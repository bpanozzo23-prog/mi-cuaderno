import { describe, it, expect, beforeEach, vi } from "vitest";
import { db, clearAllPersonalData, getPref, setPref } from "./db.js";
import {
  newLexical,
  newLexicalFromEntry,
  newPage,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  allItems,
  displayTitle,
  getPinnedLexicalIds,
  saveEntryFeedback,
  setLexicalPinned,
} from "./items.js";
import { makeStoredFeedback } from "../lib/diarioReview.js";
import { allEvents, EVENT_TYPES } from "./events.js";
import { localDate } from "../lib/dates.js";
import { newMeaning } from "../lib/meanings.js";
import { PINNED_PAGE_IDS_PREF } from "../lib/pageKinds.js";
import { PINNED_LEXICAL_IDS_PREF } from "../lib/lexicalViews.js";
import {
  emptyGrammar,
  emptySource,
  newGrammarExample,
  newGrammarSection,
  newNoteSection,
  newSourceCapture,
} from "../lib/pageKinds.js";

const GROUP_ID = "page-group:11111111-1111-4111-8111-111111111111";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  vi.restoreAllMocks();
});

const typesOf = async () => (await allEvents()).map((e) => e.type);

describe("lexical items", () => {
  it("stores the brief's shape and logs a create event", async () => {
    const item = await createItem(
      newLexical({ term: " sacar ", meanings: [newMeaning({ gloss: " to take out " })], pos: "verb", tags: ["verbs", "verbs", " "] })
    );

    const stored = await getItem(item.id);
    expect(stored.id).toMatch(/^user:/);
    expect(stored.type).toBe("lexical");
    expect(stored.term).toBe("sacar");
    expect(stored.meanings).toHaveLength(1);
    expect(stored.meanings[0].gloss).toBe("to take out");
    expect(stored.meanings[0].id).toMatch(/^meaning:/);
    expect(stored.form).toBe("word");
    expect(stored.tags).toEqual(["verbs"]); // trimmed, deduplicated, blanks dropped
    expect(stored.dictKey).toBeNull();
    expect(stored.createdAt).toBe(stored.updatedAt);

    const events = await allEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: EVENT_TYPES.create, itemKey: item.id, localDate: localDate() });
  });

  it("treats a multiword phrase as first-class, not a part of speech", async () => {
    const item = await createItem(newLexical({ term: "tener ganas de", form: "phrase" }));
    expect((await getItem(item.id)).form).toBe("phrase");
  });

  it("allows a term with no meanings", async () => {
    const item = await createItem(newLexical({ term: "por si acaso" }));
    expect((await getItem(item.id)).meanings).toEqual([]);
  });
});

describe("newLexicalFromEntry", () => {
  it("carries the lemma, first gloss and dictKey over, attached", () => {
    const entry = {
      id: "dict:wiktionary-es:chamba-noun-1",
      lemma: "chamba",
      pos: "noun",
      senses: [{ gloss: "job, work (Mexico)" }, { gloss: "luck" }],
    };

    const item = newLexicalFromEntry(entry);

    expect(item.term).toBe("chamba");
    expect(item.meanings).toHaveLength(1);
    expect(item.meanings[0].gloss).toBe("job, work (Mexico)");
    expect(item.meanings[0]).not.toHaveProperty("senseId");
    expect(item.pos).toBe("noun");
    expect(item.dictKey).toBe(entry.id);
  });

  it("maps the dictionary's abbreviated pos tags to the cuaderno's own labels", () => {
    expect(newLexicalFromEntry({ id: "dict:x", lemma: "x", pos: "adj", senses: [] }).pos).toBe("adjective");
    expect(newLexicalFromEntry({ id: "dict:x", lemma: "x", pos: "adv", senses: [] }).pos).toBe("adverb");
    expect(newLexicalFromEntry({ id: "dict:x", lemma: "x", pos: "verb", senses: [] }).pos).toBe("verb");
  });

  it("leaves meanings empty when the entry has no senses", () => {
    expect(newLexicalFromEntry({ id: "dict:x", lemma: "x", pos: "noun", senses: [] }).meanings).toEqual([]);
  });

  it("is only a builder — nothing is written until createItem is called", async () => {
    const entry = { id: "dict:wiktionary-es:chamba-noun-1", lemma: "chamba", pos: "noun", senses: [{ gloss: "job" }] };
    newLexicalFromEntry(entry);
    expect(await allItems()).toEqual([]);
  });
});

