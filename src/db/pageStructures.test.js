import { beforeEach, describe, expect, it, vi } from "vitest";
import { allEvents, EVENT_TYPES } from "./events.js";
import { clearAllPersonalData, db } from "./db.js";
import { createItem, getItem, linkItems, newLexical, newPage } from "./items.js";
import {
  copyPageStructure,
  deleteGrammarExample,
  deleteGrammarSection,
  deleteSourceCapture,
  saveGrammarExample,
  saveGrammarOrganization,
  saveGrammarSection,
  savePageConfiguration,
  savePageFocus,
  saveSourceCapture,
  saveSourceCaptureOrder,
} from "./pageStructures.js";
import {
  PAGE_FOCUSES,
  emptyGrammar,
  emptySource,
  newGrammarExample,
  newGrammarSection,
  newSourceCapture,
} from "../lib/pageKinds.js";
import { newPageGroup } from "../lib/collections.js";
import { annotationForTarget } from "../lib/relationships.js";

beforeEach(async () => {
  vi.restoreAllMocks();
  await db.open();
  await clearAllPersonalData();
});

const editEventsFor = async (id) => (await allEvents()).filter(
  (event) => event.itemKey === id && event.type === EVENT_TYPES.edit
);

describe("page configuration and structure copying", () => {
  it("preserves hidden content, falls back to Notes, and reports a dated move to Diario", async () => {
    const capture = newSourceCapture({ text: "A passage" });
    const page = await createItem(newPage({
      title: "Source",
      pageDate: "2026-08-04",
      pageFocus: PAGE_FOCUSES.source,
      source: emptySource({ enabled: true, captures: [capture] }),
    }));

    const result = await savePageConfiguration(page.id, {
      pageFocus: PAGE_FOCUSES.source,
      sourceEnabled: false,
    });
    expect(result.movesToJournal).toBe(true);
    expect(result.page.pageFocus).toBe(PAGE_FOCUSES.notes);
    expect(result.page.source.enabled).toBe(false);
    expect(result.page.source.captures).toEqual([capture]);
    expect(await editEventsFor(page.id)).toHaveLength(1);
  });

  it("persists a valid focus tap once and rejects a disabled focus", async () => {
    const page = await createItem(newPage({
      title: "Composite",
      collection: { enabled: true, groups: [] },
    }));
    await savePageFocus(page.id, PAGE_FOCUSES.vocabulary);
    expect((await getItem(page.id)).pageFocus).toBe(PAGE_FOCUSES.vocabulary);
    await expect(savePageFocus(page.id, PAGE_FOCUSES.grammar)).rejects.toThrow(/focus requires|enabled/i);
  });

  it("copies only focus, capability flags, group names, and section names with fresh IDs", async () => {
    const group = newPageGroup("Softening");
    const section = newGrammarSection({
      name: "Formation",
      explanation: "Personal content",
    });
    const source = await createItem(newPage({
      title: "Original",
      body: "Do not copy",
      pageFocus: PAGE_FOCUSES.grammar,
      collection: { enabled: true, groups: [group] },
      source: emptySource({ enabled: true, creator: "Do not copy", captures: [newSourceCapture({ text: "Do not copy" })] }),
      grammar: emptyGrammar({ enabled: true, keyIdea: "Do not copy", sections: [section] }),
      tags: ["private"],
      linkedKeys: [],
    }));

    const copy = await copyPageStructure(source.id, { title: "Copy" });
    expect(copy).toMatchObject({
      title: "Copy",
      body: "",
      pageDate: null,
      pageFocus: PAGE_FOCUSES.grammar,
      tags: [],
      linkedKeys: [],
      collection: { enabled: true },
      source: { enabled: true, creator: "", captures: [] },
      grammar: { enabled: true, keyIdea: "" },
    });
    expect(copy.collection.groups.map(({ name }) => name)).toEqual(["Softening"]);
    expect(copy.collection.groups[0].id).not.toBe(group.id);
    expect(copy.grammar.sections.map(({ name }) => name)).toEqual(["Formation"]);
    expect(copy.grammar.sections[0].id).not.toBe(section.id);
    expect(copy.grammar.sections[0].explanation).toBe("");
  });
});

