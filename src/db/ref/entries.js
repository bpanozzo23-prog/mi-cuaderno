import { activeDb, getMeta, META_KEYS } from "./refdb.js";
import { allTenses, HABER_CONJUGATION_ID } from "../../lib/conjugation.js";

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