describe("pages", () => {
  it("stores title, body and an optional date", async () => {
    const page = await createItem(
      newPage({ title: "Preterite vs imperfect", body: "Completed vs ongoing.", pageDate: "2026-07-30" })
    );
    const stored = await getItem(page.id);
    expect(stored.type).toBe("page");
    expect(stored.title).toBe("Preterite vs imperfect");
    expect(stored.pageDate).toBe("2026-07-30");
    expect(stored.pageFocus).toBe("notes");
    expect(stored.noteSections).toEqual([]);
    expect(stored).not.toHaveProperty("pageProfile");
    expect(stored.collection).toEqual({ enabled: false, groups: [] });
    expect(stored.source).toEqual(emptySource());
    expect(stored.grammar).toEqual(emptyGrammar());
    expect(stored.feedback).toBeNull();
    expect(displayTitle(stored)).toBe("Preterite vs imperfect");
  });

  it("stores an independently cloned and normalized Notes outline", () => {
    const root = newNoteSection({ name: "About" });
    const child = newNoteSection({ parentId: root.id, name: "Register", body: "Usage notes" });
    child.name = "  Register  ";
    const source = [root, child];

    const page = newPage({ title: "Collection notes", noteSections: source });

    expect(page.noteSections).toEqual([
      root,
      { ...child, name: "Register" },
    ]);
    expect(page.noteSections).not.toBe(source);
    expect(page.noteSections[0]).not.toBe(source[0]);
    source[0].name = "Mutated later";
    expect(page.noteSections[0].name).toBe("About");
  });

  it("leaves pageDate null when it is not a journal entry", async () => {
    const page = await createItem(newPage({ title: "Ser vs estar" }));
    expect((await getItem(page.id)).pageDate).toBeNull();
  });

  it("stores validated editable starter groups on a new Collection", async () => {
    const page = await createItem(
      newPage({
        title: "Conversation",
        pageFocus: "vocabulary",
        collection: { enabled: true, groups: [{ id: GROUP_ID, name: "  Questions  ", itemKeys: [] }] },
      })
    );
    expect(await getItem(page.id)).toMatchObject({
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [{ id: GROUP_ID, name: "Questions", itemKeys: [] }] },
    });
    expect(await getItem(page.id)).not.toHaveProperty("pageProfile");
  });

  it("stores composable Source and Grammar structures without a competing profile", async () => {
    const lexical = newLexical({ term: "nomás" });
    const page = newPage({
      title: "Softening requests",
      pageFocus: "grammar",
      linkedKeys: [lexical.id],
      collection: { enabled: true, groups: [] },
      source: {
        enabled: true,
        format: "audio",
        creator: "Radio Ambulante",
        scope: "Episode 4",
        url: "https://example.com/episode",
        context: "Listening notes",
        captures: [{
          id: "source-capture:33333333-3333-4333-8333-333333333333",
          type: "passage",
          text: "Nomás dime.",
          location: "18:42",
          reflection: "",
          itemKeys: [lexical.id],
        }],
      },
      grammar: {
        enabled: true,
        keyIdea: "Softening",
        sections: [{
          id: "grammar-section:44444444-4444-4444-8444-444444444444",
          name: "  Use  ",
          explanation: "",
          pattern: "nomás + imperative",
          examples: [{
            id: "grammar-example:55555555-5555-4555-8555-555555555555",
            es: "Nomás dime.",
            en: "Just tell me.",
            note: "",
            itemKeys: [lexical.id],
            sourceCaptureRef: null,
          }],
        }],
      },
    });

    expect(page.pageFocus).toBe("grammar");
    expect(page.source.enabled).toBe(true);
    expect(page.grammar.sections[0].name).toBe("Use");
    expect(page.collection.enabled).toBe(true);
    expect(page).not.toHaveProperty("pageProfile");
  });

  it("rejects a saved group reference that is not also an outgoing page link", () => {
    expect(() => newPage({
      title: "Conversation",
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [{ id: GROUP_ID, name: "Questions", itemKeys: ["user:missing"] }] },
    })).toThrow(/current Collection members/i);
  });
});

