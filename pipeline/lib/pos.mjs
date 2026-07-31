/**
 * Which kaikki parts of speech become dictionary entries.
 *
 * Excluded are the ones that are not words a learner looks up: single characters and
 * punctuation, and bound morphemes (affixes) that only exist attached to something else.
 * `name` (proper nouns) is deliberately KEPT — frequency ranking decides whether any
 * given name earns a slot, and 03-frequency.mjs reports how many make the top 10k.
 */
export const EXCLUDED_POS = new Set([
  "character",
  "punct",
  "symbol",
  "prefix",
  "suffix",
  "infix",
  "interfix",
  "romanization",
]);

export const isUsablePos = (pos) => Boolean(pos) && !EXCLUDED_POS.has(pos);

/** Display order for parts of speech in the app, most common first. */
export const POS_ORDER = [
  "noun", "verb", "adj", "adv", "pron", "prep", "conj", "det", "article",
  "num", "intj", "phrase", "prep_phrase", "proverb", "contraction", "particle", "name",
];
