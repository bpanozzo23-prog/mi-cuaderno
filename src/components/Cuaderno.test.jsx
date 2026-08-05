// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Cuaderno from "./Cuaderno.jsx";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import {
  FIXTURE_ENGLISH_SHARDS,
  FIXTURE_ENTRIES,
  FIXTURE_FORM_SHARDS,
} from "../test/dictFixture.js";
import { meaningsFromTranslation } from "../lib/meanings.js";
import { db, clearAllPersonalData } from "../db/db.js";

const at = (day) => `2026-07-${String(day).padStart(2, "0")}T10:00:00.000Z`;

const word = (name, over = {}) => {
  const hasTranslation = Object.prototype.hasOwnProperty.call(over, "translation");
  const { translation, meanings, ...rest } = over;
  return {
    id: `user:${name}`,
    type: "lexical",
    form: "word",
    term: name,
    meanings: meanings ?? meaningsFromTranslation(hasTranslation ? translation : "meaning"),
    notes: "",
    myExamples: [{ es: "ejemplo", en: "example" }],
    mediaLinks: [],
    tags: [],
    linkedKeys: [],
    createdAt: at(1),
    updatedAt: at(1),
    ...rest,
  };
};

const page = (name, over = {}) => ({
  id: `user:${name}`,
  type: "page",
  title: name,
  body: "",
  mediaLinks: [],
  tags: [],
  linkedKeys: [],
  pageFocus: "notes",
  collection: { enabled: false, groups: [] },
  source: { enabled: false, format: "", creator: "", scope: "", url: "", context: "", captures: [] },
  grammar: { enabled: false, keyIdea: "", sections: [] },
  createdAt: at(1),
  updatedAt: at(1),
  ...over,
});

function propsFor(items, over = {}) {
  return {
    notebook: { items, itemState: new Map(), reload: vi.fn() },
    selectedId: null,
    onSelect: vi.fn(),
    onBack: vi.fn(),
    hasDetailOrigin: false,
    onOpenSettings: vi.fn(),
    onOpenPages: vi.fn(),
    pinnedPageIds: [],
    onPagePinnedChange: vi.fn(),
    ...over,
  };
}

