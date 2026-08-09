import { describe, it, expect } from "vitest";
import {
  activityByDay,
  streakFrom,
  heatLevel,
  heatmapWeeks,
  cumulativeWordsByWeek,
  boxDistribution,
  drillPerformance,
  monthGrid,
  earliestActivityMonth,
  HEATMAP_WEEKS,
  MONTH_ROWS,
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

describe("monthGrid: the planner page", () => {
  const page = (yearMonth, days = new Map(), today = TODAY) => monthGrid(days, yearMonth, today);

  it("returns six rows of seven days whatever the month's shape", () => {
    // July 2026 starts on a Wednesday and needs five rows; February 2027 starts on a Monday
    // and fits in four. Both are padded to six so the card keeps its height while paging.
    expect(page("2026-07")).toHaveLength(MONTH_ROWS * 7);
    expect(page("2027-02")).toHaveLength(MONTH_ROWS * 7);
  });

  it("starts on the Monday that opens the first week, even in the month before", () => {
    // 2026-08-01 is a Saturday, so the page opens on Monday 27 July.
    const cells = page("2026-08");

    expect(cells[0].date).toBe("2026-07-27");
    expect(cells[0].inMonth).toBe(false);
    expect(cells[5].date).toBe("2026-08-01");
    expect(cells[5].inMonth).toBe(true);
  });

  it("numbers the days of the month it is showing", () => {
    const cells = page("2026-08").filter((d) => d.inMonth);

    expect(cells).toHaveLength(31);
    expect(cells[0].dayOfMonth).toBe(1);
    expect(cells[30].dayOfMonth).toBe(31);
  });

  it("puts a day's count and intensity on that day's cell", () => {
    const days = activityByDay([
      event("view", "2026-07-29"),
      event("edit", "2026-07-29"),
      event("create", "2026-07-29"),
    ]);
    const cell = page("2026-07", days).find((d) => d.date === "2026-07-29");

    expect(cell.count).toBe(3);
    expect(cell.level).toBe(2);
  });

  it("marks the days after today as future rather than as empty days", () => {
    const cells = page("2026-07").filter((d) => d.inMonth);

    expect(cells.find((d) => d.date === TODAY).future).toBe(false);
    expect(cells.filter((d) => d.future)).toHaveLength(0);
    expect(page("2026-08").filter((d) => d.inMonth && !d.future)).toHaveLength(0);
  });

  it("returns nothing for a month string it cannot parse", () => {
    expect(monthGrid(new Map(), "", TODAY)).toEqual([]);
  });
});

describe("earliestActivityMonth: how far back paging may go", () => {
  it("is null while nothing has happened", () => {
    expect(earliestActivityMonth(new Map())).toBe(null);
  });

  it("is the month of the oldest day with activity", () => {
    expect(earliestActivityMonth(daysWith("2026-07-29", "2026-05-04", "2026-06-30"))).toBe(
      "2026-05"
    );
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

  it("includes the newest future week when older words also exist", () => {
    const series = cumulativeWordsByWeek(
      [word(at("2026-07-15")), word(at("2026-08-18"))],
      TODAY
    );

    expect(series[series.length - 1]).toEqual({ weekStart: "2026-08-17", total: 2 });
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
    const { boxes, graduated, tracked } = boxDistribution(states);

    // Every unenrolled word sits at box 1; counting those would drown the real queue.
    expect(boxes.map((b) => b.count)).toEqual([0, 0, 0, 0, 0]);
    expect(graduated).toBe(0);
    expect(tracked).toBe(0);
  });

  it("puts each enrolled word in its own box", () => {
    const states = new Map([
      ["a", stateFor({ enrolled: true, box: 1 })],
      ["b", stateFor({ enrolled: true, box: 1 })],
      ["c", stateFor({ enrolled: true, box: 4 })],
    ]);
    const { boxes, tracked } = boxDistribution(states);

    expect(boxes.map((b) => b.count)).toEqual([2, 0, 0, 1, 0]);
    expect(tracked).toBe(3);
  });

  it("counts a retired word even though retiring took it out of the queue", () => {
    // deriveReviewState clears `enrolled` on graduation — that is what retirement means.
    // Reading enrollment alone would leave the Retired rung permanently empty.
    const states = new Map([
      ["a", stateFor({ enrolled: false, box: 5, graduated: true })],
      ["b", stateFor({ enrolled: true, box: 5 })],
    ]);
    const { boxes, graduated, tracked } = boxDistribution(states);

    expect(boxes[4].count).toBe(1);
    expect(graduated).toBe(1);
    expect(tracked).toBe(2);
  });

  it("reports a tracked total that matches everything it counted", () => {
    const states = new Map([
      ["a", stateFor({ enrolled: true, box: 2 })],
      ["b", stateFor({ enrolled: true, box: 3 })],
      ["c", stateFor({ enrolled: false, box: 5, graduated: true })],
      ["d", stateFor({})],
    ]);
    const { boxes, graduated, tracked } = boxDistribution(states);

    expect(boxes.reduce((sum, b) => sum + b.count, 0) + graduated).toBe(tracked);
    expect(tracked).toBe(3);
  });
});

describe("how the conjugation drill has gone", () => {
  const drill = (passed, tense, extra = {}) => ({
    type: passed ? "drill_pass" : "drill_fail",
    itemKey: "user:poner",
    localDate: "2026-08-06",
    metadata: { tense, slot: "yo", mode: "typed", verdict: passed ? "exact" : "wrong", ...extra },
  });

  it("counts nothing when the drill has never been used", () => {
    expect(drillPerformance([])).toEqual({ answered: 0, passed: 0, accentSlips: 0, tenses: [] });
  });

  it("totals answers and passes across every tense", () => {
    const result = drillPerformance([
      drill(true, "Indicative/Present"),
      drill(false, "Indicative/Preterite"),
      drill(true, "Indicative/Preterite"),
    ]);

    expect(result.answered).toBe(3);
    expect(result.passed).toBe(2);
  });

  it("counts an accent slip as a pass, and separately as a slip", () => {
    const result = drillPerformance([
      drill(true, "Indicative/Preterite", { verdict: "accents" }),
    ]);

    expect(result.passed).toBe(1);
    expect(result.accentSlips).toBe(1);
  });

  it("splits by tense and puts the weakest first", () => {
    const result = drillPerformance([
      drill(true, "Indicative/Present"),
      drill(true, "Indicative/Present"),
      drill(false, "Indicative/Preterite"),
      drill(false, "Indicative/Preterite"),
      drill(true, "Indicative/Preterite"),
    ]);

    expect(result.tenses.map((row) => row.tense)).toEqual([
      "Indicative/Preterite",
      "Indicative/Present",
    ]);
    expect(result.tenses[0]).toMatchObject({ answered: 3, passed: 1 });
    expect(result.tenses[1]).toMatchObject({ answered: 2, passed: 2 });
  });

  it("ignores every event that is not a drill answer", () => {
    const result = drillPerformance([
      { type: "review_pass", metadata: { grade: 2 } },
      { type: "view", itemKey: "user:poner" },
      { type: "future_event_type", metadata: { tense: "Indicative/Present" } },
      drill(true, "Indicative/Present"),
    ]);

    expect(result.answered).toBe(1);
    expect(result.tenses).toHaveLength(1);
  });

  it("keeps an answer with no readable tense in the totals but gives it no row", () => {
    // A future drill over something other than a tense must not invent a row for itself.
    const result = drillPerformance([
      { type: "drill_pass", metadata: { slot: "yo" } },
      drill(true, "Indicative/Present"),
    ]);

    expect(result.answered).toBe(2);
    expect(result.tenses.map((row) => row.tense)).toEqual(["Indicative/Present"]);
  });
});

describe("drill days count as activity", () => {
  it("colours the calendar and holds the streak on a drill-only day", () => {
    const today = "2026-08-06";
    const days = activityByDay([
      { type: "drill_pass", localDate: today, metadata: { tense: "Indicative/Present" } },
      { type: "drill_fail", localDate: today, metadata: { tense: "Indicative/Present" } },
    ]);

    expect(days.get(today)).toBe(2);
    expect(streakFrom(days, today)).toBe(1);
  });
});
