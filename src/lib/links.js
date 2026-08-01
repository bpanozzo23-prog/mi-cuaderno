/**
 * Links, derived (brief section 7).
 *
 * Phase 1c decided that a link is stored ONCE, on the item where it was made, and that the
 * reverse direction is computed — because `linkedKeys[]` may point at a read-only dictionary
 * entry (section 6), which cannot store a reciprocal link. This module is where that
 * computation lives for the screens.
 *
 * Pure and database-free, the same shape as src/lib/review.js: the whole notebook is already
 * in memory (useNotebook loads it), a personal notebook is small, and one pure function is
 * testable without a database and can never disagree with itself across screens.
 *
 * Nothing here is stored. There is no link count, no cached grouping, no "related" field —
 * every list below is recomputed at render from `linkedKeys` and the items themselves.
 */

/**
 * Everything connected to an item, in both directions, deduplicated.
 *
 * Forward: keys this item stores. Backward: items storing this item's key. Which side holds
 * the link is bookkeeping the owner never sees — both directions read as one list.
 *
 * `dict:` keys are not resolved here: they live in the reference layer, which is asynchronous
 * and may not be installed. See src/db/linkedEntries.js for that half.
 *
 * Order follows `items`, which useNotebook loads most-recently-updated first.
 */
export function relatedTo(item, items = []) {
  if (!item) return [];
  const forward = new Set(item.linkedKeys || []);
  return items.filter(
    (other) => other.id !== item.id && (forward.has(other.id) || (other.linkedKeys || []).includes(item.id))
  );
}

/**
 * The same question asked about a bare key rather than an item — used by the dictionary entry
 * screen, where there is no personal item to start from. A dictionary entry is reached two
 * ways: an item attached to it (`dictKey`, the section 5 seam) or an item linking to it.
 */
export function relatedToKey(key, items = []) {
  if (!key) return [];
  return items.filter((item) => item.dictKey === key || (item.linkedKeys || []).includes(key));
}
