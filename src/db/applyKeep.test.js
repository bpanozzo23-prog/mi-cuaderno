import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import { buildBackup } from "./backup.js";
import { applyKeep, createItem, deleteItem, linkItems, newLexical, updateItem } from "./items.js";
import { contentFingerprint } from "../lib/contentFingerprint.js";
import { newMeaning } from "../lib/meanings.js";
import * as persistence from "../lib/persistence.js";
import { settleAsyncCalls } from "../test/async.js";

let persist;
let quedar;
beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  persist = vi.spyOn(persistence, "requestPersistence").mockResolvedValue(null);
  quedar = await createItem(newLexical({
    term: "quedar",
    meanings: [
      newMeaning({ gloss: "to remain", examples: [{ es: "Queda poco.", en: "Little remains." }] }),
      newMeaning({ gloss: "to arrange to meet" }),
    ],
    myExamples: [{ es: "Quedamos mañana.", en: "We'll meet tomorrow." }],
    notes: "Very common.\n",
    tags: ["citas"],
  }));
});
afterEach(async () => {
  try { await settleAsyncCalls(persist); }
  finally { vi.restoreAllMocks(); }
});

const snapshot = async () => ({
  items: await db.items.orderBy("id").toArray(),
  events: await db.events.toArray(),
});
const editEvents = async (id) => (await db.events.toArray()).filter((event) => event.type === "edit" && event.itemKey === id);

/** The update as Keep's review would build it, frozen from `item` as it is now. */
const additions = (item, extra = {}) => ({
  itemId: item.id,
  fingerprint: contentFingerprint(item),
  examplesByMeaningId: {},
  myExamples: [],
  meanings: [],
  note: null,
  tags: [],
  ...extra,
});

