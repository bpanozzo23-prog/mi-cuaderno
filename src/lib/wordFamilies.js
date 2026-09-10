import {
  getConjugationPatternFamilies,
  getConjugations,
  installedMeta,
  resolveEntry,
} from "../db/ref/entries.js";
import { analyzeConjugationPatterns } from "./conjugationPatterns.js";
import {
  dictionaryKeysForItem,
  hasDictionaryAttachments,
  itemAttachesDictionaryEntry,
} from "./dictionaryAttachments.js";

/** Saved personal items attached to any loaded Phase 21 member, preserving notebook order. */
export function deriveSavedFamilySiblings(item, items = [], familyRows = [], previousIds = {}) {
  const memberIds = new Set(
    (familyRows || []).flatMap((row) => (row?.members || []).map((entry) => entry?.id).filter(Boolean))
  );
  if (!memberIds.size) return [];
  return items.filter((candidate) => {
    if (candidate?.type !== "lexical" || candidate.form !== "word" || candidate.id === item?.id || !hasDictionaryAttachments(candidate)) {
      return false;
    }
    return [...memberIds].some((memberId) => itemAttachesDictionaryEntry(candidate, memberId, previousIds));
  });
}

/**
 * One optional, read-only sequence shared by Wander and Historia.
 *
 * Attachments resolve through the alias map but are never healed here. Missing or incomplete
 * reference data is a normal absence: an older dictionary, interrupted family index, or failed
 * read simply produces no family section and never changes personal data.
 */
export async function prepareSavedConjugationFamily(
  item,
  items = [],
  {
    resolveReference = resolveEntry,
    loadConjugations = getConjugations,
    analyzePatterns = analyzeConjugationPatterns,
    loadFamilies = getConjugationPatternFamilies,
    loadMeta = installedMeta,
  } = {}
) {
  if (item?.type !== "lexical" || item.form !== "word" || !hasDictionaryAttachments(item)) return null;

  try {
    const resolved = await Promise.all(dictionaryKeysForItem(item).map((key) => resolveReference(key)));
    const entry = resolved.map((row) => row?.entry).find((candidate) => candidate?.conjugationId);
    if (!entry?.conjugationId) return null;

    const [conjugation] = await loadConjugations([entry.conjugationId]);
    if (!conjugation) return null;
    const analysis = analyzePatterns({ lemma: entry.lemma, conjugation });
    if (!analysis?.patternIds?.length) return null;

    const [familyRows, meta] = await Promise.all([
      loadFamilies(analysis.patternIds),
      loadMeta(),
    ]);
    const loadedCurrentFamily = (familyRows || []).some((row) =>
      (row?.members || []).some((member) => member?.id === entry.id)
    );
    if (!loadedCurrentFamily) return null;

    return {
      entry,
      siblings: deriveSavedFamilySiblings(
        item,
        items,
        familyRows,
        meta?.previousIds || {}
      ),
    };
  } catch {
    return null;
  }
}
