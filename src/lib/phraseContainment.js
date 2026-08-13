import { getConjugations, getEntriesForForms, resolveEntry } from "../db/ref/entries.js";
import { matchTermInText, verbForms } from "./cloze.js";
import { normalize } from "./normalize.js";

/** Fixed v1 noise rule from the approved Phase 22 direction. */
export const CONTAINMENT_STOP_WORDS = new Set([
  "a", "al", "con", "de", "del", "e", "el", "en", "la", "las", "le", "les", "lo", "los",
  "me", "nos", "o", "os", "para", "por", "que", "se", "sin", "te", "u", "un", "una",
  "unos", "unas", "y",
]);

const isWord = (item) => item?.type === "lexical" && item.form === "word";
const isPhrase = (item) => item?.type === "lexical" && item.form === "phrase";
const eligibleWord = (item) => isWord(item) && !CONTAINMENT_STOP_WORDS.has(normalize(item.term).trim());

function tentativeMatch(word, phrase, profiles) {
  if (!eligibleWord(word) || !isPhrase(phrase)) return null;
  const profile = profiles.get(word.id) || {};
  const match = matchTermInText(phrase.term, { term: word.term, forms: profile.forms });
  if (!match) return null;
  if (match.kind === "inflected" && profile.ambiguousForms?.has(match.normalizedSurface)) return null;
  return {
    item: phrase,
    word,
    phrase,
    surface: match.surface,
    normalizedSurface: match.normalizedSurface,
    matchKind: match.kind,
  };
}

/**
 * Read-only containment from one lexical detail's perspective. Item order is display order.
 */
export function derivePhraseContainment(subject, items = [], profiles = new Map()) {
  if (isWord(subject)) {
    if (!eligibleWord(subject)) return [];
    return items
      .filter(isPhrase)
      .map((candidate) => tentativeMatch(subject, candidate, profiles))
      .filter(Boolean);
  }
  if (isPhrase(subject)) {
    return items
      .filter(eligibleWord)
      .map((candidate) => tentativeMatch(candidate, subject, profiles))
      .filter(Boolean)
      .map((row) => ({ ...row, item: row.word }));
  }
  return [];
}

const defaultResolveEntries = (keys) => Promise.all(keys.map((key) => resolveEntry(key)));

/**
 * Optional reference enrichment around the pure derivation. Every failure returns exact-only
 * personal matches; detail navigation must never depend on an installed dictionary.
 */
export async function preparePhraseContainment(
  subject,
  items = [],
  {
    resolveEntries = defaultResolveEntries,
    getConjugations: loadConjugations = getConjugations,
    getFormEntries = getEntriesForForms,
  } = {}
) {
  const words = isWord(subject)
    ? (eligibleWord(subject) ? [subject] : [])
    : isPhrase(subject)
      ? items.filter(eligibleWord)
      : [];
  const attached = words.filter((word) => word.dictKey);
  if (!attached.length) return derivePhraseContainment(subject, items);

  try {
    const resolved = await resolveEntries(attached.map((word) => word.dictKey));
    const enriched = attached.map((word, index) => ({ word, entry: resolved[index]?.entry || null }));
    const conjugationIds = enriched.map(({ entry }) => entry?.conjugationId || null);
    const tables = await loadConjugations(conjugationIds);
    const profiles = new Map();
    for (let index = 0; index < enriched.length; index += 1) {
      const { word, entry } = enriched[index];
      const table = tables[index];
      if (!entry || !table) continue;
      profiles.set(word.id, {
        forms: verbForms(table),
        ambiguousForms: new Set(),
        entryLemma: normalize(entry.lemma).trim(),
      });
    }

    if (!profiles.size) return derivePhraseContainment(subject, items);
    const tentative = derivePhraseContainment(subject, items, profiles);
    const inferredSurfaces = [...new Set(
      tentative.filter((row) => row.matchKind === "inflected").map((row) => row.normalizedSurface)
    )];
    if (!inferredSurfaces.length) return tentative;

    const postings = await getFormEntries(inferredSurfaces);
    for (const profile of profiles.values()) {
      for (const surface of inferredSurfaces) {
        const distinctLemmas = new Set(
          (postings.get(surface) || []).map((entry) => normalize(entry.lemma).trim()).filter(Boolean)
        );
        if (distinctLemmas.size !== 1 || !distinctLemmas.has(profile.entryLemma)) {
          profile.ambiguousForms.add(surface);
        }
      }
    }
    return derivePhraseContainment(subject, items, profiles);
  } catch {
    return derivePhraseContainment(subject, items);
  }
}
