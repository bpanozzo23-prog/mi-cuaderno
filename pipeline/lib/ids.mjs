/**
 * Identity and normalization for the reference layer (brief §6, §8).
 *
 * `normalize` is imported from the app rather than copied. The spike kept its own
 * copy, which was fine for a throwaway; here the two must never drift, because the
 * pipeline builds the search index the app then looks words up in. One function,
 * one behaviour, one test suite (src/lib/normalize.test.js).
 */
export { normalize } from "../../src/lib/normalize.js";

/**
 * Canonical ID per brief §6: derived from identity, never display spelling alone.
 *
 * Case is PRESERVED in the lemma part: lowercasing would conflate proper nouns with
 * common ones (FIFA/fifa, Papa/papa). Case-insensitive matching is search's job,
 * not identity's. Records sharing an ID are merged (see 04-entries.mjs) — kaikki
 * splits some dictionary entries across several records.
 */
export function canonicalId(lemma, pos, etymologyKey) {
  const slug = (v) =>
    String(v ?? "")
      .normalize("NFC")
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]/gu, "");
  const parts = [slug(lemma), slug(pos)];
  if (etymologyKey !== undefined && etymologyKey !== null && etymologyKey !== "") {
    parts.push(slug(etymologyKey));
  }
  return `dict:wiktionary-es:${parts.join(":")}`;
}

/** Conjugation table keys record which source produced the table (brief §4 licensing). */
export const conjugationId = (source, lemma) => `conj:${source}:${lemma}`;

/** "lemma|pos" is the pipeline's internal key for a lemma before it has an entry. */
export const lemmaKey = (lemma, pos) => `${lemma}|${pos}`;
export const splitLemmaKey = (key) => {
  const i = key.lastIndexOf("|");
  return { lemma: key.slice(0, i), pos: key.slice(i + 1) };
};
