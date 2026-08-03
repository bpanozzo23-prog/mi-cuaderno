import Dexie from "dexie";
import { APP_VERSION } from "../version.js";
import { nowIso } from "../lib/dates.js";
import { BACKUP_FORMAT, LAST_BACKUP_PREF, validateBackup } from "./backup.js";

const DATABASE_NAME = "mi-cuaderno";
const V1_STORES = {
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
  return {
    version,
    needsV1Backup: version === 1,
    unsupported: typeof version === "number" && version > 2,
  };
}

/**
 * Opens schema v1 through an isolated connection and closes it before returning. The candidate is
 * validated through the normal importer, but the downloaded file intentionally remains v1: it is
 * the exact pre-migration recovery point.
 */
export async function buildPreupgradeV1Backup() {
  const legacy = new Dexie(DATABASE_NAME);
  legacy.version(1).stores(V1_STORES);
  try {
    await legacy.open();
    if (legacy.verno !== 1) throw new Error(`Expected schema 1 but found schema ${legacy.verno}.`);
    const [userItems, events, prefRows] = await Promise.all([
      legacy.table("items").toArray(),
      legacy.table("events").toArray(),
      legacy.table("prefs").toArray(),
    ]);
    const envelope = {
      format: BACKUP_FORMAT,
      schemaVersion: 1,
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
