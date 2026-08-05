import { db } from "./db.js";
import { EVENT_TYPES, logEvent } from "./events.js";
import { createItem, newPage } from "./items.js";
import { nowIso } from "../lib/dates.js";
import { newPageGroup } from "../lib/collections.js";
import {
  PAGE_FOCUSES,
  emptyGrammar,
  emptySource,
  hasEnabledStructuredCapability,
  isPageFocus,
  isPageFocusEnabled,
  newGrammarExample,
  newGrammarSection,
  newSourceCapture,
  validatePageStructures,
} from "../lib/pageKinds.js";
import { isGrammarExampleKey, isGrammarSectionKey, isSourceCaptureKey } from "../lib/ids.js";
import {
  clearSourceCaptureReferences,
  clearSourcePageReferences,
} from "../lib/pageReferences.js";
import {
  annotationForTarget,
  makeLinkAnnotation,
  reorientRelationship,
} from "../lib/relationships.js";

const assertPage = (page, pageId) => {
  if (!page || page.type !== "page") throw new Error(`Page ${pageId} does not exist.`);
  return page;
};

const clonePage = (page) => ({
  ...page,
  linkedKeys: [...(page.linkedKeys || [])],
  linkAnnotations: [...(page.linkAnnotations || [])],
  collection: {
    ...(page.collection || {}),
    groups: (page.collection?.groups || []).map((group) => ({ ...group, itemKeys: [...(group.itemKeys || [])] })),
  },
  source: {
    ...(page.source || emptySource()),
    captures: (page.source?.captures || []).map((capture) => ({ ...capture, itemKeys: [...(capture.itemKeys || [])] })),
  },
  grammar: {
    ...(page.grammar || emptyGrammar()),
    sections: (page.grammar?.sections || []).map((section) => ({
      ...section,
      examples: (section.examples || []).map((example) => ({
        ...example,
        itemKeys: [...(example.itemKeys || [])],
        sourceCaptureRef: example.sourceCaptureRef ? { ...example.sourceCaptureRef } : null,
      })),
    })),
  },
});

const validateNextPage = (page) => {
  const errors = validatePageStructures(page);
  if (errors.length) throw new Error(errors[0]);
};

const putExplicitEdit = async (page) => {
  const next = { ...page, updatedAt: nowIso() };
  validateNextPage(next);
  await db.items.put(next);
  await logEvent(EVENT_TYPES.edit, next.id);
  return next;
};

const withoutAnnotation = (item, targetKey) =>
  (item.linkAnnotations || []).filter((annotation) => annotation?.targetKey !== targetKey);

async function ensureOutgoingPageConnection(page, sourcePageId) {
  if (sourcePageId === page.id) return page;
  const sourcePage = assertPage(await db.items.get(sourcePageId), sourcePageId);
  const alreadyOutgoing = (page.linkedKeys || []).includes(sourcePageId);
  let annotation = null;

  // Old reciprocal edges can survive from a pre-invariant backup. An exact reference makes the
  // Grammar page the one authoritative owner, so remove the reverse copy even when the desired
  // outgoing edge already exists. This automatic cleanup is timestamp- and event-neutral.
  if ((sourcePage.linkedKeys || []).includes(page.id)) {
    annotation = annotationForTarget(sourcePage, page.id);
    await db.items.put({
      ...sourcePage,
      linkedKeys: sourcePage.linkedKeys.filter((key) => key !== page.id),
      linkAnnotations: withoutAnnotation(sourcePage, page.id),
    });
  }

  const nextAnnotations = [...(page.linkAnnotations || [])];
  if (annotation && !nextAnnotations.some((candidate) => candidate?.targetKey === sourcePageId)) {
    const moved = makeLinkAnnotation(sourcePageId, reorientRelationship(annotation));
    if (moved) nextAnnotations.push(moved);
  }
  return {
    ...page,
    linkedKeys: alreadyOutgoing ? [...(page.linkedKeys || [])] : [...(page.linkedKeys || []), sourcePageId],
    linkAnnotations: nextAnnotations,
  };
}

