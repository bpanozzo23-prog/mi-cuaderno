// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { db, clearAllPersonalData } from "./db/db.js";
import { allItems, createItem, getItem, linkItems, newLexical, newPage } from "./db/items.js";
import { removeDictionary } from "./db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "./db/ref/refdb.js";
import { FIXTURE_ENTRIES } from "./test/dictFixture.js";
import { newMeaning } from "./lib/meanings.js";
import { localDate } from "./lib/dates.js";

const CASA = "dict:wiktionary-es:casa:noun";

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await db.open();
  await clearAllPersonalData();
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

async function seedDictionary(entryIds = [CASA]) {
  const slot = "a";
  const reference = refDb(slot);
  const entries = FIXTURE_ENTRIES.filter((entry) => entryIds.includes(entry.id));
  await reference.entries.bulkPut(entries);
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: {
      datasetVersion: "phase-5a-fixture",
      counts: { entries: entries.length },
      previousIds: {},
    },
  });
  setActiveSlot(slot);
}

async function linkedTrail() {
  const phrase = await createItem(newLexical({ term: "de repente", form: "phrase" }));
  const word = await createItem(newLexical({ term: "madrugar", meanings: [newMeaning({ gloss: "to get up early" })] }));
  const page = await createItem(newPage({ title: "Study source" }));
  await linkItems(word.id, phrase.id);
  await linkItems(page.id, word.id);
  return { phrase, word, page };
}

describe("Phase 5a navigation continuity", () => {
  it("opens each linked destination at the top and backs through the detail trail", async () => {
    const user = userEvent.setup();
    await linkedTrail();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^Study source$/ }));
    expect(screen.getByRole("button", { name: "Todo el cuaderno" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));

    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));
    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));

    await user.click(screen.getByRole("button", { name: /^de repente/ }));
    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();

    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByText("madrugar", { selector: ".text-2xl *" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));

    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByText("Study source", { selector: ".text-2xl *" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Todo el cuaderno" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Todo el cuaderno" }));
    expect(screen.getByPlaceholderText(/Search words, meanings, notes, pages/)).toBeTruthy();
  });

  it("clears a linked trail when leaving Cuaderno", async () => {
    const user = userEvent.setup();
    await linkedTrail();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^Study source$/ }));
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));
    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Repaso" }));
    expect(await screen.findByText("Para hoy")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cuaderno" }));

    expect(screen.queryByRole("button", { name: "Atrás" })).toBeNull();
    expect(screen.getByPlaceholderText(/Search words, meanings, notes, pages/)).toBeTruthy();
  });

  it("keeps optional-field drafts scoped to the entry where they were typed", async () => {
    const user = userEvent.setup();
    await linkedTrail();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^Study source$/ }));
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));
    await user.click(screen.getByRole("button", { name: "Add an example" }));
    await user.type(screen.getByRole("textbox", { name: "Sentence in Spanish" }), "Me levanto temprano.");

    await user.click(screen.getByRole("button", { name: /^de repente/ }));
    await user.click(screen.getByRole("button", { name: "Add an example" }));
    expect(screen.getByRole("textbox", { name: "Sentence in Spanish" }).value).toBe("");
  });

  it("traverses between personal and dictionary details without losing the trail", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const word = await createItem(newLexical({ term: "madrugar", linkedKeys: [CASA] }));
    const page = await createItem(newPage({ title: "Study source" }));
    await linkItems(page.id, word.id);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^Study source$/ }));
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));
    await user.click(await screen.findByRole("button", { name: /^casa/ }));

    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();
    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();

    await user.click((await screen.findAllByRole("button", { name: /^madrugar/ }))[0]);
    expect(screen.getByText("madrugar", { selector: ".text-2xl *" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();
  });
});