describe("updating", () => {
  it("logs one edit event per explicit save and moves updatedAt", async () => {
    const item = await createItem(newLexical({ term: "madrugar" }));
    const before = await getItem(item.id);
    await new Promise((r) => setTimeout(r, 2));

    await updateItem(item.id, { notes: "A quien madruga, Dios le ayuda." });

    const after = await getItem(item.id);
    expect(after.notes).toBe("A quien madruga, Dios le ayuda.");
    expect(after.updatedAt > before.updatedAt).toBe(true);
    expect(await typesOf()).toEqual([EVENT_TYPES.create, EVENT_TYPES.edit]);
  });

  it("does not log an edit for bookkeeping changes such as linking", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));
    await updateItem(item.id, { linkedKeys: ["user:other"] }, { logEdit: false });
    expect(await typesOf()).toEqual([EVENT_TYPES.create]);
  });
});

describe("entry feedback", () => {
  const review = {
    verdict: "clear",
    summary: "Reads well.",
    items: [{ category: "praise", quote: "aunque llueva", corrected: null, explanation: "Good subjunctive." }],
  };
  const entryDraft = { title: "Mi día", body: "Hoy fui al mercado.", pageDate: "2026-08-11" };

  it("stores the review verbatim without moving updatedAt or logging any event", async () => {
    const page = await createItem(newPage(entryDraft));
    const stored = makeStoredFeedback(review, page);
    await new Promise((r) => setTimeout(r, 2));

    const updated = await saveEntryFeedback(page.id, stored);

    expect(updated.feedback).toEqual(stored);
    expect((await getItem(page.id)).feedback).toEqual(stored);
    expect(updated.updatedAt).toBe(page.updatedAt);
    expect(await typesOf()).toEqual([EVENT_TYPES.create]);
  });

  it("clears with null, keeping the field present", async () => {
    const page = await createItem(newPage(entryDraft));
    await saveEntryFeedback(page.id, makeStoredFeedback(review, page));

    const cleared = await saveEntryFeedback(page.id, null);

    expect(cleared.feedback).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(cleared, "feedback")).toBe(true);
    expect(await typesOf()).toEqual([EVENT_TYPES.create]);
  });

  it("rejects a missing id, a lexical target and an invalid shape", async () => {
    const lexical = await createItem(newLexical({ term: "sacar" }));
    const page = await createItem(newPage(entryDraft));

    await expect(saveEntryFeedback("user:missing", null)).rejects.toThrow(/does not exist/i);
    await expect(saveEntryFeedback(lexical.id, null)).rejects.toThrow(/does not exist/i);
    await expect(saveEntryFeedback(page.id, { verdict: "meh" })).rejects.toThrow(/verdict/i);
    expect((await getItem(page.id)).feedback).toBeNull();
  });
});

