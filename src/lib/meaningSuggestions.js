import { LEXICAL_POS_OPTIONS, meaningGlosses } from "./meanings.js";
import { normalize } from "./normalize.js";
import { connectionsFor } from "./relationships.js";

/** Definition scaffolding rather than semantic evidence. Kept explicit and testable for v1. */
export const GLOSS_STOP_WORDS = new Set([
  "about", "after", "again", "against", "all", "also", "am", "among", "an", "and", "any",
  "are", "around", "as", "at", "be", "because", "been", "before", "being", "between", "both",
  "but", "by", "can", "could", "did", "do", "does", "especially", "etc", "for", "from", "had",
  "has", "have", "having", "he", "her", "hers", "him", "his", "how", "if", "in", "into", "is",
  "it", "its", "may", "might", "must", "of", "on", "one", "onto", "or", "our", "ours", "shall",
  "she", "should", "someone", "something", "that", "the", "their", "theirs", "them", "these",
  "they", "this", "those", "through", "to", "under", "used", "usually", "was", "we", "were",
  "what", "when", "where", "which", "while", "who", "whom", "whose", "will", "with", "would",
  "you", "your", "yours",
]);

const GLOSS_WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
/**
 * Read from the option list rather than restated, because an unrecognized value here does not
 * fail — it reads as "no part of speech recorded", and the mismatch guard below then stops
 * separating the very pair it exists to separate. This set was a stale copy of the five options
 * that predated preposition, conjunction, pronoun and interjection, which was harmless only
 * while those could not be stored.
 */
const KNOWN_POS = new Set(LEXICAL_POS_OPTIONS.filter(Boolean));

export function glossContentTokens(gloss) {
  const tokens = [];
  const seen = new Set();
  for (const match of normalize(gloss).matchAll(GLOSS_WORD)) {
    const token = match[0].replaceAll("’", "'");
    const stopKey = token.endsWith("'s") ? token.slice(0, -2) : token;
    if (token.length < 3 || GLOSS_STOP_WORDS.has(token) || GLOSS_STOP_WORDS.has(stopKey) || seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function normalizedPos(item, meaning) {
  const raw = String(meaning?.posOverride || item?.pos || "").trim().toLocaleLowerCase("en");
  const value = raw === "adj" ? "adjective" : raw === "adv" ? "adverb" : raw;
  return KNOWN_POS.has(value) ? value : null;
}

const scoreOrder = (a, b) =>
  Number(b.exactContent) - Number(a.exactContent)
  || b.sharedTokens.length - a.sharedTokens.length
  || b.overlap - a.overlap;

const pairOrder = (a, b) =>
  scoreOrder(a, b)
  || a.candidateMeaningIndex - b.candidateMeaningIndex
  || a.focalMeaningIndex - b.focalMeaningIndex;

function compareMeaningPair(focalItem, focalMeaning, focalMeaningIndex, candidate, candidateMeaning, candidateMeaningIndex) {
  const focalTokens = glossContentTokens(focalMeaning.gloss);
  const candidateTokens = glossContentTokens(candidateMeaning.gloss);
  if (!focalTokens.length || !candidateTokens.length) return null;

  const focalPos = normalizedPos(focalItem, focalMeaning);
  const candidatePos = normalizedPos(candidate, candidateMeaning);
  if (focalPos && candidatePos && focalPos !== candidatePos) return null;

  const focalSet = new Set(focalTokens);
  const candidateSet = new Set(candidateTokens);
  const sharedTokens = [...focalSet].filter((token) => candidateSet.has(token)).sort();
  if (!sharedTokens.length) return null;
  const unionSize = new Set([...focalSet, ...candidateSet]).size;
  const overlap = sharedTokens.length / unionSize;
  if (overlap < 0.5) return null;

  return {
    focalMeaningIndex,
    candidateMeaningIndex,
    focalMeaningId: focalMeaning.id,
    candidateMeaningId: candidateMeaning.id,
    focalGloss: focalMeaning.gloss,
    candidateGloss: candidateMeaning.gloss,
    sharedTokens,
    exactContent: focalSet.size === candidateSet.size && sharedTokens.length === focalSet.size,
    overlap,
  };
}

/** Conservative, pairwise proposals over personal meanings. Never creates a connection. */
export function deriveSimilarMeaningSuggestions(focal, items = [], { limit = 3 } = {}) {
  if (focal?.type !== "lexical" || !meaningGlosses(focal).length || limit <= 0) return [];
  const connected = new Set(connectionsFor(focal, items).map((row) => row.key));
  const focalHeading = normalize(focal.term).trim();
  const rows = [];

  for (const candidate of items) {
    if (candidate?.type !== "lexical" || candidate.id === focal.id || connected.has(candidate.id)) continue;
    if (normalize(candidate.term).trim() === focalHeading || !meaningGlosses(candidate).length) continue;

    const pairs = [];
    for (let focalIndex = 0; focalIndex < (focal.meanings || []).length; focalIndex += 1) {
      const focalMeaning = focal.meanings[focalIndex];
      if (!String(focalMeaning?.gloss || "").trim()) continue;
      for (let candidateIndex = 0; candidateIndex < (candidate.meanings || []).length; candidateIndex += 1) {
        const candidateMeaning = candidate.meanings[candidateIndex];
        if (!String(candidateMeaning?.gloss || "").trim()) continue;
        const evidence = compareMeaningPair(
          focal, focalMeaning, focalIndex, candidate, candidateMeaning, candidateIndex
        );
        if (evidence) pairs.push(evidence);
      }
    }
    pairs.sort(pairOrder);
    if (pairs[0]) rows.push({ item: candidate, evidence: pairs[0] });
  }

  return rows.sort((a, b) =>
    scoreOrder(a.evidence, b.evidence)
    || normalize(a.item.term).localeCompare(normalize(b.item.term))
    || a.item.id.localeCompare(b.item.id)
  ).slice(0, limit);
}
