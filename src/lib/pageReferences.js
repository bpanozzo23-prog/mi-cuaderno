import { deriveCollection, NOT_GROUPED_LABEL } from "./collections.js";
import { grammarSectionBreadcrumb } from "./pageKinds.js";

const uniqueKeys = (keys = []) => [...new Set(keys || [])];

const pruneKeys = (keys, removed) => (keys || []).filter((key) => !removed.has(key));

/**
 * Counts every contextual reference that page-level vocabulary removal would clear. Collection
 * group placement counts separately from Source captures and Grammar examples so the confirmation
 * can explain the real impact, including references preserved inside disabled structures.
 */
export function vocabularyRemovalImpact(page, itemKey) {
  const groups = (page?.collection?.groups || []).filter((group) =>
    (group.itemKeys || []).includes(itemKey)
  ).length;
  const captures = (page?.source?.captures || []).filter((capture) =>
    (capture.itemKeys || []).includes(itemKey)
  ).length;
  let examples = 0;
  for (const section of page?.grammar?.sections || []) {
    examples += (section.examples || []).filter((example) =>
      (example.itemKeys || []).includes(itemKey)
    ).length;
  }
  return { groups, captures, examples, total: groups + captures + examples };
}

/** Removes contextual vocabulary placement while preserving all unrelated dormant structure. */
export function prunePageVocabularyReferences(page, removedItemKeys = []) {
  const removed = new Set(removedItemKeys || []);
  let changed = false;

  const groups = (page?.collection?.groups || []).map((group) => {
    const itemKeys = pruneKeys(group.itemKeys, removed);
    if (itemKeys.length !== (group.itemKeys || []).length) changed = true;
    return { ...group, itemKeys };
  });
  const captures = (page?.source?.captures || []).map((capture) => {
    const itemKeys = pruneKeys(capture.itemKeys, removed);
    if (itemKeys.length !== (capture.itemKeys || []).length) changed = true;
    return { ...capture, itemKeys };
  });
  const sections = (page?.grammar?.sections || []).map((section) => ({
    ...section,
    examples: (section.examples || []).map((example) => {
      const itemKeys = pruneKeys(example.itemKeys, removed);
      if (itemKeys.length !== (example.itemKeys || []).length) changed = true;
      return { ...example, itemKeys };
    }),
  }));

  return {
    changed,
    collection: { ...(page?.collection || {}), groups },
    source: { ...(page?.source || {}), captures },
    grammar: { ...(page?.grammar || {}), sections },
  };
}

/** Clears exact Grammar references to one capture without touching ordinary page connections. */
export function clearSourceCaptureReferences(page, sourcePageId, captureIds = []) {
  const removed = new Set(captureIds || []);
  let changed = false;
  const sections = (page?.grammar?.sections || []).map((section) => ({
    ...section,
    examples: (section.examples || []).map((example) => {
      const ref = example.sourceCaptureRef;
      if (!ref || ref.pageId !== sourcePageId || !removed.has(ref.captureId)) return { ...example };
      changed = true;
      return { ...example, sourceCaptureRef: null };
    }),
  }));
  return { changed, grammar: { ...(page?.grammar || {}), sections } };
}

/** Clears every exact Grammar reference to a page whose authoritative connection was removed. */
export function clearSourcePageReferences(page, sourcePageId) {
  let changed = false;
  const sections = (page?.grammar?.sections || []).map((section) => ({
    ...section,
    examples: (section.examples || []).map((example) => {
      const ref = example.sourceCaptureRef;
      if (!ref || ref.pageId !== sourcePageId) return { ...example };
      changed = true;
      return { ...example, sourceCaptureRef: null };
    }),
  }));
  return { changed, grammar: { ...(page?.grammar || {}), sections } };
}

const contextBase = (page, kind, label, detail = "") => ({
  page,
  pageId: page.id,
  pageTitle: page.title || "Untitled page",
  kind,
  label,
  detail,
});

/**
 * Active, user-visible contexts for one lexical item. Disabled structures are deliberately
 * ignored even though their arrays remain intact in the personal backup.
 */
export function activePageContextsForLexical(itemKey, items = []) {
  const contexts = [];
  for (const page of items) {
    if (page?.type !== "page") continue;
    const byKind = { source: [], grammar: [], vocabulary: [] };

    if (page.source?.enabled) {
      for (const capture of page.source.captures || []) {
        if (!(capture.itemKeys || []).includes(itemKey)) continue;
        const label = capture.type === "language_note"
          ? "Language note"
          : `${String(capture.type || "capture").charAt(0).toUpperCase()}${String(capture.type || "capture").slice(1)}`;
        byKind.source.push(contextBase(page, "source", label, capture.location || ""));
      }
    }

    if (page.grammar?.enabled) {
      for (const section of page.grammar.sections || []) {
        for (const example of section.examples || []) {
          if (!(example.itemKeys || []).includes(itemKey)) continue;
          byKind.grammar.push(contextBase(
            page,
            "grammar",
            "Grammar example",
            grammarSectionBreadcrumb(section, page.grammar.sections)
          ));
        }
      }
    }

    if (page.collection?.enabled) {
      const collection = deriveCollection(page, items);
      if (!collection.memberKeys.includes(itemKey)) continue;
      const group = collection.groups.find((candidate) => candidate.itemKeys.includes(itemKey));
      byKind.vocabulary.push(contextBase(page, "vocabulary", "Vocabulary", group?.name || NOT_GROUPED_LABEL));
    }

    const order = page.pageFocus === "vocabulary"
      ? ["vocabulary", "source", "grammar"]
      : page.pageFocus === "grammar"
        ? ["grammar", "vocabulary", "source"]
        : ["source", "vocabulary", "grammar"];
    for (const kind of order) contexts.push(...byKind[kind]);
  }
  return contexts;
}

/** Active vocabulary keys with deterministic de-duplication for search and summaries. */
export function activePageVocabularyKeys(page, items = []) {
  const keys = [];
  if (page?.collection?.enabled) keys.push(...deriveCollection(page, items).memberKeys);
  if (page?.source?.enabled) {
    for (const capture of page.source.captures || []) keys.push(...(capture.itemKeys || []));
  }
  if (page?.grammar?.enabled) {
    for (const section of page.grammar.sections || []) {
      for (const example of section.examples || []) keys.push(...(example.itemKeys || []));
    }
  }
  return uniqueKeys(keys);
}
