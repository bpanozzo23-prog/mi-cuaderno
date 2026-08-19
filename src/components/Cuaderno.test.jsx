// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
    onOpenLexical: vi.fn(),
    onWander: vi.fn(),
    pinnedPageIds: [],
    onPagePinnedChange: vi.fn(),
    ...over,
  };
}

function card(name) {
  return screen.getByRole("button", { name: new RegExp(`^${name}`) });
}

const openBrowseAll = async (user) => {
  const door = screen.queryByRole("button", { name: /^Browse all/ });
  if (door) await user.click(door);
};

// View, Order and Tag live behind Browse all's Refine disclosure, as they do in both hubs.
const openRefine = async (user) => {
  await openBrowseAll(user);
  await user.click(screen.getByRole("button", { name: /^Refine/ }));
};

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

describe("Cuaderno landing", () => {
  it("shows notebook doors, the three most recent non-journal items, and opens the hubs", async () => {
    const user = userEvent.setup();
    const props = propsFor([
      word("aunque"),
      word("tener en cuenta", { id: "user:phrase", form: "phrase" }),
      page("Grammar guide", { pageFocus: "grammar" }),
      word("older"),
    ]);
    render(<Cuaderno {...props} />);

    expect(screen.getByRole("heading", { name: "Mi cuaderno" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Words & phrases\. 2 words · 1 phrase/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Pages\. 1 page/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Browse all 4 items/ })).toBeTruthy();
    expect(card("aunque")).toBeTruthy();
    expect(card("tener en cuenta")).toBeTruthy();
    expect(card("Grammar guide")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^older/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: /^Words & phrases/ }));
    expect(props.onOpenLexical).toHaveBeenCalledWith("all");
    await user.click(screen.getByRole("button", { name: /^Pages/ }));
    expect(props.onOpenPages).toHaveBeenCalledOnce();
  });

  it("shows five compact search results before the explicit all-results view", async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 7 }, (_, index) => word(`casa-${index + 1}`));
    render(<Cuaderno {...propsFor(items)} />);

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "casa");
    const overlay = screen.getByRole("region", { name: "Search results" });
    expect(within(overlay).getAllByRole("button", { name: /^casa-/ })).toHaveLength(5);
    await user.click(within(overlay).getByRole("button", { name: "See all 7 results" }));
    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("casa");

    await user.click(screen.getByRole("button", { name: "Back to Todo el cuaderno" }));
    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("casa");
  });
});

