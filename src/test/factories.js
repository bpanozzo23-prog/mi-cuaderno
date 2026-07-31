import { newUserKey, newEventId } from "../lib/ids.js";
import { nowIso, localDate } from "../lib/dates.js";

export function makeLexical(overrides = {}) {
  const at = nowIso();
  return {
    id: newUserKey(),
    type: "lexical",
    form: "word",
    term: "sacar",
    translation: "to take out",
    pos: "verb",
    notes: "",
    myExamples: [],
    tags: [],
    linkedKeys: [],
    mediaLinks: [],
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function makePage(overrides = {}) {
  const at = nowIso();
  return {
    id: newUserKey(),
    type: "page",
    title: "Preterite vs imperfect",
    body: "",
    pageDate: null,
    tags: [],
    linkedKeys: [],
    mediaLinks: [],
    createdAt: at,
    updatedAt: at,
    ...overrides,
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
