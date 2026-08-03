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

/** The heading an item is known by: a page's title, a word's term. */
const headingOf = (item) => (item.type === "page" ? item.title || "" : item.term || "");

/**
 * The three groups links fall into, named from what the data ALREADY knows (requirement 5).
 * A dated page is a journal entry — brief §7 defines it that way, so `pageDate` is the whole
 * test and no new field is needed. There is deliberately no "sources" group: nothing in the
 * data distinguishes a film page from a grammar page, and inventing that distinction would
 * cost either a tag convention or the project's first schema field.
 */
export const GROUPS = {
  palabras: "palabras",
  paginas: "páginas",
  diario: "diario",
};

const groupOf = (item) => {
  if (item.type !== "page") return GROUPS.palabras;
  return item.pageDate ? GROUPS.diario : GROUPS.paginas;
};

/** Most recently updated first. ISO-8601 strings sort correctly as strings (Phase 1a). */
const byUpdatedDesc = (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));

/**
 * An item's links, grouped and ordered for display (requirement 5).
 *
 * One fixed sensible order, and no user-facing sort controls: those are desktop thinking for
 * a list of five links. `order` lets a screen lead with what that screen is for (requirement
 * 6) — a page leads with its vocabulary — without any of it being stored or configurable.
 *
 * Linked dictionary entries join **palabras**, after the owner's own words: a linked
 * dictionary word is still a word, and it has no `updatedAt` to sort by because the owner
 * never edits it. Entries are resolved elsewhere (src/db/linkedEntries.js) because the
 * reference layer is asynchronous and may not be installed at all.
 */
export function groupRelated(items = [], entries = [], order = [GROUPS.palabras, GROUPS.paginas, GROUPS.diario]) {
  const buckets = new Map(order.map((name) => [name, []]));

  for (const item of items) {
    const bucket = buckets.get(groupOf(item));
    if (bucket) bucket.push({ kind: "item", key: item.id, item });
  }
  for (const [, rows] of buckets) rows.sort((a, b) => byUpdatedDesc(a.item, b.item));

  const palabras = buckets.get(GROUPS.palabras);
  if (palabras) {
    palabras.push(
      ...[...entries]
        .sort((a, b) => a.lemma.localeCompare(b.lemma))
        .map((entry) => ({ kind: "entry", key: entry.id, entry }))
    );
  }

  return order
    .map((name) => ({ name, rows: buckets.get(name) || [] }))
    .filter((group) => group.rows.length > 0);
}

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
