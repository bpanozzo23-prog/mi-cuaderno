import {
  dictionaryInstalled,
  getConjugations,
  getVerbTablesByLemma,
  resolveEntry,
} from "./entries.js";
import { CURATED_GYM_LEMMAS, verbKeyForLemma } from "../../lib/conjugationGym.js";
import { dictionaryKeysForItem, hasDictionaryAttachments } from "../../lib/dictionaryAttachments.js";

/**
 * Loads the Gym's optional dictionary-backed library after the owner opens it.
 * Personal items stay the action identity; lemma keys are only the performance identity.
 */
export async function loadGymLibrary(items) {
  if (!(await dictionaryInstalled())) {
    return { installed: false, saved: [], core: [], unavailableCore: [...CURATED_GYM_LEMMAS] };
  }

  const attached = (items || [])
    .filter((item) => item.type === "lexical" && hasDictionaryAttachments(item));
  const resolvedSaved = await Promise.all(
    attached.map(async (item) => {
      const resolved = await Promise.all(dictionaryKeysForItem(item).map((key) => resolveEntry(key)));
      const entries = resolved.map((row) => row.entry).filter(Boolean);
      return { item, entries, entry: entries.find((candidate) => candidate.conjugationId) || null };
    })
  );
  const conjugableSaved = resolvedSaved.filter((row) => row.entry?.conjugationId);
  const savedTables = await getConjugations(conjugableSaved.map((row) => row.entry.conjugationId));
  const saved = conjugableSaved
    .map((row, index) => ({
      itemId: row.item.id,
      itemKey: row.item.id,
      dictKey: row.entry.id,
      entry: row.entry,
      source: "saved",
      curriculum: null,
      lemma: row.entry.lemma,
      term: row.item.term || row.entry.lemma,
      verbKey: verbKeyForLemma(row.entry.lemma),
      conjugation: savedTables[index],
      openKey: row.item.id,
    }))
    .filter((row) => row.conjugation);

  // Core answers attach to a personal item only when exactly one surviving lexical item
  // resolves to that same current entry. Zero or several is deliberately `null`.
  const personalByEntry = new Map();
  for (const { item, entries } of resolvedSaved) {
    for (const entry of entries) {
      if (!entry?.id) continue;
      const list = personalByEntry.get(entry.id) || [];
      list.push(item.id);
      personalByEntry.set(entry.id, list);
    }
  }

  const resolvedCore = await getVerbTablesByLemma(CURATED_GYM_LEMMAS);
  const core = resolvedCore
    .filter((row) => row.available)
    .map(({ lemma, entry, conjugation }) => {
      const attachedItems = personalByEntry.get(entry.id) || [];
      const itemKey = attachedItems.length === 1 ? attachedItems[0] : null;
      return {
        itemId: itemKey,
        itemKey,
        dictKey: entry.id,
        entry,
        source: "core",
        curriculum: null,
        lemma,
        term: lemma,
        verbKey: verbKeyForLemma(lemma),
        conjugation,
        openKey: itemKey || entry.id,
      };
    });

  return {
    installed: true,
    saved,
    core,
    unavailableCore: resolvedCore.filter((row) => !row.available).map((row) => row.lemma),
  };
}
