import { describe, expect, it } from "vitest";
import { makeEvent, makeLexical } from "../test/factories.js";
import { GRADES } from "./review.js";
import { deriveBiographyMilestones } from "./biography.js";

const KEY = "user:biography";
const at = (day, hour = 10) => `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const event = (type, day, { hour = 10, grade } = {}) => makeEvent({
  itemKey: KEY,
  type,
  at: at(day, hour),
  localDate: day,
  metadata: grade == null ? null : { grade },
});
const review = (day, grade, hour = 10) => event(
  grade === GRADES.again ? "review_fail" : "review_pass",
  day,
  { grade, hour }
);

describe("biography milestones", () => {
  it("uses the create event for saved and falls back to createdAt", () => {
    const item = makeLexical({ id: KEY, createdAt: at("2026-07-01") });
    expect(deriveBiographyMilestones(item, [event("create", "2026-07-02")])[0]).toEqual({
      kind: "saved",
      at: at("2026-07-02"),
    });
    expect(deriveBiographyMilestones(item, [event("view", "2026-07-03")])).toEqual([
      { kind: "saved", at: at("2026-07-01") },
    ]);
  });

  it("narrates first review, only boxes actually reached, and each retirement transition", () => {
    const item = makeLexical({ id: KEY, createdAt: at("2026-07-01") });
    const events = [
      event("view", "2026-07-02"),
      review("2026-07-03", GRADES.easy), // box 1 → 3; box 2 was never reached
      review("2026-07-04", GRADES.good), // 4
      review("2026-07-05", GRADES.good), // 5
      review("2026-07-06", GRADES.good), // retire
      review("2026-07-07", GRADES.again), // box 1
      review("2026-07-08", GRADES.easy), // 3 again; already narrated
      review("2026-07-09", GRADES.easy), // 5 again
      review("2026-07-10", GRADES.good), // re-retire
    ];

    const rows = deriveBiographyMilestones(item, events);
    expect(rows.filter((row) => row.kind === "first_review")).toEqual([
      { kind: "first_review", at: at("2026-07-03") },
    ]);
    expect(rows.filter((row) => row.kind === "box")).toEqual([
      { kind: "box", at: at("2026-07-03"), box: 3 },
      { kind: "box", at: at("2026-07-04"), box: 4 },
      { kind: "box", at: at("2026-07-05"), box: 5 },
      { kind: "box", at: at("2026-07-07"), box: 1 },
    ]);
    expect(rows.filter((row) => row.kind === "retired")).toEqual([
      { kind: "retired", at: at("2026-07-06") },
      { kind: "retired", at: at("2026-07-10") },
    ]);
    expect(rows.some((row) => row.box === 2)).toBe(false);
    expect(rows.some((row) => row.kind === "view" || row.kind === "grade")).toBe(false);
  });

  it("pairs multiple tricky episodes and leaves a trailing episode open", () => {
    const item = makeLexical({ id: KEY, createdAt: at("2026-07-01") });
    const events = [
      event("tricky_off", "2026-07-01", { hour: 9 }),
      event("tricky_on", "2026-07-02"),
      event("tricky_off", "2026-07-04"),
      event("tricky_on", "2026-07-06"),
      event("tricky_off", "2026-07-08"),
      event("tricky_on", "2026-07-10"),
    ];

    expect(deriveBiographyMilestones(item, events).filter((row) => row.kind === "tricky")).toEqual([
      { kind: "tricky", at: at("2026-07-02"), endedAt: at("2026-07-04"), open: false },
      { kind: "tricky", at: at("2026-07-06"), endedAt: at("2026-07-08"), open: false },
      { kind: "tricky", at: at("2026-07-10"), endedAt: null, open: true },
    ]);
  });

  it("orders simultaneous story beats predictably and ignores another item's events", () => {
    const item = makeLexical({ id: KEY, createdAt: at("2026-07-01") });
    const first = review("2026-07-03", GRADES.good);
    const other = { ...review("2026-07-02", GRADES.easy), itemKey: "user:other" };
    expect(deriveBiographyMilestones(item, [other, first]).map((row) => row.kind)).toEqual([
      "saved",
      "first_review",
      "box",
    ]);
  });

  it("returns no story for pages", () => {
    expect(deriveBiographyMilestones({ id: KEY, type: "page" }, [event("create", "2026-07-01")])).toEqual([]);
  });
});