describe("Source and Grammar structured mutations", () => {
  it("saves a capture as one edit and requires contextual vocabulary to be authoritative", async () => {
    const word = await createItem(newLexical({ term: "nomás" }));
    const page = await createItem(newPage({
      title: "Market",
      linkedKeys: [word.id],
      source: emptySource({ enabled: true }),
    }));
    const saved = await saveSourceCapture(page.id, {
      type: "passage",
      text: "  Nomás dígame.  ",
      location: "18:42",
      reflection: "Softening",
      itemKeys: [word.id],
    });
    expect(saved.capture.text).toBe("Nomás dígame.");
    expect((await getItem(page.id)).source.captures).toHaveLength(1);
    expect(await editEventsFor(page.id)).toHaveLength(1);

    await saveSourceCapture(page.id, { ...saved.capture, itemKeys: [] });
    const detached = await getItem(page.id);
    expect(detached.linkedKeys).toEqual([word.id]);
    expect(detached.source.captures[0].itemKeys).toEqual([]);
    expect(await editEventsFor(page.id)).toHaveLength(2);

    const unlinked = await createItem(newLexical({ term: "joven" }));
    await expect(saveSourceCapture(page.id, { text: "Joven", itemKeys: [unlinked.id] }))
      .rejects.toThrow(/already be linked/i);
  });

  it("blocks explicit capture organization and deletion while Source is hidden", async () => {
    const first = newSourceCapture({ text: "First" });
    const second = newSourceCapture({ text: "Second" });
    const page = await createItem(newPage({
      title: "Hidden Source",
      source: emptySource({ enabled: false, captures: [first, second] }),
    }));
    const before = await getItem(page.id);

    await expect(saveSourceCaptureOrder(page.id, [second.id, first.id]))
      .rejects.toThrow(/Enable Source notebook/i);
    await expect(deleteSourceCapture(page.id, first.id))
      .rejects.toThrow(/Enable Source notebook/i);

    expect(await getItem(page.id)).toEqual(before);
    expect(await editEventsFor(page.id)).toEqual([]);
  });

  it("supports same-page exact capture references without storing a self-link", async () => {
    const capture = newSourceCapture({ text: "Estaba mirando." });
    const section = newGrammarSection({ name: "Background" });
    const page = await createItem(newPage({
      title: "Composite",
      source: emptySource({ enabled: true, captures: [capture] }),
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    await saveGrammarExample(page.id, section.id, {
      es: "Estaba mirando.",
      en: "I was looking.",
      note: "",
      itemKeys: [],
      sourceCaptureRef: { pageId: page.id, captureId: capture.id },
    });
    const saved = await getItem(page.id);
    expect(saved.linkedKeys).not.toContain(page.id);
    expect(saved.grammar.sections[0].examples[0].sourceCaptureRef).toEqual({
      pageId: page.id,
      captureId: capture.id,
    });
    expect(await editEventsFor(page.id)).toHaveLength(1);
  });

  it("detaches example vocabulary without removing authoritative page membership", async () => {
    const word = await createItem(newLexical({ term: "hablar" }));
    const example = newGrammarExample({ es: "Yo hablaba.", itemKeys: [word.id] });
    const section = newGrammarSection({ name: "Examples", examples: [example] });
    const page = await createItem(newPage({
      title: "Imperfect",
      linkedKeys: [word.id],
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));

    await saveGrammarExample(page.id, section.id, { ...example, itemKeys: [] });

    const saved = await getItem(page.id);
    expect(saved.linkedKeys).toEqual([word.id]);
    expect(saved.grammar.sections[0].examples[0].itemKeys).toEqual([]);
    expect(await editEventsFor(page.id)).toHaveLength(1);
  });

  it("atomically adds a stable section while renaming, ordering, and moving examples", async () => {
    const example = newGrammarExample({ es: "Yo hablaba." });
    const formation = newGrammarSection({
      name: "Formation",
      explanation: "Keep this explanation.",
      pattern: "stem + ending",
      examples: [example],
    });
    const comparison = newGrammarSection({ name: "Comparison" });
    const added = newGrammarSection({ name: "Exceptions" });
    const page = await createItem(newPage({
      title: "Imperfect",
      grammar: emptyGrammar({ enabled: true, sections: [formation, comparison] }),
    }));
    const original = await getItem(page.id);

    await expect(saveGrammarOrganization(page.id, [
      { id: formation.id, name: "Formation", examples: [] },
      { id: added.id, name: "formation", examples: [] },
      { id: comparison.id, name: "Comparison", examples: [{ id: example.id }] },
    ])).rejects.toThrow(/unique/i);
    expect(await getItem(page.id)).toEqual(original);
    expect(await editEventsFor(page.id)).toHaveLength(0);

    await saveGrammarOrganization(page.id, [
      { id: comparison.id, name: "Choosing a form", examples: [{ id: example.id }] },
      { id: added.id, name: "Exceptions", examples: [] },
      { id: formation.id, name: "Formation", examples: [] },
    ]);

    const saved = await getItem(page.id);
    expect(saved.grammar.sections.map(({ id }) => id)).toEqual([comparison.id, added.id, formation.id]);
    expect(saved.grammar.sections[0]).toMatchObject({
      id: comparison.id,
      name: "Choosing a form",
      examples: [expect.objectContaining({ id: example.id })],
    });
    expect(saved.grammar.sections[1]).toEqual({
      id: added.id,
      name: "Exceptions",
      explanation: "",
      pattern: "",
      examples: [],
    });
    expect(saved.grammar.sections[2]).toMatchObject({
      explanation: "Keep this explanation.",
      pattern: "stem + ending",
      examples: [],
    });
    expect(await editEventsFor(page.id)).toHaveLength(1);
  });

  it("owns an external exact reference with one outgoing link and retains that connection after the example is deleted", async () => {
    const capture = newSourceCapture({ text: "Mientras caminaba, empezó a llover." });
    const source = await createItem(newPage({
      title: "Story",
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const section = newGrammarSection({ name: "Interrupted background" });
    const grammar = await createItem(newPage({
      title: "Past narration",
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));

    const saved = await saveGrammarExample(grammar.id, section.id, {
      es: "Mientras caminaba, empezó a llover.",
      itemKeys: [],
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    });
    expect((await getItem(grammar.id)).linkedKeys).toEqual([source.id]);
    expect((await getItem(source.id)).linkedKeys).toEqual([]);

    await deleteGrammarExample(grammar.id, section.id, saved.example.id);
    const afterDelete = await getItem(grammar.id);
    expect(afterDelete.linkedKeys).toEqual([source.id]);
    expect(afterDelete.grammar.sections[0].examples).toEqual([]);
    expect(await editEventsFor(grammar.id)).toHaveLength(2);
    expect(await editEventsFor(source.id)).toHaveLength(0);
  });

  it("promotes an incoming Source-page edge and preserves annotation orientation", async () => {
    const capture = newSourceCapture({ text: "Llegó al mercado." });
    const source = await createItem(newPage({
      title: "Source",
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const section = newGrammarSection({ name: "Bounded events" });
    const grammar = await createItem(newPage({
      title: "Guide",
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    await linkItems(source.id, grammar.id, { type: "found_in", subject: "owner", note: "Exact source" });
    const sourceBefore = await getItem(source.id);

    await saveGrammarExample(grammar.id, section.id, {
      es: "Llegó al mercado.",
      en: "",
      note: "",
      itemKeys: [],
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    });
    const [nextSource, nextGrammar] = await Promise.all([getItem(source.id), getItem(grammar.id)]);
    expect(nextSource.linkedKeys).not.toContain(grammar.id);
    expect(nextGrammar.linkedKeys).toContain(source.id);
    expect(annotationForTarget(nextGrammar, source.id)).toMatchObject({
      type: "found_in",
      subject: "target",
      note: "Exact source",
    });
    expect(nextSource.updatedAt).toBe(sourceBefore.updatedAt);
    expect(await editEventsFor(source.id)).toHaveLength(0);
    expect(await editEventsFor(grammar.id)).toHaveLength(1);
  });

  it("removes a reciprocal legacy Source edge even when Grammar already owns the outgoing edge", async () => {
    const capture = newSourceCapture({ text: "Llegó cuando dormía." });
    const source = await createItem(newPage({
      title: "Source",
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const section = newGrammarSection({ name: "Background" });
    const grammar = await createItem(newPage({
      title: "Guide",
      linkedKeys: [source.id],
      linkAnnotations: [{
        targetKey: source.id,
        type: "contrast",
        subject: "owner",
        note: "Keep the Grammar-owned description.",
      }],
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    await db.items.update(source.id, {
      linkedKeys: [grammar.id],
      linkAnnotations: [{
        targetKey: grammar.id,
        type: "found_in",
        subject: "owner",
        note: "Legacy reciprocal copy.",
      }],
    });
    const sourceBefore = await getItem(source.id);

    await saveGrammarExample(grammar.id, section.id, {
      es: "Llegó cuando dormía.",
      itemKeys: [],
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    });

    const [nextSource, nextGrammar] = await Promise.all([getItem(source.id), getItem(grammar.id)]);
    expect(nextSource.linkedKeys).toEqual([]);
    expect(nextSource.linkAnnotations).toEqual([]);
    expect(nextSource.updatedAt).toBe(sourceBefore.updatedAt);
    expect(nextGrammar.linkedKeys).toEqual([source.id]);
    expect(annotationForTarget(nextGrammar, source.id)).toMatchObject({
      type: "contrast",
      subject: "owner",
      note: "Keep the Grammar-owned description.",
    });
  });

  it("rolls back incoming-edge promotion and its annotation when the example fails validation", async () => {
    const capture = newSourceCapture({ text: "Llegaba temprano." });
    const section = newGrammarSection({ name: "Repeated actions" });
    const grammar = await createItem(newPage({
      title: "Guide",
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    const source = await createItem(newPage({
      title: "Source",
      linkedKeys: [grammar.id],
      linkAnnotations: [{
        targetKey: grammar.id,
        type: "found_in",
        subject: "owner",
        note: "Must survive rollback.",
      }],
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const unlinked = await createItem(newLexical({ term: "temprano" }));
    const [sourceBefore, grammarBefore] = await Promise.all([getItem(source.id), getItem(grammar.id)]);
    const eventsBefore = await db.events.count();

    await expect(saveGrammarExample(grammar.id, section.id, {
      es: "Llegaba temprano.",
      itemKeys: [unlinked.id],
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    })).rejects.toThrow(/already be linked/i);

    expect(await getItem(source.id)).toEqual(sourceBefore);
    expect(await getItem(grammar.id)).toEqual(grammarBefore);
    expect(await db.events.count()).toBe(eventsBefore);
  });

  it("clears exact dependent references when a capture is deleted without editing the dependent page", async () => {
    const capture = newSourceCapture({ text: "A passage" });
    const source = await createItem(newPage({
      title: "Source",
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const section = newGrammarSection({ name: "Guide" });
    const grammar = await createItem(newPage({
      title: "Grammar",
      linkedKeys: [source.id],
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    await saveGrammarExample(grammar.id, section.id, {
      es: "Example",
      itemKeys: [],
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    });
    const dependentBefore = await getItem(grammar.id);
    const editsBefore = (await editEventsFor(grammar.id)).length;
    const sourceEditsBefore = (await editEventsFor(source.id)).length;
    await deleteSourceCapture(source.id, capture.id);
    const dependentAfter = await getItem(grammar.id);
    expect(dependentAfter.grammar.sections[0].examples[0].sourceCaptureRef).toBeNull();
    expect(dependentAfter.linkedKeys).toEqual([source.id]);
    expect(dependentAfter.updatedAt).toBe(dependentBefore.updatedAt);
    expect(await editEventsFor(grammar.id)).toHaveLength(editsBefore);
    expect((await getItem(source.id)).source.captures).toEqual([]);
    expect(await editEventsFor(source.id)).toHaveLength(sourceEditsBefore + 1);
  });

  it("clears a same-page exact reference as part of the capture owner’s one explicit edit", async () => {
    const capture = newSourceCapture({ text: "Estudiaba cuando llamaste." });
    const section = newGrammarSection({ name: "Interrupted action" });
    const page = await createItem(newPage({
      title: "Composite",
      source: emptySource({ enabled: true, captures: [capture] }),
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    await saveGrammarExample(page.id, section.id, {
      es: "Estudiaba cuando llamaste.",
      itemKeys: [],
      sourceCaptureRef: { pageId: page.id, captureId: capture.id },
    });
    const editsBefore = (await editEventsFor(page.id)).length;

    await deleteSourceCapture(page.id, capture.id);

    const saved = await getItem(page.id);
    expect(saved.source.captures).toEqual([]);
    expect(saved.grammar.sections[0].examples[0].sourceCaptureRef).toBeNull();
    expect(saved.linkedKeys).not.toContain(page.id);
    expect(await editEventsFor(page.id)).toHaveLength(editsBefore + 1);
  });

  it("rolls back the owner capture deletion and edit event if dependent cleanup fails", async () => {
    const capture = newSourceCapture({ text: "A transactional passage" });
    const source = await createItem(newPage({
      title: "Source",
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const section = newGrammarSection({ name: "Guide" });
    const grammar = await createItem(newPage({
      title: "Grammar",
      linkedKeys: [source.id],
      grammar: emptyGrammar({ enabled: true, sections: [section] }),
    }));
    await saveGrammarExample(grammar.id, section.id, {
      es: "A transactional example",
      itemKeys: [],
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    });
    const [sourceBefore, grammarBefore] = await Promise.all([getItem(source.id), getItem(grammar.id)]);
    const eventsBefore = await db.events.count();
    vi.spyOn(db.items, "update").mockRejectedValueOnce(new Error("Dependent cleanup failed."));

    await expect(deleteSourceCapture(source.id, capture.id)).rejects.toThrow(/Dependent cleanup failed/);

    expect(await getItem(source.id)).toEqual(sourceBefore);
    expect(await getItem(grammar.id)).toEqual(grammarBefore);
    expect(await db.events.count()).toBe(eventsBefore);
  });

  it("blocks deletion of a nonempty Grammar section", async () => {
    const page = await createItem(newPage({
      title: "Guide",
      grammar: emptyGrammar({ enabled: true }),
    }));
    const { section } = await saveGrammarSection(page.id, { name: "Formation" });
    await saveGrammarExample(page.id, section.id, { es: "Se habla español.", itemKeys: [] });
    await expect(deleteGrammarSection(page.id, section.id)).rejects.toThrow(/Move or delete/i);
  });

  it("rejects explicit organizer and delete mutations while Grammar is hidden", async () => {
    const example = newGrammarExample({ es: "Se habla español." });
    const section = newGrammarSection({ name: "Formation", examples: [example] });
    const page = await createItem(newPage({
      title: "Hidden guide",
      grammar: emptyGrammar({ enabled: false, sections: [section] }),
    }));
    const before = await getItem(page.id);
    const eventsBefore = await db.events.count();

    await expect(deleteGrammarSection(page.id, section.id)).rejects.toThrow(/Enable Grammar guide/i);
    await expect(deleteGrammarExample(page.id, section.id, example.id)).rejects.toThrow(/Enable Grammar guide/i);
    await expect(saveGrammarOrganization(page.id, [
      { id: section.id, name: "Renamed", examples: [{ id: example.id }] },
    ])).rejects.toThrow(/Enable Grammar guide/i);

    expect(await getItem(page.id)).toEqual(before);
    expect(await db.events.count()).toBe(eventsBefore);
  });
});
