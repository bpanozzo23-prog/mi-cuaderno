import { normalize } from "./normalize.js";
import { TIER } from "./search.js";
import { meaningGlossText } from "./meanings.js";

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
 * Nothing here is stored. `relatedTo` derives personal endpoints at render from `linkedKeys`;
 * relationship labels and mixed-target grouping live in src/lib/relationships.js.
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

/** The heading an item is known by: a page's title, a word's term. */
const headingOf = (item) => (item.type === "page" ? item.title || "" : item.term || "");

/**
 * Matches for the link picker: "find the one item I mean".
 *
 * Deliberately narrower than search (src/lib/search.js). It matches **term, title and
 * meaning glosses only** — NOT tags, notes or page bodies. A picker is not a search screen: tag
 * matches are noise there, because typing "verb" would offer every item tagged `verbs` when
 * the owner is trying to pick one word. (The tag-filter chips on the Cuaderno screen are a
 * different feature and are untouched.)
 *
 * Ranking reuses the section 8 tier numbers, which is what lets these results interleave with
 * dictionary ones through mergeResults rather than being stacked below them. Within the
 * heading tiers, the raw comparison runs before normalization so an exactly typed accent
 * outranks an accent-blind match — the Phase 1c rule, so `sacó` typed in full beats `saco`.
 *
 * Matching goes through normalize(), so ñ stays a distinct letter: "año" never offers "ano".
 */
export function pickerMatches(items, query, { excludeId = null, limit = 8 } = {}) {
  const candidates = items.filter((item) => item.id !== excludeId);
  const typed = (query || "").trim();

  // No query yet: the most recently touched items, which useNotebook has already ordered.
  // A word just added is then zero typing away from being linked.
  if (!typed) {
    return candidates.slice(0, limit).map((item) => ({ item, tier: TIER.exactTerm, offset: 0 }));
  }

  const q = normalize(typed);
  const lower = typed.toLowerCase();
  const rows = [];

  for (const item of candidates) {
    const heading = headingOf(item);
    const nHeading = normalize(heading);

    if (heading.toLowerCase() === lower) rows.push({ item, tier: TIER.exactTerm, offset: 0 });
    else if (nHeading === q) rows.push({ item, tier: TIER.normalizedTerm, offset: 0 });
    else if (nHeading.startsWith(q)) rows.push({ item, tier: TIER.normalizedTerm, offset: 1 });
    else if (nHeading.includes(q)) rows.push({ item, tier: TIER.normalizedTerm, offset: 2 });
    else if (item.type !== "page" && normalize(meaningGlossText(item, " ")).includes(q)) {
      rows.push({ item, tier: TIER.translation, offset: 0 });
    }
  }

  return rows
    .sort((a, b) => a.tier - b.tier || a.offset - b.offset || headingOf(a.item).localeCompare(headingOf(b.item)))
    .slice(0, limit);
}
