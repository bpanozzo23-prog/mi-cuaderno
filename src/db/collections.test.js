import { beforeEach, describe, expect, it } from "vitest";
import { clearAllPersonalData, db, setPref } from "./db.js";
import { allEvents, EVENT_TYPES } from "./events.js";
import { createItem, getItem, newLexical, newPage } from "./items.js";
import {
  PINNED_PAGE_IDS_PREF,
  commitCollectionAdd,
  getPinnedPageIds,
  removeCollectionMember,
  saveCollectionOrganization,
  setPagePinned,
  setPageProfile,
} from "./collections.js";
import { newMeaning } from "../lib/meanings.js";
import { buildFixtureDictionary, installFetchStub } from "../test/dictFixture.js";
import { fetchManifest, installDictionary, removeDictionary } from "./ref/install.js";

const QUESTIONS = "page-group:11111111-1111-4111-8111-111111111111";
const ANSWERS = "page-group:22222222-2222-4222-8222-222222222222";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

const eventTypes = async () => (await allEvents()).map((event) => event.type);

const collectionPage = (overrides = {}) =>
  newPage({
    title: "Conversation",
    pageProfile: "collection",
    collection: { groups: [{ id: QUESTIONS, name: "Questions", itemKeys: [] }] },
    ...overrides,
  });

describe("setPageProfile", () => {
  it("preserves page content and dormant layout, and logs exactly one edit per change", async () => {
    const page = await createItem(collectionPage({ body: "Overview", pageDate: "2026-08-03" }));
    const before = await getItem(page.id);

    const general = await setPageProfile(page.id, "general");
    expect(general).toMatchObject({
      pageProfile: "general",
      title: "Conversation",
      body: "Overview",
      pageDate: "2026-08-03",
      collection: before.collection,
    });
    expect(await eventTypes()).toEqual([EVENT_TYPES.create, EVENT_TYPES.edit]);

    const unchangedAt = general.updatedAt;
    await setPageProfile(page.id, "general");
    expect((await getItem(page.id)).updatedAt).toBe(unchangedAt);
    expect(await eventTypes()).toEqual([EVENT_TYPES.create, EVENT_TYPES.edit]);
  });

  it("rejects nonpage targets and future profiles without writing", async () => {
    const lexical = await createItem(newLexical({ term: "hola" }));
    await expect(setPageProfile(lexical.id, "collection")).rejects.toThrow(/Page/);
    await expect(setPageProfile(lexical.id, "source")).rejects.toThrow(/general or collection/);
    expect(await eventTypes()).toEqual([EVENT_TYPES.create]);
  });
});

