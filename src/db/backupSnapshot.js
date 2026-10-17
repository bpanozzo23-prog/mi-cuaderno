import { APP_VERSION } from "../version.js";
import { nowIso } from "../lib/dates.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";

export const BACKUP_FORMAT = "mi-cuaderno-backup";
export const RESCUE_FORMAT = "mi-cuaderno-rescue";

/** One committed view, using either the current database or an isolated legacy connection. */
export async function readBackupSnapshot(connection, schemaVersion) {
  const [items, events, prefs] = await connection.transaction(
    "r", connection.table("items"), connection.table("events"), connection.table("prefs"),
    () => Promise.all([
      connection.table("items").toArray(),
      connection.table("events").toArray(),
      connection.table("prefs").toArray(),
    ])
  );
  return {
    schemaVersion,
    exportedAt: nowIso(),
    appVersion: APP_VERSION,
    // Redact before exposing any snapshot, including the failure/rescue path. Keep all other
    // rows as stored: converting prefs to an object here would lose malformed/unknown fields.
    stores: { items, events, prefs: prefs.filter((row) => row.key !== AI_API_KEY_PREF) },
  };
}

export class BackupValidationError extends Error {
  constructor(snapshot, errors) {
    super(`The notebook could not be backed up: ${errors.slice(0, 3).join(" ")}`);
    this.name = "BackupValidationError";
    this.validationErrors = errors;
    this.rescue = { format: RESCUE_FORMAT, ...snapshot, validationErrors: errors };
  }
}

/** Validate a separate candidate; a failed checker must never consume the rescue snapshot. */
export function validateBackupSnapshot(snapshot, validate, { preserveSourceSchema = false } = {}) {
  const candidate = structuredClone({
    format: BACKUP_FORMAT,
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    appVersion: snapshot.appVersion,
    userItems: snapshot.stores.items,
    events: snapshot.stores.events,
    preferences: Object.fromEntries(snapshot.stores.prefs.map((row) => [row.key, row.value])),
  });
  let checked;
  try {
    checked = validate(candidate);
  } catch {
    // Do not expose arbitrary exception content in exports or logs. The raw records below
    // remain available even when malformed data exposes a bug in the checker itself.
    throw new BackupValidationError(snapshot, [
      "The backup checker could not finish. The rescue file preserves the records for repair.",
    ]);
  }
  if (!checked.ok) throw new BackupValidationError(snapshot, checked.errors);
  return preserveSourceSchema ? candidate : checked.envelope;
}

export function rescueFilename(rescue) {
  const stamp = rescue.exportedAt.replace(/[:.]/g, "-").slice(0, 19);
  return `mi-cuaderno-RESCUE-${stamp}.json`;
}