describe("Phase 4p Diario foundation", () => {
  it("gives dated General pages their own tab and excludes them from the page count", async () => {
    const user = userEvent.setup();
    await createItem(newPage({ title: "Grammar note" }));
    await createItem(newPage({ title: "Morning check-in", pageDate: "2026-08-03", body: "Hoy practiqué." }));
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    expect(within(navigation).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Cuaderno",
      "Diario",
      "Repaso",
      "Ajustes",
    ]);
    await screen.findByRole("textbox", { name: "Search notebook" });
    expect(screen.getByLabelText("Notebook totals").textContent).toContain("1 página");
    expect(screen.queryByRole("button", { name: /Morning check-in/ })).toBeNull();

    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    expect(await screen.findByRole("button", { name: "Open Morning check-in" })).toBeTruthy();
    expect(screen.queryByText("1 página")).toBeNull();
  });

  it("routes an intentional Cuaderno search result through Diario and back to that search", async () => {
    const user = userEvent.setup();
    await createItem(newPage({ title: "Morning check-in", pageDate: "2026-08-03", body: "Hoy practiqué." }));
    render(<App />);

    const search = await screen.findByRole("textbox", { name: "Search notebook" });
    await user.type(search, "Morning");
    await user.click(screen.getByRole("button", { name: /Morning check-in/ }));

    expect(screen.getByRole("button", { name: "Back to Cuaderno" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Diario surface" })).getByText("Hoy practiqué.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to Cuaderno" }));

    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("Morning");
    expect(screen.getByRole("button", { name: /Morning check-in/ })).toBeTruthy();
  });
});

describe("Phase 4r journal capture", () => {
  it("starts an unmaterialized moment from Diario and returns home after autosave", async () => {
    const user = userEvent.setup();
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(screen.getByRole("button", { name: "Write today" }));

    await user.type(screen.getByRole("textbox", { name: "Journal title" }), "A title alone");
    expect(await allItems()).toEqual([]);
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Hoy escribí en mi diario.");
    await waitFor(async () => expect(await allItems()).toHaveLength(1), { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: "Back to Diario" }));
    expect(await screen.findByRole("button", { name: "Open A title alone" })).toBeTruthy();
  });

  it("preserves journal edits and the most recent valid date when a tab switch closes an invalid editor", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({
      title: "Tab-safe moment",
      body: "Antes.",
      pageDate: localDate(),
    }));
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(screen.getByRole("button", { name: "Open Tab-safe moment" }));
    await user.click(screen.getByRole("button", { name: "Edit journal entry" }));

    const date = screen.getByLabelText("Journal date");
    fireEvent.change(date, { target: { value: "2026-07-31" } });
    fireEvent.change(date, { target: { value: "" } });
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), " Después.");
    expect(screen.getByRole("status").textContent).toMatch(/choose a date/i);

    await user.click(within(navigation).getByRole("button", { name: "Cuaderno" }));
    await waitFor(async () => {
      const updated = await getItem(entry.id);
      expect(updated.body).toBe("Antes. Después.");
      expect(updated.pageDate).toBe("2026-07-31");
    });
  });
});

describe("Phase 4s journal reading and connections", () => {
  it("crosses from a journal to linked vocabulary and Back returns to the reader", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "madrugar", meanings: [newMeaning({ gloss: "to get up early" })] }));
    await createItem(newPage({
      title: "Morning link",
      body: "Hoy me levanté temprano.",
      pageDate: localDate(),
      linkedKeys: [word.id],
    }));
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(screen.getByRole("button", { name: "Open Morning link" }));
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));

    expect(screen.getByText("madrugar", { selector: ".text-2xl *" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("heading", { name: "Morning link" })).toBeTruthy();
  });

  it("creates reflection as a separate current-day moment linked to its source", async () => {
    const user = userEvent.setup();
    const source = await createItem(newPage({
      title: "A year ago",
      body: "Entonces pensaba otra cosa.",
      pageDate: "2025-08-03",
    }));
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(screen.getByRole("button", { name: "Open A year ago" }));
    await user.click(screen.getByRole("button", { name: "Reflect" }));

    expect(screen.getByText("Looking back, what do you notice now?")).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Ahora noto cuánto he cambiado.");
    await waitFor(async () => expect(await allItems()).toHaveLength(2), { timeout: 3000 });
    const reflection = (await allItems()).find((item) => item.id !== source.id);
    expect(reflection.pageDate).toBe(localDate());
    expect(reflection.linkedKeys).toEqual([source.id]);
    expect(reflection.prompt).toBeUndefined();

    await user.click(screen.getByRole("button", { name: "Back to Atrás" }));
    expect(screen.getByRole("heading", { name: "A year ago" })).toBeTruthy();
  });

  it("moves a journal to Pages in place and preserves Diario as the Back origin", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({ title: "Move me", body: "Keep every field.", pageDate: localDate() }));
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(screen.getByRole("button", { name: "Open Move me" }));
    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    await user.click(screen.getByRole("button", { name: "Move to Pages" }));
    await user.click(screen.getByRole("button", { name: "Confirm move" }));

    await waitFor(async () => expect((await getItem(entry.id)).pageDate).toBeNull());
    const cuaderno = await screen.findByRole("region", { name: "Cuaderno surface" });
    expect(within(cuaderno).getByText("Move me", { selector: ".text-2xl *" })).toBeTruthy();
    await user.click(within(cuaderno).getByRole("button", { name: "Diario" }));
    expect(await screen.findByText("Your first moment can begin with today.")).toBeTruthy();
  });
});
