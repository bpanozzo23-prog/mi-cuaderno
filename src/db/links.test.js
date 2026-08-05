import { describe, it, expect, beforeEach } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import {
  newLexical,
  newPage,
  createItem,
  getItem,
  deleteItem,
  linkItems,
  setLinkRelationship,
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
        pageFocus: "notes",
        linkedKeys: [lexical.id],
        collection: { enabled: false, groups: [{ id: GROUP_ID, name: "Questions", itemKeys: [lexical.id] }] },
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

  it("stores a sparse normalized relationship with a newly created edge", async () => {
    const word = await createItem(newLexical({ term: "por" }));
    const page = await createItem(newPage({ title: "Por and para" }));

    await linkItems(word.id, page.id, {
      type: "explained_by",
      subject: "owner",
      note: "  This page has the decision guide.  ",
    });

    expect(await getItem(word.id)).toMatchObject({
      linkedKeys: [page.id],
      linkAnnotations: [{
        targetKey: page.id,
        type: "explained_by",
        subject: "owner",
        note: "This page has the decision guide.",
      }],
    });
    expect((await getItem(page.id)).linkedKeys).toEqual([]);
  });

  it("edits through a backlink without reciprocal storage, timestamps or events", async () => {
    const word = await createItem(newLexical({ term: "chamba" }));
    const page = await createItem(newPage({ title: "Film notes" }));
    await linkItems(word.id, page.id);
    const beforeWord = await getItem(word.id);
    const beforePage = await getItem(page.id);
    const beforeEvents = await db.events.count();

    // From the page's perspective, the page Contains chamba. The physical edge remains on chamba.
    await setLinkRelationship(page.id, word.id, {
      type: "found_in",
      subject: "owner",
      note: "Scene at the café.",
    });

    expect((await getItem(word.id)).linkAnnotations).toEqual([{
      targetKey: page.id,
      type: "found_in",
      subject: "target",
      note: "Scene at the café.",
    }]);
    expect((await getItem(word.id)).linkedKeys).toEqual([page.id]);
    expect((await getItem(page.id)).linkedKeys).toEqual([]);
    expect((await getItem(word.id)).updatedAt).toBe(beforeWord.updatedAt);
    expect((await getItem(page.id)).updatedAt).toBe(beforePage.updatedAt);
    expect(await db.events.count()).toBe(beforeEvents);
  });

  it("edits a preserved legacy self-link exactly once without changing recency or events", async () => {
    const word = await createItem(newLexical({ term: "mismo" }));

    // The current API refuses self-links, but schema v4 deliberately preserves any already stored
    // by an older database. Seed that legacy topology directly so this remains a migration-safety
    // regression rather than weakening the creation guard.
    await db.items.update(word.id, {
      linkedKeys: [word.id],
      linkAnnotations: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const before = await getItem(word.id);
    const beforeEvents = await db.events.count();

    await setLinkRelationship(word.id, word.id, {
      type: "contrast",
      subject: "owner",
      note: "Legacy self-reference.",
    });

    const after = await getItem(word.id);
    expect(after.linkedKeys).toEqual([word.id]);
    expect(after.linkAnnotations).toEqual([{
      targetKey: word.id,
      type: "contrast",
      subject: "owner",
      note: "Legacy self-reference.",
    }]);
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(await db.events.count()).toBe(beforeEvents);
  });

  it("normalizes Related with no note by removing the explicit annotation", async () => {
    const word = await createItem(newLexical({ term: "ser" }));
    const other = await createItem(newLexical({ term: "estar" }));
    await linkItems(word.id, other.id, { type: "often_confused", note: "Both mean to be." });

    await setLinkRelationship(other.id, word.id, { type: "related", note: "   " });

    expect((await getItem(word.id)).linkAnnotations).toEqual([]);
    expect((await getItem(word.id)).linkedKeys).toEqual([other.id]);
  });

  it("does not create a reciprocal edge when linking from a backlink", async () => {
    const word = await createItem(newLexical({ term: "ser" }));
    const page = await createItem(newPage({ title: "Grammar" }));
    await linkItems(page.id, word.id, { type: "explained_by" });

    await linkItems(word.id, page.id, { type: "contrast" });

    expect((await getItem(page.id)).linkedKeys).toEqual([word.id]);
    expect((await getItem(word.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).linkAnnotations[0].type).toBe("explained_by");
  });

  it("removes reciprocal legacy copies and both annotations in one unlink", async () => {
    const first = await createItem(newLexical({ term: "first" }));
    const second = await createItem(newLexical({ term: "second" }));
    await db.items.update(first.id, {
      linkedKeys: [second.id],
      linkAnnotations: [{ targetKey: second.id, type: "contrast", subject: "owner", note: "A" }],
    });
    await db.items.update(second.id, {
      linkedKeys: [first.id],
      linkAnnotations: [{ targetKey: first.id, type: "contrast", subject: "owner", note: "B" }],
    });

    await unlinkItems(second.id, first.id);

    expect((await getItem(first.id)).linkedKeys).toEqual([]);
    expect((await getItem(first.id)).linkAnnotations).toEqual([]);
    expect((await getItem(second.id)).linkedKeys).toEqual([]);
    expect((await getItem(second.id)).linkAnnotations).toEqual([]);
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

  it("removes every annotation that targeted the deleted item", async () => {
    const target = await createItem(newLexical({ term: "target" }));
    const owner = await createItem(newPage({
      title: "Owner",
      linkedKeys: [target.id],
      linkAnnotations: [{
        targetKey: target.id,
        type: "explained_by",
        subject: "target",
        note: "Explains the page.",
      }],
    }));

    await deleteItem(target.id);

    expect((await getItem(owner.id)).linkedKeys).toEqual([]);
    expect((await getItem(owner.id)).linkAnnotations).toEqual([]);
  });
});
