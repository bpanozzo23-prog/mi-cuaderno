// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import JournalEditor from "./JournalEditor.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allItems, createItem, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseProps = (overrides = {}) => ({
  entry: null,
  seed: { date: "2026-08-03" },
  onBack: vi.fn(),
  onChanged: vi.fn(),
  onMaterialized: vi.fn(),
  autosaveMs: 15,
  ...overrides,
});

describe("JournalEditor autosave", () => {
  it("autosaves a non-destructive blank-line marker", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({
      title: "Spaced moment",
      body: "Primero.\nDespués.",
      pageDate: "2026-08-03",
    }));
    render(<JournalEditor {...baseProps({ entry })} />);
    const body = screen.getByRole("textbox", { name: "Journal body" });
    body.focus();
    body.setSelectionRange(0, "Primero.".length);

    await user.click(screen.getByRole("button", { name: "Blank line" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
    expect((await allItems())[0].body).toBe("Primero.\n\n<br>\n\nDespués.");
  });

  it("autosaves formatting inserted by the toolbar", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({
      title: "Formatted moment",
      body: "Esto importa",
      pageDate: "2026-08-03",
    }));
    render(<JournalEditor {...baseProps({ entry })} />);
    const body = screen.getByRole("textbox", { name: "Journal body" });
    body.focus();
    body.setSelectionRange(5, 12);

    await user.click(screen.getByRole("button", { name: "Highlight" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
    expect((await allItems())[0].body).toBe("Esto ==importa==");
  });

  it("does not materialize a fresh draft from a title alone", async () => {
    const user = userEvent.setup();
    render(<JournalEditor {...baseProps()} />);

    await user.type(screen.getByRole("textbox", { name: "Journal title" }), "Only a title");
    expect(screen.getByRole("status").textContent).toMatch(/start writing/i);
    cleanup();

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(await allItems()).toEqual([]);
    expect(await allEvents()).toEqual([]);
  });

  it("cancels a pending creation when the first writing is erased", async () => {
    const user = userEvent.setup();
    render(<JournalEditor {...baseProps({ autosaveMs: 50 })} />);

    const body = screen.getByRole("textbox", { name: "Journal body" });
    await user.type(body, "Temporary");
    await user.clear(body);
    expect(screen.getByRole("status").textContent).toMatch(/start writing/i);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(await allItems()).toEqual([]);
  });

  it("creates on the first nonblank body and keeps that creation visit free of edit events", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<JournalEditor {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Journal title" }), "Morning");
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Hoy caminé.");

    await waitFor(async () => expect(await allItems()).toHaveLength(1));
    const [created] = await allItems();
    expect(created.title).toBe("Morning");
    expect(created.body).toBe("Hoy caminé.");
    expect(created.pageDate).toBe("2026-08-03");
    expect(props.onMaterialized).toHaveBeenCalledWith(created.id);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), " Después descansé.");
    await waitFor(async () => {
      const [updated] = await allItems();
      expect(updated.body).toBe("Hoy caminé. Después descansé.");
    });

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(1);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
    expect(events.filter((event) => event.type === EVENT_TYPES.view)).toHaveLength(0);
  });

  it("materializes and reports Saved through React StrictMode's effect replay", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(
      <StrictMode>
        <JournalEditor {...props} />
      </StrictMode>
    );

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Strict mode moment.");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
    expect(props.onMaterialized).toHaveBeenCalledTimes(1);
    expect(await allItems()).toHaveLength(1);
  });

  it("flushes a new body on unmount without rewriting navigation after the owner leaves", async () => {
    const user = userEvent.setup();
    const props = baseProps({ autosaveMs: 5000 });
    render(<JournalEditor {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Un momento rápido.");
    cleanup();

    await waitFor(async () => expect(await allItems()).toHaveLength(1));
    expect(props.onMaterialized).not.toHaveBeenCalled();
    const events = await allEvents();
    expect(events.map((event) => event.type)).toEqual([EVENT_TYPES.create]);
  });

  it("logs at most one edit while an existing entry autosaves more than once", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({
      title: "Before",
      body: "Primera versión.",
      pageDate: "2026-08-03",
    }));
    render(<JournalEditor {...baseProps({ entry, seed: null })} />);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), " Más.");
    await waitFor(async () => {
      const [updated] = await allItems();
      expect(updated.body).toBe("Primera versión. Más.");
    });

    const title = screen.getByRole("textbox", { name: "Journal title" });
    await user.clear(title);
    await user.type(title, "After");
    await waitFor(async () => {
      const [updated] = await allItems();
      expect(updated.title).toBe("After");
    });

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(1);
  });

  it("flushes eligible writing before Back and refuses to leave an existing entry without a date", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({ body: "Antes.", pageDate: "2026-08-03" }));
    const props = baseProps({ entry, seed: null, autosaveMs: 5000 });
    render(<JournalEditor {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), " Ahora.");
    await user.click(screen.getByRole("button", { name: "Back to Diario" }));
    await waitFor(() => expect(props.onBack).toHaveBeenCalledTimes(1));
    expect((await allItems())[0].body).toBe("Antes. Ahora.");

    cleanup();
    const secondProps = baseProps({ entry: (await allItems())[0], seed: null });
    render(<JournalEditor {...secondProps} />);
    await user.clear(screen.getByLabelText("Journal date"));
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), " Sin fecha.");
    await user.click(screen.getByRole("button", { name: "Back to Diario" }));
    expect(secondProps.onBack).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toMatch(/choose a date/i);
  });

  it("uses a selected prompt only as ephemeral guidance", async () => {
    const user = userEvent.setup();
    render(<JournalEditor {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: "Need a prompt?" }));
    await user.click(screen.getByRole("button", { name: "Spanish" }));
    await user.click(screen.getByRole("button", { name: /Use prompt: ¿Qué palabra o frase/ }));
    expect(screen.getByText("Which Spanish word or phrase appeared today?")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Journal body" }).value).toBe("");

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Escuché la palabra sobremesa.");
    await waitFor(async () => expect(await allItems()).toHaveLength(1));
    const [created] = await allItems();
    expect(created.body).toBe("Escuché la palabra sobremesa.");
    expect(created.promptId).toBeUndefined();
    expect(created.prompt).toBeUndefined();
  });
});
