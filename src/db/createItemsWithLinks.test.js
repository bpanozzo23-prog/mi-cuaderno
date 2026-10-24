import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import { buildBackup } from "./backup.js";
import { createItem, createItemsWithLinks, deleteItem, newLexical } from "./items.js";
import { newMeaning } from "../lib/meanings.js";
import * as persistence from "../lib/persistence.js";
import { settleAsyncCalls } from "../test/async.js";

let persist;
beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  persist = vi.spyOn(persistence, "requestPersistence").mockResolvedValue(null);
});
afterEach(async () => {
  try { await settleAsyncCalls(persist); }
  finally { vi.restoreAllMocks(); }
});

const snapshot = async () => ({
  items: await db.items.orderBy("id").toArray(),
  events: await db.events.toArray(),
});

const kept = (term, extra = {}) => newLexical({
  term,
  form: term.includes(" ") ? "phrase" : "word",
  meanings: [newMeaning({
    gloss: `meaning of ${term}`,
    usageCue: "everyday",
    usageLabels: ["informal"],
    examples: [{ es: `Uso ${term}.`, en: "Example." }],
  })],
  notes: "From a conversation.",
  tags: ["emociones", "ia"],
  ...extra,
});

describe("createItemsWithLinks", () => {
  it("creates each item with one create event and stores links once, on the new item", async () => {
    const existing = await createItem(newLexical({ term: "echar de menos", form: "phrase" }));
    const before = await db.items.get(existing.id);
    persist.mockClear();
    const [a, b] = [kept("extrañar"), kept("hacer falta")];
    const result = await createItemsWithLinks({
      items: [a, b],
      links: [
        { ownerId: a.id, targetId: existing.id, relationship: { type: "similar_meaning", subject: "owner" } },
        { ownerId: b.id, targetId: existing.id, relationship: { type: "found_in", subject: "target" } },
        { ownerId: b.id, targetId: a.id, relationship: { type: "related", subject: "owner" } },
      ],
    });

    expect(result.created).toEqual([a.id, b.id]);
    expect(result.linked).toHaveLength(3);
    expect(result.skipped).toEqual([]);
    const events = await db.events.toArray();
    expect(events.filter((e) => e.type === "create").map((e) => e.itemKey).sort()).toEqual([a.id, b.id, existing.id].sort());
    expect(events.some((e) => e.type === "edit")).toBe(false);

    const savedA = await db.items.get(a.id);
    const savedB = await db.items.get(b.id);
    expect(savedA.linkedKeys).toEqual([existing.id]);
    expect(savedB.linkedKeys).toEqual([existing.id, a.id]);
    expect(savedB.linkAnnotations).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetKey: existing.id, type: "found_in", subject: "target" }),
    ]));
    // The existing entry is untouched: no reciprocal copy, same content and timestamp.
    expect(await db.items.get(existing.id)).toEqual(before);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("skips and reports a link whose existing entry was deleted, and still saves the items", async () => {
    const gone = await createItem(newLexical({ term: "ausente" }));
    await deleteItem(gone.id);
    const item = kept("extrañar");
    const link = { ownerId: item.id, targetId: gone.id, relationship: { type: "related", subject: "owner" } };
    const result = await createItemsWithLinks({ items: [item], links: [link] });
    expect(result).toEqual({ created: [item.id], linked: [], skipped: [{ ...link, reason: "target_deleted" }] });
    expect((await db.items.get(item.id)).linkedKeys).toEqual([]);
  });

  it("stores a pair once even when the batch names it in both directions", async () => {
    const [a, b] = [kept("uno"), kept("dos")];
    const result = await createItemsWithLinks({
      items: [a, b],
      links: [
        { ownerId: a.id, targetId: b.id, relationship: { type: "variant", subject: "owner" } },
        { ownerId: b.id, targetId: a.id, relationship: { type: "contrast", subject: "owner" } },
      ],
    });
    expect(result.linked).toHaveLength(1);
    expect(result.skipped).toEqual([expect.objectContaining({ ownerId: b.id, reason: "already_connected" })]);
    expect((await db.items.get(b.id)).linkedKeys).toEqual([]);
  });

  it("refuses a link between two existing entries before writing anything", async () => {
    const before = await snapshot();
    await expect(createItemsWithLinks({
      items: [kept("nuevo")],
      links: [{ ownerId: "user:a", targetId: "user:b", relationship: { type: "related" } }],
    })).rejects.toThrow(/must involve a new item/);
    expect(await snapshot()).toEqual(before);
  });

  describe("rolls back completely", () => {
    let existing;
    let before;
    beforeEach(async () => {
      existing = await createItem(newLexical({ term: "echar de menos", form: "phrase" }));
      persist.mockClear();
      before = await snapshot();
    });

    const batch = () => {
      const [a, b] = [kept("extrañar"), kept("hacer falta")];
      return {
        items: [a, b],
        links: [
          { ownerId: a.id, targetId: existing.id, relationship: { type: "similar_meaning", subject: "owner" } },
          { ownerId: b.id, targetId: a.id, relationship: { type: "related", subject: "owner" } },
        ],
      };
    };

    async function expectRollbackThenExactRetry(failure) {
      await expect(createItemsWithLinks(batch())).rejects.toThrow(failure);
      expect(await snapshot()).toEqual(before);
      expect(persist).not.toHaveBeenCalled();
      vi.restoreAllMocks();
      persist = vi.spyOn(persistence, "requestPersistence").mockResolvedValue(null);
      const retry = batch();
      const result = await createItemsWithLinks(retry);
      expect(result.created).toHaveLength(2);
      expect((await snapshot()).items).toHaveLength(3);
      expect(await db.events.where("type").equals("create").count()).toBe(3);
      expect(persist).toHaveBeenCalledTimes(1);
    }

    it("when an item cannot be added", async () => {
      vi.spyOn(db.items, "add").mockImplementationOnce(async function () {
        throw new Error("Item add failed.");
      });
      await expectRollbackThenExactRetry("Item add failed.");
    });

    it("when a create event fails partway through the batch", async () => {
      const add = db.events.add.bind(db.events);
      let calls = 0;
      vi.spyOn(db.events, "add").mockImplementation((...args) => {
        calls += 1;
        if (calls === 2) return Promise.reject(new Error("Second event failed."));
        return add(...args);
      });
      await expectRollbackThenExactRetry("Second event failed.");
    });

    it("when a later link fails after an earlier one succeeded", async () => {
      const put = db.items.put.bind(db.items);
      let puts = 0;
      vi.spyOn(db.items, "put").mockImplementation((...args) => {
        puts += 1;
        if (puts === 2) return Promise.reject(new Error("Second link failed."));
        return put(...args);
      });
      await expectRollbackThenExactRetry("Second link failed.");
    });
  });

  it("produces a notebook that still exports as a valid backup", async () => {
    const existing = await createItem(newLexical({ term: "echar de menos", form: "phrase" }));
    const [a, b] = [kept("extrañar"), kept("hacer falta", { tags: ["ia"] })];
    await createItemsWithLinks({
      items: [a, b],
      links: [
        { ownerId: a.id, targetId: existing.id, relationship: { type: "similar_meaning", subject: "owner" } },
        { ownerId: b.id, targetId: existing.id, relationship: { type: "explained_by", subject: "target" } },
      ],
    });
    const envelope = await buildBackup();
    expect(envelope.userItems).toHaveLength(3);
  });
});
