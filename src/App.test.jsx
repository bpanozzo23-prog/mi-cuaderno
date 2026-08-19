// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { sameRouteDestination } from "./App.jsx";
import { db, clearAllPersonalData, getPref, setPref } from "./db/db.js";
import { EVENT_TYPES, allEvents, logEvent } from "./db/events.js";
import { allItems, createItem, getItem, linkItems, newLexical, newPage } from "./db/items.js";
import { removeDictionary } from "./db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "./db/ref/refdb.js";
import {
  FIXTURE_ENGLISH_SHARDS,
  FIXTURE_ENTRIES,
  FIXTURE_FORM_SHARDS,
  FIXTURE_PATTERN_CONJUGATIONS,
} from "./test/dictFixture.js";
import { newMeaning } from "./lib/meanings.js";
import { localDate } from "./lib/dates.js";
import { TAG_COLORS_PREF } from "./lib/tagColors.js";
import { newNoteSection, PAGE_FOCUSES } from "./lib/pageKinds.js";

const CASA = "dict:wiktionary-es:casa:noun";
const SACAR = "dict:wiktionary-es:sacar:verb";

beforeEach(async () => {
  window.history.replaceState(null, "", "/");
  await removeDictionary();
  localStorage.clear();
  await db.open();
  await clearAllPersonalData();
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
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

async function seedConjugationFamily() {
  const slot = "a";
  const reference = refDb(slot);
  const sacar = FIXTURE_ENTRIES.find((entry) => entry.id === SACAR);
  const buscar = {
    id: "dict:fixture:buscar:verb",
    lemma: "buscar",
    pos: "verb",
    senses: [{ gloss: "to look for" }],
    conjugationId: "conj:fixture:buscar",
    conjugationPatternIds: ["spelling:c-qu"],
    freqRank: 100,
  };
  const buscarTable = {
    id: buscar.conjugationId,
    source: "fixture",
    gerund: "buscando",
    pastParticiple: "buscado",
    tenses: {
      "Indicative/Present": {
        yo: "busco", "tú": "buscas", "él/ella/usted": "busca",
        nosotros: "buscamos", "ustedes/ellos": "buscan", vosotros: "buscáis",
      },
      "Indicative/Preterite": {
        yo: "busqué", "tú": "buscaste", "él/ella/usted": "buscó",
        nosotros: "buscamos", "ustedes/ellos": "buscaron", vosotros: "buscasteis",
      },
      "Subjunctive/Present": {
        yo: "busque", "tú": "busques", "él/ella/usted": "busque",
        nosotros: "busquemos", "ustedes/ellos": "busquen", vosotros: "busquéis",
      },
    },
  };

  await reference.entries.bulkPut([sacar, buscar]);
  await reference.conjugations.bulkPut([...FIXTURE_PATTERN_CONJUGATIONS, buscarTable]);
  await reference.patternFamilies.put({ id: "spelling:c-qu", memberIds: [SACAR, buscar.id] });
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: {
      datasetVersion: "phase-21-fixture",
      counts: { entries: 2, patternFamilies: 1 },
      previousIds: {},
    },
  });
  setActiveSlot(slot);
  return { sacar, buscar };
}

async function linkedTrail() {
  const phrase = await createItem(newLexical({ term: "de repente", form: "phrase" }));
  const word = await createItem(newLexical({ term: "madrugar", meanings: [newMeaning({ gloss: "to get up early" })] }));
  const page = await createItem(newPage({ title: "Study source" }));
  await linkItems(word.id, phrase.id);
  await linkItems(page.id, word.id);
  return { phrase, word, page };
}

async function openBrowseAll(user) {
  await user.click(await screen.findByRole("button", { name: /^Browse all/ }));
}

