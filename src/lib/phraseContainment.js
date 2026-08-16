import { getConjugations, getEntriesForForms, resolveEntry } from "../db/ref/entries.js";
import { matchTermInText, verbForms } from "./cloze.js";
import { normalize } from "./normalize.js";
import { connectionsFor } from "./relationships.js";

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

/** Exact-only fallback: no tentative pass ran, so nothing was suppressed. */
const exactOnlyOutcome = (rows) => ({ rows, tentative: null, profiles: new Map(), postings: new Map() });

/**
 * The full enrichment run, kept internal so the confirmation tier can see what the public
 * sequence discarded without forking it: `tentative` is the pre-oracle derivation and
 * `profiles`/`postings` carry the ambiguity evidence that separated it from `rows`.
 */
async function runFormProfileSequence(
  words,
  derive,
  {
    resolveEntries = defaultResolveEntries,
    getConjugations: loadConjugations = getConjugations,
    getFormEntries = getEntriesForForms,
  } = {}
) {
  const attached = words.filter((word) => word.dictKey);
  if (!attached.length) return exactOnlyOutcome(derive(new Map()));

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

    if (!profiles.size) return exactOnlyOutcome(derive(new Map()));
    const tentative = derive(profiles);
    const inferredSurfaces = [...new Set(
      tentative.filter((row) => row.matchKind === "inflected").map((row) => row.normalizedSurface)
    )];
    if (!inferredSurfaces.length) return { rows: tentative, tentative, profiles, postings: new Map() };

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
    return { rows: derive(profiles), tentative, profiles, postings };
  } catch {
    return exactOnlyOutcome(derive(new Map()));
  }
}

/**
 * Optional reference enrichment shared by lexical containment and prose containment.
 *
 * `derive` receives the current per-word form profiles and must return rows carrying
 * `matchKind` plus `normalizedSurface` for inferred matches. That small generic boundary keeps
 * reference resolution, conjugation loading, and the conservative ambiguity oracle in one
 * sequence. Every failure reruns the derivation without profiles, so personal exact matches
 * never depend on an installed dictionary.
 */
export async function prepareWithFormProfiles(words = [], derive, deps = {}) {
  const { rows } = await runFormProfileSequence(words, derive, deps);
  return rows;
}

const subjectWords = (subject, items) => isWord(subject)
  ? (eligibleWord(subject) ? [subject] : [])
  : isPhrase(subject)
    ? items.filter(eligibleWord)
    : [];

/**
 * Optional reference enrichment around the pure phrase derivation. Its public signature and
 * exact-only fallback remain unchanged; prepareWithFormProfiles merely owns the shared reads.
 */
export async function preparePhraseContainment(subject, items = [], deps = {}) {
  return prepareWithFormProfiles(
    subjectWords(subject, items),
    (profiles) => derivePhraseContainment(subject, items, profiles),
    deps
  );
}

/**
 * The inflected matches the ambiguity oracle suppressed, offered for explicit owner
 * confirmation rather than shown as derived facts. The conservative rule survives intact:
 * the app still asserts nothing here. A row qualifies only when the form posting names the
 * attached lemma among others — *creo* proposes *creer* against *crear*, while an empty or
 * mismatched posting stays fully silent, exactly as the Phase 22 record requires. Stop-word
 * surfaces never propose (normalized *dé* collides with the preposition *de*, which would
 * offer *dar* under every phrase containing *de*), already-connected pairs are excluded, and
 * any reference failure returns no candidates at all.
 */
export async function preparePhraseContainmentCandidates(subject, items = [], deps = {}) {
  const { tentative, profiles, postings } = await runFormProfileSequence(
    subjectWords(subject, items),
    (profiles) => derivePhraseContainment(subject, items, profiles),
    deps
  );
  if (!tentative || !profiles.size) return [];

  const connected = new Set(connectionsFor(subject, items).map((row) => row.key));
  const candidates = [];
  for (const row of tentative) {
    if (row.matchKind !== "inflected") continue;
    const profile = profiles.get(row.word.id);
    if (!profile?.ambiguousForms.has(row.normalizedSurface)) continue;
    if (CONTAINMENT_STOP_WORDS.has(row.normalizedSurface)) continue;
    if (connected.has(row.item.id)) continue;

    // One display lemma per normalized identity, so alias rows never repeat in evidence.
    const lemmasByNorm = new Map(
      (postings.get(row.normalizedSurface) || [])
        .map((entry) => [normalize(entry.lemma).trim(), entry.lemma])
        .filter(([norm]) => Boolean(norm))
    );
    if (!lemmasByNorm.has(profile.entryLemma)) continue;
    const competingLemmas = [...lemmasByNorm]
      .filter(([norm]) => norm !== profile.entryLemma)
      .map(([, lemma]) => lemma);
    if (!competingLemmas.length) continue;
    candidates.push({ ...row, competingLemmas });
  }
  return candidates;
}
