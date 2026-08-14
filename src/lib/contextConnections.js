import { deriveCollection } from "./collections.js";
import { normalize } from "./normalize.js";
import { plainTextFromMarkdown } from "./noteMarkdown.js";
import {
  grammarSectionBreadcrumb,
  isJournalPage,
  noteSectionBreadcrumb,
} from "./pageKinds.js";
import {
  CONTAINMENT_STOP_WORDS,
  prepareWithFormProfiles,
} from "./phraseContainment.js";

const WORD = /[\p{L}\p{M}]+/gu;
const preparedIndexes = new WeakMap();

const isLexical = (item) => item?.type === "lexical";
const titleFor = (page) => page?.title || "Untitled page";
const uniqueKeys = (keys = []) => [...new Set(keys || [])];

const captureLabel = (capture) => {
  const type = capture?.type === "language_note"
    ? "Language note"
    : String(capture?.type || "capture").replaceAll("_", " ");
  const label = `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  return `${label}${capture?.location ? ` · ${capture.location}` : ""}`;
};

function tokenize(text) {
  const tokens = [];
  for (const match of String(text || "").matchAll(WORD)) {
    tokens.push({
      start: match.index,
      end: match.index + match[0].length,
      norm: normalize(match[0]),
    });
  }
  return tokens;
}

function wantedTokens(item) {
  return normalize(item?.term || "").split(/\s+/).filter(Boolean);
}

function eligibleLexical(item) {
  if (!isLexical(item)) return false;
  const wanted = wantedTokens(item);
  if (!wanted.length) return false;
  return item.form !== "word" || !CONTAINMENT_STOP_WORDS.has(wanted.join(" "));
}

/**
 * The Phase 26 prose projection deliberately sits beside proseDocumentsFor. It includes the
 * additional exact attachment targets needed by Mentioned here without changing Phase 22/23
 * Historia behavior.
 */
export function contextDocumentsFor(items = []) {
  const documents = [];

  for (const page of items) {
    if (page?.type !== "page" || isJournalPage(page)) continue;
    const pageTitle = titleFor(page);

    documents.push({
      contextId: `${page.id}:notes:overview`,
      page,
      pageId: page.id,
      pageTitle,
      journal: false,
      kind: "notes_overview",
      label: "Notes overview",
      text: plainTextFromMarkdown(page.body, { noteCallouts: true }),
      explicitItemKeys: [],
      target: { kind: "notes_overview" },
    });

    for (const section of page.noteSections || []) {
      documents.push({
        contextId: `${page.id}:notes:${section.id}`,
        page,
        pageId: page.id,
        pageTitle,
        journal: false,
        kind: "note_section",
        label: noteSectionBreadcrumb(section, page.noteSections) || section.name || "Notes section",
        text: plainTextFromMarkdown(section.body, { noteCallouts: true }),
        explicitItemKeys: [],
        target: { kind: "note_section", sectionId: section.id },
      });
    }

    if (page.source?.enabled) {
      for (const capture of page.source.captures || []) {
        documents.push({
          contextId: `${page.id}:source:${capture.id}`,
          page,
          pageId: page.id,
          pageTitle,
          journal: false,
          kind: "source_capture",
          label: captureLabel(capture),
          text: String(capture.text || ""),
          explicitItemKeys: uniqueKeys(capture.itemKeys),
          target: { kind: "source_capture", captureId: capture.id },
        });
      }
    }

    if (page.grammar?.enabled) {
      for (const section of page.grammar.sections || []) {
        const sectionLabel = grammarSectionBreadcrumb(section, page.grammar.sections)
          || section.name
          || "Grammar section";
        documents.push({
          contextId: `${page.id}:grammar:${section.id}:overview`,
          page,
          pageId: page.id,
          pageTitle,
          journal: false,
          kind: "grammar_overview",
          label: sectionLabel,
          text: plainTextFromMarkdown(section.explanation),
          explicitItemKeys: [],
          target: { kind: "grammar_overview", sectionId: section.id },
        });

        for (const example of section.examples || []) {
          documents.push({
            contextId: `${page.id}:grammar:${section.id}:example:${example.id}`,
            page,
            pageId: page.id,
            pageTitle,
            journal: false,
            kind: "grammar_example",
            label: `${sectionLabel} · Example`,
            text: String(example.es || ""),
            explicitItemKeys: uniqueKeys(example.itemKeys),
            target: {
              kind: "grammar_example",
              sectionId: section.id,
              exampleId: example.id,
            },
          });
        }
      }
    }
  }

  for (const page of items) {
    if (!isJournalPage(page)) continue;
    documents.push({
      contextId: `${page.id}:journal`,
      page,
      pageId: page.id,
      pageTitle: titleFor(page),
      journal: true,
      kind: "journal",
      label: page.pageDate || titleFor(page),
      text: plainTextFromMarkdown(page.body, { noteCallouts: false }),
      explicitItemKeys: [],
      target: { kind: "journal" },
    });
  }

  return documents;
}

function termCandidates(items) {
  return items
    .map((item, itemIndex) => ({ item, itemIndex, wanted: wantedTokens(item) }))
    .filter(({ item }) => eligibleLexical(item));
}

/**
 * Context-first, all-occurrences matcher. Each document is tokenized once per derivation, while
 * exact terms and safe attached-word forms are looked up through postings keyed by token.
 */
export function deriveContextMatchOccurrences(items = [], documents = [], profiles = new Map()) {
  const candidates = termCandidates(items);
  const exactByFirstToken = new Map();
  const formsByToken = new Map();

  for (const candidate of candidates) {
    const first = candidate.wanted[0];
    if (!exactByFirstToken.has(first)) exactByFirstToken.set(first, []);
    exactByFirstToken.get(first).push(candidate);

    if (candidate.item.form !== "word") continue;
    const profile = profiles.get(candidate.item.id);
    for (const form of profile?.forms || []) {
      const normalizedForm = normalize(form).trim();
      if (!normalizedForm || normalizedForm.includes(" ")) continue;
      if (!formsByToken.has(normalizedForm)) formsByToken.set(normalizedForm, []);
      formsByToken.get(normalizedForm).push({ candidate, profile });
    }
  }

  for (const candidatesAtToken of exactByFirstToken.values()) {
    candidatesAtToken.sort((a, b) => b.wanted.length - a.wanted.length || a.itemIndex - b.itemIndex);
  }

  const matches = new Map();
  const bucketFor = (document, candidate) => {
    const key = `${document.contextId}\u0000${candidate.item.id}`;
    if (!matches.has(key)) {
      matches.set(key, { document, candidate, exact: [], inflected: [] });
    }
    return matches.get(key);
  };

  for (const document of documents) {
    const text = String(document.text || "");
    const tokens = tokenize(text);
    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += 1) {
      const token = tokens[tokenIndex];

      for (const candidate of exactByFirstToken.get(token.norm) || []) {
        if (tokenIndex + candidate.wanted.length > tokens.length) continue;
        const run = tokens.slice(tokenIndex, tokenIndex + candidate.wanted.length);
        if (!run.every((part, offset) => part.norm === candidate.wanted[offset])) continue;
        const start = run[0].start;
        const end = run[run.length - 1].end;
        bucketFor(document, candidate).exact.push({
          start,
          end,
          surface: text.slice(start, end),
          normalizedSurface: run.map((part) => part.norm).join(" "),
        });
      }

      for (const { candidate, profile } of formsByToken.get(token.norm) || []) {
        if (profile.ambiguousForms?.has(token.norm)) continue;
        bucketFor(document, candidate).inflected.push({
          start: token.start,
          end: token.end,
          surface: text.slice(token.start, token.end),
          normalizedSurface: token.norm,
        });
      }
    }
  }

  const rows = [];
  for (const { document, candidate, exact, inflected } of matches.values()) {
    const matchKind = exact.length ? "exact" : "inflected";
    const occurrences = (exact.length ? exact : inflected)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    for (const occurrence of occurrences) {
      rows.push({
        contextId: document.contextId,
        item: candidate.item,
        itemId: candidate.item.id,
        itemIndex: candidate.itemIndex,
        matchKind,
        ...occurrence,
      });
    }
  }
  return rows;
}

function assembleContextIndex(items, documents, occurrences) {
  const documentsById = new Map(documents.map((document) => [document.contextId, document]));
  const grouped = new Map();
  for (const occurrence of occurrences) {
    const key = `${occurrence.contextId}\u0000${occurrence.itemId}`;
    if (!grouped.has(key)) grouped.set(key, { ...occurrence, occurrences: [] });
    grouped.get(key).occurrences.push({
      start: occurrence.start,
      end: occurrence.end,
      surface: occurrence.surface,
      normalizedSurface: occurrence.normalizedSurface,
    });
  }

  const matches = [...grouped.values()].map((row) => ({
    ...row,
    context: documentsById.get(row.contextId),
  }));

  const matchesByContextId = new Map();
  const matchesByItemId = new Map();
  for (const row of matches) {
    if (!matchesByContextId.has(row.contextId)) matchesByContextId.set(row.contextId, []);
    matchesByContextId.get(row.contextId).push(row);
    if (!matchesByItemId.has(row.itemId)) matchesByItemId.set(row.itemId, []);
    matchesByItemId.get(row.itemId).push(row);
  }

  for (const rows of matchesByContextId.values()) {
    const surfaceGroups = new Map();
    for (const row of rows) {
      const key = normalize(row.item.term).trim();
      if (!surfaceGroups.has(key)) surfaceGroups.set(key, []);
      surfaceGroups.get(key).push(row);
    }
    for (const [ambiguityKey, group] of surfaceGroups) {
      if (group.length < 2) continue;
      for (const row of group) {
        row.ambiguous = true;
        row.ambiguityKey = ambiguityKey;
      }
    }
  }

  return {
    items,
    documents,
    documentsById,
    matches,
    matchesByContextId,
    matchesByItemId,
    itemsById: new Map(items.map((item) => [item.id, item])),
  };
}

async function buildContextIndex(items, deps) {
  const documents = contextDocumentsFor(items);
  const words = items.filter((item) => eligibleLexical(item) && item.form === "word");
  const occurrences = await prepareWithFormProfiles(
    words,
    (profiles) => deriveContextMatchOccurrences(items, documents, profiles),
    deps
  );
  return assembleContextIndex(items, documents, occurrences);
}

/** One lazy visit-local promise per notebook snapshot; injected test dependencies bypass cache. */
export function prepareContextIndex(items = [], deps = {}) {
  const cacheable = items && typeof items === "object" && Object.keys(deps || {}).length === 0;
  if (!cacheable) return buildContextIndex(items, deps || {});
  if (preparedIndexes.has(items)) return preparedIndexes.get(items);
  const pending = buildContextIndex(items, {}).catch((error) => {
    preparedIndexes.delete(items);
    throw error;
  });
  preparedIndexes.set(items, pending);
  return pending;
}

const hasEdge = (page, item) => (page?.linkedKeys || []).includes(item?.id)
  || (item?.linkedKeys || []).includes(page?.id);

const mentionRank = (left, right) => {
  const leftPhrase = left.item.form === "phrase" ? 1 : 0;
  const rightPhrase = right.item.form === "phrase" ? 1 : 0;
  return rightPhrase - leftPhrase
    || wantedTokens(right.item).length - wantedTokens(left.item).length
    || Number(left.matchKind === "inflected") - Number(right.matchKind === "inflected")
    || left.itemIndex - right.itemIndex;
};

/** Current unconfirmed candidates for one visible prose slot, ranked longest phrase first. */
export function mentionedHereFor(index, contextId) {
  const context = index?.documentsById?.get(contextId);
  if (!context) return [];
  const exactAttachment = context.kind === "source_capture" || context.kind === "grammar_example";
  const attached = new Set(context.explicitItemKeys || []);
  return [...(index.matchesByContextId.get(contextId) || [])]
    .filter((row) => exactAttachment ? !attached.has(row.itemId) : !hasEdge(context.page, row.item))
    .sort(mentionRank);
}

function structuralContextsFor(items) {
  const contexts = [];
  const lexicalIds = new Set(items.filter(isLexical).map((item) => item.id));
  const cleanKeys = (keys) => uniqueKeys(keys).filter((key) => lexicalIds.has(key));

  for (const page of items) {
    if (page?.type !== "page" || isJournalPage(page)) continue;
    const pageTitle = titleFor(page);

    if (page.collection?.enabled) {
      for (const group of deriveCollection(page, items).groups) {
        contexts.push({
          contextId: `${page.id}:collection:${group.id}`,
          page,
          pageId: page.id,
          pageTitle,
          kind: "collection_group",
          label: group.name,
          itemKeys: cleanKeys(group.itemKeys),
        });
      }
    }

    if (page.source?.enabled) {
      for (const capture of page.source.captures || []) {
        contexts.push({
          contextId: `${page.id}:source:${capture.id}`,
          page,
          pageId: page.id,
          pageTitle,
          kind: "source_capture",
          label: captureLabel(capture),
          itemKeys: cleanKeys(capture.itemKeys),
        });
      }
    }

    if (page.grammar?.enabled) {
      for (const section of page.grammar.sections || []) {
        const sectionLabel = grammarSectionBreadcrumb(section, page.grammar.sections)
          || section.name
          || "Grammar section";
        for (const example of section.examples || []) {
          contexts.push({
            contextId: `${page.id}:grammar:${section.id}:example:${example.id}`,
            page,
            pageId: page.id,
            pageTitle,
            kind: "grammar_example",
            label: `${sectionLabel} · Example`,
            itemKeys: cleanKeys(example.itemKeys),
          });
        }
      }
    }
  }
  return contexts;
}

function independentlyOccurs(left, right) {
  return left.occurrences.some((leftOccurrence) =>
    right.occurrences.some((rightOccurrence) =>
      leftOccurrence.end <= rightOccurrence.start || rightOccurrence.end <= leftOccurrence.start
    )
  );
}

/**
 * Evidence-backed lexical neighborhoods. One structural context qualifies immediately; prose
 * needs two distinct contexts and cannot borrow an overlapping phrase/component occurrence.
 */
export function deriveContextNeighborhoods(subjectId, index, items = index?.items || []) {
  const subject = index?.itemsById?.get(subjectId);
  if (!isLexical(subject)) return [];
  const order = new Map(items.map((item, itemIndex) => [item.id, itemIndex]));
  const evidence = new Map();
  const contextOrder = new Map();
  let nextContextOrder = 0;

  const addEvidence = (itemId, context, kind) => {
    if (itemId === subjectId || !isLexical(index.itemsById.get(itemId))) return;
    if (!contextOrder.has(context.contextId)) contextOrder.set(context.contextId, nextContextOrder++);
    if (!evidence.has(itemId)) evidence.set(itemId, new Map());
    const contexts = evidence.get(itemId);
    if (!contexts.has(context.contextId)) {
      contexts.set(context.contextId, { ...context, explicit: false, prose: false });
    }
    contexts.get(context.contextId)[kind] = true;
  };

  for (const context of structuralContextsFor(items)) {
    if (!context.itemKeys.includes(subjectId)) continue;
    for (const itemId of context.itemKeys) addEvidence(itemId, context, "explicit");
  }

  for (const document of index.documents || []) {
    const rows = index.matchesByContextId.get(document.contextId) || [];
    const subjectRow = rows.find((row) => row.itemId === subjectId);
    if (!subjectRow || subjectRow.ambiguous) continue;
    for (const candidate of rows) {
      if (candidate.itemId === subjectId || candidate.ambiguous) continue;
      if (!independentlyOccurs(subjectRow, candidate)) continue;
      addEvidence(candidate.itemId, document, "prose");
    }
  }

  return [...evidence.entries()]
    .map(([itemId, contexts]) => {
      const contextRows = [...contexts.values()].sort(
        (a, b) => contextOrder.get(a.contextId) - contextOrder.get(b.contextId)
      );
      const explicitCount = contextRows.filter((context) => context.explicit).length;
      const proseCount = contextRows.filter((context) => context.prose).length;
      const prosePageCount = new Set(
        contextRows.filter((context) => context.prose).map((context) => context.pageId)
      ).size;
      return {
        item: index.itemsById.get(itemId),
        itemId,
        contexts: contextRows,
        explicitCount,
        proseCount,
        prosePageCount,
        contextCount: contextRows.length,
      };
    })
    .filter((row) => row.explicitCount > 0 || row.prosePageCount >= 2)
    .sort((a, b) => b.explicitCount - a.explicitCount
      || b.contextCount - a.contextCount
      || (order.get(a.itemId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.itemId) ?? Number.MAX_SAFE_INTEGER));
}

/** Lazy Biography adapter over the shared context index. */
export async function prepareContextNeighborhoods(subject, items = [], deps = {}) {
  const index = await prepareContextIndex(items, deps);
  return deriveContextNeighborhoods(subject?.id || subject, index, items);
}
