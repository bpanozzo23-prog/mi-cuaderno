// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Estadisticas from "./Estadisticas.jsx";
import { HEATMAP_WEEKS } from "../lib/stats.js";
import { addDaysToLocalDate, addMonths, localDate, monthOfDate } from "../lib/dates.js";
import { makeEvent, makeLexical, makePage } from "../test/factories.js";

// These derivations read the real clock, so fixtures are built relative to it rather than
// from fixed dates that would rot as the calendar moves past them.
const today = localDate();
const dayBefore = (n) => addDaysToLocalDate(today, -n);
const at = (day) => `${day}T10:00:00.000Z`;

const thisMonth = monthOfDate(today);
const dayOfMonth = Number(today.slice(8, 10));

// The month view only shows the month it is on, so a "recent day" fixture has to stay inside
// it — n days back, or as far back as the 1st allows when the run happens early in a month.
const backInMonth = (n) => dayBefore(Math.min(n, dayOfMonth - 1));

const MONTHS_ES_FULL = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const monthTitle = (yearMonth) =>
  `${MONTHS_ES_FULL[Number(yearMonth.slice(5, 7)) - 1]} ${yearMonth.slice(0, 4)}`;

const view = (day, overrides = {}) =>
  makeEvent({ type: "view", at: at(day), localDate: day, ...overrides });

const renderStats = (items = [], events = [], onBack = vi.fn()) => {
  render(<Estadisticas items={items} events={events} onBack={onBack} />);
  return onBack;
};

const marks = () => document.querySelectorAll(".activity-mark");
const dots = () => document.querySelectorAll(".trend-dot");
const labelledDays = () =>
  screen.queryAllByLabelText(/^\d{4}-\d{2}-\d{2}: \d+ events$/);

const showTrend = async (user) =>
  user.click(screen.getByRole("radio", { name: "tendencia" }));

afterEach(cleanup);

describe("the activity calendar", () => {
  it("opens on the month the owner is standing in", () => {
    renderStats();

    expect(screen.getByText(monthTitle(thisMonth))).toBeTruthy();
  });

  it("labels a day with what happened on it", () => {
    const day = backInMonth(3);
    renderStats([], [view(day), view(day)]);

    expect(screen.getByLabelText(`${day}: 2 events`)).toBeTruthy();
  });

  it("counts an event whose item has since been deleted", () => {
    // The Phase 11 owner decision, visible on screen: a day the owner studied stays studied.
    renderStats([], [view(backInMonth(2), { itemKey: "user:long-gone" })]);

    expect(screen.getByLabelText(`${backInMonth(2)}: 1 events`)).toBeTruthy();
  });

  it("labels every day up to today and none of the days after it", () => {
    // Counting rather than probing one date: a day that has not happened yet must not appear
    // as a day with nothing in it, and the count catches an off-by-one at either end.
    renderStats([], [view(today)]);

    expect(labelledDays()).toHaveLength(dayOfMonth);
    expect(screen.getByLabelText(`${today}: 1 events`)).toBeTruthy();
  });

  it("circles the days with activity and leaves the quiet days bare", () => {
    renderStats([], [view(today), view(backInMonth(1))]);

    // Two circles when today and yesterday are distinct; one when the run lands on the 1st.
    expect(marks()).toHaveLength(today === backInMonth(1) ? 1 : 2);
  });

  it("draws no ink at all in a month the owner did nothing", () => {
    renderStats();

    expect(marks()).toHaveLength(0);
  });

  it("rules today in red so the page says where the owner is", () => {
    renderStats([], [view(today)]);

    expect(document.querySelectorAll(".today-rule")).toHaveLength(1);
  });
});

describe("paging the activity calendar", () => {
  const lastMonth = addMonths(thisMonth, -1);

  it("steps back a month and comes forward again", async () => {
    const user = userEvent.setup();
    renderStats([], [view(`${lastMonth}-15`)]);

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByText(monthTitle(lastMonth))).toBeTruthy();
    expect(screen.getByLabelText(`${lastMonth}-15: 1 events`)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText(monthTitle(thisMonth))).toBeTruthy();
  });

  it("stops at the first month with anything in it", () => {
    renderStats([], [view(today)]);

    expect(screen.getByRole("button", { name: "Mes anterior" }).disabled).toBe(true);
  });

  it("stops at the month the owner is in rather than paging into empty pages", () => {
    renderStats([], [view(today)]);

    expect(screen.getByRole("button", { name: "Mes siguiente" }).disabled).toBe(true);
  });

  it("keeps the back arrow live while there is an earlier month to reach", () => {
    renderStats([], [view(`${lastMonth}-15`)]);

    expect(screen.getByRole("button", { name: "Mes anterior" }).disabled).toBe(false);
  });
});

