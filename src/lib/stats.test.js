import { describe, it, expect } from "vitest";
import {
  activityByDay,
  streakFrom,
  heatLevel,
  heatmapWeeks,
  cumulativeWordsByWeek,
  boxDistribution,
  HEATMAP_WEEKS,
} from "./stats.js";
import { addDaysToLocalDate } from "./dates.js";
import { emptyReviewState } from "./review.js";
import { makeLexical, makePage, makeEvent } from "../test/factories.js";

// A Friday, so week arithmetic in these tests crosses a Monday in both directions.
const TODAY = "2026-07-31";
const at = (day, hour = 10) => `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const event = (type, day, overrides = {}) =>
  makeEvent({ type, at: at(day), localDate: day, ...overrides });

const daysWith = (...days) => activityByDay(days.map((day) => event("view", day)));

const stateFor = (overrides) => ({ ...emptyReviewState, ...overrides });

describe("activityByDay: what counts as a day's activity", () => {
  it("returns nothing for an empty log", () => {
    expect(activityByDay([]).size).toBe(0);
  });

  it("adds up every event that happened on the same day", () => {
    const days = activityByDay([
      event("view", "2026-07-30"),
      event("edit", "2026-07-30"),
      event("review_pass", "2026-07-30"),
      event("view", "2026-07-31"),
    ]);

    expect(days.get("2026-07-30")).toBe(3);
    expect(days.get("2026-07-31")).toBe(1);
  });

  it("counts an event whose item has since been deleted", () => {
    // The owner's Phase 11 decision: section 7 excludes deleted items from item-centric
    // statistics, but a day the owner studied stays a day the owner studied.
    const days = activityByDay([
      event("view", "2026-07-30", { itemKey: "user:long-gone" }),
      event("delete", "2026-07-30", { itemKey: "user:long-gone" }),
    ]);

    expect(days.get("2026-07-30")).toBe(2);
  });

  it("counts a search miss, which belongs to no item at all", () => {
    const days = activityByDay([
      event("search_miss", "2026-07-31", { itemKey: null, metadata: { query: "chamba" } }),
    ]);

    expect(days.get("2026-07-31")).toBe(1);
  });

  it("ignores an event type it does not recognise", () => {
    // Section 7 lets new event types be added freely; a future bookkeeping event must not
    // invent activity on a day the owner did nothing.
    const days = activityByDay([event("collection_reordered", "2026-07-31")]);

    expect(days.size).toBe(0);
  });

  it("ignores an event with no localDate", () => {
    const days = activityByDay([makeEvent({ type: "view", localDate: undefined })]);

    expect(days.size).toBe(0);
  });
});

describe("streakFrom: consecutive days, with one day of grace", () => {
  it("is zero when nothing has ever happened", () => {
    expect(streakFrom(new Map(), TODAY)).toBe(0);
  });

  it("counts today alone as one day", () => {
    expect(streakFrom(daysWith(TODAY), TODAY)).toBe(1);
  });

  it("counts back through consecutive days ending today", () => {
    const days = daysWith(TODAY, "2026-07-30", "2026-07-29", "2026-07-28");

    expect(streakFrom(days, TODAY)).toBe(4);
  });

  it("stays alive on a day the owner has not opened the app yet", () => {
    // Reading zero at breakfast would report a broken habit that is not broken.
    const days = daysWith("2026-07-30", "2026-07-29", "2026-07-28");

    expect(streakFrom(days, TODAY)).toBe(3);
  });

  it("is one when today is active but yesterday was silent", () => {
    const days = daysWith(TODAY, "2026-07-28");

    expect(streakFrom(days, TODAY)).toBe(1);
  });

  it("is zero once a whole day has passed with nothing in it", () => {
    const days = daysWith("2026-07-29", "2026-07-28");

    expect(streakFrom(days, TODAY)).toBe(0);
  });

  it("stops at the first gap rather than counting every active day", () => {
    const days = daysWith(TODAY, "2026-07-30", "2026-07-28", "2026-07-27");

    expect(streakFrom(days, TODAY)).toBe(2);
  });

  it("counts across a month boundary", () => {
    const days = daysWith("2026-08-01", "2026-07-31", "2026-07-30");

    expect(streakFrom(days, "2026-08-01")).toBe(3);
  });

  it("counts across a year boundary", () => {
    const days = daysWith("2026-01-01", "2025-12-31", "2025-12-30");

    expect(streakFrom(days, "2026-01-01")).toBe(3);
  });
});

describe("heatLevel: fixed intensity buckets", () => {
  it("puts a day with nothing in it at level zero", () => {
    expect(heatLevel(0)).toBe(0);
  });

  it("moves up a level at each threshold", () => {
    expect([1, 2, 3, 5, 6, 9, 10, 40].map(heatLevel)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("heatmapWeeks: the calendar grid", () => {
  const grid = (days, today = TODAY) => heatmapWeeks(days, today);

  it("returns sixteen weeks of seven days", () => {
    const columns = grid(new Map());

    expect(columns).toHaveLength(HEATMAP_WEEKS);
    expect(columns.every((c) => c.days.length === 7)).toBe(true);
  });

  it("ends with the week containing today", () => {
    const columns = grid(new Map());
    const last = columns[columns.length - 1];

    expect(last.days.map((d) => d.date)).toContain(TODAY);
  });

  it("starts every column on a Monday", () => {
    // 2026-07-27 is the Monday of today's week; every column start is a multiple of 7 back.
    const columns = grid(new Map());

    expect(columns[columns.length - 1].weekStart).toBe("2026-07-27");
    expect(columns[0].weekStart).toBe(addDaysToLocalDate("2026-07-27", -7 * (HEATMAP_WEEKS - 1)));
  });

  it("puts a day's count on that day's cell", () => {
    const columns = grid(activityByDay([event("view", "2026-07-29"), event("edit", "2026-07-29")]));
    const cell = columns.flatMap((c) => c.days).find((d) => d.date === "2026-07-29");

    expect(cell.count).toBe(2);
    expect(cell.level).toBe(1);
  });

  it("marks the days after today as future rather than as empty days", () => {
    const columns = grid(new Map());
    const cells = columns.flatMap((c) => c.days);

    expect(cells.filter((d) => d.future).map((d) => d.date)).toEqual(["2026-08-01", "2026-08-02"]);
    expect(cells.find((d) => d.date === TODAY).future).toBe(false);
  });
});

describe("cumulativeWordsByWeek: how the vocabulary grew", () => {
  const word = (createdAt) => makeLexical({ createdAt });

  it("returns nothing for an empty notebook", () => {
    expect(cumulativeWordsByWeek([], TODAY)).toEqual([]);
  });

  it("runs from the first word's week through this week", () => {
    const series = cumulativeWordsByWeek([word(at("2026-07-15"))], TODAY);

    expect(series[0]).toEqual({ weekStart: "2026-07-13", total: 1 });
    expect(series[series.length - 1]).toEqual({ weekStart: "2026-07-27", total: 1 });
    expect(series).toHaveLength(3);
  });

  it("accumulates rather than reporting each week on its own", () => {
    const series = cumulativeWordsByWeek(
      [word(at("2026-07-15")), word(at("2026-07-16")), word(at("2026-07-28"))],
      TODAY
    );

    expect(series.map((p) => p.total)).toEqual([2, 2, 3]);
  });

  it("fills a week where nothing was added instead of skipping it", () => {
    const series = cumulativeWordsByWeek([word(at("2026-07-06")), word(at("2026-07-28"))], TODAY);

    expect(series.map((p) => p.weekStart)).toEqual([
      "2026-07-06",
      "2026-07-13",
      "2026-07-20",
      "2026-07-27",
    ]);
    expect(series.map((p) => p.total)).toEqual([1, 1, 1, 2]);
  });

  it("leaves pages out — a page is a note, not a word learned", () => {
    const series = cumulativeWordsByWeek(
      [word(at("2026-07-28")), makePage({ createdAt: at("2026-07-28") })],
      TODAY
    );

    expect(series[series.length - 1].total).toBe(1);
  });

  it("carries the total across a year boundary", () => {
    const series = cumulativeWordsByWeek(
      [word(at("2025-12-30")), word(at("2026-01-05"))],
      "2026-01-09"
    );

    expect(series.map((p) => p.weekStart)).toEqual(["2025-12-29", "2026-01-05"]);
    expect(series.map((p) => p.total)).toEqual([1, 2]);
  });

  it("ignores an item with an unusable createdAt", () => {
    expect(cumulativeWordsByWeek([word("not a date")], TODAY)).toEqual([]);
  });
});

describe("boxDistribution: the review ladder", () => {
  it("counts nothing for a notebook with nothing enrolled", () => {
    const states = new Map([
      ["a", stateFor({})],
      ["b", stateFor({})],
    ]);
    const { boxes, graduated, enrolled } = boxDistribution(states);

    // Every unenrolled word sits at box 1; counting those would drown the real queue.
    expect(boxes.map((b) => b.count)).toEqual([0, 0, 0, 0, 0]);
    expect(graduated).toBe(0);
    expect(enrolled).toBe(0);
  });

  it("puts each enrolled word in its own box", () => {
    const states = new Map([
      ["a", stateFor({ enrolled: true, box: 1 })],
      ["b", stateFor({ enrolled: true, box: 1 })],
      ["c", stateFor({ enrolled: true, box: 4 })],
    ]);
    const { boxes, enrolled } = boxDistribution(states);

    expect(boxes.map((b) => b.count)).toEqual([2, 0, 0, 1, 0]);
    expect(enrolled).toBe(3);
  });

  it("counts a retired word separately from the box it retired out of", () => {
    const states = new Map([
      ["a", stateFor({ enrolled: true, box: 5, graduated: true })],
      ["b", stateFor({ enrolled: true, box: 5 })],
    ]);
    const { boxes, graduated, enrolled } = boxDistribution(states);

    expect(boxes[4].count).toBe(1);
    expect(graduated).toBe(1);
    expect(enrolled).toBe(2);
  });

  it("reports an enrolled total that matches everything it counted", () => {
    const states = new Map([
      ["a", stateFor({ enrolled: true, box: 2 })],
      ["b", stateFor({ enrolled: true, box: 3 })],
      ["c", stateFor({ enrolled: true, box: 5, graduated: true })],
      ["d", stateFor({})],
    ]);
    const { boxes, graduated, enrolled } = boxDistribution(states);

    expect(boxes.reduce((sum, b) => sum + b.count, 0) + graduated).toBe(enrolled);
    expect(enrolled).toBe(3);
  });
});
