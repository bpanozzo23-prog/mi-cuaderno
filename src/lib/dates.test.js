import { describe, it, expect } from "vitest";
import {
  localDate,
  timeAgo,
  daysSince,
  addDaysToLocalDate,
  mondayWeekStart,
} from "./dates.js";

describe("localDate", () => {
  it("uses the local calendar day, not UTC", () => {
    // 23:30 local on the 30th is already the 31st in UTC for negative offsets;
    // daily queues must group by the day the owner experienced.
    const lateEvening = new Date(2026, 6, 30, 23, 30, 0);
    expect(localDate(lateEvening)).toBe("2026-07-30");
  });

  it("zero-pads months and days", () => {
    expect(localDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-07-30T12:00:00.000Z");

  it.each([
    ["2026-07-30T11:59:40.000Z", "just now"],
    ["2026-07-30T11:45:00.000Z", "15m ago"],
    ["2026-07-30T09:00:00.000Z", "3h ago"],
    ["2026-07-28T12:00:00.000Z", "2d ago"],
  ])("renders %s as %s", (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected);
  });
});

describe("addDaysToLocalDate", () => {
  it("counts calendar days forward and back", () => {
    expect(addDaysToLocalDate("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysToLocalDate("2026-07-31", 16)).toBe("2026-08-16");
    expect(addDaysToLocalDate("2026-08-01", -1)).toBe("2026-07-31");
    expect(addDaysToLocalDate("2026-07-31", 0)).toBe("2026-07-31");
  });

  it("rolls over months, years and leap days", () => {
    expect(addDaysToLocalDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToLocalDate("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDaysToLocalDate("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("crosses a daylight-saving change without losing or gaining a day", () => {
    // A day is a calendar day, not 86,400,000 milliseconds. Northern-hemisphere
    // spring forward and autumn back, whichever way this machine's zone runs.
    expect(addDaysToLocalDate("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDaysToLocalDate("2026-10-31", 2)).toBe("2026-11-02");
  });

  it("leaves a value it cannot parse alone", () => {
    expect(addDaysToLocalDate("", 1)).toBe("");
  });
});

describe("daysSince", () => {
  it("counts whole days elapsed", () => {
    const now = Date.parse("2026-07-30T12:00:00.000Z");
    expect(daysSince("2026-07-30T09:00:00.000Z", now)).toBe(0);
    expect(daysSince("2026-07-27T09:00:00.000Z", now)).toBe(3);
  });
});

describe("mondayWeekStart", () => {
  it("walks a midweek day back to its Monday", () => {
    // 2026-07-31 is a Friday.
    expect(mondayWeekStart("2026-07-31")).toBe("2026-07-27");
  });

  it("leaves a Monday where it is", () => {
    expect(mondayWeekStart("2026-07-27")).toBe("2026-07-27");
  });

  it("treats Sunday as the end of its week, not the start of the next", () => {
    // The Spanish convention, and the one the heatmap's weekday column reads by.
    expect(mondayWeekStart("2026-08-02")).toBe("2026-07-27");
  });

  it("crosses a year boundary", () => {
    expect(mondayWeekStart("2026-01-01")).toBe("2025-12-29");
  });

  it("survives a daylight-saving change", () => {
    // US spring-forward Sunday; the noon anchor keeps the missing hour from moving the day.
    expect(mondayWeekStart("2026-03-08")).toBe("2026-03-02");
  });

  it("leaves a value it cannot parse alone", () => {
    expect(mondayWeekStart("")).toBe("");
  });
});
