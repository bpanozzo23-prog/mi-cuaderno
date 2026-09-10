import { isDictKey } from "./ids.js";

/**
 * The one read seam for a schema-v12 lexical item's dictionary attachments.
 *
 * Array order is stable presentation order only. No attachment is semantically primary; callers
 * that need a capability such as conjugation must inspect the resolved entries for that
 * capability instead of assuming the first key supplies it.
 */
export function dictionaryKeysForItem(item) {
  return item?.type === "lexical" && Array.isArray(item.dictKeys) ? item.dictKeys : [];
}

export const hasDictionaryAttachments = (item) => dictionaryKeysForItem(item).length > 0;

export const canonicalDictionaryKey = (key, previousIds = {}) => previousIds?.[key] || key;

export function itemAttachesDictionaryEntry(item, entryKey, previousIds = {}) {
  if (!entryKey) return false;
  const canonicalEntryKey = canonicalDictionaryKey(entryKey, previousIds);
  return dictionaryKeysForItem(item).some(
    (key) => canonicalDictionaryKey(key, previousIds) === canonicalEntryKey
  );
}

/** Runtime writers admit only real dictionary IDs and preserve the earliest equivalent key. */
export function appendDictionaryKey(keys = [], key, previousIds = {}) {
  if (!isDictKey(key)) throw new Error("A dictionary attachment needs a dictionary entry key.");
  const canonical = canonicalDictionaryKey(key, previousIds);
  if ((keys || []).some((candidate) => canonicalDictionaryKey(candidate, previousIds) === canonical)) {
    return [...keys];
  }
  return [...keys, key];
}

/** Alias healing may make two stored keys converge; the earliest attachment survives. */
export function uniqueDictionaryKeys(keys = []) {
  const seen = new Set();
  const result = [];
  for (const key of keys || []) {
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}
