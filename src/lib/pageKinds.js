import {
  isGrammarExampleKey,
  isGrammarSectionKey,
  isNoteSectionKey,
  isPageGroupKey,
  isSourceCaptureKey,
  isUserKey,
  newGrammarExampleKey,
  newGrammarSectionKey,
  newNoteSectionKey,
  newSourceCaptureKey,
} from "./ids.js";
import {
  canonicalOutline,
  outlineBreadcrumb,
  outlineCounts,
  outlineHierarchy,
  validateOneLevelOutline,
} from "./oneLevelOutline.js";

/** The leading presentation focus stored on every structured page. */
export const PAGE_FOCUSES = Object.freeze({
  notes: "notes",
  vocabulary: "vocabulary",
  source: "source",
  grammar: "grammar",
});

export const SOURCE_FORMATS = Object.freeze([
  "",
  "book",
  "audio",
  "video",
  "article_lesson",
  "other",
]);

export const SOURCE_CAPTURE_TYPES = Object.freeze([
  "passage",
  "reflection",
  "language_note",
  "question",
]);

export const PINNED_PAGE_IDS_PREF = "pinnedPageIds";

const isString = (value) => typeof value === "string";
const isNonblankString = (value) => isString(value) && value.trim() !== "";
const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

export const pageStructureNameKey = (name) =>
  String(name || "").trim().normalize("NFKC").toLocaleLowerCase("es");

export function isPageFocus(value) {
  return Object.values(PAGE_FOCUSES).includes(value);
}

export function isSourceFormat(value) {
  return SOURCE_FORMATS.includes(value);
}

export function isSourceCaptureType(value) {
  return SOURCE_CAPTURE_TYPES.includes(value);
}

