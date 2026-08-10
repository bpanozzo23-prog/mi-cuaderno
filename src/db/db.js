import Dexie from "dexie";
import { upgradeLexicalItemV1 } from "../lib/meanings.js";
import { emptyGrammar, emptySource, PAGE_FOCUSES } from "../lib/pageKinds.js";

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

/**
 * Schema-v3 page defaults. Collection layout stays on every page even when its active profile
 * is General, so switching profiles never discards the owner's organization.
 */
export function upgradePageItemV2(item) {
  if (!item || item.type !== "page") return { ...item };
  return {
    ...item,
    pageProfile: "general",
    collection: { groups: [] },
  };
}

export async function migratePersonalDataToV3(transaction) {
  await transaction
    .table("items")
    .where("type")
    .equals("page")
    .modify((item) => {
      Object.assign(item, upgradePageItemV2(item));
    });
}

db.version(3)
  .stores(PERSONAL_STORES)
  .upgrade(migratePersonalDataToV3);

/**
 * Schema-v4 relationship metadata is mandatory but sparse. Existing connections keep deriving
 * as Related, so the migration adds only the empty annotation array and leaves link topology,
 * content, timestamps and every other field untouched.
 */
export function upgradeItemV3(item) {
  return {
    ...item,
    linkAnnotations: [],
  };
}

export async function migratePersonalDataToV4(transaction) {
  await transaction
    .table("items")
    .toCollection()
    .modify((item) => {
      Object.assign(item, upgradeItemV3(item));
    });
}

db.version(4)
  .stores(PERSONAL_STORES)
  .upgrade(migratePersonalDataToV4);

/**
 * Schema v5 replaces the exclusive pageProfile with one leading focus and three independently
 * enabled structures. Existing Collections become Vocabulary-led pages; every other page remains
 * Notes-led. Dormant Collection layout and every unrelated field are preserved byte-for-byte.
 */
export function upgradePageItemV4(item) {
  if (!item || item.type !== "page") return { ...item };
  const {
    pageProfile,
    pageFocus: _unrecognizedFocus,
    source: _unrecognizedSource,
    grammar: _unrecognizedGrammar,
    collection,
    ...withoutLegacyProfile
  } = item;
  const vocabularyEnabled = pageProfile === "collection";
  return {
    ...withoutLegacyProfile,
    pageFocus: vocabularyEnabled ? PAGE_FOCUSES.vocabulary : PAGE_FOCUSES.notes,
    collection: { enabled: vocabularyEnabled, groups: [...(collection?.groups || [])] },
    source: emptySource(),
    grammar: emptyGrammar(),
  };
}

export async function migratePersonalDataToV5(transaction) {
  await transaction
    .table("items")
    .where("type")
    .equals("page")
    .modify((item) => {
      Object.assign(item, upgradePageItemV4(item));
      delete item.pageProfile;
    });
}

db.version(5)
  .stores(PERSONAL_STORES)
  .upgrade(migratePersonalDataToV5);

/** Schema v6 adds one optional hierarchy edge to each Grammar section. Existing sections are roots. */
export function upgradePageItemV5(item) {
  if (!item || item.type !== "page") return { ...item };
  if (!item.grammar || typeof item.grammar !== "object" || Array.isArray(item.grammar)) {
    return { ...item };
  }
  return {
    ...item,
    grammar: {
      ...item.grammar,
      sections: Array.isArray(item.grammar.sections)
        ? item.grammar.sections.map((section) => ({ ...section, parentId: null }))
        : item.grammar.sections,
    },
  };
}

export async function migratePersonalDataToV6(transaction) {
  await transaction
    .table("items")
    .where("type")
    .equals("page")
    .modify((item) => {
      Object.assign(item, upgradePageItemV5(item));
    });
}

db.version(6)
  .stores(PERSONAL_STORES)
  .upgrade(migratePersonalDataToV6);

export async function getPref(key, fallback = null) {
  const row = await db.prefs.get(key);
  return row === undefined ? fallback : row.value;
}

export async function setPref(key, value) {
  await db.prefs.put({ key, value });
  return value;
}

/** Removes the row entirely, so the preference is absent rather than stored as null. */
export async function delPref(key) {
  await db.prefs.delete(key);
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
