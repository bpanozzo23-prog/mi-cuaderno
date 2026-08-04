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
} from "./items.js";
import { allEvents, EVENT_TYPES } from "./events.js";
import { localDate } from "../lib/dates.js";
import { newMeaning } from "../lib/meanings.js";
import { PINNED_PAGE_IDS_PREF } from "../lib/pageProfiles.js";
import { emptyGrammar, emptySource } from "../lib/pageKinds.js";

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
    expect(stored).not.toHaveProperty("pageProfile");
    expect(stored.collection).toEqual({ enabled: false, groups: [] });
    expect(stored.source).toEqual(emptySource());
    expect(stored.grammar).toEqual(emptyGrammar());
    expect(displayTitle(stored)).toBe("Preterite vs imperfect");
  });

  it("leaves pageDate null when it is not a journal entry", async () => {
    const page = await createItem(newPage({ title: "Ser vs estar" }));
    expect((await getItem(page.id)).pageDate).toBeNull();
  });

  it("stores validated editable starter groups on a new Collection", async () => {
    const page = await createItem(
      newPage({
        title: "Conversation",
        pageProfile: "collection",
        collection: { groups: [{ id: GROUP_ID, name: "  Questions  ", itemKeys: [] }] },
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
      pageProfile: "collection",
      collection: { groups: [{ id: GROUP_ID, name: "Questions", itemKeys: ["user:missing"] }] },
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
    const page = await createItem(
      newPage({
        title: "Conversation",
        pageProfile: "general",
        linkedKeys: [lexical.id],
        collection: { groups: [{ id: GROUP_ID, name: "Questions", itemKeys: [lexical.id] }] },
      })
    );
    await setPref(PINNED_PAGE_IDS_PREF, [page.id]);

    await deleteItem(lexical.id);
    expect((await getItem(page.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).collection.groups[0].itemKeys).toEqual([]);

    await deleteItem(page.id);
    expect(await getPref(PINNED_PAGE_IDS_PREF)).toEqual([]);
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