describe("applyKeep — additions", () => {
  it("appends every kind of addition with one edit event, rewriting nothing", async () => {
    const before = await db.items.get(quedar.id);
    const update = additions(before, {
      examplesByMeaningId: { [before.meanings[1].id]: [{ es: "Quedamos a las cinco.", en: "Let's meet at five." }] },
      myExamples: [{ es: "Me quedé en casa.", en: "I stayed home." }],
      meanings: [{ gloss: "to fit (clothes)", usageCue: "", usageLabels: ["informal"], examples: [{ es: "Te queda bien.", en: "It suits you." }] }],
      note: "Quedar de + infinitive is Mexican.",
      tags: ["planes"],
    });
    const result = await applyKeep({ updates: [update], attachedIds: [quedar.id] });

    expect(result).toEqual({ created: [], updated: [quedar.id], linked: [], skipped: [], skippedUpdates: [] });
    const saved = await db.items.get(quedar.id);
    expect(saved.meanings.slice(0, 2).map((meaning) => meaning.id)).toEqual(before.meanings.map((meaning) => meaning.id));
    expect(saved.meanings[0]).toEqual(before.meanings[0]);
    expect(saved.meanings[1].examples).toEqual([{ es: "Quedamos a las cinco.", en: "Let's meet at five." }]);
    expect(saved.meanings[2]).toMatchObject({ gloss: "to fit (clothes)", usageLabels: ["informal"], examples: [{ es: "Te queda bien.", en: "It suits you." }] });
    expect(saved.meanings[2].id).toMatch(/^meaning:/);
    expect(before.meanings.map((meaning) => meaning.id)).not.toContain(saved.meanings[2].id);
    expect(saved.myExamples).toEqual([...before.myExamples, { es: "Me quedé en casa.", en: "I stayed home." }]);
    expect(saved.notes).toBe("Very common.\n\nQuedar de + infinitive is Mexican.");
    expect(saved.tags).toEqual(["citas", "planes"]);
    expect(await editEvents(quedar.id)).toHaveLength(1);
    expect(persist).toHaveBeenCalledTimes(2); // createItem in setup, then this save
  });

  it("skips an entry changed since Claude saw it, and still saves the rest", async () => {
    const frozen = await db.items.get(quedar.id);
    await updateItem(quedar.id, { notes: "Edited meanwhile." });
    const changed = await db.items.get(quedar.id);
    const fresh = newLexical({ term: "citarse" });

    const result = await applyKeep({
      items: [fresh],
      updates: [additions(frozen, { tags: ["planes"], note: "Claude's paragraph." })],
      attachedIds: [quedar.id],
    });
    expect(result.updated).toEqual([]);
    expect(result.skippedUpdates).toEqual([{ itemId: quedar.id, reason: "entry_changed" }]);
    expect(result.created).toEqual([fresh.id]);
    expect(await db.items.get(quedar.id)).toEqual(changed);
    expect(await editEvents(quedar.id)).toHaveLength(1); // only the owner's own edit
  });

  it("still adds after a connection was made meanwhile, since linking changes no content", async () => {
    const frozen = await db.items.get(quedar.id);
    const other = await createItem(newLexical({ term: "verse" }));
    await linkItems(quedar.id, other.id);
    expect((await db.items.get(quedar.id)).updatedAt).toBeDefined();

    const result = await applyKeep({ updates: [additions(frozen, { tags: ["planes"] })], attachedIds: [quedar.id] });
    expect(result.updated).toEqual([quedar.id]);
    expect((await db.items.get(quedar.id)).linkedKeys).toEqual([other.id]);
  });

  it("reports a deleted entry", async () => {
    const frozen = await db.items.get(quedar.id);
    await deleteItem(quedar.id);
    const result = await applyKeep({ updates: [additions(frozen, { tags: ["planes"] })], attachedIds: [quedar.id] });
    expect(result.skippedUpdates).toEqual([{ itemId: quedar.id, reason: "entry_deleted" }]);
  });

  it("writes nothing and logs no edit when nothing new remains", async () => {
    const before = await db.items.get(quedar.id);
    const result = await applyKeep({ updates: [additions(before, { tags: ["citas"], note: "   " })], attachedIds: [quedar.id] });
    expect(result.updated).toEqual([]);
    expect(result.skippedUpdates).toEqual([]);
    expect(await db.items.get(quedar.id)).toEqual(before);
    expect(await editEvents(quedar.id)).toHaveLength(0);
  });

  it("keeps a meaning-specific connection on the meaning it extends", async () => {
    const other = await createItem(newLexical({ term: "citarse", meanings: [newMeaning({ gloss: "to meet up" })] }));
    await linkItems(other.id, quedar.id, { type: "similar_meaning" }, {
      fromMeaningId: other.meanings[0].id,
      toMeaningId: quedar.meanings[1].id,
    });
    const before = await db.items.get(quedar.id);
    await applyKeep({
      updates: [additions(before, { examplesByMeaningId: { [before.meanings[1].id]: [{ es: "Quedamos el lunes.", en: "" }] } })],
      attachedIds: [quedar.id],
    });
    const linker = await db.items.get(other.id);
    expect(linker.linkAnnotations).toEqual([expect.objectContaining({ targetKey: quedar.id, targetMeaningId: before.meanings[1].id })]);
    expect((await db.items.get(quedar.id)).meanings[1].examples).toHaveLength(1);
  });
});

