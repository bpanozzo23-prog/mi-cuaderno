import { describe, it, expect, beforeEach, vi } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import {
  newLexical,
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

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  vi.restoreAllMocks();
});

const typesOf = async () => (await allEvents()).map((e) => e.type);

describe("lexical items", () => {
  it("stores the brief's shape and logs a create event", async () => {
    const item = await createItem(
      newLexical({ term: " sacar ", translation: " to take out ", pos: "verb", tags: ["verbs", "verbs", " "] })
    );

    const stored = await getItem(item.id);
    expect(stored.id).toMatch(/^user:/);
    expect(stored.type).toBe("lexical");
    expect(stored.term).toBe("sacar");
    expect(stored.translation).toBe("to take out");
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

  it("allows a term with no translation", async () => {
    const item = await createItem(newLexical({ term: "por si acaso" }));
    expect((await getItem(item.id)).translation).toBe("");
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
    expect(displayTitle(stored)).toBe("Preterite vs imperfect");
  });

  it("leaves pageDate null when it is not a journal entry", async () => {
    const page = await createItem(newPage({ title: "Ser vs estar" }));
    expect((await getItem(page.id)).pageDate).toBeNull();
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
});

describe("listing", () => {
  it("returns both content types, most recently touched first", async () => {
    const word = await createItem(newLexical({ term: "sacar" }));
    await new Promise((r) => setTimeout(r, 2));
    const page = await createItem(newPage({ title: "Ser vs estar" }));

    expect((await allItems()).map((i) => i.id)).toEqual([page.id, word.id]);
  });
});
