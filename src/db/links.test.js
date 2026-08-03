import { describe, it, expect, beforeEach } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import {
  newLexical,
  newPage,
  createItem,
  getItem,
  deleteItem,
  linkItems,
  unlinkItems,
  backlinksFor,
} from "./items.js";
import { newMeaning } from "../lib/meanings.js";
import { allEvents, EVENT_TYPES } from "./events.js";

const GROUP_ID = "page-group:11111111-1111-4111-8111-111111111111";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

async function scenario() {
  // The brief's acceptance case: a grammar page linking two words.
  const preterite = await createItem(newLexical({ term: "sacó", meanings: [newMeaning({ gloss: "he/she took out" })] }));
  const imperfect = await createItem(newLexical({ term: "sacaba", meanings: [newMeaning({ gloss: "he/she used to take out" })] }));
  const page = await createItem(newPage({ title: "Preterite vs imperfect" }));
  await linkItems(page.id, preterite.id);
  await linkItems(page.id, imperfect.id);
  return { preterite, imperfect, page };
}

describe("links are stored once and read in both directions", () => {
  it("stores the link only on the item where it was made", async () => {
    const { preterite, page } = await scenario();

    expect((await getItem(page.id)).linkedKeys).toContain(preterite.id);
    // The target is untouched — it may one day be a read-only dictionary entry.
    expect((await getItem(preterite.id)).linkedKeys).toEqual([]);
  });

  it("computes the reverse direction from the index", async () => {
    const { preterite, page } = await scenario();

    const backlinks = await backlinksFor(preterite.id);
    expect(backlinks.map((i) => i.id)).toEqual([page.id]);
  });

  // Reading both directions for a screen is a pure render-time derivation over items already
  // in memory — src/lib/links.test.js covers it. What has to be true *here* is that the
  // database stores the link on one side and the index can answer the other.

  it("refuses to link an item to itself and never duplicates a link", async () => {
    const word = await createItem(newLexical({ term: "sacar" }));
    const page = await createItem(newPage({ title: "Verbs" }));

    await linkItems(word.id, word.id);
    await linkItems(page.id, word.id);
    await linkItems(page.id, word.id);

    expect((await getItem(word.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).linkedKeys).toEqual([word.id]);
  });

  it("unlinks from either side", async () => {
    const { preterite, page } = await scenario();

    // Asked from the word, though the link lives on the page.
    await unlinkItems(preterite.id, page.id);

    expect((await getItem(page.id)).linkedKeys).not.toContain(preterite.id);
    expect(await backlinksFor(preterite.id)).toEqual([]);
  });

  it("unlinks from either side and prunes dormant Collection placement", async () => {
    const lexical = await createItem(newLexical({ term: "hola" }));
    const page = await createItem(
      newPage({
        title: "Conversation",
        pageProfile: "general",
        linkedKeys: [lexical.id],
        collection: { groups: [{ id: GROUP_ID, name: "Questions", itemKeys: [lexical.id] }] },
      })
    );

    // Asked from the lexical side even though the page owns the link and the dormant layout.
    await unlinkItems(lexical.id, page.id);

    expect((await getItem(page.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).collection.groups[0].itemKeys).toEqual([]);
  });

  it("does not log an edit event for linking, which is bookkeeping rather than content", async () => {
    await scenario();
    const editEvents = (await allEvents()).filter((e) => e.type === EVENT_TYPES.edit);
    expect(editEvents).toEqual([]);
  });
});

describe("deletion leaves no dangling links", () => {
  it("removes the deleted key from every item that pointed at it", async () => {
    const { preterite, imperfect, page } = await scenario();

    await deleteItem(preterite.id);

    const survivingPage = await getItem(page.id);
    expect(survivingPage.linkedKeys).toEqual([imperfect.id]);

    const allKeys = (await db.items.toArray()).flatMap((i) => i.linkedKeys);
    const existingIds = new Set((await db.items.toArray()).map((i) => i.id));
    expect(allKeys.every((key) => existingIds.has(key))).toBe(true);
  });

  it("keeps the deleted item's history in the log", async () => {
    const { preterite } = await scenario();
    await deleteItem(preterite.id);

    const its = (await allEvents()).filter((e) => e.itemKey === preterite.id).map((e) => e.type);
    expect(its).toEqual([EVENT_TYPES.create, EVENT_TYPES.delete]);
  });
});
