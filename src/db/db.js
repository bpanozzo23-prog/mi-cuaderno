import Dexie from "dexie";
import { upgradeLexicalItemV1 } from "../lib/meanings.js";

/**
 * Personal-layer database (brief section 5). Reference-layer tables arrive in Phase 2
 * as separate stores, so rebuilding the dictionary can never touch anything here.
 *
 * Index notes: a leading "id" is the primary key; "*tags" and "*linkedKeys" are
 * multi-entry indexes, so "which items carry tag T" and "which items link to key K"
 * are single indexed lookups rather than full scans.
 */
export const db = new Dexie("mi-cuaderno");

export const PERSONAL_STORES = {
  items: "id, type, term, title, updatedAt, *tags, *linkedKeys",
  events: "id, at, localDate, itemKey, type",
  prefs: "key",
};

db.version(1).stores(PERSONAL_STORES);

export async function migratePersonalDataToV2(transaction) {
  await transaction
    .table("items")
    .where("type")
    .equals("lexical")
    .modify((item) => {
      const upgraded = upgradeLexicalItemV1(item);
      Object.assign(item, upgraded);
      delete item.translation;
    });
}

db.version(2)
  .stores(PERSONAL_STORES)
  .upgrade(migratePersonalDataToV2);

export async function getPref(key, fallback = null) {
  const row = await db.prefs.get(key);
  return row === undefined ? fallback : row.value;
}

export async function setPref(key, value) {
  await db.prefs.put({ key, value });
  return value;
}

export async function allPrefs() {
  const rows = await db.prefs.toArray();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Used by backup import (replace-and-restore) and by tests. */
export async function clearAllPersonalData() {
  await db.transaction("rw", db.items, db.events, db.prefs, async () => {
    await Promise.all([db.items.clear(), db.events.clear(), db.prefs.clear()]);
  });
}