describe("deleting", () => {
  it("hard-deletes the record and leaves a delete event as the tombstone", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));

    await deleteItem(item.id);

    expect(await getItem(item.id)).toBeUndefined();
    expect(await db.items.count()).toBe(0);
    const events = await allEvents();
    expect(events.map((e) => e.type)).toEqual([EVENT_TYPES.create, EVENT_TYPES.delete]);
    // The history survives even though the item does not.
    expect(events.every((e) => e.itemKey === item.id)).toBe(true);
  });

  it("prunes active or dormant Collection layout and a deleted page's pin", async () => {
    const lexical = await createItem(newLexical({ term: "hola" }));
    const capture = newSourceCapture({ text: "Hola", itemKeys: [lexical.id] });
    const example = newGrammarExample({ es: "Hola.", itemKeys: [lexical.id] });
    const section = newGrammarSection({ name: "Greeting", examples: [example] });
    const page = await createItem(
      newPage({
        title: "Conversation",
        pageFocus: "notes",
        linkedKeys: [lexical.id],
        collection: { enabled: false, groups: [{ id: GROUP_ID, name: "Questions", itemKeys: [lexical.id] }] },
        source: emptySource({ enabled: false, captures: [capture] }),
        grammar: emptyGrammar({ enabled: false, sections: [section] }),
      })
    );
    await setPref(PINNED_PAGE_IDS_PREF, [page.id]);
    const dependentBefore = await getItem(page.id);
    const dependentEventsBefore = (await allEvents()).filter((event) => event.itemKey === page.id).length;

    await deleteItem(lexical.id);
    const dependentAfter = await getItem(page.id);
    expect(dependentAfter.linkedKeys).toEqual([]);
    expect(dependentAfter.collection.groups[0].itemKeys).toEqual([]);
    expect(dependentAfter.source.captures[0].itemKeys).toEqual([]);
    expect(dependentAfter.grammar.sections[0].examples[0].itemKeys).toEqual([]);
    expect(dependentAfter.updatedAt).toBe(dependentBefore.updatedAt);
    expect((await allEvents()).filter((event) => event.itemKey === page.id)).toHaveLength(dependentEventsBefore);

    await deleteItem(page.id);
    expect(await getPref(PINNED_PAGE_IDS_PREF)).toEqual([]);
  });

  it("cleans an exact Source-page reference and ordinary edge without touching the dependent page's recency or events", async () => {
    const capture = newSourceCapture({ text: "Estaba lloviendo." });
    const source = await createItem(newPage({
      title: "Story",
      source: emptySource({ enabled: true, captures: [capture] }),
    }));
    const example = newGrammarExample({
      es: "Estaba lloviendo.",
      sourceCaptureRef: { pageId: source.id, captureId: capture.id },
    });
    const grammar = await createItem(newPage({
      title: "Past narration",
      linkedKeys: [source.id],
      grammar: emptyGrammar({
        enabled: true,
        sections: [newGrammarSection({ name: "Background", examples: [example] })],
      }),
    }));
    const grammarBefore = await getItem(grammar.id);
    const grammarEventsBefore = (await allEvents()).filter((event) => event.itemKey === grammar.id).length;

    await deleteItem(source.id);

    const grammarAfter = await getItem(grammar.id);
    expect(grammarAfter.linkedKeys).toEqual([]);
    expect(grammarAfter.grammar.sections[0].examples[0].sourceCaptureRef).toBeNull();
    expect(grammarAfter.updatedAt).toBe(grammarBefore.updatedAt);
    expect((await allEvents()).filter((event) => event.itemKey === grammar.id)).toHaveLength(grammarEventsBefore);
    expect((await allEvents()).filter((event) => event.itemKey === source.id).map((event) => event.type))
      .toEqual([EVENT_TYPES.create, EVENT_TYPES.delete]);
  });

  it("rolls back hard deletion, dependent cleanup, and pins when the tombstone event cannot be written", async () => {
    const lexical = await createItem(newLexical({ term: "hola" }));
    const page = await createItem(newPage({ title: "Conversation", linkedKeys: [lexical.id] }));
    await setPref(PINNED_PAGE_IDS_PREF, [lexical.id, page.id]);
    const [lexicalBefore, pageBefore] = await Promise.all([getItem(lexical.id), getItem(page.id)]);
    const eventsBefore = await allEvents();
    vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Tombstone write failed."));

    await expect(deleteItem(lexical.id)).rejects.toThrow(/Tombstone write failed/);

    expect(await getItem(lexical.id)).toEqual(lexicalBefore);
    expect(await getItem(page.id)).toEqual(pageBefore);
    expect(await getPref(PINNED_PAGE_IDS_PREF)).toEqual([lexical.id, page.id]);
    expect(await allEvents()).toEqual(eventsBefore);
  });

  it("prunes a dormant layout reference even when its authoritative link was already absent", async () => {
    const lexical = await createItem(newLexical({ term: "hola" }));
    const page = await createItem(
      newPage({
        title: "Conversation",
        linkedKeys: [lexical.id],
        collection: { groups: [{ id: GROUP_ID, name: "Questions", itemKeys: [lexical.id] }] },
      })
    );
    // Simulate an older/malformed row that lost its authoritative link before cleanup existed.
    await db.items.update(page.id, { linkedKeys: [] });

    await deleteItem(lexical.id);

    expect((await getItem(page.id)).collection.groups[0].itemKeys).toEqual([]);
  });
});

