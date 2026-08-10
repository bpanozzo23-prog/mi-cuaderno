import { normalize } from "./normalize.js";
import { plainTextFromMarkdown } from "./noteMarkdown.js";
import {
  allPersonalExamples,
  meaningContextText,
  meaningGlossText,
  meaningNotes,
} from "./meanings.js";
import { activePageVocabularyKeys } from "./pageReferences.js";

/**
 * Search over the personal layer, per brief section 8.
 *
 * One results list spans both content types, ranked high to low:
 *   1 exact Spanish term
 *   2 accent-normalized Spanish term
 *   3 inflected-form alias  — reference layer only (src/db/ref/search.js); the tier
 *                             number is shared so personal and dictionary results
 *                             interleave into a single ranked list
 *   4 English dictionary gloss or personal meaning gloss — English to Spanish is first-class
 *   5 tags
 *   6 notes, personal examples, page titles and page bodies
 *
 * Every result carries why it matched, because a result whose reason is invisible
 * looks like a bug.
 */
export const TIER = {
  exactTerm: 1,
  normalizedTerm: 2,
  inflectedForm: 3,
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
  meaning: "in a meaning",
  body: "in the page",
  source: "in source notes",
  grammar: "in the grammar guide",
};

/** Newlines and runs of spaces read as one space when matching a free-text field. */
const flattenSpace = (text) => text.replace(/\s+/g, " ");

function containedVocabularyMatch(page, query, allItems) {
  const q = normalize(query);
  const byId = new Map((allItems || []).map((candidate) => [candidate.id, candidate]));
  const matches = [];
  for (const key of activePageVocabularyKeys(page, allItems)) {
    const lexical = byId.get(key);
    if (lexical?.type !== "lexical") continue;
    const heading = String(lexical.term || "");
    if (normalize(heading).includes(q)) {
      matches.push({ tier: TIER.text, reason: `contained vocabulary “${heading}”`, offset: 3 });
    }
    if (flattenSpace(normalize(meaningGlossText(lexical, " "))).includes(q)) {
      matches.push({ tier: TIER.text, reason: `meaning of contained vocabulary “${heading}”`, offset: 4 });
    }
  }
  // One page produces one result. Prefer a matching Spanish heading over a personal meaning,
  // regardless of membership order, then keep active vocabulary order as the stable tie-break.
  return matches.sort((a, b) => a.offset - b.offset)[0] || null;
}

function activeSourceText(page) {
  if (!page?.source?.enabled) return "";
  return [
    page.source.creator,
    page.source.scope,
    page.source.url,
    page.source.context,
    ...(page.source.captures || []).flatMap((capture) => [
      capture.text,
      capture.location,
      capture.reflection,
    ]),
  ].filter(Boolean).join("\n");
}

function activeGrammarText(page) {
  if (!page?.grammar?.enabled) return "";
  return [
    page.grammar.keyIdea,
    ...(page.grammar.sections || []).flatMap((section) => [
      section.name,
      flattenSpace(plainTextFromMarkdown(section.explanation)),
      section.pattern,
      ...(section.examples || []).flatMap((example) => [example.es, example.en, example.note]),
    ]),
  ].filter(Boolean).join("\n");
}