describe("Phase 5a navigation continuity", () => {
  it("opens each linked destination at the top and backs through the detail trail", async () => {
    const user = userEvent.setup();
    await linkedTrail();
    render(<App />);

    await openBrowseAll(user);
    await user.click(await screen.findByRole("button", { name: /^Study source$/ }));
    expect(screen.getByRole("button", { name: "Browse all" })).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "Browse all" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Browse all" }));
    expect(await screen.findByRole("heading", { name: "Browse all" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to Todo el cuaderno" }));
    expect(await screen.findByRole("textbox", { name: "Search notebook" })).toBeTruthy();
  });

  it("restores Cuaderno's linked trail after visiting another tab", async () => {
    const user = userEvent.setup();
    await linkedTrail();
    render(<App />);

    await openBrowseAll(user);
    await user.click(await screen.findByRole("button", { name: /^Study source$/ }));
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));
    expect(screen.getByRole("button", { name: "Atrás" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Repaso" }));
    expect(await screen.findByText("Para hoy")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cuaderno" }));

    expect(await screen.findByText("madrugar", { selector: ".text-2xl *" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Cuaderno surface" }))
      .getByRole("button", { name: "Repaso" })).toBeTruthy();
  });

  it("keeps optional-field drafts scoped to the entry where they were typed", async () => {
    const user = userEvent.setup();
    await linkedTrail();
    render(<App />);

    await openBrowseAll(user);
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

    await openBrowseAll(user);
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

  it("navigates dictionary verb → family sibling → Atrás with one view per verb", async () => {
    const user = userEvent.setup();
    const { buscar } = await seedConjugationFamily();
    await createItem(newLexical({ term: "verb source", linkedKeys: [SACAR] }));
    render(<App />);

    await openBrowseAll(user);
    await user.click(await screen.findByRole("button", { name: /^verb source$/ }));
    await user.click(await screen.findByRole("button", { name: /^sacar/ }));
    expect(await screen.findByText("Shares this pattern")).toBeTruthy();

    window.scrollTo.mockClear();
    await user.click(screen.getByRole("button", { name: "buscar" }));
    expect(await screen.findByText("buscar", { selector: ".text-2xl" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));

    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(await screen.findByText("sacar", { selector: ".text-2xl" })).toBeTruthy();

    await waitFor(async () => {
      const views = (await allEvents()).filter((event) =>
        event.type === EVENT_TYPES.view && [SACAR, buscar.id].includes(event.itemKey)
      );
      expect(views.map((event) => event.itemKey).sort()).toEqual([SACAR, buscar.id].sort());
    });
  });
});

describe("browser-backed navigation continuity", () => {
  it("uses browser Back and Forward across personal and dictionary details without duplicate views", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const word = await createItem(newLexical({ term: "madrugar", linkedKeys: [CASA] }));
    render(<App />);

    await openBrowseAll(user);
    await user.click(await screen.findByRole("button", { name: "madrugar" }));
    await user.click(await screen.findByRole("button", { name: /^casa/ }));
    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();

    window.history.back();
    expect(await screen.findByText("madrugar", { selector: ".text-2xl *" })).toBeTruthy();

    window.history.forward();
    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();

    await waitFor(async () => {
      const views = (await allEvents()).filter((event) =>
        event.type === EVENT_TYPES.view && [word.id, CASA].includes(event.itemKey)
      );
      expect(views.filter((event) => event.itemKey === word.id)).toHaveLength(1);
      expect(views.filter((event) => event.itemKey === CASA)).toHaveLength(1);
    });
  });

  it("replays tab chronology, restores each stack, and lets Back undo an active-tab reset", async () => {
    const user = userEvent.setup();
    render(<App />);

    const primary = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: /^Pages\./ }));
    expect(screen.getByRole("heading", { name: "Pages" })).toBeTruthy();
    await user.click(within(primary).getByRole("button", { name: "Repaso" }));
    await waitFor(() => expect(within(primary).getByRole("button", { name: "Repaso" })
      .getAttribute("aria-current")).toBe("page"));
    await user.click(within(primary).getByRole("button", { name: "Diario" }));
    await waitFor(() => expect(within(primary).getByRole("button", { name: "Diario" })
      .getAttribute("aria-current")).toBe("page"));

    window.history.back();
    await waitFor(() => expect(within(primary).getByRole("button", { name: "Repaso" })
      .getAttribute("aria-current")).toBe("page"));
    window.history.back();
    expect(await screen.findByRole("heading", { name: "Pages" })).toBeTruthy();

    await user.click(within(primary).getByRole("button", { name: "Cuaderno" }));
    expect(await screen.findByRole("heading", { name: "Mi cuaderno" })).toBeTruthy();
    window.history.back();
    expect(await screen.findByRole("heading", { name: "Pages" })).toBeTruthy();
  }, 10_000);

  it("restores a stable Historia visit on refresh while resetting route scroll", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "madrugar" }));
    await createItem(newPage({ title: "History source", linkedKeys: [word.id] }));
    let mounted = render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(await screen.findByRole("button", { name: /^Pages\./ }));
    mounted.unmount();
    mounted = render(<App />);
    expect(await screen.findByRole("heading", { name: "Pages" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "History source" }));
    await user.click(screen.getByRole("button", { name: /^madrugar/ }));
    await user.click(screen.getByRole("button", { name: "Historia" }));
    expect(screen.getByText("Historia")).toBeTruthy();
    expect(window.history.state.mcNavigation.stacks.cuaderno.at(-1)).toMatchObject({
      screen: "biography",
      id: word.id,
    });

    Object.defineProperty(window, "scrollY", { value: 333, configurable: true });
    window.scrollTo.mockClear();
    mounted.unmount();
    render(<App />);

    expect(await screen.findByText("Historia")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "madrugar" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0));
  });

  it("keeps full-search text out of history and falls back to the foyer on refresh", async () => {
    const user = userEvent.setup();
    await Promise.all(Array.from({ length: 6 }, (_, index) =>
      createItem(newLexical({ term: `navterm ${index + 1}` }))
    ));
    const mounted = render(<App />);

    const search = await screen.findByRole("textbox", { name: "Search notebook" });
    await user.type(search, "navterm");
    await user.click(await screen.findByRole("button", { name: "See all 6 results" }));
    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();
    expect(JSON.stringify(window.history.state.mcNavigation)).not.toContain("navterm");

    mounted.unmount();
    render(<App />);
    const refreshedSearch = await screen.findByRole("textbox", { name: "Search notebook" });
    expect(refreshedSearch.value).toBe("");
    expect(screen.getByRole("heading", { name: "Mi cuaderno" })).toBeTruthy();
  });
});

describe("example-to-phrase creation", () => {
  it("cancels without a write, then creates an editable phrase and returns through the trail", async () => {
    const user = userEvent.setup();
    const source = await createItem(newLexical({
      term: "razón",
      myExamples: [{ es: "tener razon", en: "to be right" }],
    }));
    render(<App />);

    await openBrowseAll(user);
    await user.click(await screen.findByRole("button", { name: "razón" }));
    await waitFor(async () => {
      expect((await allEvents()).some((event) =>
        event.type === EVENT_TYPES.view && event.itemKey === source.id
      )).toBe(true);
    });
    const sourceBefore = await getItem(source.id);
    const eventsBefore = JSON.stringify(await allEvents());

    const openBridge = async () => {
      await user.click(screen.getByRole("button", {
        name: "Actions for “tener razon”",
      }));
      return screen.getByRole("button", {
        name: "Add “tener razon” as a phrase",
      });
    };
    await user.click(await openBridge());
    expect(screen.getByPlaceholderText("Spanish word or phrase *").value).toBe("tener razon");
    expect(screen.getByRole("textbox", { name: "English gloss" }).value).toBe("to be right");
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByPlaceholderText("Spanish word or phrase *")).toBeNull());
    expect((await allItems()).map((item) => item.id)).toEqual([source.id]);
    expect(await getItem(source.id)).toEqual(sourceBefore);
    expect(JSON.stringify(await allEvents())).toBe(eventsBefore);

    await user.click(await openBridge());
    const term = screen.getByPlaceholderText("Spanish word or phrase *");
    await user.clear(term);
    await user.type(term, "tener razón");
    await user.click(screen.getByRole("button", { name: "Add to cuaderno" }));

    await waitFor(async () => expect((await allItems()).length).toBe(2));
    const created = (await allItems()).find((item) => item.id !== source.id);
    expect(created).toMatchObject({
      type: "lexical",
      form: "phrase",
      term: "tener razón",
      myExamples: [],
      linkedKeys: [],
    });
    expect(created.meanings.map((meaning) => meaning.gloss)).toEqual(["to be right"]);
    expect(await getItem(source.id)).toEqual(sourceBefore);
    expect((await allEvents()).filter((event) =>
      event.type === EVENT_TYPES.create && event.itemKey === created.id
    )).toHaveLength(1);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);

    expect(await screen.findByText("tener razón", { selector: ".text-2xl *" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(await screen.findByText("razón", { selector: ".text-2xl *" })).toBeTruthy();
    expect((await getItem(source.id)).myExamples).toEqual([
      { es: "tener razon", en: "to be right" },
    ]);
  });
});

describe("Phase 23b wander navigation", () => {
  it("deduplicates only the same id, tab, and screen", () => {
    const detail = { tab: "cuaderno", screen: "detail", id: "user:a" };
    expect(sameRouteDestination(detail, { ...detail })).toBe(true);
    expect(sameRouteDestination(
      { tab: "cuaderno", screen: "wander", id: "user:a" },
      detail
    )).toBe(false);
    expect(sameRouteDestination(detail, { ...detail, tab: "diario" })).toBe(false);
  });

  it("hops through the real trail, opens the same center's full Detail, and backs through every center", async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const first = await createItem(newLexical({ term: "casa" }));
    const second = await createItem(newLexical({ term: "hogar" }));
    const page = await createItem(newPage({ title: "Architecture notes" }));
    await linkItems(first.id, second.id, { type: "similar_meaning", note: "First hop" });
    await linkItems(second.id, page.id, { type: "found_in", note: "Second hop" });
    // Link writes can share one millisecond, so make the newest-first lexical order explicit.
    // The 0.99 draw then deterministically selects the final eligible row: casa.
    await db.items.update(first.id, { updatedAt: "2026-08-12T12:00:00.000Z" });
    await db.items.update(second.id, { updatedAt: "2026-08-12T12:00:01.000Z" });
    const before = JSON.stringify(await allEvents());
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: "Pasear" }));
    expect(await screen.findByText("Paseo por tu cuaderno")).toBeTruthy();
    expect(screen.getByText("casa", { selector: ".text-2xl" })).toBeTruthy();
    expect(JSON.stringify(await allEvents())).toBe(before);

    await user.click(screen.getByRole("button", { name: /^hogar/ }));
    expect(screen.getByText("hogar", { selector: ".text-2xl" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Architecture notes/ }));
    expect(screen.getByText("Architecture notes", { selector: ".text-2xl" })).toBeTruthy();
    expect(JSON.stringify(await allEvents())).toBe(before);

    // This is the regression case: id + tab are unchanged, but wander → detail is not a no-op.
    await user.click(screen.getByRole("button", { name: "Open full entry" }));
    expect(await screen.findByRole("heading", { name: "Architecture notes" })).toBeTruthy();
    await waitFor(async () => {
      expect((await allEvents()).some((event) =>
        event.type === EVENT_TYPES.view && event.itemKey === page.id
      )).toBe(true);
    });

    await user.click(screen.getByRole("button", { name: "Wander" }));
    expect(await screen.findByText("Paseo por tu cuaderno")).toBeTruthy();
    expect(screen.getByText("Architecture notes", { selector: ".text-2xl" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Wander" }));
    expect(await screen.findByText("hogar", { selector: ".text-2xl" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Wander" }));
    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Todo el cuaderno" }));
    expect(screen.getByRole("textbox", { name: "Search notebook" })).toBeTruthy();
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
    expect(await screen.findByRole("heading", { name: "Mi cuaderno" })).toBeTruthy();
    await user.click(within(navigation).getByRole("button", { name: "Repaso" }));
    expect(screen.getByRole("banner", { name: "App header" })).toBeTruthy();
    await user.click(await screen.findByRole("button", { name: "Start" }));

    expect(await screen.findByRole("region", { name: "Review session" })).toBeTruthy();
    expect(screen.queryByRole("banner", { name: "App header" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(screen.getByRole("progressbar", { name: "Session progress" })).toBeTruthy();
    expect(window.history.state.mcStudySession).toEqual({ version: 1 });

    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(await screen.findByRole("banner", { name: "App header" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(window.history.state.mcStudySession).toBeUndefined();
  });

  it("uses the same transient marker for hardware Back and consumes it exactly once", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "madrugar" }));
    await logEvent(EVENT_TYPES.trickyOn, word.id);
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: "Start" }));
    expect(await screen.findByRole("region", { name: "Review session" })).toBeTruthy();
    expect(window.history.state.mcStudySession).toEqual({ version: 1 });

    window.history.back();
    const restoredNavigation = await screen.findByRole("navigation", { name: "Primary" });
    await waitFor(() => expect(within(restoredNavigation).getByRole("button", { name: "Repaso" })
      .getAttribute("aria-current")).toBe("page"));
    expect(screen.queryByRole("region", { name: "Review session" })).toBeNull();
    expect(window.history.state.mcStudySession).toBeUndefined();

    window.history.back();
    await waitFor(() => expect(within(restoredNavigation).getByRole("button", { name: "Cuaderno" })
      .getAttribute("aria-current")).toBe("page"));
  });

  it("replaces the session marker when opening its entry and returns to the launcher", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({
      term: "madrugar",
      meanings: [newMeaning({ gloss: "to get up early" })],
    }));
    await logEvent(EVENT_TYPES.trickyOn, word.id);
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: "Start" }));
    await user.click(await screen.findByRole("button", { name: "Tap to see the meaning" }));
    await user.click(screen.getByRole("button", { name: "Open the full entry" }));
    await user.click(screen.getByRole("button", { name: "Open the full entry and end session" }));

    expect(await screen.findByText("madrugar", { selector: ".text-2xl *" })).toBeTruthy();
    expect(window.history.state.mcStudySession).toBeUndefined();
    const restoredNavigation = await screen.findByRole("navigation", { name: "Primary" });
    window.history.back();
    await waitFor(() => expect(within(restoredNavigation).getByRole("button", { name: "Repaso" })
      .getAttribute("aria-current")).toBe("page"));
    expect(screen.queryByRole("region", { name: "Review session" })).toBeNull();
    expect(screen.getByText("Para hoy")).toBeTruthy();
  });
});