function assertLinkedLexicalKeys(page, itemKeys, allItems) {
  const byId = new Map(allItems.map((item) => [item.id, item]));
  const linked = new Set(page.linkedKeys || []);
  for (const key of itemKeys || []) {
    if (byId.get(key)?.type !== "lexical" || !linked.has(key)) {
      throw new Error("Contextual vocabulary must already be linked to this page.");
    }
  }
}

export async function savePageConfiguration(pageId, {
  pageFocus,
  collectionEnabled,
  sourceEnabled,
  grammarEnabled,
} = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const current = assertPage(await db.items.get(pageId), pageId);
    const next = clonePage(current);
    if (typeof collectionEnabled === "boolean") next.collection.enabled = collectionEnabled;
    if (typeof sourceEnabled === "boolean") next.source.enabled = sourceEnabled;
    if (typeof grammarEnabled === "boolean") next.grammar.enabled = grammarEnabled;

    const requestedFocus = isPageFocus(pageFocus) ? pageFocus : next.pageFocus;
    next.pageFocus = isPageFocusEnabled(requestedFocus, next) ? requestedFocus : PAGE_FOCUSES.notes;

    const unchanged = next.pageFocus === current.pageFocus
      && next.collection.enabled === current.collection?.enabled
      && next.source.enabled === current.source?.enabled
      && next.grammar.enabled === current.grammar?.enabled;
    if (unchanged) {
      result = { page: current, changed: false, movesToJournal: false };
      return;
    }
    const saved = await putExplicitEdit(next);
    result = {
      page: saved,
      changed: true,
      movesToJournal: Boolean(saved.pageDate) && !hasEnabledStructuredCapability(saved),
    };
  });
  return result;
}

export async function savePageFocus(pageId, pageFocus) {
  if (!isPageFocus(pageFocus)) throw new Error("Page focus is not supported.");
  const page = assertPage(await db.items.get(pageId), pageId);
  if (!isPageFocusEnabled(pageFocus, page)) {
    throw new Error("Page focus requires its structure to be enabled.");
  }
  return savePageConfiguration(pageId, { pageFocus });
}

export async function copyPageStructure(sourcePageId, { title } = {}) {
  const sourcePage = assertPage(await db.items.get(sourcePageId), sourcePageId);
  const copiedTitle = String(title || "").trim();
  if (!copiedTitle) throw new Error("A copied page needs a title.");

  const collection = {
    enabled: sourcePage.collection?.enabled === true,
    groups: (sourcePage.collection?.groups || []).map((group) => newPageGroup(group.name)),
  };
  const source = emptySource({ enabled: sourcePage.source?.enabled === true });
  const grammar = emptyGrammar({
    enabled: sourcePage.grammar?.enabled === true,
    sections: (sourcePage.grammar?.sections || []).map((section) => newGrammarSection({ name: section.name })),
  });
  const created = newPage({
    title: copiedTitle,
    pageFocus: sourcePage.pageFocus,
    collection,
    source,
    grammar,
  });
  await createItem(created);
  return created;
}

export async function saveSourceDetails(pageId, fields = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.source.enabled) throw new Error("Enable Source notebook before editing its details.");
    page.source = {
      ...page.source,
      format: fields.format ?? page.source.format,
      creator: fields.creator ?? page.source.creator,
      scope: fields.scope ?? page.source.scope,
      url: fields.url == null ? page.source.url : String(fields.url).trim(),
      context: fields.context ?? page.source.context,
    };
    result = await putExplicitEdit(page);
  });
  return result;
}

export async function saveSourceCapture(pageId, draft = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.source.enabled) throw new Error("Enable Source notebook before saving captures.");
    const all = await db.items.toArray();
    const captureId = draft.id || null;
    const capture = captureId
      ? {
          ...page.source.captures.find((candidate) => candidate.id === captureId),
          ...draft,
          id: captureId,
          text: String(draft.text || "").trim(),
          itemKeys: [...(draft.itemKeys || [])],
        }
      : newSourceCapture({
          ...draft,
          text: String(draft.text || "").trim(),
          itemKeys: [...(draft.itemKeys || [])],
        });
    if (captureId && !isSourceCaptureKey(captureId)) throw new Error("Source capture ID is invalid.");
    const index = captureId
      ? page.source.captures.findIndex((candidate) => candidate.id === captureId)
      : -1;
    if (captureId && index < 0) throw new Error("Source capture does not exist.");
    assertLinkedLexicalKeys(page, capture.itemKeys, all);
    if (index < 0) page.source.captures.push(capture);
    else page.source.captures[index] = capture;
    result = { page: await putExplicitEdit(page), capture };
  });
  return result;
}

