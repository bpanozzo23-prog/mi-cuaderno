import { newUserKey, newEventId } from "../lib/ids.js";
import { nowIso, localDate } from "../lib/dates.js";
import { meaningsFromTranslation, newMeaning } from "../lib/meanings.js";
import {
  emptyCollection,
  emptyGrammar,
  emptySource,
  PAGE_FOCUSES,
} from "../lib/pageKinds.js";

export function makeLexical(overrides = {}) {
  const at = nowIso();
  const { translation, meanings, ...rest } = overrides;
  return {
    id: newUserKey(),
    type: "lexical",
    form: "word",
    term: "sacar",
    meanings: meanings ?? (translation !== undefined
      ? meaningsFromTranslation(translation)
      : [newMeaning({ gloss: "to take out" })]),
    pos: "verb",
    notes: "",
    myExamples: [],
    tags: [],
    linkedKeys: [],
    linkAnnotations: [],
    mediaLinks: [],
    createdAt: at,
    updatedAt: at,
    ...rest,
  };
}

export function makePage(overrides = {}) {
  const at = nowIso();
  const {
    pageProfile,
    pageFocus,
    collection,
    source,
    grammar,
    ...rest
  } = overrides;
  const legacyCollection = pageProfile === "collection";
  return {
    id: newUserKey(),
    type: "page",
    title: "Preterite vs imperfect",
    body: "",
    pageDate: null,
    pageFocus: pageFocus ?? (legacyCollection ? PAGE_FOCUSES.vocabulary : PAGE_FOCUSES.notes),
    collection: emptyCollection({
      ...(collection || {}),
      enabled: typeof collection?.enabled === "boolean" ? collection.enabled : legacyCollection,
    }),
    source: emptySource(source || {}),
    grammar: emptyGrammar(grammar || {}),
    tags: [],
    linkedKeys: [],
    linkAnnotations: [],
    mediaLinks: [],
    createdAt: at,
    updatedAt: at,
    ...rest,
  };
}

export function makeEvent(overrides = {}) {
  const date = new Date();
  return {
    id: newEventId(),
    type: "view",
    itemKey: null,
    at: nowIso(date),
    localDate: localDate(date),
    metadata: null,
    ...overrides,
  };
}