describe("applyKeep — connections between existing entries", () => {
  it("stores the link once on its owner, with no event and no content change on either", async () => {
    const other = await createItem(newLexical({ term: "verse" }));
    const eventsBefore = await db.events.count();
    const link = { ownerId: other.id, targetId: quedar.id, relationship: { type: "explained_by", subject: "owner" } };
    const result = await applyKeep({ links: [link], attachedIds: [quedar.id] });

    expect(result.linked).toEqual([link]);
    expect((await db.items.get(other.id)).linkedKeys).toEqual([quedar.id]);
    expect((await db.items.get(quedar.id)).linkedKeys).toEqual([]);
    expect(await db.events.count()).toBe(eventsBefore);
  });

  it.each([
    ["the same direction", (other) => linkItems(other.id, quedar.id, { type: "related" })],
    ["the other direction", (other) => linkItems(quedar.id, other.id, { type: "related" })],
  ])("reports a pair already connected in %s, keeping the old relationship", async (_label, connect) => {
    const other = await createItem(newLexical({ term: "verse" }));
    await connect(other);
    const before = await snapshot();
    const link = { ownerId: other.id, targetId: quedar.id, relationship: { type: "contrast", subject: "owner" } };
    const result = await applyKeep({ links: [link], attachedIds: [quedar.id] });
    expect(result.linked).toEqual([]);
    expect(result.skipped).toEqual([{ ...link, reason: "already_connected" }]);
    expect(await snapshot()).toEqual(before);
  });

  it("refuses links and additions that do not involve an attached entry, before writing anything", async () => {
    const a = await createItem(newLexical({ term: "uno" }));
    const b = await createItem(newLexical({ term: "dos" }));
    const before = await snapshot();
    await expect(applyKeep({
      links: [{ ownerId: a.id, targetId: b.id, relationship: { type: "related" } }],
      attachedIds: [quedar.id],
    })).rejects.toThrow(/must involve a new item or an attached entry/);
    await expect(applyKeep({
      items: [newLexical({ term: "tres" })],
      updates: [additions(a, { tags: ["x"] })],
      attachedIds: [quedar.id],
    })).rejects.toThrow(/only go to attached entries/);
    expect(await snapshot()).toEqual(before);
  });
});

describe("applyKeep — rollback", () => {
  it("undoes the additions when a later connection fails", async () => {
    const other = await createItem(newLexical({ term: "verse" }));
    const before = await snapshot();
    persist.mockClear();
    vi.spyOn(db.items, "put").mockImplementationOnce(() => Promise.reject(new Error("Link failed.")));
    const fresh = newLexical({ term: "citarse" });
    await expect(applyKeep({
      items: [fresh],
      updates: [additions(await db.items.get(quedar.id), { tags: ["planes"], note: "Added." })],
      links: [{ ownerId: other.id, targetId: quedar.id, relationship: { type: "related", subject: "owner" } }],
      attachedIds: [quedar.id],
    })).rejects.toThrow("Link failed.");
    expect(await snapshot()).toEqual(before);
    expect(persist).not.toHaveBeenCalled();
  });

  it("undoes everything when the edit event fails", async () => {
    const before = await snapshot();
    const add = db.events.add.bind(db.events);
    vi.spyOn(db.events, "add").mockImplementation((event, ...rest) => (
      event?.type === "edit" ? Promise.reject(new Error("Edit event failed.")) : add(event, ...rest)
    ));
    await expect(applyKeep({
      items: [newLexical({ term: "citarse" })],
      updates: [additions(await db.items.get(quedar.id), { tags: ["planes"] })],
      attachedIds: [quedar.id],
    })).rejects.toThrow("Edit event failed.");
    expect(await snapshot()).toEqual(before);
  });
});

it("leaves a notebook that still exports as a valid backup", async () => {
  const other = await createItem(newLexical({ term: "verse" }));
  const before = await db.items.get(quedar.id);
  await applyKeep({
    items: [newLexical({ term: "citarse", tags: ["ia"] })],
    updates: [additions(before, {
      examplesByMeaningId: { [before.meanings[0].id]: [{ es: "Quedó poco.", en: "" }] },
      meanings: [{ gloss: "to fit", usageCue: "", usageLabels: [], examples: [] }],
      note: "Added.",
      tags: ["planes"],
    })],
    links: [{ ownerId: other.id, targetId: quedar.id, relationship: { type: "related", subject: "owner" } }],
    attachedIds: [quedar.id],
  });
  const envelope = await buildBackup();
  expect(envelope.userItems).toHaveLength(3);
});
