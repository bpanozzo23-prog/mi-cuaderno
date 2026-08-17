// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import JournalEditor from "./JournalEditor.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allItems, createItem, getItem, newPage, saveEntryFeedback } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { makeStoredFeedback } from "../lib/diarioReview.js";

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

describe("JournalEditor stored feedback", () => {
  const review = {
    verdict: "mostly_clear",
    summary: "One preposition slip is worth fixing.",
    items: [
      { category: "error", quote: "agradecido para", corrected: "agradecido por", explanation: "Wrong preposition." },
    ],
  };

  const reviewedEntry = async (body = "Hoy estoy agradecido para mi familia.") => {
    const created = await createItem(newPage({ title: "Martes", body, pageDate: "2026-08-03" }));
    await saveEntryFeedback(created.id, makeStoredFeedback(review, created));
    return getItem(created.id);
  };

  it("shows the stored review read-only beside the draft, without request controls", async () => {
    const entry = await reviewedEntry();
    render(<JournalEditor {...baseProps({ entry })} />);

    expect(screen.getByText("Mostly clear")).toBeTruthy();
    expect(screen.getByText("agradecido para")).toBeTruthy();
    expect(screen.getByText(/→ agradecido por/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Send and review/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ask again/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/i })).toBeNull();
    // Fresh against the unedited draft: no staleness warning yet.
    expect(screen.queryByText(/From before your last edit/i)).toBeNull();
  });

  it("renders no panel for an entry without feedback or a brand-new draft", async () => {
    const entry = await createItem(newPage({ title: "Sin review", body: "Texto.", pageDate: "2026-08-03" }));
    render(<JournalEditor {...baseProps({ entry })} />);
    expect(screen.queryByText(/Margin notes/i)).toBeNull();
    cleanup();

    render(<JournalEditor {...baseProps()} />);
    expect(screen.queryByText(/Margin notes/i)).toBeNull();
  });

  it("marks the review stale as the text changes, but not for formatting-only edits", async () => {
    const user = userEvent.setup();
    const entry = await reviewedEntry("Esto importa");
    render(<JournalEditor {...baseProps({ entry })} />);
    const body = screen.getByRole("textbox", { name: "Journal body" });

    // Formatting only: the visible-text projection is unchanged, so the review stays fresh.
    body.focus();
    body.setSelectionRange(5, 12);
    await user.click(screen.getByRole("button", { name: "Highlight" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
    expect(screen.queryByText(/From before your last edit/i)).toBeNull();

    await user.type(body, " mucho");

    expect(screen.getByText(/From before your last edit/i)).toBeTruthy();
  });

  it("autosaves around the stored review without touching it", async () => {
    const user = userEvent.setup();
    const entry = await reviewedEntry();
    render(<JournalEditor {...baseProps({ entry })} />);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), " Y más.");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));

    const stored = await getItem(entry.id);
    expect(stored.body).toContain("Y más.");
    expect(stored.feedback).toEqual(entry.feedback);
  });
});

describe("JournalEditor autosave", () => {
  it("offers Inline code and Link in Diario and Apuntes without explicit callout variants", async () => {
    const user = userEvent.setup();
    render(<JournalEditor {...baseProps()} />);

    expect(screen.getByRole("button", { name: "Inline code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tip callout" })).toBeNull();
    expect(screen.queryByRole("button", { name: "¡Ojo! callout" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Apuntes" }));
    expect(screen.getAllByRole("button", { name: "Inline code" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Link" })).toHaveLength(2);
  });

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

  it("autosaves Apuntes typed in the collapsible box and trims a blanked box back to null", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({ title: "Con caja", body: "Cuerpo.", pageDate: "2026-08-03" }));
    render(<JournalEditor {...baseProps({ entry, seed: null })} />);

    // Empty Apuntes start collapsed; the box must be opened before typing.
    const toggle = screen.getByRole("button", { name: "Apuntes" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    await user.type(screen.getByRole("textbox", { name: "Apuntes" }), "recopilar > juntar");
    await waitFor(async () => expect((await allItems())[0].apuntes).toBe("recopilar > juntar"));
    expect((await allItems())[0].body).toBe("Cuerpo.");

    await user.clear(screen.getByRole("textbox", { name: "Apuntes" }));
    await waitFor(async () => expect((await allItems())[0].apuntes).toBeNull());
  });

  it("keeps the Apuntes box mounted while collapsed so its draft survives", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({
      title: "Guardado",
      body: "Cuerpo.",
      pageDate: "2026-08-03",
      apuntes: "Nota externa",
    }));
    render(<JournalEditor {...baseProps({ entry, seed: null })} />);

    // Non-empty Apuntes open expanded.
    const toggle = screen.getByRole("button", { name: "Apuntes" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const box = screen.getByRole("textbox", { name: "Apuntes" });
    expect(box.value).toBe("Nota externa");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // Hidden, not unmounted: the value is still there when reopened.
    expect(box.isConnected).toBe(true);
    await user.click(toggle);
    expect(screen.getByRole("textbox", { name: "Apuntes" }).value).toBe("Nota externa");
  });

  it("materializes a fresh draft from Apuntes alone so pasted feedback is never lost", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<JournalEditor {...props} />);

    await user.click(screen.getByRole("button", { name: "Apuntes" }));
    await user.type(screen.getByRole("textbox", { name: "Apuntes" }), "Feedback de Gemini.");

    await waitFor(async () => expect(await allItems()).toHaveLength(1));
    const [created] = await allItems();
    expect(created.apuntes).toBe("Feedback de Gemini.");
    expect(created.body).toBe("");
    expect(created.pageDate).toBe("2026-08-03");
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
