// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JournalHome from "./JournalHome.jsx";

afterEach(cleanup);

const moment = (id, date, overrides = {}) => ({
  id: `user:${id}`,
  type: "page",
  pageFocus: "notes",
  collection: { enabled: false, groups: [] },
  source: { enabled: false, format: "", creator: "", scope: "", url: "", context: "", captures: [] },
  grammar: { enabled: false, keyIdea: "", sections: [] },
  pageDate: date,
  title: id,
  body: `${id} body`,
  tags: [],
  createdAt: `${date}T08:00:00.000Z`,
  updatedAt: `${date}T08:00:00.000Z`,
  ...overrides,
});

describe("JournalHome", () => {
  it("shows clean visible text rather than Markdown punctuation in a card preview", () => {
    const formatted = moment("Formatted", "2026-08-03", {
      body: "A **very important** ==memory==.",
    });
    render(
      <JournalHome
        entries={[formatted]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        now={new Date(2026, 7, 3, 12)}
      />
    );

    expect(screen.getAllByText("A very important memory.")).toHaveLength(1);
    expect(document.body.textContent).not.toContain("**");
    expect(document.body.textContent).not.toContain("==");
    expect(document.body.textContent).not.toContain("Notice the day");
    expect(screen.queryByRole("button", { name: /Continue Formatted/ })).toBeNull();
  });

  it("opens the stable Today anchor, every same-day continuation, and a fresh same-day moment", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onEdit = vi.fn();
    const onStart = vi.fn();
    const first = moment("First today", "2026-08-03", {
      createdAt: "2026-08-03T08:00:00.000Z",
      updatedAt: "2026-08-03T09:00:00.000Z",
    });
    const second = moment("Second today", "2026-08-03", {
      createdAt: "2026-08-03T10:00:00.000Z",
      updatedAt: "2026-08-03T12:00:00.000Z",
    });
    const third = moment("Third today", "2026-08-03", {
      createdAt: "2026-08-03T11:00:00.000Z",
      updatedAt: "2026-08-03T13:00:00.000Z",
    });
    const yesterday = moment("Yesterday", "2026-08-02", {
      updatedAt: "2026-08-03T14:00:00.000Z",
    });

    render(
      <JournalHome
        entries={[yesterday, third, second, first]}
        onOpen={onOpen}
        onEdit={onEdit}
        onStart={onStart}
        now={new Date(2026, 7, 3, 12)}
      />
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onEdit).toHaveBeenLastCalledWith(first.id);
    await user.click(screen.getByRole("button", { name: "Open First today" }));
    expect(onOpen).toHaveBeenLastCalledWith(first.id);
    const continuationButtons = screen.getAllByRole("button", { name: /Continue .* today/ });
    expect(continuationButtons).toHaveLength(2);
    expect(screen.queryByText("Aug 3")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open Second today" }));
    expect(onOpen).toHaveBeenLastCalledWith(second.id);
    await user.click(screen.getByRole("button", { name: "Open Third today" }));
    expect(onOpen).toHaveBeenLastCalledWith(third.id);
    await user.click(screen.getByRole("button", { name: /Continue Second today/ }));
    expect(onEdit).toHaveBeenLastCalledWith(second.id);
    await user.click(screen.getByRole("button", { name: /Continue Third today/ }));
    expect(onEdit).toHaveBeenLastCalledWith(third.id);
    expect(screen.queryByRole("button", { name: /Continue Yesterday/ })).toBeNull();
    const timeline = screen.getByRole("region", { name: "Journal timeline" });
    expect(within(timeline).queryByRole("button", { name: "Open First today" })).toBeNull();
    expect(within(timeline).queryByRole("button", { name: "Open Second today" })).toBeNull();
    expect(within(timeline).queryByRole("button", { name: "Open Third today" })).toBeNull();
    expect(within(timeline).getByRole("button", { name: "Open Yesterday" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "New" }));
    expect(onStart).toHaveBeenCalledWith({ date: "2026-08-03" });
  });

  it("groups timeline entries under one date while showing derived Taller provenance and targets", () => {
    const first = moment("Morning", "2026-08-02", { tags: ["rutina"] });
    const second = moment("Evening", "2026-08-02");
    const event = {
      id: "evt:practice",
      type: "practice_write",
      itemKey: second.id,
      at: "2026-08-02T20:00:00.000Z",
      localDate: "2026-08-02",
      metadata: { skill: "narrate", promptId: "narrate-scene", kept: true },
    };

    render(
      <JournalHome
        entries={[second, first]}
        events={[event]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        now={new Date(2026, 7, 3, 12)}
      />
    );

    const timeline = screen.getByRole("region", { name: "Journal timeline" });
    expect(within(timeline).getAllByText("Aug 2, 2026")).toHaveLength(1);
    expect(within(timeline).getByText("#rutina")).toBeTruthy();
    expect(within(timeline).getByText("Narrate")).toBeTruthy();
    expect(within(timeline).getByText(/Indicative preterite/)).toBeTruthy();
    expect(within(timeline).queryByText("Taller")).toBeNull();
    const morningCard = within(timeline).getByRole("button", { name: "Open Morning" });
    const eveningCard = within(timeline).getByRole("button", { name: "Open Evening" });
    expect(morningCard.querySelector(".lucide-hammer")).toBeNull();
    expect(eveningCard.querySelector(".lucide-hammer")).toBeTruthy();
  });

  it("shows current moments, keeps older years in an explicit archive, and searches every year", async () => {
    const user = userEvent.setup();
    const current = moment("Current moment", "2026-07-20");
    const memory = moment("Nearby memory", "2025-08-05");
    const archived = moment("Archived moment", "2024-03-01", { tags: ["gratitud"] });

    render(
      <JournalHome
        entries={[archived, current, memory]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        now={new Date(2026, 7, 3, 12)}
      />
    );

    expect(screen.getByRole("button", { name: "Open Current moment" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Nearby memory" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open Archived moment" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("button", { name: "Open Archived moment" })).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Search journal" }), "gratitud");
    expect(screen.getByRole("button", { name: "Open Archived moment" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open Current moment" })).toBeNull();
  });

  it("starts a nonmaterialized Today draft when the journal is empty", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <JournalHome
        entries={[]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={onStart}
        now={new Date(2026, 7, 3, 12)}
      />
    );

    expect(screen.queryByRole("button", { name: "New" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Write today" }));
    expect(onStart).toHaveBeenCalledWith({ date: "2026-08-03" });
    expect(screen.getByText("Your first moment can begin with today.")).toBeTruthy();
  });
});