describe("retained Repaso destinations", () => {
  it("restores major screens, preserves performance filters across detail Back, and resets them on refresh", async () => {
    const user = userEvent.setup();
    await seedConjugationFamily();
    const saved = await createItem(newLexical({ term: "sacar", dictKey: SACAR }));
    for (let index = 0; index < 3; index += 1) {
      await logEvent(EVENT_TYPES.drillFail, saved.id, {
        sessionId: "navigation-regression",
        promptId: `navigation-regression:${index}`,
        sessionKind: "focus",
        source: "saved",
        curriculum: null,
        verbKey: "lemma:sacar",
        lemma: "sacar",
        dictKey: SACAR,
        tense: "Indicative/Present",
        slot: "yo",
        mode: "typed",
        verdict: "wrong",
        diagnosis: "wrong_tense",
        stage: "initial",
        cardIndex: index + 1,
        deckSize: 3,
      });
    }

    let mounted = render(<App />);
    const primary = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(primary).getByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: /Actividad y crecimiento/ }));
    expect(await screen.findByText("Actividad")).toBeTruthy();

    mounted.unmount();
    mounted = render(<App />);
    expect(await screen.findByText("Actividad")).toBeTruthy();
    await user.click(within(screen.getByRole("region", { name: "Repaso surface" }))
      .getByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: "Open" }));
    expect(await screen.findByText("Train the forms you need")).toBeTruthy();
    mounted.unmount();
    mounted = render(<App />);
    expect(await screen.findByText("Train the forms you need")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "View conjugation performance" }));
    expect(await screen.findByText("Conjugation performance")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Performance tense pack" }), "all");
    await user.click(await screen.findByRole("button", { name: "sacar" }));
    expect(await screen.findByText("sacar", { selector: ".text-2xl *" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Conjugation performance" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Conjugation performance" }));
    expect(await screen.findByText("Conjugation performance")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Saved" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("combobox", { name: "Performance tense pack" }).value).toBe("all");

    await user.click(screen.getByRole("button", { name: "sacar" }));
    expect(await screen.findByText("sacar", { selector: ".text-2xl *" })).toBeTruthy();
    window.history.back();
    expect(await screen.findByText("Conjugation performance")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Saved" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("combobox", { name: "Performance tense pack" }).value).toBe("all");

    mounted.unmount();
    render(<App />);
    expect(await screen.findByText("Conjugation performance")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("combobox", { name: "Performance tense pack" }).value).toBe("everyday");
  });
});

