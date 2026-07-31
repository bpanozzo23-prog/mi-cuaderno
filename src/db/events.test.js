import { describe, it, expect, beforeEach } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import { newLexical, newPage, createItem, deleteItem } from "./items.js";
import {
  logEvent,
  logView,
  toggleTricky,
  isTricky,
  deriveItemState,
  allEvents,
  eventsFor,
  EVENT_TYPES,
  SESSION_WINDOW_MINUTES,
} from "./events.js";
import { makeEvent } from "../test/factories.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

const viewsOf = async (key) => (await eventsFor(key)).filter((e) => e.type === EVENT_TYPES.view).length;

describe("view events respect the session window", () => {
  it("records one lookup when the same item is opened twice in quick succession", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));

    const first = await logView(item.id);
    const second = await logView(item.id);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(await viewsOf(item.id)).toBe(1);
  });

  it("still records one lookup just inside the window", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));
    const start = new Date("2026-07-30T12:00:00.000Z");

    await logView(item.id, start);
    const again = new Date(start.getTime() + (SESSION_WINDOW_MINUTES - 1) * 60000);
    expect(await logView(item.id, again)).toBeNull();
    expect(await viewsOf(item.id)).toBe(1);
  });

  it("records a second lookup once the window has passed", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));
    const start = new Date("2026-07-30T12:00:00.000Z");

    await logView(item.id, start);
    const later = new Date(start.getTime() + (SESSION_WINDOW_MINUTES + 1) * 60000);
    expect(await logView(item.id, later)).not.toBeNull();
    expect(await viewsOf(item.id)).toBe(2);
  });

  it("records one lookup when two calls arrive together", async () => {
    // React re-invoking an effect, or a double-tap: both calls would otherwise
    // read "no view yet" before either had written one.
    const item = await createItem(newLexical({ term: "sacar" }));

    const [first, second] = await Promise.all([logView(item.id), logView(item.id)]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await viewsOf(item.id)).toBe(1);
  });

  it("counts each item separately", async () => {
    const a = await createItem(newLexical({ term: "sacar" }));
    const b = await createItem(newPage({ title: "Verbs" }));

    await logView(a.id);
    await logView(b.id);

    expect(await viewsOf(a.id)).toBe(1);
    expect(await viewsOf(b.id)).toBe(1);
  });
});

describe("tricky state is derived, never stored", () => {
  it("follows the most recent tricky event across on, off and on again", async () => {
    const item = await createItem(newLexical({ term: "tener ganas de", form: "phrase" }));
    expect(await isTricky(item.id)).toBe(false);

    await toggleTricky(item.id, false);
    expect(await isTricky(item.id)).toBe(true);

    await toggleTricky(item.id, true);
    expect(await isTricky(item.id)).toBe(false);

    await toggleTricky(item.id, false);
    expect(await isTricky(item.id)).toBe(true);
  });

  it("keeps no flag on the record itself", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));
    await toggleTricky(item.id, false);

    const stored = await db.items.get(item.id);
    expect(stored.struggling).toBeUndefined();
    expect(stored.tricky).toBeUndefined();
  });
});

describe("deriveItemState", () => {
  it("summarises views and tricky state in one pass", () => {
    const key = "user:a";
    const events = [
      makeEvent({ type: EVENT_TYPES.view, itemKey: key, at: "2026-07-30T10:00:00.000Z" }),
      makeEvent({ type: EVENT_TYPES.view, itemKey: key, at: "2026-07-30T14:00:00.000Z" }),
      makeEvent({ type: EVENT_TYPES.trickyOn, itemKey: key, at: "2026-07-30T15:00:00.000Z" }),
    ];

    const state = deriveItemState(events).get(key);

    expect(state.views).toBe(2);
    expect(state.lastViewedAt).toBe("2026-07-30T14:00:00.000Z");
    expect(state.tricky).toBe(true);
  });

  it("excludes events belonging to items that no longer exist", () => {
    const events = [
      makeEvent({ type: EVENT_TYPES.view, itemKey: "user:alive" }),
      makeEvent({ type: EVENT_TYPES.view, itemKey: "user:deleted" }),
    ];

    const state = deriveItemState(events, new Set(["user:alive"]));

    expect(state.has("user:alive")).toBe(true);
    expect(state.has("user:deleted")).toBe(false);
  });

  it("ignores event types it does not recognise", () => {
    const key = "user:a";
    const events = [
      makeEvent({ type: "some_future_type", itemKey: key }),
      makeEvent({ type: EVENT_TYPES.view, itemKey: key }),
    ];

    expect(deriveItemState(events).get(key).views).toBe(1);
  });

  it("ignores events with no item, such as search misses", () => {
    const events = [makeEvent({ type: EVENT_TYPES.searchMiss, itemKey: null, metadata: { query: "chamarra" } })];
    expect(deriveItemState(events).size).toBe(0);
  });
});

describe("a deleted item drops out of the statistics but not the log", () => {
  it("keeps its events while excluding it from derived state", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));
    await logView(item.id);
    await toggleTricky(item.id, false);

    await deleteItem(item.id);

    const events = await allEvents();
    expect(events.filter((e) => e.itemKey === item.id).length).toBe(4); // create, view, tricky_on, delete

    const survivingKeys = new Set((await db.items.toArray()).map((i) => i.id));
    expect(deriveItemState(events, survivingKeys).size).toBe(0);
  });
});

describe("localDate", () => {
  it("is stamped on every event so daily grouping never uses UTC", async () => {
    const item = await createItem(newLexical({ term: "sacar" }));
    await logView(item.id);
    await logEvent(EVENT_TYPES.searchMiss, null, { query: "chamarra" });

    const events = await allEvents();
    expect(events.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.localDate))).toBe(true);
  });

  it("groups by the owner's calendar day, not the UTC one", () => {
    // 23:30 local on the 30th; in UTC this may already be the 31st.
    const events = [
      makeEvent({ type: EVENT_TYPES.view, itemKey: "user:a", localDate: "2026-07-30" }),
      makeEvent({ type: EVENT_TYPES.view, itemKey: "user:a", localDate: "2026-07-31" }),
    ];
    const byDay = events.reduce((acc, e) => {
      acc[e.localDate] = (acc[e.localDate] || 0) + 1;
      return acc;
    }, {});
    expect(byDay).toEqual({ "2026-07-30": 1, "2026-07-31": 1 });
  });
});