export async function saveSourceCaptureOrder(pageId, captureIds = []) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.source.enabled) throw new Error("Enable Source notebook before organizing captures.");
    const byId = new Map(page.source.captures.map((capture) => [capture.id, capture]));
    if (captureIds.length !== byId.size || new Set(captureIds).size !== byId.size || captureIds.some((id) => !byId.has(id))) {
      throw new Error("Capture organization must include every current capture exactly once.");
    }
    page.source.captures = captureIds.map((id) => byId.get(id));
    result = await putExplicitEdit(page);
  });
  return result;
}

export async function deleteSourceCapture(pageId, captureId) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const pages = (await db.items.toArray()).filter((item) => item.type === "page");
    const page = clonePage(assertPage(pages.find((item) => item.id === pageId), pageId));
    if (!page.source.enabled) throw new Error("Enable Source notebook before deleting captures.");
    const before = page.source.captures.length;
    page.source.captures = page.source.captures.filter((capture) => capture.id !== captureId);
    if (page.source.captures.length === before) throw new Error("Source capture does not exist.");
    result = await putExplicitEdit(page);

    for (const candidate of pages) {
      const cleared = clearSourceCaptureReferences(candidate, pageId, [captureId]);
      if (cleared.changed) await db.items.update(candidate.id, { grammar: cleared.grammar });
    }
  });
  return result;
}

export async function saveGrammarDetails(pageId, { keyIdea } = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.grammar.enabled) throw new Error("Enable Grammar guide before editing it.");
    page.grammar.keyIdea = keyIdea ?? page.grammar.keyIdea;
    result = await putExplicitEdit(page);
  });
  return result;
}

export async function saveGrammarSection(pageId, draft = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.grammar.enabled) throw new Error("Enable Grammar guide before editing sections.");
    const sectionId = draft.id || null;
    const index = sectionId
      ? page.grammar.sections.findIndex((section) => section.id === sectionId)
      : -1;
    if (sectionId && (!isGrammarSectionKey(sectionId) || index < 0)) throw new Error("Grammar section does not exist.");
    const current = index >= 0 ? page.grammar.sections[index] : null;
    const section = current
      ? {
          ...current,
          name: String(draft.name ?? current.name).trim(),
          explanation: draft.explanation ?? current.explanation,
          pattern: draft.pattern ?? current.pattern,
        }
      : newGrammarSection(draft);
    if (index < 0) page.grammar.sections.push(section);
    else page.grammar.sections[index] = section;
    result = { page: await putExplicitEdit(page), section };
  });
  return result;
}

export async function deleteGrammarSection(pageId, sectionId) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.grammar.enabled) throw new Error("Enable Grammar guide before deleting sections.");
    const section = page.grammar.sections.find((candidate) => candidate.id === sectionId);
    if (!section) throw new Error("Grammar section does not exist.");
    if ((section.examples || []).length) throw new Error("Move or delete this section’s examples first.");
    page.grammar.sections = page.grammar.sections.filter((candidate) => candidate.id !== sectionId);
    result = await putExplicitEdit(page);
  });
  return result;
}

