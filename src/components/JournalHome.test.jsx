// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

    expect(screen.getAllByText("A very important memory.")).toHaveLength(2);
    expect(document.body.textContent).not.toContain("**");
    expect(document.body.textContent).not.toContain("==");
  });

  it("opens the stable Today anchor, a distinct continuation, and a fresh same-day moment", async () => {
    const user = userEvent.setup();
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

    render(
      <JournalHome
        entries={[second, first]}
        onOpen={vi.fn()}
        onEdit={onEdit}
        onStart={onStart}
        now={new Date(2026, 7, 3, 12)}
      />
    );

    await user.click(screen.getByRole("button", { name: "Continue today" }));
    expect(onEdit).toHaveBeenLastCalledWith(first.id);
    await user.click(screen.getByRole("button", { name: /Continue Second today/ }));
    expect(onEdit).toHaveBeenLastCalledWith(second.id);
    await user.click(screen.getByRole("button", { name: "New moment" }));
    expect(onStart).toHaveBeenCalledWith({ date: "2026-08-03" });
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

    await user.click(screen.getByRole("button", { name: "Write today" }));
    expect(onStart).toHaveBeenCalledWith({ date: "2026-08-03" });
    expect(screen.getByText("Your first moment can begin with today.")).toBeTruthy();
  });
});
