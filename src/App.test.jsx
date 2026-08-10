// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { db, clearAllPersonalData } from "./db/db.js";
import { EVENT_TYPES, logEvent } from "./db/events.js";
import { allItems, createItem, getItem, linkItems, newLexical, newPage } from "./db/items.js";
import { removeDictionary } from "./db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "./db/ref/refdb.js";
import {
  FIXTURE_ENGLISH_SHARDS,
  FIXTURE_ENTRIES,
  FIXTURE_FORM_SHARDS,
} from "./test/dictFixture.js";
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

describe("study-session focus mode", () => {
  it("removes the app header and primary navigation until the session finishes", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({
      term: "madrugar",
      meanings: [newMeaning({ gloss: "to get up early" })],
    }));
    await logEvent(EVENT_TYPES.trickyOn, word.id);
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    expect(screen.getByText("Spanish notebook")).toBeTruthy();
    await user.click(within(navigation).getByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: "Start" }));

    expect(await screen.findByRole("region", { name: "Review session" })).toBeTruthy();
    expect(screen.queryByText("Spanish notebook")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(screen.getByRole("progressbar", { name: "Session progress" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByText("Spanish notebook")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  });
});

describe("Phase 4z Pages hub navigation", () => {
  it("opens a focused hub, shares pin state with detail, and restores its scroll through the route trail", async () => {
    const user = userEvent.setup();
    await createItem(newPage({ title: "Plain notes", body: "Keep this nearby." }));
    await createItem(newPage({
      title: "Listening source",
      pageFocus: "source",
      collection: { enabled: true, groups: [] },
      source: { enabled: true, format: "audio" },
    }));
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: "páginas" }));

    expect(screen.getByRole("heading", { name: "Pages" })).toBeTruthy();
    expect(screen.queryByText("Spanish notebook")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sources" }));
    expect(screen.getByRole("button", { name: "Listening source" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plain notes" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Pin Listening source" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unpin Listening source" })).toBeTruthy());
    Object.defineProperty(window, "scrollY", { value: 436, configurable: true });
    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "Listening source" }));

    expect(screen.getByRole("button", { name: "Pages" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unpin page" }).getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));
    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "Pages" }));

    expect(screen.getByRole("heading", { name: "Pages" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Listening source" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plain notes" })).toBeNull();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 436));
    await user.click(within(screen.getByRole("region", { name: "Cuaderno surface" })).getByRole("button", { name: "Cuaderno" }));
    expect(screen.getByRole("textbox", { name: "Search notebook" })).toBeTruthy();
    expect(screen.getByText("Spanish notebook")).toBeTruthy();
  });
});

describe("Phase 8 Words & phrases hub navigation", () => {
  async function seedVocabulary() {
    const word = await createItem(newLexical({
      term: "madrugar",
      meanings: [newMeaning({ gloss: "to get up early" })],
    }));
    const phrase = await createItem(newLexical({ term: "de repente", form: "phrase" }));
    return { word, phrase };
  }

  it("opens a focused hub from frases, keeps pin state, and restores its scroll by the trail", async () => {
    const user = userEvent.setup();
    await seedVocabulary();
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: "frases" }));

    // The hub replaces the app header and arrives with the tapped chip already applied.
    expect(screen.getByRole("heading", { name: "Words & phrases" })).toBeTruthy();
    expect(screen.queryByText("Spanish notebook")).toBeNull();
    expect(screen.getByRole("button", { name: "de repente" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "madrugar" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Pin de repente" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unpin de repente" })).toBeTruthy());

    Object.defineProperty(window, "scrollY", { value: 512, configurable: true });
    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "de repente" }));
    expect(screen.getByRole("button", { name: "Words & phrases" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));
    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "Words & phrases" }));

    // Back lands on the hub with its visit-local chip and the pin both intact.
    expect(screen.getByRole("heading", { name: "Words & phrases" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unpin de repente" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "madrugar" })).toBeNull();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 512));

    await user.click(within(screen.getByRole("region", { name: "Cuaderno surface" })).getByRole("button", { name: "Cuaderno" }));
    expect(screen.getByRole("textbox", { name: "Search notebook" })).toBeTruthy();
    expect(screen.getByText("Spanish notebook")).toBeTruthy();
  });

  /** The shared seed above is built for link traversal; searching also needs the form shards. */
  async function seedSearchableDictionary() {
    const reference = refDb("a");
    await Promise.all([
      reference.entries.put(FIXTURE_ENTRIES.find((entry) => entry.lemma === "casa")),
      reference.formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca")),
      reference.englishShards.bulkPut(FIXTURE_ENGLISH_SHARDS.filter((row) => row.id === "ho")),
      reference.meta.put({
        key: META_KEYS.dataset,
        value: { datasetVersion: "phase-8-fixture", counts: { entries: 1 }, previousIds: {} },
      }),
    ]);
    setActiveSlot("a");
  }

  it("hands a hub miss to Cuaderno, where the dictionary can answer it", async () => {
    const user = userEvent.setup();
    await seedSearchableDictionary();
    await seedVocabulary();
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: "palabras" }));
    await user.click(screen.getByRole("button", { name: "Search words and phrases" }));
    await user.type(screen.getByLabelText("Search words and phrases"), "casa");

    // The hub holds no personal "casa", and it never consults the dictionary itself.
    expect(screen.getByText(/No words or phrases match/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Search the dictionary for/ }));

    // Cuaderno's one mixed list takes over, with the query applied and the entry found there.
    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("casa");
    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();
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

  it("moves a dated enhanced page into Diario in place when its final structure is disabled", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({
      title: "Move into Diario",
      body: "Keep this writing.",
      pageDate: localDate(),
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [] },
    }));
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Move into Diario" }));
    await user.click(screen.getByLabelText("Page actions"));
    await user.click(screen.getByRole("button", { name: /Customize page/ }));
    await user.click(screen.getByRole("checkbox", { name: "Vocabulary groups" }));
    await user.click(screen.getByRole("button", { name: "Save and move to Diario" }));

    await waitFor(async () => {
      const stored = await getItem(entry.id);
      expect(stored.pageFocus).toBe("notes");
      expect(stored.collection.enabled).toBe(false);
    });
    const diario = await screen.findByRole("region", { name: "Diario surface" });
    await waitFor(() => expect(within(diario).getByRole("heading", { name: "Move into Diario" })).toBeTruthy());
    expect(within(diario).getByText("Keep this writing.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back to Cuaderno" })).toBeTruthy();
  });
});
