import { describe, it, expect } from "vitest";
import { localDate, timeAgo, daysSince } from "./dates.js";

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

describe("daysSince", () => {
  it("counts whole days elapsed", () => {
    const now = Date.parse("2026-07-30T12:00:00.000Z");
    expect(daysSince("2026-07-30T09:00:00.000Z", now)).toBe(0);
    expect(daysSince("2026-07-27T09:00:00.000Z", now)).toBe(3);
  });
});