describe("Phase 5c Cuaderno retrieval controls", () => {
  it("browses rolling 7-day and 30-day additions plus media links", async () => {
    const user = userEvent.setup();
    const now = new Date("2026-08-15T10:00:00.000Z");
    const items = [
      word("today", { createdAt: "2026-08-15T09:00:00.000Z" }),
      word("six-days", { createdAt: "2026-08-09T10:00:00.000Z" }),
      page("twenty-days", { createdAt: "2026-07-26T10:00:00.000Z" }),
      word("old-video", {
        createdAt: "2026-06-01T10:00:00.000Z",
        mediaLinks: [{ url: "https://example.com/video", label: "Lesson" }],
      }),
      page("Media page", {
        createdAt: "2026-05-01T10:00:00.000Z",
        mediaLinks: [{ url: "https://example.com/image.jpg", label: "Image" }],
      }),
    ];
    render(<Cuaderno {...propsFor(items, { now })} />);
    await openRefine(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "added-7-days");
    expect(card("today")).toBeTruthy();
    expect(card("six-days")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^twenty-days/ })).toBeNull();

    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "added-30-days");
    expect(card("today")).toBeTruthy();
    expect(card("six-days")).toBeTruthy();
    expect(card("twenty-days")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^old-video/ })).toBeNull();

    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "with-media");
    expect(card("old-video")).toBeTruthy();
    expect(card("Media page")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^today/ })).toBeNull();
  });

  it("orders browsing without changing search relevance or the shared source order", async () => {
    const user = userEvent.setup();
    const items = [
      word("zorro", { createdAt: at(1), updatedAt: at(30) }),
      word("abeja", { createdAt: at(30), updatedAt: at(1) }),
      page("casa", { body: "Una nota sobre zorro.", createdAt: at(15), updatedAt: at(15) }),
    ];
    const sourceOrder = items.map((item) => item.id);
    render(<Cuaderno {...propsFor(items)} />);
    await openRefine(user);

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
    await openRefine(user);

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
    await openRefine(user);

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
    await openRefine(user);

    // Since Phase 8 the maintenance View is the root list's remaining context control: palabras
    // and frases are doors to the hub, so `todo` is the only type state this list holds.
    await user.selectOptions(
      screen.getByRole("combobox", { name: "View" }),
      "missing-meaning"
    );

    const tags = screen.getByRole("combobox", { name: "Tag" });
    expect(screen.getByRole("option", { name: "Mexico · 1" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "mexico · 1" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "verbs · 2" })).toBeTruthy();
    // Words and phrases share this list now, so a phrase's tag belongs to the same context.
    expect(screen.getByRole("option", { name: "phrases · 1" })).toBeTruthy();
    expect(card("phrase")).toBeTruthy();
    expect(screen.queryByRole("option", { name: /source/ })).toBeNull();

    await user.selectOptions(tags, "Mexico");
    expect(card("first")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^second/ })).toBeNull();
    expect(screen.getByRole("option", { name: "verbs · 2" })).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "no-match");
    expect(tags.value).toBe("Mexico");
    expect(screen.getByRole("option", { name: "verbs · 2" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    // Every fixture word carries an example, so this view empties the context and Mexico
    // becomes impossible — the selected tag has to clear itself rather than hide every card.
    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "missing-examples");
    await waitFor(() => expect(tags.value).toBe(""));
    expect(screen.getByRole("option", { name: "No tags in this view" })).toBeTruthy();
  });

  it("hides the retrieval controls behind Refine and counts what it is hiding", async () => {
    const user = userEvent.setup();
    render(<Cuaderno {...propsFor([word("one", { tags: ["study"] })])} />);

    await openBrowseAll(user);

    // Nothing is refined yet, so the disclosure is closed and its label carries no count.
    expect(screen.queryByRole("combobox", { name: "View" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Order" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Tag" })).toBeNull();
    const refine = screen.getByRole("button", { name: "Refine" });
    expect(refine.getAttribute("aria-expanded")).toBe("false");

    await openRefine(user);
    expect(refine.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("combobox", { name: "View" })).toBeTruthy();

    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "unlinked");
    expect(screen.getByRole("button", { name: "Refine (1)" })).toBeTruthy();
    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "alphabetical");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "study");
    expect(screen.getByRole("button", { name: "Refine (3)" })).toBeTruthy();

    // Closing the panel hides the controls but must not silently drop the refinements.
    await user.click(screen.getByRole("button", { name: "Refine (3)" }));
    expect(screen.queryByRole("combobox", { name: "View" })).toBeNull();
    expect(screen.getByRole("button", { name: "Refine (3)" })).toBeTruthy();

    await openRefine(user);
    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "all");
    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "touched");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "");
    expect(screen.getByRole("button", { name: "Refine" })).toBeTruthy();
  });

  it("keeps retrieval choices local by returning to defaults after remount", async () => {
    const user = userEvent.setup();
    const items = [word("one", { tags: ["study"] })];
    const first = render(<Cuaderno {...propsFor(items)} />);
    await openRefine(user);

    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "added");
    await user.selectOptions(screen.getByRole("combobox", { name: "View" }), "unlinked");
    await user.selectOptions(screen.getByRole("combobox", { name: "Tag" }), "study");
    first.unmount();

    render(<Cuaderno {...propsFor(items)} />);
    // The disclosure is visit-local too: it comes back closed, with nothing to report.
    await openBrowseAll(user);
    expect(screen.getByRole("button", { name: "Refine" })).toBeTruthy();
    await openRefine(user);
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
    expect(within(screen.getByRole("region", { name: "Search results" })).getByText("Context hub")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.click(screen.getByRole("button", { name: /^Pages/ }));
    expect(props.onOpenPages).toHaveBeenCalledOnce();
  });

  it("hands palabras and frases to the Words & phrases hub instead of filtering in place", async () => {
    const user = userEvent.setup();
    const props = propsFor([
      word("madrugar"),
      word("de repente", { id: "user:phrase", form: "phrase" }),
    ]);
    render(<Cuaderno {...props} />);
    await openBrowseAll(user);

    await user.click(screen.getByRole("button", { name: "palabras" }));
    expect(props.onOpenLexical).toHaveBeenCalledWith("word");
    // The list itself must not narrow: the hub is the surface that answers the chip.
    expect(card("de repente")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "frases" }));
    expect(props.onOpenLexical).toHaveBeenCalledWith("phrase");
    expect(card("madrugar")).toBeTruthy();

    // todo remains a real filter, and the only type state this list can hold.
    await user.click(screen.getByRole("button", { name: "todo" }));
    expect(props.onOpenLexical).toHaveBeenCalledTimes(2);
  });

  it("still filters in place when no hub is wired up", async () => {
    const user = userEvent.setup();
    render(<Cuaderno {...propsFor(
      [word("madrugar"), word("de repente", { id: "user:phrase", form: "phrase" })],
      { onOpenLexical: undefined, onOpenPages: undefined }
    )} />);
    await openBrowseAll(user);

    await user.click(screen.getByRole("button", { name: "frases" }));

    expect(card("de repente")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^madrugar/ })).toBeNull();
  });

  it("applies a query handed over by the hub, and re-applies the same text on a second hand-off", async () => {
    const items = [word("madrugar"), word("dormir")];
    const { rerender } = render(
      <Cuaderno {...propsFor(items, { seedQuery: { text: "madrugar", key: 1 } })} />
    );
    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("madrugar");
    expect(screen.queryByRole("button", { name: /^dormir/ })).toBeNull();

    rerender(<Cuaderno {...propsFor(items, { seedQuery: { text: "dormir", key: 2 } })} />);
    expect(screen.getByRole("textbox", { name: "Search notebook" }).value).toBe("dormir");
    expect(card("dormir")).toBeTruthy();
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

describe("Phase 11: review state reaching the detail strip", () => {
  it("derives the selected word's box and hands it to Detail", async () => {
    const user = userEvent.setup();
    const madrugar = word("madrugar");
    const events = [
      {
        id: "evt:1",
        type: "review_fail",
        itemKey: madrugar.id,
        at: at(20),
        localDate: "2026-07-20",
        metadata: { grade: 0 },
      },
    ];

    render(
      <Cuaderno
        {...propsFor([madrugar], {
          notebook: { items: [madrugar], events, itemState: new Map(), reload: vi.fn() },
          selectedId: madrugar.id,
        })}
      />
    );

    // A missed review drops the word to box 1 and enrolls it; the strip must say so,
    // which it can only do if Cuaderno's gated memo actually ran and was passed down.
    await user.click(screen.getByRole("button", { name: "Stats" }));
    await waitFor(() => expect(screen.getByText(/box 1/)).toBeTruthy());
  });

  it("says not in review for a word with no review history", async () => {
    const user = userEvent.setup();
    const madrugar = word("madrugar");

    render(
      <Cuaderno
        {...propsFor([madrugar], {
          notebook: { items: [madrugar], events: [], itemState: new Map(), reload: vi.fn() },
          selectedId: madrugar.id,
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: "Stats" }));
    await waitFor(() => expect(screen.getByText(/not in review/)).toBeTruthy());
  });
});

describe("Phase 23a: event history reaching Biography", () => {
  it("threads the selected item's events without replaying them at the Cuaderno root", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
    const madrugar = word("madrugar");
    const events = [
      {
        id: "evt:create",
        type: "create",
        itemKey: madrugar.id,
        at: at(10),
        localDate: "2026-07-10",
        metadata: null,
      },
      {
        id: "evt:review",
        type: "review_pass",
        itemKey: madrugar.id,
        at: at(20),
        localDate: "2026-07-20",
        metadata: { grade: 2 },
      },
    ];

    render(
      <Cuaderno
        {...propsFor([madrugar], {
          notebook: { items: [madrugar], events, itemState: new Map(), reload: vi.fn() },
          selectedId: madrugar.id,
        })}
      />
    );

    await user.click(screen.getByRole("button", { name: "Historia" }));
    expect(screen.getByText("First review")).toBeTruthy();
    expect(screen.getByText("Reached box 2")).toBeTruthy();
  });
});

describe("Phase 23b: idle wandering launcher", () => {
  it("samples from all lexical items only while the root search is idle", async () => {
    const user = userEvent.setup();
    const onWander = vi.fn();
    const first = word("casa");
    const pageOnly = page("Notes");
    const last = word("a veces", { form: "phrase" });
    const random = vi.fn(() => 0.99);
    render(<Cuaderno {...propsFor([first, pageOnly, last], { onWander, random })} />);

    const launcher = screen.getByRole("button", { name: "Pasear" });
    expect(launcher.textContent).toBe("Pasear");
    expect(launcher.className).toContain("min-h-14");
    expect(screen.queryByText("Start somewhere unexpected.")).toBeNull();
    await user.click(launcher);
    expect(random).toHaveBeenCalledTimes(1);
    expect(onWander).toHaveBeenCalledWith(last.id);

    await user.type(screen.getByRole("textbox", { name: "Search notebook" }), "casa");
    expect(screen.queryByRole("button", { name: "Pasear" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Pasear" })).toBeTruthy();

    cleanup();
    render(<Cuaderno {...propsFor([pageOnly], { onWander })} />);
    expect(screen.queryByRole("button", { name: "Pasear" })).toBeNull();
  });
});
