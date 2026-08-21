import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllPersonalData, db } from "./db.js";
import { allEvents, EVENT_TYPES } from "./events.js";
import { createItem, getItem, newLexical } from "./items.js";
import {
  deleteLexicalNoteSection,
  saveLexicalNoteOrganization,
  saveLexicalNoteSection,
} from "./lexicalNotes.js";
import { newNoteSection } from "../lib/pageKinds.js";

beforeEach(async () => {
  vi.restoreAllMocks();
  await db.open();
  await clearAllPersonalData();
});

const editEventsFor = async (id) => (await allEvents()).filter(
  (event) => event.itemKey === id && event.type === EVENT_TYPES.edit
);

describe("lexical structured Notes mutations", () => {
  it("adds and edits a subsection while preserving General note and stable IDs", async () => {
    const root = newNoteSection({ name: "Usage", body: "Root body." });
    const item = await createItem(newLexical({
      term: "quedar",
      notes: "General note\n\nkept exactly.",
      noteSections: [root],
    }));

    const added = await saveLexicalNoteSection(item.id, {
      parentId: root.id,
      name: "Register",
      body: "Conversational.",
    });
    const edited = await saveLexicalNoteSection(item.id, {
      id: added.section.id,
      name: "Usage and register",
      body: "Mostly conversational.",
    });
    const saved = await getItem(item.id);

    expect(saved.notes).toBe("General note\n\nkept exactly.");
    expect(edited.section).toMatchObject({
      id: added.section.id,
      parentId: root.id,
      name: "Usage and register",
      body: "Mostly conversational.",
    });
    expect(saved.noteSections.map((section) => section.id)).toEqual([root.id, added.section.id]);
    expect(await editEventsFor(item.id)).toHaveLength(2);
  });

  it("organizes canonically, preserves bodies, and skips unchanged interleaved imports", async () => {
    const usage = newNoteSection({ name: "Usage", body: "Keep usage." });
    const examples = newNoteSection({ name: "Examples", body: "Keep examples." });
    const register = newNoteSection({ parentId: usage.id, name: "Register", body: "Keep register." });
    const item = await createItem(newLexical({
      term: "andar",
      noteSections: [usage, register, examples],
    }));
    await db.items.put({ ...item, noteSections: [usage, examples, register] });

    const unchanged = await saveLexicalNoteOrganization(item.id, [
      { id: usage.id, parentId: null, name: "Usage" },
      { id: register.id, parentId: usage.id, name: "Register" },
      { id: examples.id, parentId: null, name: "Examples" },
    ]);
    expect(unchanged.noteSections).toEqual([usage, examples, register]);
    expect(await editEventsFor(item.id)).toEqual([]);

    await saveLexicalNoteOrganization(item.id, [
      { id: examples.id, parentId: null, name: "Examples in context" },
      { id: register.id, parentId: examples.id, name: "Register" },
      { id: usage.id, parentId: null, name: "Usage" },
    ]);
    expect((await getItem(item.id)).noteSections).toEqual([
      expect.objectContaining({ id: examples.id, name: "Examples in context", body: "Keep examples." }),
      expect.objectContaining({ id: register.id, parentId: examples.id, body: "Keep register." }),
      expect.objectContaining({ id: usage.id, body: "Keep usage." }),
    ]);
    expect(await editEventsFor(item.id)).toHaveLength(1);
  });

  it("blocks parent deletion, deletes a leaf atomically, and skips unchanged edits", async () => {
    const root = newNoteSection({ name: "Root", body: "Root body." });
    const child = newNoteSection({ parentId: root.id, name: "Child", body: "Child body." });
    const item = await createItem(newLexical({ term: "salir", noteSections: [root, child] }));
    const before = await getItem(item.id);

    await expect(deleteLexicalNoteSection(item.id, root.id)).rejects.toThrow(/subsections/i);
    expect(await getItem(item.id)).toEqual(before);
    await saveLexicalNoteSection(item.id, { id: child.id, name: "Child", body: "Child body." });
    expect(await editEventsFor(item.id)).toEqual([]);

    await deleteLexicalNoteSection(item.id, child.id);
    expect((await getItem(item.id)).noteSections).toEqual([root]);
    expect(await editEventsFor(item.id)).toHaveLength(1);
  });

  it("rejects pages and invalid hierarchy changes without writes or events", async () => {
    const item = await createItem(newLexical({ term: "hacer" }));
    const root = newNoteSection({ name: "Root" });
    const child = newNoteSection({ parentId: root.id, name: "Child" });
    await saveLexicalNoteOrganization(item.id, [root, child]);
    const before = await getItem(item.id);
    const eventsBefore = await editEventsFor(item.id);

    await expect(saveLexicalNoteOrganization(item.id, [
      { id: root.id, parentId: child.id, name: "Root" },
      { id: child.id, parentId: root.id, name: "Child" },
    ])).rejects.toThrow(/cycle|one subsection level/i);
    expect(await getItem(item.id)).toEqual(before);
    expect(await editEventsFor(item.id)).toEqual(eventsBefore);
  });
});
