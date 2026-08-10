import { describe, it, expect, beforeEach } from "vitest";
import { db, clearAllPersonalData } from "./db.js";
import { newLexical, newPage, createItem, deleteItem } from "./items.js";
import {
  logEvent,
  logView,
  logReview,
  logDrill,
  toggleTricky,
  isTricky,
  deriveItemState,
  allEvents,
  eventsFor,
  EVENT_TYPES,
  SESSION_WINDOW_MINUTES,
} from "./events.js";
import { makeEvent } from "../test/factories.js";
import { GRADES } from "../lib/review.js";

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

  it("keeps rapid toggles ordered when the clock has not advanced a millisecond", async () => {
    const item = await createItem(newLexical({ term: "pues" }));
    const sameInstant = new Date("2026-08-03T20:00:00.000Z");

    const on = await toggleTricky(item.id, false, sameInstant);
    const off = await toggleTricky(item.id, true, sameInstant);

    expect(off.at > on.at).toBe(true);
    expect(await isTricky(item.id)).toBe(false);
  });
});

describe("every review event carries a grade", () => {
  it("maps Again to fail and Hard, Good, and Easy to pass", async () => {
    const item = await createItem(newLexical({ term: "madrugar" }));

    const events = await Promise.all([
      logReview(item.id, GRADES.again),
      logReview(item.id, GRADES.hard),
      logReview(item.id, GRADES.good),
      logReview(item.id, GRADES.easy),
    ]);

    expect(events.map((event) => event.type)).toEqual([
      EVENT_TYPES.reviewFail,
      EVENT_TYPES.reviewPass,
      EVENT_TYPES.reviewPass,
      EVENT_TYPES.reviewPass,
    ]);
    expect(events.map((event) => event.metadata.grade)).toEqual([
      GRADES.again,
      GRADES.hard,
      GRADES.good,
      GRADES.easy,
    ]);
  });

  it("stamps the grade into the log itself, not just the return value", async () => {
    const item = await createItem(newLexical({ term: "madrugar" }));
    await logReview(item.id, GRADES.good);

    const stored = (await eventsFor(item.id)).filter((e) => e.type.startsWith("review_"));
    expect(stored).toHaveLength(1);
    expect(stored[0].metadata.grade).toBe(GRADES.good);
    expect(stored[0].localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("accepts an injected timestamp, so a history can be replayed or tested", async () => {
    const item = await createItem(newLexical({ term: "madrugar" }));
    const when = new Date(2026, 6, 15, 9, 0, 0);

    const event = await logReview(item.id, GRADES.good, null, when);

    expect(event.at).toBe(when.toISOString());
    expect(event.localDate).toBe("2026-07-15");
  });

  it("still honours a timestamp passed in the old third-argument position", async () => {
    // A Date spreads to no keys, so getting this wrong would backdate nothing and stamp
    // "now" while the metadata still looked right. Silent, not loud — hence the guard.
    const item = await createItem(newLexical({ term: "madrugar" }));
    const when = new Date(2026, 6, 15, 9, 0, 0);

    const event = await logReview(item.id, GRADES.good, when);

    expect(event.at).toBe(when.toISOString());
    expect(event.metadata).toEqual({ grade: GRADES.good });
  });

  it("records how the card was asked alongside the grade (Phase 10a)", async () => {
    const item = await createItem(newLexical({ term: "madrugar" }));

    const event = await logReview(item.id, GRADES.good, { direction: "reverse", face: "cloze" });

    expect(event.metadata).toEqual({ direction: "reverse", face: "cloze", grade: GRADES.good });
  });

  it("never lets a detail overwrite the grade", async () => {
    const item = await createItem(newLexical({ term: "madrugar" }));

    const event = await logReview(item.id, GRADES.again, { grade: GRADES.easy, direction: "forward" });

    expect(event.metadata.grade).toBe(GRADES.again);
  });
});

describe("Conjugation Gym events", () => {
  it("allows unattached Core history while keeping its lemma identity in metadata", async () => {
    const event = await logDrill(null, false, {
      source: "core",
      curriculum: "core20",
      verbKey: "lemma:ser",
      lemma: "ser",
      dictKey: "dict:wiktionary-es:ser:verb",
      stage: "initial",
    });

    expect(event.itemKey).toBeNull();
    expect(event.type).toBe(EVENT_TYPES.drillFail);
    expect(event.metadata).toMatchObject({ source: "core", verbKey: "lemma:ser", stage: "initial" });
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
