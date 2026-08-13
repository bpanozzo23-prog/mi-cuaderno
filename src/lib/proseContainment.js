import { matchTermInText } from "./cloze.js";
import { sortJournalEntries } from "./journal.js";
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

const PROSE_SOURCES = Object.freeze({
  journal: "journal",
  page: "page",
  note: "note",
  source: "source",
  grammar: "grammar",
});

const titleFor = (page) => page?.title || "Untitled page";

const captureLabel = (capture) => {
  const type = capture?.type === "language_note"
    ? "Language note"
    : String(capture?.type || "capture").replaceAll("_", " ");
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}${capture?.location ? ` · ${capture.location}` : ""}`;
};

const sourceAllowed = (source, sources) => !sources || sources.has(source);

/**
 * Every owner-visible prose slot that can contain a lexical subject. Disabled Source and
 * Grammar structures stay out exactly as they do in search; Notes remain independently
 * scannable. Journal bodies are projected with their deliberately plainer Markdown dialect.
 */
export function proseDocumentsFor(items = [], { sources: requestedSources } = {}) {
  const sources = Array.isArray(requestedSources) ? new Set(requestedSources) : null;
  const rows = [];

  for (const page of items) {
    if (page?.type !== "page" || isJournalPage(page)) continue;

    if (sourceAllowed(PROSE_SOURCES.page, sources)) {
      rows.push({
        documentId: `${page.id}:body`,
        page,
        pageId: page.id,
        journal: false,
        source: PROSE_SOURCES.page,
        label: "Notes overview",
        text: plainTextFromMarkdown(page.body, { noteCallouts: true }),
      });
    }

    if (sourceAllowed(PROSE_SOURCES.note, sources)) {
      for (const section of page.noteSections || []) {
        rows.push({
          documentId: `${page.id}:note:${section.id}`,
          page,
          pageId: page.id,
          journal: false,
          source: PROSE_SOURCES.note,
          label: noteSectionBreadcrumb(section, page.noteSections) || section.name || "Notes section",
          text: plainTextFromMarkdown(section.body, { noteCallouts: true }),
        });
      }
    }

    if (page.source?.enabled && sourceAllowed(PROSE_SOURCES.source, sources)) {
      for (const capture of page.source.captures || []) {
        rows.push({
          documentId: `${page.id}:source:${capture.id}`,
          page,
          pageId: page.id,
          journal: false,
          source: PROSE_SOURCES.source,
          label: captureLabel(capture),
          text: String(capture.text || ""),
        });
      }
    }

    if (page.grammar?.enabled && sourceAllowed(PROSE_SOURCES.grammar, sources)) {
      for (const section of page.grammar.sections || []) {
        rows.push({
          documentId: `${page.id}:grammar:${section.id}`,
          page,
          pageId: page.id,
          journal: false,
          source: PROSE_SOURCES.grammar,
          label: grammarSectionBreadcrumb(section, page.grammar.sections) || section.name || "Grammar section",
          text: plainTextFromMarkdown(section.explanation),
        });
      }
    }
  }

  if (sourceAllowed(PROSE_SOURCES.journal, sources)) {
    for (const page of sortJournalEntries(items)) {
      rows.push({
        documentId: `${page.id}:journal`,
        page,
        pageId: page.id,
        journal: true,
        source: PROSE_SOURCES.journal,
        label: page.pageDate || titleFor(page),
        text: plainTextFromMarkdown(page.body, { noteCallouts: false }),
      });
    }
  }

  return rows;
}

/** A compact original-text window around one matcher result. */
export function matchSnippet(text, match, radius = 56) {
  text = String(text || "");
  if (!match || !text) return "";
  const safeRadius = Math.max(0, Number.isFinite(radius) ? Math.floor(radius) : 56);
  const start = Math.max(0, match.start - safeRadius);
  const end = Math.min(text.length, match.end + safeRadius);
  const excerpt = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${excerpt}${end < text.length ? "…" : ""}`;
}

const isLexical = (item) => item?.type === "lexical";
const eligibleSubject = (item) => isLexical(item)
  && (item.form !== "word" || !CONTAINMENT_STOP_WORDS.has(normalize(item.term).trim()));

/** Pure one-subject scan over the current personal prose projection. */
export function deriveProseContainment(
  subject,
  items = [],
  profiles = new Map(),
  { sources, snippetRadius = 56 } = {}
) {
  if (!eligibleSubject(subject)) return [];
  const profile = profiles.get(subject.id) || {};
  const rows = [];

  for (const document of proseDocumentsFor(items, { sources })) {
    const match = matchTermInText(document.text, {
      term: subject.term,
      forms: profile.forms,
    });
    if (!match) continue;
    if (match.kind === "inflected" && profile.ambiguousForms?.has(match.normalizedSurface)) {
      continue;
    }
    const { documentId: _documentId, text: _text, ...context } = document;
    rows.push({
      ...context,
      surface: match.surface,
      normalizedSurface: match.normalizedSurface,
      matchKind: match.kind,
      snippet: matchSnippet(document.text, match, snippetRadius),
    });
  }
  return rows;
}

/** Optional attached-verb enrichment with the same fallback and ambiguity oracle as phrases. */
export async function prepareProseContainment(subject, items = [], deps = {}) {
  const { sources, snippetRadius, ...profileDeps } = deps || {};
  const words = eligibleSubject(subject) && subject.form === "word" ? [subject] : [];
  return prepareWithFormProfiles(
    words,
    (profiles) => deriveProseContainment(subject, items, profiles, { sources, snippetRadius }),
    profileDeps
  );
}