/** Blank is handled by callers; nonblank Source URLs must be complete HTTP(S) URLs. */
export function isHttpSourceUrl(value) {
  if (!isString(value) || value.trim() !== value || value === "") return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function emptyCollection({ enabled = false, groups = [] } = {}) {
  return {
    enabled: enabled === true,
    groups: Array.isArray(groups)
      ? groups.map((group) => ({ ...group, itemKeys: [...(group?.itemKeys || [])] }))
      : groups,
  };
}

export function emptySource({
  enabled = false,
  format = "",
  creator = "",
  scope = "",
  url = "",
  context = "",
  captures = [],
} = {}) {
  return {
    enabled: enabled === true,
    format,
    creator,
    scope,
    url,
    context,
    captures: Array.isArray(captures)
      ? captures.map((capture) => ({ ...capture, itemKeys: [...(capture?.itemKeys || [])] }))
      : captures,
  };
}

export function emptyGrammar({ enabled = false, keyIdea = "", sections = [] } = {}) {
  return {
    enabled: enabled === true,
    keyIdea,
    sections: Array.isArray(sections)
      ? sections.map((section) => ({
          ...section,
          parentId: section?.parentId ?? null,
          examples: Array.isArray(section?.examples)
            ? section.examples.map((example) => ({
                ...example,
                itemKeys: [...(example?.itemKeys || [])],
                sourceCaptureRef: example?.sourceCaptureRef
                  ? { ...example.sourceCaptureRef }
                  : example?.sourceCaptureRef,
              }))
            : section?.examples,
        }))
      : sections,
  };
}

export function newSourceCapture({
  type = "passage",
  text = "",
  location = "",
  reflection = "",
  itemKeys = [],
} = {}) {
  return {
    id: newSourceCaptureKey(),
    type,
    text,
    location,
    reflection,
    itemKeys: [...itemKeys],
  };
}

export function newGrammarExample({
  es = "",
  en = "",
  note = "",
  itemKeys = [],
  sourceCaptureRef = null,
} = {}) {
  return {
    id: newGrammarExampleKey(),
    es,
    en,
    note,
    itemKeys: [...itemKeys],
    sourceCaptureRef: sourceCaptureRef ? { ...sourceCaptureRef } : null,
  };
}

export function newGrammarSection({
  parentId = null,
  name = "",
  explanation = "",
  pattern = "",
  examples = [],
} = {}) {
  return {
    id: newGrammarSectionKey(),
    parentId,
    name: String(name).trim(),
    explanation,
    pattern,
    examples: examples.map((example) => ({
      ...example,
      itemKeys: [...(example?.itemKeys || [])],
      sourceCaptureRef: example?.sourceCaptureRef ? { ...example.sourceCaptureRef } : null,
    })),
  };
}

export function newNoteSection({
  parentId = null,
  name = "",
  body = "",
} = {}) {
  return {
    id: newNoteSectionKey(),
    parentId,
    name: String(name).trim(),
    body,
  };
}

export function normalizeNoteSections(sections = []) {
  return Array.isArray(sections)
    ? sections.map((section) => ({
        ...section,
        parentId: section?.parentId ?? null,
        name: typeof section?.name === "string" ? section.name.trim() : section?.name,
      }))
    : sections;
}

export function noteSectionHierarchy(sections = []) {
  return outlineHierarchy(sections);
}

export function canonicalNoteSections(sections = []) {
  return canonicalOutline(sections);
}

export function noteStructureCounts(sections = []) {
  return outlineCounts(sections);
}

export function noteSectionBreadcrumb(section, sections = []) {
  return outlineBreadcrumb(section, sections);
}

/** Read the flat schema-v6 array as one root level plus one child level without cloning content. */
export function grammarSectionHierarchy(sections = []) {
  return outlineHierarchy(sections);
}

/** Stable depth-first storage: each root is followed by its children; invalid leftovers are retained. */
export function canonicalGrammarSections(sections = []) {
  return canonicalOutline(sections);
}

export function grammarStructureCounts(sections = []) {
  const list = Array.isArray(sections) ? sections : [];
  const hierarchyCounts = outlineCounts(list);
  return {
    ...hierarchyCounts,
    examples: list.reduce((total, section) => total + (section?.examples?.length || 0), 0),
  };
}

export function grammarSectionBreadcrumb(section, sections = []) {
  return outlineBreadcrumb(section, sections);
}

/**
 * Produces the complete current structures without changing IDs, ordering or owner prose.
 * The legacy profile argument is used only by the v4→v5 migration and temporary callers.
 */
export function normalizePageStructures(page = {}) {
  const legacyCollection = page?.pageProfile === "collection";
  const collection = emptyCollection({
    ...(page?.collection || {}),
    enabled: typeof page?.collection?.enabled === "boolean"
      ? page.collection.enabled
      : legacyCollection,
  });
  const source = emptySource(page?.source || {});
  const grammar = emptyGrammar(page?.grammar || {});
  const noteSections = normalizeNoteSections(page?.noteSections ?? []);

  let pageFocus = isPageFocus(page?.pageFocus)
    ? page.pageFocus
    : legacyCollection
      ? PAGE_FOCUSES.vocabulary
      : PAGE_FOCUSES.notes;
  if (!isPageFocusEnabled(pageFocus, { collection, source, grammar })) {
    pageFocus = PAGE_FOCUSES.notes;
  }

  return { pageFocus, noteSections, collection, source, grammar };
}

export function hasEnabledStructuredCapability(page) {
  return page?.collection?.enabled === true || page?.source?.enabled === true || page?.grammar?.enabled === true;
}

export function hasDurablePageStructure(page) {
  return hasEnabledStructuredCapability(page) || (Array.isArray(page?.noteSections) && page.noteSections.length > 0);
}

export function isJournalPage(page) {
  return page?.type === "page" && Boolean(page.pageDate) && !hasDurablePageStructure(page);
}

export function isPageFocusEnabled(focus, page) {
  if (focus === PAGE_FOCUSES.notes) return true;
  if (focus === PAGE_FOCUSES.vocabulary) return page?.collection?.enabled === true;
  if (focus === PAGE_FOCUSES.source) return page?.source?.enabled === true;
  if (focus === PAGE_FOCUSES.grammar) return page?.grammar?.enabled === true;
  return false;
}

export function enabledPageRoles(page) {
  const active = [];
  if (page?.source?.enabled) active.push(PAGE_FOCUSES.source);
  if (page?.grammar?.enabled) active.push(PAGE_FOCUSES.grammar);
  if (page?.collection?.enabled) active.push(PAGE_FOCUSES.vocabulary);
  if (page?.pageFocus === PAGE_FOCUSES.notes) active.unshift(PAGE_FOCUSES.notes);
  const focus = isPageFocusEnabled(page?.pageFocus, page) ? page.pageFocus : PAGE_FOCUSES.notes;
  return [focus, ...active.filter((role) => role !== focus)];
}

function validateItemKeyArray(value, where, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${where} must be an array`);
    return;
  }
  const seen = new Set();
  value.forEach((key, index) => {
    if (!isUserKey(key)) errors.push(`${where}[${index}] must be a personal lexical item id`);
    else if (seen.has(key)) errors.push(`${where} must not contain duplicate item ids`);
    else seen.add(key);
  });
}

const registerStableId = (id, where, label, predicate, seen, errors) => {
  if (!predicate(id)) errors.push(`${where}.id must be a ${label} UUID`);
  else if (seen.has(id)) errors.push(`Duplicate ${label} id "${id}".`);
  else seen.add(id);
};

/**
 * Deep structural validation shared by constructors and schema-v5/v6/v7 backup validation. Cross-record
 * authority (target existence, lexical type and outgoing links) is validated by the database layer.
 */
export function validatePageStructures(page, {
  where = "page",
  schemaVersion = 9,
  seenGroupIds = new Set(),
  seenCaptureIds = new Set(),
  seenSectionIds = new Set(),
  seenExampleIds = new Set(),
  seenNoteSectionIds = new Set(),
} = {}) {
  const errors = [];
  if (!isPlainObject(page)) return [`${where} must be an object`];
  if (Object.prototype.hasOwnProperty.call(page, "pageProfile")) {
    errors.push(`${where}.pageProfile is not part of schema v${schemaVersion}`);
  }
  if (!isPageFocus(page.pageFocus)) {
    errors.push(`${where}.pageFocus is not supported`);
  }

  if (schemaVersion < 7) {
    if (Object.prototype.hasOwnProperty.call(page, "noteSections")) {
      errors.push(`${where}.noteSections is not part of schema v${schemaVersion}`);
    }
  } else if (!Array.isArray(page.noteSections)) {
    errors.push(`${where}.noteSections must be an array`);
  } else {
    errors.push(...validateOneLevelOutline(page.noteSections, {
      where: `${where}.noteSections`,
      isId: isNoteSectionKey,
      idLabel: "note-section",
      seenIds: seenNoteSectionIds,
      normalizeName: pageStructureNameKey,
    }));
    page.noteSections.forEach((section, index) => {
      if (!isPlainObject(section)) return;
      if (!isString(section.body)) errors.push(`${where}.noteSections[${index}].body must be a string`);
    });
  }

  const collection = page.collection;
  if (!isPlainObject(collection)) {
    errors.push(`${where}.collection must be an object`);
  } else {
    if (typeof collection.enabled !== "boolean") errors.push(`${where}.collection.enabled must be boolean`);
    if (!Array.isArray(collection.groups)) {
      errors.push(`${where}.collection.groups must be an array`);
    } else {
      const seenNames = new Set();
      const placed = new Set();
      collection.groups.forEach((group, index) => {
        const groupWhere = `${where}.collection.groups[${index}]`;
        if (!isPlainObject(group)) {
          errors.push(`${groupWhere} is not an object`);
          return;
        }
        registerStableId(group.id, groupWhere, "page-group", isPageGroupKey, seenGroupIds, errors);
        if (!isNonblankString(group.name)) errors.push(`${groupWhere}.name must be a nonblank string`);
        else {
          if (group.name !== group.name.trim()) errors.push(`${groupWhere}.name must be trimmed`);
          const nameKey = pageStructureNameKey(group.name);
          if (seenNames.has(nameKey)) errors.push(`${where}.collection.groups must have unique names`);
          else seenNames.add(nameKey);
        }
        if (!Array.isArray(group.itemKeys)) errors.push(`${groupWhere}.itemKeys must be an array`);
        else group.itemKeys.forEach((key, keyIndex) => {
          if (!isUserKey(key)) errors.push(`${groupWhere}.itemKeys[${keyIndex}] must be a personal lexical item id`);
          else if (placed.has(key)) errors.push(`${where}.collection contains duplicate placement for "${key}"`);
          else placed.add(key);
        });
      });
    }
  }

  const source = page.source;
  if (!isPlainObject(source)) {
    errors.push(`${where}.source must be an object`);
  } else {
    if (typeof source.enabled !== "boolean") errors.push(`${where}.source.enabled must be boolean`);
    if (!isSourceFormat(source.format)) errors.push(`${where}.source.format is not supported`);
    for (const field of ["creator", "scope", "url", "context"]) {
      if (!isString(source[field])) errors.push(`${where}.source.${field} must be a string`);
    }
    if (isString(source.url) && source.url !== "" && !isHttpSourceUrl(source.url)) {
      errors.push(`${where}.source.url must be blank or an http(s) URL`);
    }
    if (!Array.isArray(source.captures)) {
      errors.push(`${where}.source.captures must be an array`);
    } else source.captures.forEach((capture, index) => {
      const captureWhere = `${where}.source.captures[${index}]`;
      if (!isPlainObject(capture)) {
        errors.push(`${captureWhere} is not an object`);
        return;
      }
      registerStableId(capture.id, captureWhere, "source-capture", isSourceCaptureKey, seenCaptureIds, errors);
      if (!isSourceCaptureType(capture.type)) errors.push(`${captureWhere}.type is not supported`);
      if (!isNonblankString(capture.text)) errors.push(`${captureWhere}.text must be a nonblank string`);
      if (!isString(capture.location)) errors.push(`${captureWhere}.location must be a string`);
      if (!isString(capture.reflection)) errors.push(`${captureWhere}.reflection must be a string`);
      validateItemKeyArray(capture.itemKeys, `${captureWhere}.itemKeys`, errors);
    });
  }

  const grammar = page.grammar;
  if (!isPlainObject(grammar)) {
    errors.push(`${where}.grammar must be an object`);
  } else {
    if (typeof grammar.enabled !== "boolean") errors.push(`${where}.grammar.enabled must be boolean`);
    if (!isString(grammar.keyIdea)) errors.push(`${where}.grammar.keyIdea must be a string`);
    if (!Array.isArray(grammar.sections)) {
      errors.push(`${where}.grammar.sections must be an array`);
    } else {
      errors.push(...validateOneLevelOutline(grammar.sections, {
        where: `${where}.grammar.sections`,
        isId: isGrammarSectionKey,
        idLabel: "grammar-section",
        seenIds: seenSectionIds,
        normalizeName: pageStructureNameKey,
        parentMode: schemaVersion >= 6 ? "required" : "forbidden",
      }).map((error) => schemaVersion < 6 && error.endsWith("is not part of this schema")
        ? `${error.slice(0, -"this schema".length)}schema v${schemaVersion}`
        : error));
      grammar.sections.forEach((section, sectionIndex) => {
        const sectionWhere = `${where}.grammar.sections[${sectionIndex}]`;
        if (!isPlainObject(section)) {
          return;
        }
        if (!isString(section.explanation)) errors.push(`${sectionWhere}.explanation must be a string`);
        if (!isString(section.pattern)) errors.push(`${sectionWhere}.pattern must be a string`);
        if (!Array.isArray(section.examples)) {
          errors.push(`${sectionWhere}.examples must be an array`);
          return;
        }
        section.examples.forEach((example, exampleIndex) => {
          const exampleWhere = `${sectionWhere}.examples[${exampleIndex}]`;
          if (!isPlainObject(example)) {
            errors.push(`${exampleWhere} is not an object`);
            return;
          }
          registerStableId(example.id, exampleWhere, "grammar-example", isGrammarExampleKey, seenExampleIds, errors);
          if (!isNonblankString(example.es)) errors.push(`${exampleWhere}.es must be a nonblank string`);
          if (!isString(example.en)) errors.push(`${exampleWhere}.en must be a string`);
          if (!isString(example.note)) errors.push(`${exampleWhere}.note must be a string`);
          validateItemKeyArray(example.itemKeys, `${exampleWhere}.itemKeys`, errors);
          const ref = example.sourceCaptureRef;
          if (ref !== null) {
            if (!isPlainObject(ref)) errors.push(`${exampleWhere}.sourceCaptureRef must be null or an object`);
            else {
              if (!isUserKey(ref.pageId)) errors.push(`${exampleWhere}.sourceCaptureRef.pageId must be a personal page id`);
              if (!isSourceCaptureKey(ref.captureId)) errors.push(`${exampleWhere}.sourceCaptureRef.captureId must be a source-capture UUID`);
            }
          }
        });
      });

    }
  }

  if (isPageFocus(page.pageFocus) && !isPageFocusEnabled(page.pageFocus, page)) {
    errors.push(`${where}.pageFocus requires its structure to be enabled`);
  }
  return errors;
}