export async function saveGrammarExample(pageId, sectionId, draft = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    let page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.grammar.enabled) throw new Error("Enable Grammar guide before saving examples.");
    const all = await db.items.toArray();
    const sectionIndex = page.grammar.sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex < 0) throw new Error("Grammar section does not exist.");
    const exampleId = draft.id || null;
    const exampleIndex = exampleId
      ? page.grammar.sections[sectionIndex].examples.findIndex((example) => example.id === exampleId)
      : -1;
    if (exampleId && (!isGrammarExampleKey(exampleId) || exampleIndex < 0)) throw new Error("Grammar example does not exist.");
    const sourceCaptureRef = draft.sourceCaptureRef || null;
    if (sourceCaptureRef) {
      const sourcePage = assertPage(all.find((item) => item.id === sourceCaptureRef.pageId), sourceCaptureRef.pageId);
      if (!(sourcePage.source?.captures || []).some((capture) => capture.id === sourceCaptureRef.captureId)) {
        throw new Error("Related Source capture does not exist.");
      }
      if (sourceCaptureRef.pageId !== page.id) page = await ensureOutgoingPageConnection(page, sourceCaptureRef.pageId);
    }
    const current = exampleIndex >= 0 ? page.grammar.sections[sectionIndex].examples[exampleIndex] : null;
    const example = current
      ? {
          ...current,
          ...draft,
          id: exampleId,
          es: String(draft.es ?? current.es).trim(),
          itemKeys: [...(draft.itemKeys || [])],
          sourceCaptureRef,
        }
      : newGrammarExample({
          ...draft,
          es: String(draft.es || "").trim(),
          itemKeys: [...(draft.itemKeys || [])],
          sourceCaptureRef,
        });
    assertLinkedLexicalKeys(page, example.itemKeys, all);
    if (exampleIndex < 0) page.grammar.sections[sectionIndex].examples.push(example);
    else page.grammar.sections[sectionIndex].examples[exampleIndex] = example;
    result = { page: await putExplicitEdit(page), example };
  });
  return result;
}

export async function deleteGrammarExample(pageId, sectionId, exampleId) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.grammar.enabled) throw new Error("Enable Grammar guide before deleting examples.");
    const section = page.grammar.sections.find((candidate) => candidate.id === sectionId);
    if (!section) throw new Error("Grammar section does not exist.");
    const before = section.examples.length;
    section.examples = section.examples.filter((example) => example.id !== exampleId);
    if (section.examples.length === before) throw new Error("Grammar example does not exist.");
    result = await putExplicitEdit(page);
  });
  return result;
}

export async function saveGrammarOrganization(pageId, sections = []) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const page = clonePage(assertPage(await db.items.get(pageId), pageId));
    if (!page.grammar.enabled) throw new Error("Enable Grammar guide before organizing it.");
    const currentSectionIds = new Set(page.grammar.sections.map((section) => section.id));
    const currentExampleIds = new Set(page.grammar.sections.flatMap((section) => section.examples.map((example) => example.id)));
    const nextSectionIds = sections.map((section) => section?.id);
    const nextExampleIds = sections.flatMap((section) => (section.examples || []).map((example) => example.id));
    const nextSectionIdSet = new Set(nextSectionIds);
    if (nextSectionIdSet.size !== nextSectionIds.length || nextSectionIds.some((id) => !isGrammarSectionKey(id))) {
      throw new Error("Grammar organization section IDs must be stable and unique.");
    }
    if ([...currentSectionIds].some((id) => !nextSectionIdSet.has(id))) {
      throw new Error("Grammar organization must include every current section exactly once.");
    }
    if (nextExampleIds.length !== currentExampleIds.size || new Set(nextExampleIds).size !== currentExampleIds.size
        || nextExampleIds.some((id) => !currentExampleIds.has(id))) {
      throw new Error("Grammar organization must include every current example exactly once.");
    }
    const examplesById = new Map(page.grammar.sections.flatMap((section) => section.examples).map((example) => [example.id, example]));
    const sectionsById = new Map(page.grammar.sections.map((section) => [section.id, section]));
    page.grammar.sections = sections.map((draft) => {
      const current = sectionsById.get(draft.id);
      return {
        ...(current || {
          id: draft.id,
          explanation: "",
          pattern: "",
        }),
        name: String(draft.name || "").trim(),
        examples: (draft.examples || []).map((example) => examplesById.get(example.id)),
      };
    });
    result = await putExplicitEdit(page);
  });
  return result;
}

/** Called by generic unlink/delete cleanup when the authoritative page edge disappears. */
export function sourcePageReferenceCleanup(page, sourcePageId) {
  return clearSourcePageReferences(page, sourcePageId);
}
