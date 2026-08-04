// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { db, clearAllPersonalData } from "./db/db.js";
import { createItem, linkItems, newLexical, newPage } from "./db/items.js";
import { removeDictionary } from "./db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "./db/ref/refdb.js";
import { FIXTURE_ENTRIES } from "./test/dictFixture.js";
import { newMeaning } from "./lib/meanings.js";

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

    await user.click(screen.getAllByRole("button", { name: /^madrugar/ })[0]);
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
    expect(await screen.findByRole("button", { name: /Morning check-in/ })).toBeTruthy();
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
