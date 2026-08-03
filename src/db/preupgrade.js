import Dexie from "dexie";
import { APP_VERSION, SCHEMA_VERSION } from "../version.js";
import { nowIso } from "../lib/dates.js";
import { BACKUP_FORMAT, LAST_BACKUP_PREF, validateBackup } from "./backup.js";

const DATABASE_NAME = "mi-cuaderno";
const LEGACY_STORES = {
  items: "id, type, term, title, updatedAt, *tags, *linkedKeys",
  events: "id, at, localDate, itemKey, type",
  prefs: "key",
};

// Dexie maps its decimal schema versions to integer IndexedDB versions by multiplying by ten.
const dexieSchemaVersion = (indexedDbVersion) =>
  typeof indexedDbVersion === "number" && indexedDbVersion >= 10 && indexedDbVersion % 10 === 0
    ? indexedDbVersion / 10
    : indexedDbVersion;

/** Read the current version without asking IndexedDB to upgrade it. */
export async function currentPersonalDatabaseVersion() {
  if (typeof indexedDB === "undefined") return null;

  if (typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    const version = databases.find((candidate) => candidate.name === DATABASE_NAME)?.version ?? null;
    return dexieSchemaVersion(version);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const request = indexedDB.open(DATABASE_NAME);
    request.onupgradeneeded = () => {
      settled = true;
      request.transaction.abort();
      resolve(null);
    };
    request.onsuccess = () => {
      const version = dexieSchemaVersion(request.result.version);
      request.result.close();
      settled = true;
      resolve(version);
    };
    request.onerror = () => {
      if (!settled) reject(request.error ?? new Error("Could not inspect the notebook database."));
    };
  });
}

export async function preupgradeStatus() {
  const version = await currentPersonalDatabaseVersion();
  const needsBackup = version === 1 || version === 2;
  return {
    version,
    needsBackup,
    // Kept while main.jsx still uses the original gate flag; it now covers both legacy schemas.
    needsV1Backup: needsBackup,
    unsupported: typeof version === "number" && version > SCHEMA_VERSION,
  };
}

/**
 * Opens the exact installed legacy schema through an isolated connection and closes it before
 * returning. The candidate is validated through the normal importer, but the downloaded file
 * intentionally remains at its source schema: it is the untouched pre-migration recovery point.
 */
export async function buildPreupgradeBackup() {
  const sourceVersion = await currentPersonalDatabaseVersion();
  if (sourceVersion !== 1 && sourceVersion !== 2) {
    throw new Error(`Expected schema 1 or 2 but found ${sourceVersion ?? "no notebook database"}.`);
  }

  const legacy = new Dexie(DATABASE_NAME);
  legacy.version(sourceVersion).stores(LEGACY_STORES);
  try {
    await legacy.open();
    if (legacy.verno !== sourceVersion) {
      throw new Error(`Expected schema ${sourceVersion} but found schema ${legacy.verno}.`);
    }
    const [userItems, events, prefRows] = await Promise.all([
      legacy.table("items").toArray(),
      legacy.table("events").toArray(),
      legacy.table("prefs").toArray(),
    ]);
    const envelope = {
      format: BACKUP_FORMAT,
      schemaVersion: sourceVersion,
      exportedAt: nowIso(),
      appVersion: APP_VERSION,
      userItems,
      events,
      preferences: Object.fromEntries(prefRows.map((row) => [row.key, row.value])),
    };
    const validation = validateBackup(envelope);
    if (!validation.ok) throw new Error(`The pre-upgrade backup did not validate: ${validation.errors.join(" ")}`);
    await legacy.table("prefs").put({ key: LAST_BACKUP_PREF, value: envelope.exportedAt });
    return envelope;
  } finally {
    legacy.close();
  }
}

// Compatibility for callers/tests from the schema-v2 release. New code should use the general name.
export const buildPreupgradeV1Backup = buildPreupgradeBackup;
