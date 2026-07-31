import { activeDb } from "./refdb.js";
import { normalize } from "../../lib/normalize.js";
import { TIER } from "../../lib/search.js";

/**
 * Searching the reference layer, using the same §8 tiers as the personal layer so the two
 * result lists can be interleaved rather than stacked.
 *
 *   1 exact Spanish term        the query, spelled exactly as the lemma is
 *   2 accent-normalized term    "saco" finding "sacó"; also prefix matches
 *   3 inflected-form alias      "fui" → ir and ser — the tier Phase 1 held open
 *   4 English gloss             "take out" → sacar, a first-class path
 *
 * Tier 3 is what the whole form index exists for. It is not a fuzzy match: the pipeline
 * harvested every inflected form Wiktionary lists, so "tuvimos" resolves to *tener*
 * because Wiktionary says it does, not because the strings look alike.
 *
 * Every lookup is a primary-key read of one pre-sharded row. Nothing here scans.
 */

/** Prefix search needs at least two characters — one character is every shard in the index. */
const MIN_PREFIX = 2;
const MAX_PREFIX_KEYS = 300;
const DEFAULT_LIMIT = 20;

const shardKeyFor = (term) => term.slice(0, 2) || "_";

const REASONS = {
  exact: "exact match",
  accents: "ignoring accents",
  startsWith: "starts with your search",
  english: "English meaning",
  formOf: (lemma) => `form of ${lemma}`,
};

async function readShard(db, store, term) {
  const row = await db[store].get(shardKeyFor(term));
  return row?.terms || null;
}

/**
 * Entries whose stored forms include this exact normalized term, tagged with which tier
 * the match belongs to: the lemma itself (1 or 2) or one of its inflections (3).
 */
async function matchByForm(db, query) {
  const q = normalize(query);
  const terms = await readShard(db, "formShards", q);
  const ids = terms?.[q];
  if (!ids?.length) return [];

  const entries = (await db.entries.bulkGet(ids)).filter(Boolean);
  const typed = query.trim().toLowerCase();

  return entries.map((entry) => {
    const lemma = entry.lemma.toLowerCase();
    if (lemma === typed) return { entry, tier: TIER.exactTerm, reason: REASONS.exact, offset: 0 };
    if (normalize(entry.lemma) === q) return { entry, tier: TIER.normalizedTerm, reason: REASONS.accents, offset: 0 };
    // The matched form is not the lemma, so this is an inflection — brief §8 tier 3.
    return { entry, tier: TIER.inflectedForm, reason: REASONS.formOf(entry.lemma), offset: 0 };
  });
}

/**
 * Entries whose lemma starts with the query. The shard is keyed on the first two letters,
 * so it already holds every candidate — which is why no separate prefix index is needed.
 */
async function matchByPrefix(db, query) {
  const q = normalize(query);
  if (q.length < MIN_PREFIX) return [];
  const terms = await readShard(db, "formShards", q);
  if (!terms) return [];

  const ids = new Set();
  let scanned = 0;
  for (const term of Object.keys(terms)) {
    if (!term.startsWith(q) || term === q) continue;
    if (++scanned > MAX_PREFIX_KEYS) break;
    for (const id of terms[term]) ids.add(id);
  }
  if (!ids.size) return [];

  const entries = (await db.entries.bulkGet([...ids])).filter(Boolean);
  return entries
    // Only the lemma starting with the query counts. Without this, typing "sac" would
    // surface every verb with an inflection beginning "sac", which is not what the
    // owner meant and buries sacar under its own conjugations.
    .filter((entry) => normalize(entry.lemma).startsWith(q))
    .map((entry) => ({ entry, tier: TIER.normalizedTerm, reason: REASONS.startsWith, offset: 1 }));
}

/**
 * Entries whose English gloss contains every word of the query (brief §8 tier 4).
 * Intersecting the words' postings is what makes "take out" find *sacar* rather than
 * everything that means "take" or "out".
 */
async function matchByEnglish(db, query) {
  const words = query.toLowerCase().split(/[^a-z0-9']+/i).filter((w) => w.length >= 2);
  if (!words.length) return [];

  let ids = null;
  for (const word of words) {
    const terms = await readShard(db, "englishShards", word);
    const posting = new Set(terms?.[word] || []);
    if (!posting.size) return [];
    ids = ids === null ? posting : new Set([...ids].filter((id) => posting.has(id)));
    if (!ids.size) return [];
  }

  const entries = (await db.entries.bulkGet([...ids])).filter(Boolean);
  const phrase = query.trim().toLowerCase();

  return entries.map((entry) => {
    // A gloss containing the whole phrase is a better answer than one that merely
    // contains the words scattered, so it sorts first within the tier.
    const exactPhrase = entry.senses.some((s) => s.gloss.toLowerCase().includes(phrase));
    return { entry, tier: TIER.translation, reason: REASONS.english, offset: exactPhrase ? 0 : 1 };
  });
}

/**
 * One ranked list of dictionary results. Returns [] when no dictionary is installed —
 * the notebook works without one, so that is a normal state rather than an error.
 */
export async function searchDictionary(query, { limit = DEFAULT_LIMIT } = {}) {
  const db = activeDb();
  const trimmed = (query || "").trim();
  if (!db || !trimmed) return [];

  const groups = await Promise.all([
    matchByForm(db, trimmed),
    matchByPrefix(db, trimmed),
    matchByEnglish(db, trimmed),
  ]);

  // An entry can match several ways at once ("casa" is both a lemma and, for some other
  // verb, an inflection). Keep the best tier for each, so nothing appears twice.
  const best = new Map();
  for (const match of groups.flat()) {
    const existing = best.get(match.entry.id);
    if (!existing || match.tier < existing.tier || (match.tier === existing.tier && match.offset < existing.offset)) {
      best.set(match.entry.id, match);
    }
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        a.offset - b.offset ||
        (a.entry.freqRank ?? 1e9) - (b.entry.freqRank ?? 1e9) ||
        a.entry.lemma.localeCompare(b.entry.lemma)
    )
    .slice(0, limit);
}