describe("commitCollectionAdd", () => {
  it("adds personal members in selection order with no edit event", async () => {
    const page = await createItem(collectionPage());
    const first = await createItem(newLexical({ term: "¿Qué?" }));
    const second = await createItem(newLexical({ term: "¿Cómo?" }));

    const result = await commitCollectionAdd(page.id, {
      targetGroupId: QUESTIONS,
      candidates: [
        { kind: "personal", itemId: second.id },
        { kind: "personal", itemId: first.id },
      ],
    });

    expect(result.memberIds).toEqual([second.id, first.id]);
    expect(result.addedIds).toEqual([second.id, first.id]);
    expect((await getItem(page.id)).linkedKeys).toEqual([second.id, first.id]);
    expect((await getItem(page.id)).collection.groups[0].itemKeys).toEqual([second.id, first.id]);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
  });

  it("promotes an incoming lexical backlink by flipping the one stored edge atomically", async () => {
    const page = await createItem(collectionPage());
    const incoming = await createItem(newLexical({ term: "pues", linkedKeys: [page.id] }));

    await commitCollectionAdd(page.id, {
      candidates: [{ kind: "personal", itemId: incoming.id }],
    });

    expect((await getItem(incoming.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).linkedKeys).toEqual([incoming.id]);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
  });

  it("reuses an attached personal entry and materializes dictionary/new selections only at commit", async () => {
    const page = await createItem(collectionPage());
    const attached = await createItem(
      newLexical({ term: "hola", dictKey: "dict:wiktionary-es:hola:noun:1" })
    );
    const beforeCreates = (await allEvents()).filter((event) => event.type === EVENT_TYPES.create).length;

    const result = await commitCollectionAdd(page.id, {
      candidates: [
        {
          kind: "dictionary",
          entry: {
            id: "dict:wiktionary-es:hola:noun:1",
            lemma: "hola",
            pos: "noun",
            senses: [{ gloss: "hello" }],
          },
        },
        {
          kind: "dictionary",
          entry: {
            id: "dict:wiktionary-es:gracias:interjection:1",
            lemma: "gracias",
            pos: "interjection",
            senses: [{ gloss: "thank you" }],
          },
        },
        { kind: "new", term: "por supuesto", form: "phrase", meanings: [newMeaning({ gloss: "of course" })] },
      ],
    });

    expect(result.memberIds[0]).toBe(attached.id);
    expect(result.createdItems).toHaveLength(2);
    expect(result.createdItems.map((item) => item.type)).toEqual(["lexical", "lexical"]);
    expect(result.createdItems[0].dictKey).toBe("dict:wiktionary-es:gracias:interjection:1");
    expect(result.createdItems[1]).toMatchObject({ term: "por supuesto", form: "phrase" });
    const afterCreates = (await allEvents()).filter((event) => event.type === EVENT_TYPES.create).length;
    expect(afterCreates - beforeCreates).toBe(2);
  });

  it("reuses a personal attachment through the installed dictionary alias map", async () => {
    const previousFetch = globalThis.fetch;
    const oldKey = "dict:wiktionary-es:sacar:verb:1";
    const currentKey = "dict:wiktionary-es:sacar:verb";
    await removeDictionary();
    installFetchStub(await buildFixtureDictionary({ previousIds: { [oldKey]: currentKey } }));
    await installDictionary(await fetchManifest());

    try {
      const page = await createItem(collectionPage());
      const attached = await createItem(newLexical({ term: "sacar", dictKey: oldKey }));
      const beforeCreates = (await allEvents()).filter((event) => event.type === EVENT_TYPES.create).length;

      const result = await commitCollectionAdd(page.id, {
        candidates: [{
          kind: "dictionary",
          entry: { id: currentKey, lemma: "sacar", pos: "verb", senses: [{ gloss: "take out" }] },
        }],
      });

      expect(result.memberIds).toEqual([attached.id]);
      expect(result.createdItems).toEqual([]);
      expect((await getItem(page.id)).linkedKeys).toEqual([attached.id]);
      const afterCreates = (await allEvents()).filter((event) => event.type === EVENT_TYPES.create).length;
      expect(afterCreates).toBe(beforeCreates);
    } finally {
      globalThis.fetch = previousFetch;
      await removeDictionary();
    }
  });

  it("rolls back all staged creation and links when any candidate is invalid", async () => {
    const page = await createItem(collectionPage());
    const beforeItems = await db.items.count();
    const beforeEvents = await db.events.count();

    await expect(
      commitCollectionAdd(page.id, {
        candidates: [
          { kind: "new", term: "válido", form: "word", meanings: [] },
          { kind: "personal", itemId: "user:missing" },
        ],
      })
    ).rejects.toThrow(/existing personal lexical/i);

    expect(await db.items.count()).toBe(beforeItems);
    expect(await db.events.count()).toBe(beforeEvents);
    expect((await getItem(page.id)).linkedKeys).toEqual([]);
  });

  it("never accepts a raw dictionary key as a member", async () => {
    const page = await createItem(collectionPage());
    await expect(
      commitCollectionAdd(page.id, { candidates: [{ kind: "personal", itemId: "dict:wiktionary-es:hola" }] })
    ).rejects.toThrow(/personal item ID/i);
  });
});

describe("saveCollectionOrganization", () => {
  async function organizedScenario() {
    const a = await createItem(newLexical({ term: "a" }));
    const b = await createItem(newLexical({ term: "b" }));
    const c = await createItem(newLexical({ term: "c" }));
    const relatedPage = await createItem(newPage({ title: "Related" }));
    const page = await createItem(
      collectionPage({
        linkedKeys: ["dict:first", a.id, relatedPage.id, b.id, "dict:last", c.id],
        collection: {
          groups: [
            { id: QUESTIONS, name: "Questions", itemKeys: [a.id] },
            { id: ANSWERS, name: "Answers", itemKeys: [b.id] },
          ],
        },
      })
    );
    return { page, a, b, c, relatedPage };
  }

  it("atomically saves groups, ordering and explicit removals with one page edit", async () => {
    const { page, a, b, c, relatedPage } = await organizedScenario();
    const beforeEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;

    const result = await saveCollectionOrganization(page.id, {
      groups: [{ id: ANSWERS, name: "  Responses  ", itemKeys: [b.id, a.id] }],
      ungroupedItemKeys: [],
      removedItemKeys: [c.id],
    });

    expect(result.changed).toBe(true);
    const stored = await getItem(page.id);
    expect(stored.collection.groups).toEqual([
      { id: ANSWERS, name: "Responses", itemKeys: [b.id, a.id] },
    ]);
    // Group display order lives in itemKeys; only removed/Not-grouped member slots change in
    // linkedKeys, so unrelated page/dictionary link positions and grouped keys stay untouched.
    expect(stored.linkedKeys).toEqual(["dict:first", a.id, relatedPage.id, b.id, "dict:last"]);
    expect(await getItem(c.id)).toBeTruthy();
    const afterEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;
    expect(afterEdits - beforeEdits).toBe(1);
  });

  it("does no write and logs no event for an unchanged draft", async () => {
    const { page, a, b, c, relatedPage } = await organizedScenario();
    // Grouped layout order is independent of linkedKeys. This is still a no-op draft: c is
    // already the sole Not-grouped member, even though its link slot precedes grouped members.
    await db.items.update(page.id, {
      linkedKeys: ["dict:first", c.id, relatedPage.id, a.id, "dict:last", b.id],
    });
    const before = await getItem(page.id);
    const beforeEvents = await db.events.count();

    const result = await saveCollectionOrganization(page.id, {
      groups: before.collection.groups,
      ungroupedItemKeys: [c.id],
      removedItemKeys: [],
    });

    expect(result.changed).toBe(false);
    expect((await getItem(page.id)).updatedAt).toBe(before.updatedAt);
    expect(await db.events.count()).toBe(beforeEvents);
    expect(result.page.collection.groups[0].itemKeys).toEqual([a.id]);
    expect(result.page.collection.groups[1].itemKeys).toEqual([b.id]);
  });

  it("requires every member to be placed or explicitly removed before any write", async () => {
    const { page, a } = await organizedScenario();
    const before = await getItem(page.id);
    const beforeEvents = await db.events.count();

    await expect(
      saveCollectionOrganization(page.id, {
        groups: [{ id: QUESTIONS, name: "Questions", itemKeys: [a.id] }],
        ungroupedItemKeys: [],
        removedItemKeys: [],
      })
    ).rejects.toThrow(/placed or explicitly removed/i);

    expect(await getItem(page.id)).toEqual(before);
    expect(await db.events.count()).toBe(beforeEvents);
  });
});

describe("removeCollectionMember", () => {
  it("removes the page-owned link and dormant placement without deleting the lexical item or logging", async () => {
    const lexical = await createItem(newLexical({ term: "hola" }));
    const page = await createItem(
      collectionPage({
        pageProfile: "general",
        linkedKeys: [lexical.id],
        collection: { groups: [{ id: QUESTIONS, name: "Questions", itemKeys: [lexical.id] }] },
      })
    );
    const beforeEvents = await db.events.count();

    await removeCollectionMember(page.id, lexical.id);

    expect((await getItem(page.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).collection.groups[0].itemKeys).toEqual([]);
    expect(await getItem(lexical.id)).toBeTruthy();
    expect(await db.events.count()).toBe(beforeEvents);
  });
});

describe("page pins", () => {
  it("filters stale, duplicate and nonpage IDs defensively", async () => {
    const page = await createItem(newPage({ title: "Page" }));
    const lexical = await createItem(newLexical({ term: "word" }));
    await setPref(PINNED_PAGE_IDS_PREF, ["user:stale", page.id, page.id, lexical.id, "dict:x"]);
    expect(await getPinnedPageIds()).toEqual([page.id]);
  });

  it("pins without touching page timestamps or events", async () => {
    const first = await createItem(newPage({ title: "First" }));
    const second = await createItem(newPage({ title: "Second" }));
    const before = await getItem(first.id);
    const beforeEvents = await db.events.count();

    expect(await setPagePinned(first.id, true)).toEqual([first.id]);
    expect(await setPagePinned(second.id, true)).toEqual([first.id, second.id]);
    expect(await setPagePinned(first.id, false)).toEqual([second.id]);

    expect((await getItem(first.id)).updatedAt).toBe(before.updatedAt);
    expect(await db.events.count()).toBe(beforeEvents);
  });
});
