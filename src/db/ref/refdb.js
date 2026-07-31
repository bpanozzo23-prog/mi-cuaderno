import Dexie from "dexie";

/**
 * The reference layer's storage (brief §5, §11).
 *
 * Reference data lives in its OWN databases, not in tables of the personal `mi-cuaderno`
 * database. §5 says rebuilding or replacing the dictionary must never touch personal data;
 * separate databases make that structural rather than a rule someone has to remember —
 * no reference migration can see a personal record, and no personal migration can see a
 * dictionary one.
 *
 * There are TWO of them, A and B, and only one is live at a time. §11 requires that a new
 * dataset version is fully downloaded before it replaces the old one, and that a failed or
 * interrupted download leaves the previous version intact and usable. So an install writes
 * into whichever database is NOT live, and the pointer flips only once every chunk has
 * arrived and verified. If the download dies halfway, the live database was never touched.
 */

const SLOTS = ["a", "b"];
const ACTIVE_SLOT_KEY = "mc-ref-active";
const dbNameFor = (slot) => `mi-cuaderno-ref-${slot}`;

/**
 * Stores. `entries` is keyed by the namespaced dict: id (§6). `formShards` and
 * `englishShards` are keyed by their shard prefix — the index is sharded so a lookup reads
 * one small row instead of one row per form; see pipeline/build/07-package.mjs.
 *
 * No compound or multi-entry indexes: every read is either a primary-key get or a bulkGet,
 * because the pipeline pre-computed the indexes that would otherwise need them.
 */
const SCHEMA = {
  entries: "id, freqRank",
  conjugations: "id",
  formShards: "id",
  englishShards: "id",
  meta: "key",
};

const open = (slot) => {
  const db = new Dexie(dbNameFor(slot));
  db.version(1).stores(SCHEMA);
  return db;
};

const handles = new Map();

/** Dexie connections are cached: opening one per call leaks connections and is slow. */
export function refDb(slot) {
  if (!handles.has(slot)) handles.set(slot, open(slot));
  return handles.get(slot);
}

export function activeSlot() {
  try {
    const stored = localStorage.getItem(ACTIVE_SLOT_KEY);
    return SLOTS.includes(stored) ? stored : null;
  } catch {
    return null; // private mode, storage disabled — treated as "nothing installed"
  }
}

export const inactiveSlot = () => (activeSlot() === "a" ? "b" : "a");

/**
 * The atomic swap. Writing one small string is the entire commit: before it the old
 * dictionary answers every query, after it the new one does, and there is no moment in
 * between where the app is looking at a half-written dataset.
 */
export function setActiveSlot(slot) {
  if (!SLOTS.includes(slot)) throw new Error(`unknown reference slot: ${slot}`);
  localStorage.setItem(ACTIVE_SLOT_KEY, slot);
}

export function clearActiveSlot() {
  localStorage.removeItem(ACTIVE_SLOT_KEY);
}

/** The live reference database, or null when no dictionary is installed. */
export function activeDb() {
  const slot = activeSlot();
  return slot ? refDb(slot) : null;
}

export const META_KEYS = {
  dataset: "dataset",   // the installed manifest
  progress: "progress", // an in-flight install, so it can resume
};

export async function getMeta(db, key, fallback = null) {
  if (!db) return fallback;
  const row = await db.meta.get(key);
  return row === undefined ? fallback : row.value;
}

export async function setMeta(db, key, value) {
  await db.meta.put({ key, value });
  return value;
}

/** Empties a slot. Used before a fresh install and by "remove dictionary". */
export async function wipeSlot(slot) {
  const db = refDb(slot);
  await db.transaction("rw", db.entries, db.conjugations, db.formShards, db.englishShards, db.meta, async () => {
    await Promise.all([
      db.entries.clear(), db.conjugations.clear(),
      db.formShards.clear(), db.englishShards.clear(), db.meta.clear(),
    ]);
  });
}

/** Frees the storage a slot occupies. Deleting beats clearing when nothing is coming back. */
export async function deleteSlot(slot) {
  const db = handles.get(slot);
  if (db) {
    db.close();
    handles.delete(slot);
  }
  await Dexie.delete(dbNameFor(slot));
}

export { SLOTS, ACTIVE_SLOT_KEY, dbNameFor };