function bestMatch(item, query, { allItems = [], includeContainedVocabulary = false } = {}) {
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
  //
  // Whitespace is flattened HERE rather than in normalize(): a meaning may now hold several
  // lines, and "jacket sack" should find one reading "jacket" above another reading "sack".
  // normalize() itself must not change — the pipeline imports it and it decides the shipped
  // dictionary index, so collapsing whitespace there would alter what 10,278 entries match.
  if (!isPage && flattenSpace(normalize(meaningGlossText(item, " "))).includes(q)) {
    return { tier: TIER.translation, reason: REASONS.translation, offset: 0 };
  }

  // Tier 5: tags.
  const tag = item.tags.find((t) => normalize(t).includes(q));
  if (tag) return { tier: TIER.tag, reason: `${REASONS.tag} "${tag}"`, offset: 0 };

  // Tier 6: free text — notes, personal examples, page bodies.
  if (!isPage && normalize([plainTextFromMarkdown(item.notes), meaningNotes(item)].filter(Boolean).join("\n")).includes(q)) {
    return { tier: TIER.text, reason: REASONS.notes, offset: 0 };
  }
  if (!isPage && allPersonalExamples(item).some((x) => normalize(x.es).includes(q) || normalize(x.en).includes(q))) {
    return { tier: TIER.text, reason: REASONS.examples, offset: 1 };
  }
  if (!isPage && normalize(meaningContextText(item)).includes(q)) {
    return { tier: TIER.text, reason: REASONS.meaning, offset: 2 };
  }
  if (isPage && normalize(plainTextFromMarkdown(item.body)).includes(q)) {
    return { tier: TIER.text, reason: REASONS.body, offset: 0 };
  }
  if (isPage && normalize(activeSourceText(item)).includes(q)) {
    return { tier: TIER.text, reason: REASONS.source, offset: 1 };
  }
  if (isPage && normalize(activeGrammarText(item)).includes(q)) {
    return { tier: TIER.text, reason: REASONS.grammar, offset: 2 };
  }
  if (isPage && includeContainedVocabulary) {
    const contained = containedVocabularyMatch(item, query, allItems);
    if (contained) return contained;
  }

  return null;
}

export function searchItems(items, query, options = {}) {
  if (!query || !query.trim()) return [];
  const results = [];
  for (const item of items) {
    const match = bestMatch(item, query, options);
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

/**
 * Interleaves personal and dictionary results into the single list brief §8 asks for.
 *
 * Two rules decide the order:
 *  - tier first, so an exact dictionary match outranks a personal note that merely
 *    mentions the word;
 *  - within a tier, the owner's own entry comes first. It is their notebook, and their
 *    note on a word is worth more to them than the dictionary's definition of it.
 *
 * The interesting case is a dictionary entry the owner has ATTACHED to one of their items.
 * The dictionary result is replaced by their item, carrying the dictionary's reason. That
 * does two things at once: it stops *sacar* appearing twice, once as their word and once
 * as the dictionary's; and it lets the reference layer find the owner's own words through
 * inflections the personal layer knows nothing about — searching "fui" surfaces their note
 * on *ir*, labelled "form of ir", which is the whole point of the seam (§5).
 *
 * `items` is every personal item, not just the ones that matched, because an item can only
 * be promoted this way if we can see it.
 */
export function mergeResults(personal, dictionary, items = [], { previousIds = {} } = {}) {
  const byDictKey = new Map();
  for (const item of items) {
    if (!item.dictKey) continue;
    if (!byDictKey.has(item.dictKey)) byDictKey.set(item.dictKey, item);
    const canonicalKey = previousIds?.[item.dictKey];
    if (canonicalKey && !byDictKey.has(canonicalKey)) byDictKey.set(canonicalKey, item);
  }

  const rows = personal.map((r) => ({ ...r, kind: "item", key: r.item.id, source: 0 }));
  const alreadyListed = new Set(personal.map((r) => r.item.id));

  for (const result of dictionary) {
    const attached = byDictKey.get(result.entry.id) || byDictKey.get(previousIds?.[result.entry.id]);
    if (!attached) {
      rows.push({ ...result, kind: "entry", key: result.entry.id, source: 1 });
      continue;
    }
    // Their item is already in the list on its own merits; the dictionary adds nothing.
    if (alreadyListed.has(attached.id)) continue;
    alreadyListed.add(attached.id);
    rows.push({ ...result, entry: undefined, item: attached, kind: "item", key: attached.id, source: 0 });
  }

  return rows.sort((a, b) => a.tier - b.tier || a.source - b.source || a.offset - b.offset);
}