describe("Phase 4z Pages hub navigation", () => {
  it("keeps a dated outlined Page in Pages while a body-only dated record stays in Diario", async () => {
    const user = userEvent.setup();
    await createItem(newPage({
      title: "Dated organized notes",
      body: "An Overview can be long.",
      pageDate: localDate(),
      noteSections: [newNoteSection({ name: "Collection context" })],
    }));
    await createItem(newPage({
      title: "Body-only moment",
      body: "Body length still does not make durable Page organization.",
      pageDate: localDate(),
    }));
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: /^Pages\./ }));
    expect(screen.getByRole("button", { name: "Dated organized notes" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Body-only moment" })).toBeNull();

    await user.click(within(screen.getByRole("region", { name: "Cuaderno surface" })).getByRole("button", { name: "Todo el cuaderno" }));
    await user.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Diario" }));
    const diario = screen.getByRole("region", { name: "Diario surface" });
    expect(within(diario).getByRole("button", { name: "Open Body-only moment" })).toBeTruthy();
    expect(within(diario).queryByRole("button", { name: "Open Dated organized notes" })).toBeNull();
  });

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
    await user.click(screen.getByRole("button", { name: /^Pages\./ }));

    expect(screen.getByRole("heading", { name: "Pages" })).toBeTruthy();
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

    expect(await screen.findByRole("heading", { name: "Pages" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Listening source" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plain notes" })).toBeNull();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 436));
    await user.click(within(screen.getByRole("region", { name: "Cuaderno surface" })).getByRole("button", { name: "Todo el cuaderno" }));
    expect(screen.getByRole("textbox", { name: "Search notebook" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mi cuaderno" })).toBeTruthy();
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
    await user.click(screen.getByRole("button", { name: /^Words & phrases\./ }));
    await user.click(screen.getByRole("button", { name: "Phrases" }));

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

    // Back lands on the combined hub with the pin and scroll position intact.
    expect(await screen.findByRole("heading", { name: "Words & phrases" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Unpin de repente" })).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenLastCalledWith(0, 512));

    await user.click(within(screen.getByRole("region", { name: "Cuaderno surface" })).getByRole("button", { name: "Todo el cuaderno" }));
    expect(await screen.findByRole("textbox", { name: "Search notebook" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mi cuaderno" })).toBeTruthy();
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
    await user.click(screen.getByRole("button", { name: /^Words & phrases\./ }));
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
    expect(screen.getByRole("button", { name: /^Pages\. 1 page/ })).toBeTruthy();
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

    expect(screen.getByRole("button", { name: "Back to Todo el cuaderno" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Diario surface" })).getByText("Hoy practiqué.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to Todo el cuaderno" }));

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

  it("blocks hardware Back on an invalid date, then saves before a valid hardware Back", async () => {
    const user = userEvent.setup();
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(screen.getByRole("button", { name: "New moment" }));

    fireEvent.change(screen.getByLabelText("Journal date"), { target: { value: "" } });
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "No se pierde.");
    window.history.back();

    await waitFor(() => expect(screen.getByRole("status").textContent)
      .toBe("Choose a date before leaving"));
    await waitFor(() => expect(window.history.state.mcNavigation.stacks.diario.at(-1).screen)
      .toBe("edit"));
    expect(screen.getByRole("textbox", { name: "Journal body" }).value).toBe("No se pierde.");

    fireEvent.change(screen.getByLabelText("Journal date"), { target: { value: "2026-08-18" } });
    window.history.back();

    await waitFor(() => expect(screen.queryByLabelText("Journal date")).toBeNull());
    await waitFor(async () => {
      const entries = await allItems();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ body: "No se pierde.", pageDate: "2026-08-18" });
    });
  });

  it("restores a Diario reader on refresh but sends a new unsaved editor to its launcher", async () => {
    const user = userEvent.setup();
    await createItem(newPage({
      title: "Refreshable moment",
      body: "Todavía aquí.",
      pageDate: "2026-08-18",
    }));
    let mounted = render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(within(navigation).getByRole("button", { name: "Diario" }));
    await user.click(await screen.findByRole("button", { name: "Open Refreshable moment" }));
    mounted.unmount();
    mounted = render(<App />);

    expect(await screen.findByRole("heading", { name: "Refreshable moment" })).toBeTruthy();
    expect(screen.getByText("Todavía aquí.")).toBeTruthy();
    window.history.back();
    await screen.findByRole("button", { name: "New moment" });
    await user.click(screen.getByRole("button", { name: "New moment" }));
    expect(await screen.findByLabelText("Journal date")).toBeTruthy();

    mounted.unmount();
    render(<App />);
    expect(await screen.findByRole("button", { name: "New moment" })).toBeTruthy();
    expect(screen.queryByLabelText("Journal date")).toBeNull();
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
    // Same month-day one year back, so the entry always sits inside the ±7-day memory window
    // that puts it on the Diario home screen — a fixed date walks out of that window over time.
    const lastYearToday = localDate().replace(/^\d{4}/, (year) => String(Number(year) - 1));
    const source = await createItem(newPage({
      title: "A year ago",
      body: "Entonces pensaba otra cosa.",
      pageDate: lastYearToday,
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

    await openBrowseAll(user);
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
    expect(screen.getByRole("button", { name: "Back to Browse all" })).toBeTruthy();
  });
});

describe("Phase 20 global tag management", () => {
  it("renames and removes from Ajustes while reloading every personal item", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "hablar", tags: ["verbs"] }));
    const page = await createItem(newPage({ title: "Grammar notes", tags: ["verbs"] }));
    await setPref(TAG_COLORS_PREF, { verbs: "red" });
    render(<App />);

    const navigation = await screen.findByRole("navigation", { name: "Primary" });
    await screen.findByRole("textbox", { name: "Search notebook" });
    await openBrowseAll(user);
    await user.click(screen.getByRole("button", { name: "Refine" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "verbs");
    expect(screen.getByRole("combobox", { name: "Tag" }).value).toBe("verbs");
    await user.click(within(navigation).getByRole("button", { name: "Ajustes" }));
    await user.click(await screen.findByRole("button", { name: "Manage tag verbs" }));
    await user.type(screen.getByRole("textbox", { name: "New tag name" }), "word classes");
    await user.click(screen.getByRole("button", { name: "Rename tag" }));

    expect(await screen.findByText("Renamed “verbs” to “word classes” on 2 entries.")).toBeTruthy();
    await waitFor(async () => {
      expect((await getItem(word.id)).tags).toEqual(["word classes"]);
      expect((await getItem(page.id)).tags).toEqual(["word classes"]);
      expect(await getPref(TAG_COLORS_PREF, {})).toEqual({ "word classes": "red" });
    });
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Manage tag verbs" })).toBeNull();
      expect(screen.getByRole("button", { name: "Manage tag word classes" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Red for word classes" })).toBeNull();
      expect(screen.getByRole("button", { name: "Choose colour for word classes; current Red" })).toBeTruthy();
    });
    await user.click(screen.getByRole("button", { name: "Choose colour for word classes; current Red" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Red for word classes" }).getAttribute("aria-pressed")).toBe("true");
    });

    await user.click(within(navigation).getByRole("button", { name: "Cuaderno" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Tag" }).value).toBe(""));
    expect(screen.getByRole("option", { name: "word classes · 2" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^hablar/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Grammar notes/ })).toBeTruthy();

    await user.click(within(navigation).getByRole("button", { name: "Ajustes" }));
    await user.click(await screen.findByRole("button", { name: "Manage tag word classes" }));
    await user.click(screen.getByRole("button", { name: "Remove tag everywhere" }));
    await user.click(screen.getByRole("button", { name: "Confirm removal" }));

    expect(await screen.findByText("Removed “word classes” from 2 entries.")).toBeTruthy();
    await waitFor(async () => {
      expect((await getItem(word.id)).tags).toEqual([]);
      expect((await getItem(page.id)).tags).toEqual([]);
      expect(await getPref(TAG_COLORS_PREF, {})).toEqual({});
      expect(screen.queryByRole("button", { name: "Manage tag word classes" })).toBeNull();
    });
    expect(screen.getByText("Tags you add to words, phrases and pages appear here, ready to colour or manage.")).toBeTruthy();
  });
});

describe("Android share target arrival", () => {
  // Chrome opens the installed PWA at "./?share_*=…" (manifest share_target, vite.config.js);
  // the app consumes the params while building its initial in-memory trail. Simulated here by
  // setting the URL before render, exactly what the browser hands the booting app.
  const arriveAt = (query) => window.history.replaceState(null, "", `/${query}`);

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("lands shared text in the two-layer search box and strips the params", async () => {
    arriveAt("?share_text=madrugar");
    const mounted = render(<App />);

    // The seed and the URL strip are passive effects — await the observable result.
    const search = await screen.findByRole("textbox", { name: "Search notebook" });
    await waitFor(() => expect(search.value).toBe("madrugar"));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(JSON.stringify(window.history.state.mcNavigation)).not.toContain("madrugar");

    mounted.unmount();
    render(<App />);
    expect((await screen.findByRole("textbox", { name: "Search notebook" })).value).toBe("");
  });

  it("lands long shared prose whole in the search box for the owner to trim", async () => {
    const prose = "Cuando despertó, el dinosaurio todavía estaba allí.";
    arriveAt(`?share_text=${encodeURIComponent(prose)}`);
    render(<App />);

    const search = await screen.findByRole("textbox", { name: "Search notebook" });
    await waitFor(() => expect(search.value).toBe(prose));
  });

  it("offers the page-kind chooser for a shared URL, and Source creation stays prefilled", async () => {
    const user = userEvent.setup();
    arriveAt("?share_url=https%3A%2F%2Fexample.com%2Farticle&share_title=Un%20art%C3%ADculo");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    expect(within(chooser).getByText("https://example.com/article")).toBeTruthy();
    await user.click(within(chooser).getByRole("button", { name: /New page/ }));
    expect(within(chooser).getByText("What kind of page?")).toBeTruthy();
    await user.click(within(chooser).getByRole("button", { name: /^Source notebook/ }));

    expect(await screen.findByText("New Source notebook")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Primary URL" }).value).toBe("https://example.com/article");
    expect(screen.getByPlaceholderText("Title *").value).toBe("Un artículo");
    expect(screen.getByRole("combobox", { name: "Format" }).value).toBe("");
    expect(await allItems()).toHaveLength(0);
    await waitFor(() => expect(window.location.search).toBe(""));
  });

  it("treats text that is exactly a URL as a URL share (how Chrome shares a page)", async () => {
    arriveAt("?share_text=https%3A%2F%2Fexample.com%2Fnota&share_title=Nota");
    render(<App />);

    expect(await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" })).toBeTruthy();
  });

  it("dismissing the chooser writes nothing and lands on the plain Cuaderno", async () => {
    const user = userEvent.setup();
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Ffake");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /New page/ }));
    await user.click(within(chooser).getByRole("button", { name: "Close share destinations" }));

    expect(screen.queryByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("");
    expect(screen.queryByRole("region", { name: "Shared video" })).toBeNull();
    expect(await allItems()).toHaveLength(0);
    expect(await allEvents()).toHaveLength(0);
  });

  it("starts a Grammar guide with the shared video attached as a media link", async () => {
    const user = userEvent.setup();
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Fser-estar&share_title=Ser%20vs%20estar");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /New page/ }));
    await user.click(within(chooser).getByRole("button", { name: /^Grammar guide/ }));

    expect(await screen.findByText("New Grammar guide")).toBeTruthy();
    expect(screen.getByPlaceholderText("Title *").value).toBe("Ser vs estar");
    await user.click(screen.getByRole("button", { name: "Add Grammar guide" }));

    await waitFor(async () => {
      const pages = (await allItems()).filter((item) => item.type === "page");
      expect(pages).toHaveLength(1);
      expect(pages[0].mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/ser-estar", label: "Ser vs estar" },
      ]);
      expect(pages[0].grammar.enabled).toBe(true);
    });
    expect(await screen.findByRole("region", { name: "Shared video" })).toBeTruthy();
  });

  it("starts with Notes first and leaves its title blank when TikTok supplies no title", async () => {
    const user = userEvent.setup();
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Frespuestas");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /New page/ }));
    const pageChoices = within(chooser).getAllByRole("button")
      .map((button) => button.textContent.trim())
      .filter((text) => ["Notes page", "Vocabulary page", "Grammar guide", "Source notebook"]
        .some((title) => text.startsWith(title)));
    expect(pageChoices[0]).toMatch(/^Notes page/);
    await user.click(within(chooser).getByRole("button", { name: /^Notes page/ }));

    expect(await screen.findByText("New notes page")).toBeTruthy();
    const title = screen.getByPlaceholderText("Title *");
    expect(title.value).toBe("");
    await user.type(title, "Ways to say no problem");
    await user.click(screen.getByRole("button", { name: "Add notes page" }));

    await waitFor(async () => {
      const pages = (await allItems()).filter((item) => item.type === "page");
      expect(pages).toHaveLength(1);
      expect(pages[0].pageFocus).toBe(PAGE_FOCUSES.notes);
      expect(pages[0].collection.enabled).toBe(false);
      expect(pages[0].source.enabled).toBe(false);
      expect(pages[0].grammar.enabled).toBe(false);
      expect(pages[0].mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/respuestas", label: "" },
      ]);
    });
  });

  it("starts a blank Vocabulary page with the shared video attached as a media link", async () => {
    const user = userEvent.setup();
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Frespuestas&share_title=Formas%20de%20responder");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /New page/ }));
    await user.click(within(chooser).getByRole("button", { name: /^Vocabulary page/ }));

    expect(await screen.findByText("New vocabulary page")).toBeTruthy();
    expect(screen.getByPlaceholderText("Title *").value).toBe("Formas de responder");
    await user.click(screen.getByRole("button", { name: "Add vocabulary page" }));

    await waitFor(async () => {
      const pages = (await allItems()).filter((item) => item.type === "page");
      expect(pages).toHaveLength(1);
      expect(pages[0].pageFocus).toBe(PAGE_FOCUSES.vocabulary);
      expect(pages[0].collection.enabled).toBe(true);
      expect(pages[0].collection.groups).toEqual([]);
      expect(pages[0].mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/respuestas", label: "Formas de responder" },
      ]);
    });
  });

  it("attaches the shared video to an existing page as one ordinary media-link edit", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Preterite vs imperfect" }));
    const word = await createItem(newLexical({ term: "madrugar" }));
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Fpasado&share_title=El%20pasado");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /Add to an existing page or word/ }));
    // Empty query lists recent items — both seeded entries are one tap away.
    expect(await within(chooser).findByRole("button", { name: /madrugar/ })).toBeTruthy();
    await user.click(within(chooser).getByRole("button", { name: /Preterite vs imperfect/ }));

    await waitFor(async () => {
      const stored = await getItem(page.id);
      expect(stored.mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/pasado", label: "El pasado" },
      ]);
    });
    const edits = (await allEvents()).filter(
      (event) => event.type === EVENT_TYPES.edit && event.itemKey === page.id
    );
    expect(edits).toHaveLength(1);
    expect((await getItem(word.id)).mediaLinks).toEqual([]);
    // Landed on the page, ready to keep working.
    expect(await screen.findByText("Preterite vs imperfect", { selector: ".text-2xl *" })).toBeTruthy();

    // The continuation pill follows onto the detail screen and reopens the chooser there,
    // so one video can reach several targets without resharing.
    const pill = await screen.findByRole("region", { name: "Shared video" });
    expect(within(pill).getByText("El pasado")).toBeTruthy();
    await user.click(within(pill).getByRole("button", { name: "Add to another item" }));

    const reopened = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(reopened).getByRole("button", { name: /Add to an existing page or word/ }));
    await user.click(await within(reopened).findByRole("button", { name: /madrugar/ }));

    await waitFor(async () => {
      expect((await getItem(word.id)).mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/pasado", label: "El pasado" },
      ]);
    });

    await user.click(within(await screen.findByRole("region", { name: "Shared video" }))
      .getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Shared video" })).toBeNull());
  });

  it("creates a dictionary-attached word from the top-level chooser row with the video attached", async () => {
    const user = userEvent.setup();
    await seedDictionary([CASA]);
    await refDb("a").formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca"));
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Fcasa&share_title=Casa");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /New word or phrase/ }));

    const termInput = await screen.findByPlaceholderText("Spanish word or phrase *");
    expect(termInput.value).toBe("");
    await user.type(termInput, "cas");
    const suggestions = await screen.findByRole("region", { name: "Dictionary suggestions" });
    await user.click(within(suggestions).getByRole("button", { name: /casa.*house/ }));
    await user.click(screen.getByRole("button", { name: "Add to cuaderno" }));

    await waitFor(async () => {
      const created = (await allItems()).find((item) => item.term === "casa");
      expect(created.form).toBe("word");
      expect(created.dictKey).toBe(CASA);
      expect(created.meanings.map((meaning) => meaning.gloss)).toEqual(["house"]);
      expect(created.mediaLinks).toEqual([{ url: "https://vm.tiktok.com/casa", label: "Casa" }]);
    });
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(1);
    expect(await screen.findByRole("region", { name: "Shared video" })).toBeTruthy();
  });

  it("creates a new phrase from the picker with the video attached from birth", async () => {
    const user = userEvent.setup();
    arriveAt("?share_url=https%3A%2F%2Fvm.tiktok.com%2Fquedar&share_title=Quedar");
    render(<App />);

    const chooser = await screen.findByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" });
    await user.click(within(chooser).getByRole("button", { name: /Add to an existing page or word/ }));
    await user.type(within(chooser).getByRole("textbox", { name: "Search destinations" }), "quedarse con");
    await user.click(within(chooser).getByRole("button", { name: /Create phrase “quedarse con”/ }));

    // The normal creation sheet, term prefilled, phrase inferred by the space rule.
    const termInput = await screen.findByPlaceholderText("Spanish word or phrase *");
    expect(termInput.value).toBe("quedarse con");
    await user.click(screen.getByRole("button", { name: "Add to cuaderno" }));

    await waitFor(async () => {
      const created = (await allItems()).find((item) => item.term === "quedarse con");
      expect(created.form).toBe("phrase");
      expect(created.mediaLinks).toEqual([{ url: "https://vm.tiktok.com/quedar", label: "Quedar" }]);
    });
    expect(await screen.findByRole("region", { name: "Shared video" })).toBeTruthy();
  });

  it("starts exactly as before when no share params arrive", async () => {
    render(<App />);

    const search = await screen.findByRole("textbox", { name: "Search notebook" });
    expect(search.value).toBe("");
    expect(screen.queryByRole("dialog", { name: "Compartido — ¿dónde lo guardas?" })).toBeNull();
  });
});

describe("Cuidar hub navigation", () => {
  const OLD = "2026-07-01T10:00:00.000Z";

  async function seedGarden() {
    const terms = ["solitaria", "aislada", "suelta", "perdida", "olvidada"];
    const words = [];
    for (const term of terms) {
      const word = await createItem(newLexical({
        term,
        meanings: [newMeaning({ gloss: "alone" })],
        myExamples: ["Un ejemplo mío."],
      }));
      await db.items.update(word.id, { createdAt: OLD });
      words.push(word);
    }
    return words;
  }

  it("walks door → hub → see-all Browse view and backs out through history", async () => {
    const user = userEvent.setup();
    await seedGarden();
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: "Cuidar" }));
    expect(await screen.findByRole("heading", { name: "Cuidar mi cuaderno" })).toBeTruthy();

    const connect = screen.getByRole("region", { name: "Conectar" });
    await user.click(within(connect).getByRole("button", { name: "Ver las 5" }));
    expect(await screen.findByRole("heading", { name: "Browse all" })).toBeTruthy();
    // The arriving list is exactly the promised maintenance view, and the transient
    // payload that carried it never enters browser history.
    const region = within(screen.getByRole("region", { name: "Cuaderno surface" }));
    expect(await region.findByRole("button", { name: /^solitaria/ })).toBeTruthy();
    expect(JSON.stringify(window.history.state.mcNavigation)).not.toContain("browseView");
    expect(JSON.stringify(window.history.state.mcNavigation)).toContain("cuidar");

    window.history.back();
    expect(await screen.findByRole("heading", { name: "Cuidar mi cuaderno" })).toBeTruthy();
    window.history.back();
    expect(await screen.findByRole("textbox", { name: "Search notebook" })).toBeTruthy();
  }, 10_000);

  it("routes tag twins to Ajustes with the duplicates review open", async () => {
    const user = userEvent.setup();
    const first = await createItem(newLexical({ term: "modismo", tags: ["idiom"] }));
    const second = await createItem(newLexical({ term: "refrán", tags: ["Idiom"] }));
    await linkItems(first.id, second.id);
    await db.items.update(first.id, { createdAt: OLD });
    await db.items.update(second.id, { createdAt: OLD });
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    await user.click(screen.getByRole("button", { name: "Cuidar" }));
    const twins = await screen.findByRole("region", { name: "Etiquetas gemelas" });
    expect(within(twins).getByText("Idiom · idiom")).toBeTruthy();

    await user.click(within(twins).getByRole("button", { name: "Revisar en Ajustes" }));
    const toggle = await screen.findByRole("button", { name: /Possible duplicates · 1/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("These exact tags differ only by capitalization. Choose the spelling to keep, then review each merge.")
    ).toBeTruthy();
    // Let Ajustes' initial async storage refresh settle before teardown closes the database.
    await screen.findByText(/2 items · /);
  }, 10_000);

  it("celebrates a tended notebook inside the hub while the door stays static", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("textbox", { name: "Search notebook" });
    const door = screen.getByRole("button", { name: "Cuidar" });
    expect(door.textContent).toBe("Cuidar");
    expect(screen.queryByText("Pequeñas mejoras, si te apetece.")).toBeNull();
    await user.click(door);

    expect(await screen.findByText("Todo está en orden.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Conectar" })).toBeNull();
  }, 10_000);
});
