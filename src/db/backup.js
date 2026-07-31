import { db, allPrefs, setPref } from "./db.js";
import { APP_VERSION, SCHEMA_VERSION } from "../version.js";
import { nowIso } from "../lib/dates.js";

/**
 * Backup is the disaster-recovery mechanism, not a convenience (brief section 10).
 * The envelope excludes the reference dictionary (replaceable) and, from Phase 5,
 * the API key (never exported).
 */
export const BACKUP_FORMAT = "mi-cuaderno-backup";
export const LAST_BACKUP_PREF = "lastBackupAt";

export async function buildBackup() {
  const [userItems, events, preferences] = await Promise.all([
    db.items.toArray(),
    db.events.toArray(),
    allPrefs(),
  ]);
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    appVersion: APP_VERSION,
    userItems,
    events,
    preferences,
  };
}

export function backupFilename(envelope) {
  const stamp = (envelope?.exportedAt || nowIso()).replace(/[:.]/g, "-").slice(0, 19);
  return `mi-cuaderno-backup-${stamp}.json`;
}

export async function recordBackupTaken(at = nowIso()) {
  return setPref(LAST_BACKUP_PREF, at);
}

/* ---------- validation ---------- */

const isString = (v) => typeof v === "string";
const isNonEmptyString = (v) => isString(v) && v.trim() !== "";

function validateItem(item, index, errors) {
  const where = `userItems[${index}]`;
  if (!item || typeof item !== "object") return errors.push(`${where} is not an object`);
  if (!isNonEmptyString(item.id)) errors.push(`${where}.id is missing`);
  if (item.type !== "lexical" && item.type !== "page") {
    errors.push(`${where}.type must be "lexical" or "page"`);
  }
  if (!isString(item.createdAt)) errors.push(`${where}.createdAt is missing`);
  if (!isString(item.updatedAt)) errors.push(`${where}.updatedAt is missing`);
  if (!Array.isArray(item.tags)) errors.push(`${where}.tags must be an array`);
  if (!Array.isArray(item.linkedKeys)) errors.push(`${where}.linkedKeys must be an array`);
  if (!Array.isArray(item.mediaLinks)) errors.push(`${where}.mediaLinks must be an array`);
  if (item.type === "lexical") {
    if (!isNonEmptyString(item.term)) errors.push(`${where}.term is missing`);
    if (item.form !== "word" && item.form !== "phrase") {
      errors.push(`${where}.form must be "word" or "phrase"`);
    }
  }
  if (item.type === "page" && !isString(item.title)) {
    errors.push(`${where}.title is missing`);
  }
}

function validateEvent(event, index, errors) {
  const where = `events[${index}]`;
  if (!event || typeof event !== "object") return errors.push(`${where} is not an object`);
  if (!isNonEmptyString(event.id)) errors.push(`${where}.id is missing`);
  if (!isNonEmptyString(event.type)) errors.push(`${where}.type is missing`);
  if (!isString(event.at)) errors.push(`${where}.at is missing`);
  if (!isString(event.localDate)) errors.push(`${where}.localDate is missing`);
}

/**
 * Validates the ENTIRE file before anything touches the database (brief section 10).
 * Returns { ok, errors, envelope, summary } — never throws on bad input.
 */
export function validateBackup(raw) {
  const errors = [];
  let parsed = raw;

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, errors: ["The file is not valid JSON."], envelope: null, summary: null };
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: ["The file is not a backup envelope."], envelope: null, summary: null };
  }
  if (parsed.format !== BACKUP_FORMAT) {
    errors.push(`Not a Mi cuaderno backup (format is "${parsed.format ?? "missing"}").`);
  }
  if (typeof parsed.schemaVersion !== "number") {
    errors.push("schemaVersion is missing.");
  } else if (parsed.schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `This backup is schema version ${parsed.schemaVersion}, newer than this app understands (${SCHEMA_VERSION}). Update the app first.`
    );
  }
  if (!Array.isArray(parsed.userItems)) errors.push("userItems must be an array.");
  if (!Array.isArray(parsed.events)) errors.push("events must be an array.");
  if (parsed.preferences !== undefined && (typeof parsed.preferences !== "object" || parsed.preferences === null)) {
    errors.push("preferences must be an object.");
  }
  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  parsed.userItems.forEach((item, i) => validateItem(item, i, errors));
  parsed.events.forEach((event, i) => validateEvent(event, i, errors));

  const seenItemIds = new Set();
  for (const item of parsed.userItems) {
    if (item && seenItemIds.has(item.id)) errors.push(`Duplicate item id "${item.id}".`);
    if (item) seenItemIds.add(item.id);
  }

  // Duplicate EVENT ids are skipped rather than rejected, per brief section 10.
  const seenEventIds = new Set();
  const events = [];
  let skippedEvents = 0;
  for (const event of parsed.events) {
    if (event && seenEventIds.has(event.id)) {
      skippedEvents += 1;
      continue;
    }
    if (event) seenEventIds.add(event.id);
    events.push(event);
  }

  if (errors.length > 0) return { ok: false, errors, envelope: null, summary: null };

  const envelope = { ...parsed, events, preferences: parsed.preferences ?? {} };
  const summary = {
    items: envelope.userItems.length,
    lexical: envelope.userItems.filter((i) => i.type === "lexical").length,
    pages: envelope.userItems.filter((i) => i.type === "page").length,
    events: events.length,
    skippedEvents,
    exportedAt: envelope.exportedAt ?? null,
    appVersion: envelope.appVersion ?? null,
    schemaVersion: envelope.schemaVersion,
  };
  return { ok: true, errors: [], envelope, summary };
}

/**
 * Replace-and-restore (the only supported mode in v1 — no merge). Runs in one
 * transaction: either the whole backup lands or nothing changes.
 * The caller is responsible for auto-exporting the current database first.
 */
export async function importBackup(envelope) {
  const { ok, errors, envelope: clean } = validateBackup(envelope);
  if (!ok) throw new Error(`Refusing to import: ${errors.join(" ")}`);

  const prefRows = Object.entries(clean.preferences).map(([key, value]) => ({ key, value }));

  await db.transaction("rw", db.items, db.events, db.prefs, async () => {
    await Promise.all([db.items.clear(), db.events.clear(), db.prefs.clear()]);
    if (clean.userItems.length) await db.items.bulkAdd(clean.userItems);
    if (clean.events.length) await db.events.bulkAdd(clean.events);
    if (prefRows.length) await db.prefs.bulkAdd(prefRows);
  });

  return { items: clean.userItems.length, events: clean.events.length, preferences: prefRows.length };
}