describe("listing", () => {
  it("returns both content types, most recently touched first", async () => {
    const word = await createItem(newLexical({ term: "sacar" }));
    await new Promise((r) => setTimeout(r, 2));
    const page = await createItem(newPage({ title: "Ser vs estar" }));

    expect((await allItems()).map((i) => i.id)).toEqual([page.id, word.id]);
  });
});

describe("pinned vocabulary", () => {
  it("ignores stale, duplicate, page and dictionary ids on read", async () => {
    const lexical = await createItem(newLexical({ term: "sacar" }));
    const page = await createItem(newPage({ title: "Ser vs estar" }));
    await setPref(PINNED_LEXICAL_IDS_PREF, [
      "user:stale",
      lexical.id,
      lexical.id,
      page.id,
      "dict:x",
    ]);

    expect(await getPinnedLexicalIds()).toEqual([lexical.id]);
  });

  it("adds, keeps order and removes", async () => {
    const first = await createItem(newLexical({ term: "sacar" }));
    const second = await createItem(newLexical({ term: "dar con" }));

    expect(await setLexicalPinned(first.id, true)).toEqual([first.id]);
    expect(await setLexicalPinned(second.id, true)).toEqual([first.id, second.id]);
    expect(await setLexicalPinned(first.id, true)).toEqual([first.id, second.id]);
    expect(await setLexicalPinned(first.id, false)).toEqual([second.id]);
  });

  it("refuses to pin a page or a missing item through the lexical setter", async () => {
    const page = await createItem(newPage({ title: "Ser vs estar" }));

    await expect(setLexicalPinned(page.id, true)).rejects.toThrow(/does not exist/);
    await expect(setLexicalPinned("user:missing", true)).rejects.toThrow(/does not exist/);
    await expect(setLexicalPinned("user:whatever", "yes")).rejects.toThrow(/true or false/);
    expect(await getPref(PINNED_LEXICAL_IDS_PREF, [])).toEqual([]);
  });

  it("writes no item change or event", async () => {
    const lexical = await createItem(newLexical({ term: "sacar" }));
    const before = await getItem(lexical.id);
    const eventsBefore = await typesOf();

    await setLexicalPinned(lexical.id, true);

    expect(await getItem(lexical.id)).toEqual(before);
    expect(await typesOf()).toEqual(eventsBefore);
  });

  it("drops the pin when the word is deleted, so the backup can never cite a missing item", async () => {
    const lexical = await createItem(newLexical({ term: "sacar" }));
    const survivor = await createItem(newLexical({ term: "dar con" }));
    await setLexicalPinned(lexical.id, true);
    await setLexicalPinned(survivor.id, true);

    await deleteItem(lexical.id);

    expect(await getPref(PINNED_LEXICAL_IDS_PREF)).toEqual([survivor.id]);
  });
});
