import { normalize } from "./normalize.js";

/**
 * Search over the personal layer, per brief section 8.
 *
 * One results list spans both content types, ranked high to low:
 *   1 exact Spanish term
 *   2 accent-normalized Spanish term
 *   3 inflected-form alias  — RESERVED for Phase 2 (needs the reference layer's
 *                             form-to-lemma index; the tier number is held open
 *                             so personal and dictionary results interleave correctly)
 *   4 English gloss or personal translation — English to Spanish is first-class
 *   5 tags
 *   6 notes, personal examples, page titles and page bodies
 *
 * Every result carries why it matched, because a result whose reason is invisible
 * looks like a bug.
 */
export const TIER = {
  exactTerm: 1,
  normalizedTerm: 2,
  inflectedForm: 3, // Phase 2
  translation: 4,
  tag: 5,
  text: 6,
};

const REASONS = {
  exactTerm: "exact match",
  normalizedTerm: "ignoring accents",
  startsWith: "starts with your search",
  translation: "English meaning",
  pageTitle: "page title",
  tag: "tag",
  notes: "in your notes",
  examples: "in your examples",
  body: "in the page",
};

function bestMatch(item, query) {
  const q = normalize(query);
  if (!q) return null;

  const isPage = item.type === "page";
  const heading = isPage ? item.title || "" : item.term;
  const nHeading = normalize(heading);

  // Tier 1/2: the Spanish term itself. The raw comparison runs before
  // normalization so an exactly-typed accent outranks an accent-blind match.
  if (heading.toLowerCase() === query.trim().toLowerCase()) {
    return { tier: TIER.exactTerm, reason: isPage ? REASONS.pageTitle : REASONS.exactTerm, offset: 0 };
  }
  if (nHeading === q) {
    return { tier: TIER.normalizedTerm, reason: REASONS.normalizedTerm, offset: 0 };
  }
  if (nHeading.startsWith(q)) {
    return {
      tier: TIER.normalizedTerm,
      reason: isPage ? REASONS.pageTitle : REASONS.startsWith,
      offset: 1,
    };
  }
  if (nHeading.includes(q)) {
    return { tier: TIER.normalizedTerm, reason: isPage ? REASONS.pageTitle : REASONS.startsWith, offset: 2 };
  }

  // Tier 4: English meaning. Looking a word up from English is a first-class path.
  if (!isPage && normalize(item.translation).includes(q)) {
    return { tier: TIER.translation, reason: REASONS.translation, offset: 0 };
  }

  // Tier 5: tags.
  const tag = item.tags.find((t) => normalize(t).includes(q));
  if (tag) return { tier: TIER.tag, reason: `${REASONS.tag} "${tag}"`, offset: 0 };

  // Tier 6: free text — notes, personal examples, page bodies.
  if (!isPage && normalize(item.notes).includes(q)) {
    return { tier: TIER.text, reason: REASONS.notes, offset: 0 };
  }
  if (!isPage && item.myExamples.some((x) => normalize(x.es).includes(q) || normalize(x.en).includes(q))) {
    return { tier: TIER.text, reason: REASONS.examples, offset: 1 };
  }
  if (isPage && normalize(item.body).includes(q)) {
    return { tier: TIER.text, reason: REASONS.body, offset: 0 };
  }

  return null;
}

export function searchItems(items, query) {
  if (!query || !query.trim()) return [];
  const results = [];
  for (const item of items) {
    const match = bestMatch(item, query);
    if (match) results.push({ item, ...match });
  }
  return results.sort(
    (a, b) =>
      a.tier - b.tier ||
      a.offset - b.offset ||
      normalize(a.item.type === "page" ? a.item.title : a.item.term).localeCompare(
        normalize(b.item.type === "page" ? b.item.title : b.item.term)
      )
  );
}
