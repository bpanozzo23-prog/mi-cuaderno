import {
  isGrammarExampleKey,
  isGrammarSectionKey,
  isPageGroupKey,
  isSourceCaptureKey,
  isUserKey,
  newGrammarExampleKey,
  newGrammarSectionKey,
  newSourceCaptureKey,
} from "./ids.js";

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

/** Read the flat schema-v6 array as one root level plus one child level without cloning content. */
export function grammarSectionHierarchy(sections = []) {
  const list = Array.isArray(sections) ? sections : [];
  const roots = list.filter((section) => section?.parentId == null);
  const childrenByParent = new Map(roots.map((section) => [section.id, []]));
  const unplaced = [];
  for (const section of list) {
    if (section?.parentId == null) continue;
    const siblings = childrenByParent.get(section.parentId);
    if (siblings) siblings.push(section);
    else unplaced.push(section);
  }
  return { roots, childrenByParent, unplaced };
}

/** Stable depth-first storage: each root is followed by its children; invalid leftovers are retained. */
export function canonicalGrammarSections(sections = []) {
  const list = Array.isArray(sections) ? sections : [];
  const { roots, childrenByParent, unplaced } = grammarSectionHierarchy(list);
  const ordered = roots.flatMap((root) => [root, ...(childrenByParent.get(root.id) || [])]);
  return [...ordered, ...unplaced];
}

export function grammarStructureCounts(sections = []) {
  const list = Array.isArray(sections) ? sections : [];
  return {
    sections: list.filter((section) => section?.parentId == null).length,
    subsections: list.filter((section) => section?.parentId != null).length,
    examples: list.reduce((total, section) => total + (section?.examples?.length || 0), 0),
  };
}

export function grammarSectionBreadcrumb(section, sections = []) {
  if (!section) return "";
  if (section.parentId == null) return section.name || "";
  const parent = (sections || []).find((candidate) => candidate?.id === section.parentId);
  return parent ? `${parent.name} › ${section.name}` : section.name || "";
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

  let pageFocus = isPageFocus(page?.pageFocus)
    ? page.pageFocus
    : legacyCollection
      ? PAGE_FOCUSES.vocabulary
      : PAGE_FOCUSES.notes;
  if (!isPageFocusEnabled(pageFocus, { collection, source, grammar })) {
    pageFocus = PAGE_FOCUSES.notes;
  }

  return { pageFocus, collection, source, grammar };
}

export function hasEnabledStructuredCapability(page) {
  return page?.collection?.enabled === true || page?.source?.enabled === true || page?.grammar?.enabled === true;
}

export function isJournalPage(page) {
  return page?.type === "page" && Boolean(page.pageDate) && !hasEnabledStructuredCapability(page);
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
 * Deep structural validation shared by constructors and schema-v5/v6 backup validation. Cross-record
 * authority (target existence, lexical type and outgoing links) is validated by the database layer.
 */
export function validatePageStructures(page, {
  where = "page",
  schemaVersion = 6,
  seenGroupIds = new Set(),
  seenCaptureIds = new Set(),
  seenSectionIds = new Set(),
  seenExampleIds = new Set(),
} = {}) {
  const errors = [];
  if (!isPlainObject(page)) return [`${where} must be an object`];
  if (Object.prototype.hasOwnProperty.call(page, "pageProfile")) {
    errors.push(`${where}.pageProfile is not part of schema v${schemaVersion}`);
  }
  if (!isPageFocus(page.pageFocus)) {
    errors.push(`${where}.pageFocus is not supported`);
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
      const localSectionsById = new Map();
      grammar.sections.forEach((section, sectionIndex) => {
        const sectionWhere = `${where}.grammar.sections[${sectionIndex}]`;
        if (!isPlainObject(section)) {
          errors.push(`${sectionWhere} is not an object`);
          return;
        }
        registerStableId(section.id, sectionWhere, "grammar-section", isGrammarSectionKey, seenSectionIds, errors);
        if (isGrammarSectionKey(section.id) && !localSectionsById.has(section.id)) {
          localSectionsById.set(section.id, section);
        }
        if (schemaVersion >= 6) {
          if (section.parentId !== null && !isGrammarSectionKey(section.parentId)) {
            errors.push(`${sectionWhere}.parentId must be null or a grammar-section UUID`);
          }
        } else if (Object.prototype.hasOwnProperty.call(section, "parentId")) {
          errors.push(`${sectionWhere}.parentId is not part of schema v${schemaVersion}`);
        }
        if (!isNonblankString(section.name)) errors.push(`${sectionWhere}.name must be a nonblank string`);
        else {
          if (section.name !== section.name.trim()) errors.push(`${sectionWhere}.name must be trimmed`);
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

      const seenNamesByParent = new Map();
      grammar.sections.forEach((section, sectionIndex) => {
        if (!isPlainObject(section) || !isNonblankString(section.name)) return;
        const sectionWhere = `${where}.grammar.sections[${sectionIndex}]`;
        const parentKey = schemaVersion >= 6 ? section.parentId : null;
        let seenNames = seenNamesByParent.get(parentKey);
        if (!seenNames) {
          seenNames = new Set();
          seenNamesByParent.set(parentKey, seenNames);
        }
        const nameKey = pageStructureNameKey(section.name);
        if (seenNames.has(nameKey)) {
          errors.push(schemaVersion >= 6
            ? `${where}.grammar.sections must have unique names among siblings`
            : `${where}.grammar.sections must have unique names`);
        } else {
          seenNames.add(nameKey);
        }

        if (schemaVersion < 6 || section.parentId === null || !isGrammarSectionKey(section.parentId)) return;
        if (section.parentId === section.id) {
          errors.push(`${sectionWhere}.parentId must not point to the section itself`);
          return;
        }
        const parent = localSectionsById.get(section.parentId);
        if (!parent) {
          errors.push(`${sectionWhere}.parentId must point to a section on the same page`);
        } else if (parent.parentId !== null) {
          errors.push(`${sectionWhere}.parentId would exceed the one subsection level`);
        }
      });

      if (schemaVersion >= 6) {
        let hasCycle = false;
        for (const section of grammar.sections) {
          if (!isPlainObject(section) || !isGrammarSectionKey(section.id)) continue;
          const path = new Set();
          let current = section;
          while (current && current.parentId !== null && isGrammarSectionKey(current.parentId)) {
            if (path.has(current.id)) {
              hasCycle = true;
              break;
            }
            path.add(current.id);
            current = localSectionsById.get(current.parentId);
          }
          if (hasCycle) break;
        }
        if (hasCycle) errors.push(`${where}.grammar.sections must not contain a parent cycle`);
      }
    }
  }

  if (isPageFocus(page.pageFocus) && !isPageFocusEnabled(page.pageFocus, page)) {
    errors.push(`${where}.pageFocus requires its structure to be enabled`);
  }
  return errors;
}
