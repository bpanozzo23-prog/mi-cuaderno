import { db } from "./db.js";
import { EVENT_TYPES, logEvent } from "./events.js";
import { nowIso } from "../lib/dates.js";
import {
  deleteNoteSectionMutation,
  organizeNoteSectionsMutation,
  saveNoteSectionMutation,
} from "../lib/noteSectionMutations.js";
import { validateNoteSections } from "../lib/pageKinds.js";

const assertLexical = (item, itemId) => {
  if (!item || item.type !== "lexical") throw new Error(`Lexical item ${itemId} does not exist.`);
  return item;
};

const saveExplicitEdit = async (item, noteSections) => {
  const errors = validateNoteSections(noteSections, { where: "lexical.noteSections" });
  if (errors.length) throw new Error(errors[0]);
  const next = { ...item, noteSections, updatedAt: nowIso() };
  await db.items.put(next);
  await logEvent(EVENT_TYPES.edit, next.id);
  return next;
};

export async function saveLexicalNoteSection(itemId, draft = {}) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const stored = assertLexical(await db.items.get(itemId), itemId);
    const mutation = saveNoteSectionMutation(stored.noteSections, draft);
    if (!mutation.changed) {
      result = { item: stored, section: mutation.section, changed: false };
      return;
    }
    result = {
      item: await saveExplicitEdit(stored, mutation.sections),
      section: mutation.section,
      changed: true,
    };
  });
  return result;
}

export async function deleteLexicalNoteSection(itemId, sectionId) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const stored = assertLexical(await db.items.get(itemId), itemId);
    const mutation = deleteNoteSectionMutation(stored.noteSections, sectionId);
    result = await saveExplicitEdit(stored, mutation.sections);
  });
  return result;
}

export async function saveLexicalNoteOrganization(itemId, sections = []) {
  let result;
  await db.transaction("rw", db.items, db.events, async () => {
    const stored = assertLexical(await db.items.get(itemId), itemId);
    const mutation = organizeNoteSectionsMutation(stored.noteSections, sections);
    if (!mutation.changed) {
      result = stored;
      return;
    }
    result = await saveExplicitEdit(stored, mutation.sections);
  });
  return result;
}