describe("the activity trend view", () => {
  it("swaps the month page for sixteen weeks of dots", async () => {
    const user = userEvent.setup();
    renderStats([], [view(today)]);

    await showTrend(user);

    expect(screen.queryByText(monthTitle(thisMonth))).toBeNull();
    expect(labelledDays()).toHaveLength(0);
    expect(screen.getAllByLabelText(/^Week of \d{4}-\d{2}-\d{2}: \d+ active days$/)).toHaveLength(
      HEATMAP_WEEKS
    );
  });

  it("draws one dot per day the owner showed up, and none for the quiet days", async () => {
    const user = userEvent.setup();
    renderStats([], [view(today), view(dayBefore(1)), view(dayBefore(1))]);

    await showTrend(user);

    expect(dots()).toHaveLength(2);
  });

  it("comes back to the month page", async () => {
    const user = userEvent.setup();
    renderStats([], [view(today)]);

    await showTrend(user);
    await user.click(screen.getByRole("radio", { name: "mes" }));

    expect(screen.getByText(monthTitle(thisMonth))).toBeTruthy();
    expect(dots()).toHaveLength(0);
  });
});

describe("the streak", () => {
  it("shows the streak above the calendar", () => {
    renderStats([], [view(today), view(dayBefore(1))]);

    // Scoped to the streak tile: the calendar below now prints day numbers, so a bare
    // getByText("2") matches the second of the month as readily as a two-day run.
    expect(screen.getByText("2", { selector: ".text-3xl" })).toBeTruthy();
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

  it("draws the total as visible text, not only as an accessible name", () => {
    // The original chart passed its aria-label assertion while its only visible number was
    // clipped off the top of the viewBox. Reading the rendered <text> is what catches that.
    const items = [
      makeLexical({ createdAt: at(dayBefore(30)) }),
      makeLexical({ createdAt: at(dayBefore(20)) }),
      makeLexical({ createdAt: at(dayBefore(2)) }),
    ];
    renderStats(items);

    const svg = screen.getByRole("img");
    const labels = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    expect(labels).toContain("3");
    expect(labels).toContain("0");
  });

  it("keeps every label inside the viewBox", () => {
    // A cumulative total never falls, so the last point is always the highest one. Any label
    // hung above it needs headroom, or it renders off the top edge where nothing can see it.
    renderStats([makeLexical({ createdAt: at(dayBefore(30)) }), makeLexical({ createdAt: at(today) })]);

    const svg = screen.getByRole("img");
    const [, , boxWidth, boxHeight] = svg.getAttribute("viewBox").split(" ").map(Number);

    for (const text of svg.querySelectorAll("text")) {
      const x = Number(text.getAttribute("x"));
      const y = Number(text.getAttribute("y"));
      const size = Number(text.getAttribute("fontSize") || text.getAttribute("font-size"));
      // y is the baseline, so the glyphs reach up to roughly one font size above it.
      expect(y - size).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(boxHeight);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(boxWidth);
    }
  });

  it("says where the line started and how much arrived since", () => {
    const items = [
      makeLexical({ createdAt: at(dayBefore(30)) }),
      makeLexical({ createdAt: at(dayBefore(30)) }),
      makeLexical({ createdAt: at(dayBefore(2)) }),
    ];
    renderStats(items);

    expect(screen.getByText(/3 words — 2 by .+, 1 added since\./)).toBeTruthy();
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

describe("Phase 14: compact Conjugation Gym summary", () => {
  const drill = (passed, tense, verdict = passed ? "exact" : "wrong") =>
    makeEvent({
      type: passed ? "drill_pass" : "drill_fail",
      itemKey: "user:poner",
      at: at(today),
      localDate: today,
      metadata: { tense, slot: "yo", mode: "typed", verdict },
    });

  it("is absent entirely until the drill has been used", () => {
    render(<Estadisticas items={[]} events={[]} onBack={vi.fn()} />);

    expect(screen.queryByText("Conjugaciones")).toBeNull();
  });

  it("shows initial typed accuracy and links to the dedicated performance screen", async () => {
    const user = userEvent.setup();
    const onOpenConjugationPerformance = vi.fn();
    render(
      <Estadisticas
        items={[]}
        events={[
          drill(true, "Indicative/Present"),
          drill(true, "Indicative/Present"),
          drill(false, "Indicative/Preterite"),
          drill(true, "Indicative/Preterite"),
        ]}
        onBack={vi.fn()}
        onOpenConjugationPerformance={onOpenConjugationPerformance}
      />
    );

    expect(screen.getByText("Conjugaciones")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText(/3\/4 typed first attempts/)).toBeTruthy();
    expect(screen.queryByText("Preterite")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Conjugation Gym/ }));
    expect(onOpenConjugationPerformance).toHaveBeenCalledTimes(1);
  });

  it("names accent slips alongside the total", () => {
    render(
      <Estadisticas
        items={[]}
        events={[drill(true, "Indicative/Preterite", "accents")]}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText(/1 accent slip/)).toBeTruthy();
  });
});
