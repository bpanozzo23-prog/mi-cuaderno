import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, clearAllPersonalData, getPref, setPref } from "./db.js";
import {
  addDictionaryMeaningsToItem, createAndLinkItem, createItem, createKeptPracticeEntry,
  getItem, linkItems, newLexical, newPage, updateItem,
} from "./items.js";
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
  items: await db.items.toArray(),
  events: await db.events.toArray(),
});
const practiceDetails = {
  skill: "narrate", promptId: "fixture-prompt", tier: "easier",
  offeredWordIds: [], tema: "cocina",
};

describe("all-or-nothing item saves", () => {
  it("rolls back a failed create event and retries with exactly one item and event", async () => {
    const before = await snapshot();
    vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Create event failed."));
    await expect(createItem(newPage({ title: "Draft", body: "Hoy escribo." }))).rejects.toThrow("Create event failed.");
    expect(await snapshot()).toEqual(before);
    expect(persist).not.toHaveBeenCalled();

    const saved = await createItem(newPage({ title: "Draft", body: "Hoy escribo." }));
    expect((await snapshot()).items).toEqual([saved]);
    expect((await snapshot()).events).toEqual([expect.objectContaining({ type: "create", itemKey: saved.id })]);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("rolls back content, meanings, attachments, tags and timestamp when an edit event fails", async () => {
    const item = await createItem(newLexical({ term: "banco", notes: "Original", meanings: [newMeaning({ gloss: "bench" })] }));
    await db.items.update(item.id, { updatedAt: "2026-01-01T00:00:00.000Z" });
    const before = await snapshot();
    vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Edit event failed."));
    await expect(updateItem(item.id, {
      notes: "Changed", meanings: [newMeaning({ gloss: "bank" })],
      tags: ["new"], dictKeys: ["dict:wiktionary-es:banco:noun"],
    })).rejects.toThrow("Edit event failed.");
    expect(await snapshot()).toEqual(before);
  });

  it.each([true, false])("rejects an update of a missing item without history (logEdit %s)", async (logEdit) => {
    const before = await snapshot();
    await expect(updateItem("user:missing", { notes: "Lost target" }, { logEdit })).rejects.toThrow(/no longer exists/);
    expect(await snapshot()).toEqual(before);
  });

  it("keeps dictionary-meaning imports compatible with the parent transaction and rolls back failures", async () => {
    const item = await createItem(newLexical({ term: "malo", meanings: [newMeaning({ gloss: "bad" })] }));
    const imported = newMeaning({ gloss: "badly", posOverride: "adverb" });
    const before = await snapshot();
    vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Import edit failed."));
    await expect(addDictionaryMeaningsToItem(item.id, [imported], "dict:wiktionary-es:malo:adverb")).rejects.toThrow("Import edit failed.");
    expect(await snapshot()).toEqual(before);
    const saved = await addDictionaryMeaningsToItem(item.id, [imported], "dict:wiktionary-es:malo:adverb");
    expect(saved.meanings).toEqual([...item.meanings, imported]);
    expect(saved.dictKeys).toEqual(["dict:wiktionary-es:malo:adverb"]);
    expect(await db.events.where("type").equals("edit").count()).toBe(1);
  });

  it.each(["owner", "target"])("serializes a competing meaning connection after removal of its %s meaning", async (endpoint) => {
    const removed = newMeaning({ gloss: "bank" });
    const otherMeaning = newMeaning({ gloss: "institution" });
    const target = await createItem(newLexical({ term: "banco", meanings: [removed] }));
    const other = await createItem(newLexical({ term: "entidad", meanings: [otherMeaning] }));
    const read = db.items.toArray.bind(db.items);
    let competing;
    vi.spyOn(db.items, "toArray").mockImplementationOnce(async () => {
      const rows = await read();
      // Queue a real independent writer immediately after the guard's read. Do not
      // await it inside the transaction whose lock it must wait for.
      competing = Dexie.ignoreTransaction(() => {
        const [from, to, fromMeaning, toMeaning] = endpoint === "owner"
          ? [target, other, removed, otherMeaning]
          : [other, target, otherMeaning, removed];
        return linkItems(from.id, to.id, { type: "similar_meaning" }, {
          fromMeaningId: fromMeaning.id, toMeaningId: toMeaning.id,
        }).then(() => ({ saved: true }), (error) => ({ error }));
      });
      return rows;
    });
    try {
      await updateItem(target.id, { meanings: [] });
      const outcome = await competing;
      expect(outcome.error?.message).toMatch(/no longer exists/);
      expect((await getItem(target.id)).meanings).toEqual([]);
      expect((await getItem(target.id)).linkAnnotations).toEqual([]);
      expect((await getItem(other.id)).linkAnnotations).toEqual([]);
    } finally {
      await competing;
    }
  });
});

describe("combined creation operations", () => {
  it.each(["event", "link"])("rolls back quick-create, its event and source changes on %s failure, then retries once", async (failure) => {
    const source = await createItem(newPage({ title: "Grammar notes", body: "Existing text" }));
    await db.items.update(source.id, { updatedAt: "2026-01-01T00:00:00.000Z" });
    const before = await snapshot();
    persist.mockClear();
    if (failure === "event") vi.spyOn(db.events, "add").mockRejectedValueOnce(new Error("Save failed."));
    else vi.spyOn(db.items, "put").mockRejectedValueOnce(new Error("Save failed."));
    const relationship = { type: "explained_by", subject: "target", note: "A useful guide" };
    await expect(createAndLinkItem(source.id, newLexical({ term: "por" }), relationship)).rejects.toThrow("Save failed.");
    expect(await snapshot()).toEqual(before);
    expect(persist).not.toHaveBeenCalled();

    const saved = await createAndLinkItem(source.id, newLexical({ term: "por" }), relationship);
    expect(await db.items.count()).toBe(2);
    expect((await getItem(source.id)).linkedKeys).toEqual([saved.id]);
    expect((await getItem(source.id)).linkAnnotations).toEqual([{ targetKey: saved.id, ...relationship }]);
    expect(saved.linkedKeys).toEqual([]);
    expect(await db.events.where("type").equals("create").count()).toBe(2);
    expect(await db.events.where("type").equals("edit").count()).toBe(0);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("rejects quick-create from a missing source rather than saving an unlinked item", async () => {
    const before = await snapshot();
    await expect(createAndLinkItem("user:missing", newPage({ title: "New page" }))).rejects.toThrow(/no longer exists/);
    expect(await snapshot()).toEqual(before);
    expect(persist).not.toHaveBeenCalled();
  });

  it.each(["create", "practice_write"])("rolls back a kept practice entry on %s failure, then saves exactly one page and both events", async (failure) => {
    const add = db.events.add.bind(db.events);
    vi.spyOn(db.events, "add").mockImplementation((event) => {
      if (event.type === failure) throw new Error("Practice save failed.");
      return add(event);
    });
    const before = await snapshot();
    const draft = { title: "Práctica", body: "> Una pregunta\n\nFui al mercado.", pageDate: "2026-10-17" };
    await expect(createKeptPracticeEntry(newPage(draft), practiceDetails)).rejects.toThrow("Practice save failed.");
    expect(await snapshot()).toEqual(before);
    expect(persist).not.toHaveBeenCalled();
    db.events.add.mockRestore();

    const saved = await createKeptPracticeEntry(newPage(draft), practiceDetails);
    expect((await snapshot()).items).toEqual([saved]);
    expect(saved).toMatchObject(draft);
    const events = await db.events.where("itemKey").equals(saved.id).toArray();
    expect(events).toHaveLength(2);
    expect(events.find((event) => event.type === "create")).toBeTruthy();
    expect(events.find((event) => event.type === "practice_write").metadata).toEqual({ ...practiceDetails, kept: true });
    expect(persist).toHaveBeenCalledTimes(1);
  });
});

describe("storage protection after commit", () => {
  it.each(["standalone", "link", "practice"])("requests protection outside the completed %s save, with prefs usable", async (kind) => {
    const source = await createItem(newPage({ title: "Source" }));
    persist.mockClear();
    let observed;
    persist.mockImplementation(async () => {
      expect(Dexie.currentTransaction).toBeNull();
      observed = await snapshot();
      await setPref("storagePersisted", true);
    });
    const page = newPage({ title: "New", body: "Writing", pageDate: "2026-10-17" });
    if (kind === "standalone") await createItem(page);
    if (kind === "link") await createAndLinkItem(source.id, page);
    if (kind === "practice") await createKeptPracticeEntry(page, practiceDetails);
    await settleAsyncCalls(persist);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await getPref("storagePersisted")).toBe(true);
    expect(observed.items).toHaveLength(2);
    expect(observed.events).toHaveLength(kind === "practice" ? 3 : 2);
    if (kind === "link") expect(observed.items.find(({ id }) => id === source.id).linkedKeys).toEqual([page.id]);
  });

  it("defers protection until an enclosing transaction commits", async () => {
    persist.mockImplementation(async () => {
      expect(Dexie.currentTransaction).toBeNull();
      expect(await db.items.count()).toBe(1);
      await setPref("storagePersisted", true);
    });
    await db.transaction("rw", db.items, db.events, async () => {
      await createItem(newPage({ title: "Nested" }));
      expect(persist).not.toHaveBeenCalled();
    });
    await settleAsyncCalls(persist);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(await getPref("storagePersisted")).toBe(true);
  });

  it("never requests protection when an enclosing transaction rolls back", async () => {
    await expect(db.transaction("rw", db.items, db.events, async () => {
      await createItem(newPage({ title: "Rolled back" }));
      throw new Error("Outer save failed.");
    })).rejects.toThrow("Outer save failed.");
    expect(await snapshot()).toEqual({ items: [], events: [] });
    expect(persist).not.toHaveBeenCalled();
  });

  it("does not reject a committed save when storage protection fails", async () => {
    // The background failure is deliberately swallowed by production; inspect its
    // rejected promise here so generic teardown need not treat it as unfinished work.
    persist.mockRejectedValueOnce(new Error("Browser protection unavailable."));
    const item = await createItem(newPage({ title: "Saved" }));
    await expect(persist.mock.results[0].value).rejects.toThrow("Browser protection unavailable.");
    expect(await getItem(item.id)).toEqual(item);
    expect(await db.events.count()).toBe(1);
    persist.mockClear();
  });
});
