import { normalize } from "./normalize.js";

/**
 * Suggesting tags the owner has already used.
 *
 * The friction this solves is duplicate near-identical tags: nothing while typing hints that
 * `expression` already exists, so `expresion`, `Expression` and `expressions` accumulate
 * alongside it. `cleanTags` (src/db/items.js) dedupes exact strings only, so those really are
 * four different tags.
 *
 * Matching therefore goes through normalize() — the same ñ-preserving normalizer the whole app
 * shares — which makes it case- AND accent-insensitive. That is the part that actually fixes
 * the problem: typing "Expresion" surfaces the existing `expresión` and one tap reuses it.
 *
 * It only ever SUGGESTS. Typing a new tag still creates exactly what was typed — silently
 * folding what the owner wrote into an existing tag would be the kind of helpfulness that
 * annoys the third time it happens.
 *
 * Pure and database-free, like the rest of src/lib: the whole tag vocabulary is derivable from
 * items already in memory, so nothing here is stored (§7).
 */

const LIMIT = 6;

/** Every tag in use across the notebook, deduplicated, alphabetical. */
export function allTagsIn(items = []) {
  const seen = new Set();
  for (const item of items) for (const tag of item.tags || []) seen.add(tag);
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * Tags worth offering for what has been typed so far.
 *
 * Prefix matches rank above substring ones — typing "ex" means "expression" more often than
 * "complex" — and anything already on this item is left out, since offering it would be a
 * suggestion that does nothing.
 */
export function suggestTags(allTags = [], query, { exclude = [], limit = LIMIT } = {}) {
  const q = normalize((query || "").trim());
  const taken = new Set(exclude.map((tag) => normalize(tag)));

  const rows = [];
  for (const tag of allTags) {
    const n = normalize(tag);
    if (taken.has(n)) continue;
    if (!q) {
      rows.push({ tag, rank: 0 });
      continue;
    }
    if (n.startsWith(q)) rows.push({ tag, rank: 0 });
    else if (n.includes(q)) rows.push({ tag, rank: 1 });
  }

  return rows
    .sort((a, b) => a.rank - b.rank || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map((row) => row.tag);
}
