import { activeDb, getMeta, META_KEYS } from "./refdb.js";
import { allTenses, HABER_CONJUGATION_ID } from "../../lib/conjugation.js";
import { normalize } from "../../lib/normalize.js";

/**
 * Reading the reference layer.
 *
 * Everything here returns empty rather than throwing when no dictionary is installed —
 * the notebook works fully without one (§11), so "not installed" is a normal state, not
 * an error the callers should each have to handle.
 */

export const isDictKey = (key) => typeof key === "string" && key.startsWith("dict:");

export async function dictionaryInstalled() {
  return Boolean(await installedMeta());
}

export async function installedMeta() {
  const db = activeDb();
  if (!db) return null;
  return getMeta(db, META_KEYS.dataset, null);
}

export async function getEntry(id) {
  const db = activeDb();
  if (!db || !id) return null;
  return (await db.entries.get(id)) || null;
}

export async function getEntries(ids) {
  const db = activeDb();
  if (!db || !ids?.length) return [];
  return (await db.entries.bulkGet(ids)).filter(Boolean);
}

/**
 * Resolves a dict: key through the alias map when the entry itself is gone (§6).
 *
 * A dataset rebuild can change an entry's canonical id. §5 says a personal item whose
 * reference vanished keeps working and can be re-attached; this is the first thing tried,
 * so most such items silently keep their link instead of ever looking orphaned.
 */
export async function resolveEntry(key) {
  const direct = await getEntry(key);
  if (direct) return { entry: direct, resolvedFrom: null };

  const meta = await installedMeta();
  const alias = meta?.previousIds?.[key];
  if (alias) {
    const entry = await getEntry(alias);
    if (entry) return { entry, resolvedFrom: key };
  }
  return { entry: null, resolvedFrom: null };
}

let haberCache = null;

/** haber's table, cached — every perfect tense of every verb is composed from it. */
async function haberTable() {
  const db = activeDb();
  if (!db) return null;
  if (haberCache?.db === db) return haberCache.table;
  const table = (await db.conjugations.get(HABER_CONJUGATION_ID)) || null;
  haberCache = { db, table };
  return table;
}

/**
 * A verb's full conjugation: the simple tenses as stored, plus the eight perfect tenses
 * composed from haber (see src/lib/conjugation.js for why they are not shipped).
 */
export async function getConjugation(conjugationId) {
  const db = activeDb();
  if (!db || !conjugationId) return null;
  const table = await db.conjugations.get(conjugationId);
  if (!table) return null;
  return { ...table, tenses: allTenses(table, await haberTable()) };
}

/** Full conjugations in one IndexedDB read, aligned with the requested ids. */
export async function getConjugations(conjugationIds) {
  const db = activeDb();
  if (!db || !conjugationIds?.length) return [];
  const validIds = [...new Set(conjugationIds.filter(Boolean))];
  const loaded = await db.conjugations.bulkGet(validIds);
  const byId = new Map(validIds.map((id, index) => [id, loaded[index] || null]));
  const haber = await haberTable();
  return conjugationIds.map((id) => {
    const table = byId.get(id);
    return table ? { ...table, tenses: allTenses(table, haber) } : null;
  });
}

const exactLemma = (value) => String(value || "").trim().normalize("NFC").toLowerCase();

/**
 * Resolves curated verbs through the lemma form index instead of assuming dictionary ids.
 * Results stay aligned with `lemmas`; an ambiguous or missing lemma is explicitly
 * unavailable, never guessed from an inflected-form match.
 */
export async function resolveVerbEntriesByLemma(lemmas) {
  const db = activeDb();
  if (!db || !lemmas?.length) return (lemmas || []).map((lemma) => ({ lemma, entry: null }));

  const requested = lemmas.map((lemma) => ({
    lemma: String(lemma || "").trim().normalize("NFC"),
    normalized: normalize(lemma),
  }));
  const shardIds = [...new Set(requested.map(({ normalized }) => normalized.slice(0, 2) || "_"))];
  const shards = (await db.formShards.bulkGet(shardIds)).filter(Boolean);
  const termsByShard = new Map(shards.map((row) => [row.id, row.terms || {}]));
  const postings = requested.map(({ normalized }) =>
    termsByShard.get(normalized.slice(0, 2) || "_")?.[normalized] || []
  );
  const entryIds = [...new Set(postings.flat())];
  const entries = await db.entries.bulkGet(entryIds);
  const byId = new Map(entries.filter(Boolean).map((entry) => [entry.id, entry]));

  return requested.map(({ lemma }, index) => {
    const matches = postings[index]
      .map((id) => byId.get(id))
      .filter((entry) =>
        entry?.pos === "verb" && entry.conjugationId && exactLemma(entry.lemma) === exactLemma(lemma)
      );
    return { lemma, entry: matches.length === 1 ? matches[0] : null };
  });
}

/** Curated lemma resolution plus one batched conjugation read, for a Gym pool. */
export async function getVerbTablesByLemma(lemmas) {
  const resolved = await resolveVerbEntriesByLemma(lemmas);
  const ids = resolved.map(({ entry }) => entry?.conjugationId || null);
  const tables = await getConjugations(ids);
  return resolved.map(({ lemma, entry }, index) => ({
    lemma,
    entry,
    conjugation: entry ? tables[index] : null,
    available: Boolean(entry && tables[index]),
  }));
}

/** Entry plus its conjugation in one call, for the detail screen. */
export async function getEntryWithConjugation(id) {
  const entry = await getEntry(id);
  if (!entry) return null;
  const conjugation = entry.conjugationId ? await getConjugation(entry.conjugationId) : null;
  return { ...entry, conjugation };
}

/**
 * Materializes an example's full attribution (§4). The license and URL are constants
 * recorded once in the manifest rather than duplicated across 56,420 sentence sides; this
 * is where they are put back together for display.
 */
export function exampleAttribution(example, meta) {
  const [es, en, sourceId, contributor, englishSourceId, englishContributor] = example;
  const cfg = meta?.attribution?.examples || {};
  const url = (id) =>
    id && cfg.urlTemplate ? cfg.urlTemplate.replace("{id}", String(id).replace(cfg.idPrefix || "", "")) : null;
  return {
    es,
    en,
    license: cfg.license || null,
    spanish: { sourceId, contributor, url: url(sourceId) },
    english: { sourceId: englishSourceId, contributor: englishContributor, url: url(englishSourceId) },
  };
}

/** Called after an install or removal, since the cached table belongs to the old slot. */
export function forgetCaches() {
  haberCache = null;
}