function card(name) {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

function expectBefore(first, second) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

async function seedCasaDictionary() {
  const reference = refDb("a");
  const casa = FIXTURE_ENTRIES.find((entry) => entry.lemma === "casa");
  await Promise.all([
    reference.entries.put(casa),
    reference.formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca")),
    reference.englishShards.bulkPut(FIXTURE_ENGLISH_SHARDS.filter((row) => row.id === "ho")),
    reference.meta.put({
      key: META_KEYS.dataset,
      value: { datasetVersion: "phase-5c-fixture", counts: { entries: 1 } },
    }),
  ]);
  setActiveSlot("a");
}

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

describe("Phase 5c Cuaderno retrieval controls", () => {
  it("orders browsing without changing search relevance or the shared source order", async () => {
    const user = userEvent.setup();
    const items = [
      word("zorro", { createdAt: at(1), updatedAt: at(30) }),
      word("abeja", { createdAt: at(30), updatedAt: at(1) }),
      page("casa", { body: "Una nota sobre zorro.", createdAt: at(15), updatedAt: at(15) }),
    ];
    const sourceOrder = items.map((item) => item.id);
    render(<Cuaderno {...propsFor(items)} />);

    expectBefore(card("zorro"), card("abeja"));
    expectBefore(card("abeja"), card("casa"));

    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "added");
    expectBefore(card("abeja"), card("casa"));
    expectBefore(card("casa"), card("zorro"));

    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "alphabetical");
    expectBefore(card("abeja"), card("casa"));
    expectBefore(card("casa"), card("zorro"));

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "zorro");
    expectBefore(card("zorro"), card("casa"));
    expect(screen.getByRole("combobox", { name: "Order" }).value).toBe("relevance");

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expectBefore(card("casa"), card("zorro"));
    expect(screen.getByRole("combobox", { name: "Order" }).value).toBe("alphabetical");
    expect(items.map((item) => item.id)).toEqual(sourceOrder);
  });

  it("applies maintenance to the full notebook before the type filter", async () => {
    const user = userEvent.setup();
    const linkedWord = word("linked", { translation: "", myExamples: [] });
    const isolatedWord = word("isolated", { translation: " ", myExamples: [] });
    const linkingPage = page("source", { linkedKeys: [linkedWord.id] });
    const dictionaryLinked = word("dictionary-linked", {
      linkedKeys: ["dict:wiktionary-es:casa:noun"],
    });
    render(
      <Cuaderno
        {...propsFor([linkedWord, isolatedWord, linkingPage, dictionaryLinked])}
      />
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "unlinked");
    await user.click(screen.getByRole("button", { name: "palabras" }));

    expect(card("isolated")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^linked/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^dictionary-linked/ })).toBeNull();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "View" }),
      "missing-meaning"
    );
    expect(card("linked")).toBeTruthy();
    expect(card("isolated")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^source/ })).toBeNull();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "View" }),
      "missing-examples"
    );
    expect(card("linked")).toBeTruthy();
    expect(card("isolated")).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "zzzzz");
    expect(await screen.findByText(/Nothing matches/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Get the dictionary/ })).toBeNull();
  });

  it("suppresses dictionary results whenever a maintenance view is active", async () => {
    const user = userEvent.setup();
    await seedCasaDictionary();
    render(<Cuaderno {...propsFor([word("personal")])} />);

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "casa");
    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "View" }),
      "missing-meaning"
    );
    expect(screen.queryByRole("button", { name: /^casa/ })).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(screen.queryByRole("button", { name: /^casa/ })).toBeNull();

    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "all");
    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();
  }, 10000);

  it("counts contextual exact tags before the selected tag and clears an impossible tag", async () => {
    const user = userEvent.setup();
    const items = [
      word("first", { translation: "", tags: ["verbs", "Mexico"] }),
      word("second", { translation: " ", tags: ["verbs", "mexico"] }),
      word("phrase", { form: "phrase", translation: "", tags: ["phrases"] }),
      word("complete", { tags: ["complete"] }),
      page("source", { tags: ["source"] }),
    ];
    render(<Cuaderno {...propsFor(items)} />);

    await user.click(screen.getByRole("button", { name: "palabras" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "View" }),
      "missing-meaning"
    );

    const tags = screen.getByRole("combobox", { name: "Tag" });
    expect(screen.getByRole("option", { name: "Mexico · 1" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "mexico · 1" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "verbs · 2" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /source/ })).toBeNull();

    await user.selectOptions(tags, "Mexico");
    expect(card("first")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^second/ })).toBeNull();
    expect(screen.getByRole("option", { name: "verbs · 2" })).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "no-match");
    expect(tags.value).toBe("Mexico");
    expect(screen.getByRole("option", { name: "verbs · 2" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    await user.click(screen.getByRole("button", { name: "frases" }));
    await waitFor(() => expect(tags.value).toBe(""));
    expect(card("phrase")).toBeTruthy();
    expect(screen.getByRole("option", { name: "phrases · 1" })).toBeTruthy();
  });

  it("keeps retrieval choices local by returning to defaults after remount", async () => {
    const user = userEvent.setup();
    const items = [word("one", { tags: ["study"] })];
    const first = render(<Cuaderno {...propsFor(items)} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "added");
    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "unlinked");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "study");
    first.unmount();

    render(<Cuaderno {...propsFor(items)} />);
    expect(screen.getByRole("combobox", { name: "Order" }).value).toBe("touched");
    expect(screen.getByRole("combobox", { name: "View" }).value).toBe("all");
    expect(screen.getByRole("combobox", { name: "Tag" }).value).toBe("");
  });
});

describe("composable page retrieval and starters", () => {
  it("keeps contained vocabulary on the lexical card globally and hands Pages browsing to its hub", async () => {
    const user = userEvent.setup();
    const lexical = word("nomás", { translation: "just" });
    const sourcePage = page("Context hub", {
      pageFocus: "source",
      linkedKeys: [lexical.id],
      source: {
        enabled: true,
        format: "audio",
        creator: "",
        scope: "",
        url: "",
        context: "",
        captures: [{
          id: "source-capture:context-hub",
          type: "passage",
          text: "A captured thought without the search term.",
          location: "18:42",
          reflection: "",
          itemKeys: [lexical.id],
        }],
      },
    });
    const props = propsFor([lexical, sourcePage]);
    render(<Cuaderno {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "nomás");
    expect(card("nomás")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Context hub" })).toBeNull();
    expect(screen.getByText("Used in 1 page context")).toBeTruthy();
    expect(screen.getByText("Context hub · Passage · 18:42")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "páginas" }));
    expect(props.onOpenPages).toHaveBeenCalledOnce();
  });

  it("opens the page starting-point gallery before the page form", async () => {
    const user = userEvent.setup();
    render(<Cuaderno {...propsFor([])} />);

    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: /^Page/ }));
    expect(screen.getByRole("dialog", { name: "What kind of page?" })).toBeTruthy();
    expect(screen.queryByText("New page")).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Vocabulary/ }));
    await user.click(screen.getByRole("button", { name: /Conversational function/ }));
    expect(screen.getByText("New vocabulary page")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Group 1 name" }).value).toBe("Questions");
    expect(screen.getByRole("textbox", { name: "Group 2 name" }).value).toBe("Answers");
    expect(screen.getByRole("textbox", { name: "Group 3 name" }).value).toBe("Reactions and follow-ups");
  });
});
