// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Estadisticas from "./Estadisticas.jsx";
import { HEATMAP_WEEKS } from "../lib/stats.js";
import { addDaysToLocalDate, localDate } from "../lib/dates.js";
import { makeEvent, makeLexical, makePage } from "../test/factories.js";

// These derivations read the real clock, so fixtures are built relative to it rather than
// from fixed dates that would rot as the calendar moves past them.
const today = localDate();
const dayBefore = (n) => addDaysToLocalDate(today, -n);
const at = (day) => `${day}T10:00:00.000Z`;

const view = (day, overrides = {}) =>
  makeEvent({ type: "view", at: at(day), localDate: day, ...overrides });

const renderStats = (items = [], events = [], onBack = vi.fn()) => {
  render(<Estadisticas items={items} events={events} onBack={onBack} />);
  return onBack;
};

const cells = () => document.querySelectorAll('[class*="rounded-[3px]"]');

afterEach(cleanup);

describe("the activity calendar", () => {
  it("draws sixteen weeks of seven days", () => {
    renderStats();

    expect(cells()).toHaveLength(HEATMAP_WEEKS * 7);
  });

  it("labels a day with what happened on it", () => {
    renderStats([], [view(dayBefore(3)), view(dayBefore(3))]);

    expect(screen.getByLabelText(`${dayBefore(3)}: 2 events`)).toBeTruthy();
  });

  it("counts an event whose item has since been deleted", () => {
    // The Phase 11 owner decision, visible on screen: a day the owner studied stays studied.
    renderStats([], [view(dayBefore(2), { itemKey: "user:long-gone" })]);

    expect(screen.getByLabelText(`${dayBefore(2)}: 1 events`)).toBeTruthy();
  });

  it("leaves the days after today unlabelled rather than showing them as empty days", () => {
    renderStats([], [view(today)]);

    expect(screen.getByLabelText(`${today}: 1 events`)).toBeTruthy();
    expect(screen.queryByLabelText(new RegExp(`^${addDaysToLocalDate(today, 1)}`))).toBeNull();
  });

  it("shows the streak above the calendar", () => {
    renderStats([], [view(today), view(dayBefore(1))]);

    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("days in a row")).toBeTruthy();
  });

  it("says day rather than days for a streak of one", () => {
    renderStats([], [view(today)]);

    expect(screen.getByText("day in a row")).toBeTruthy();
  });
});

describe("the growth chart", () => {
  it("reports the running total of words", () => {
    const items = [
      makeLexical({ createdAt: at(dayBefore(30)) }),
      makeLexical({ createdAt: at(dayBefore(10)) }),
    ];
    renderStats(items);

    expect(screen.getByRole("img", { name: /now 2$/ })).toBeTruthy();
  });

  it("leaves pages out of the total", () => {
    const items = [
      makeLexical({ createdAt: at(dayBefore(10)) }),
      makePage({ createdAt: at(dayBefore(10)) }),
    ];
    renderStats(items);

    expect(screen.getByRole("img", { name: /now 1$/ })).toBeTruthy();
  });

  it("draws a single word without dividing by a zero-length span", () => {
    renderStats([makeLexical({ createdAt: at(today) })]);

    const chart = screen.getByRole("img", { name: /now 1$/ });
    expect(chart.querySelector("path").getAttribute("d")).not.toContain("NaN");
  });

  it("says the line has not started when there are no words", () => {
    renderStats([]);

    expect(screen.getByText(/line starts with your first word/i)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("getting back", () => {
  it("returns to Repaso", async () => {
    const user = userEvent.setup();
    const onBack = renderStats();

    await user.click(screen.getByRole("button", { name: /Repaso/ }));

    expect(onBack).toHaveBeenCalled();
  });
});
