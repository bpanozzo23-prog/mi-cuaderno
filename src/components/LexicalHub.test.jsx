// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LexicalHub from "./LexicalHub.jsx";
import { newGrammarExample, newGrammarSection, newSourceCapture } from "../lib/pageKinds.js";

const at = (day) => `2026-08-${String(day).padStart(2, "0")}T10:00:00.000Z`;

const lexical = (term, over = {}) => ({
  id: `user:${term}`,
  type: "lexical",
  form: "word",
  term,
  meanings: [{
    id: `meaning:${term}`,
    gloss: `meaning of ${term}`,
    usageCue: "",
    regions: [],
    usageLabels: [],
    posOverride: "",
    verbBehavior: [],
    note: "",
    examples: [],
  }],
  pos: "",
  notes: "",
  myExamples: [],
  mediaLinks: [],
  tags: [],
  linkedKeys: [],
  linkAnnotations: [],
  createdAt: at(1),
  updatedAt: at(1),
  ...over,
});

const page = (title, over = {}) => ({
  id: `user:${title.toLowerCase().replaceAll(" ", "-")}`,
  type: "page",
  title,
  body: "",
  pageDate: null,
  mediaLinks: [],
  tags: [],
  linkedKeys: [],
  linkAnnotations: [],
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
    notebook: { items, itemState: new Map(), events: [], reload: vi.fn() },
    pinnedLexicalIds: [],
    onLexicalPinnedChange: vi.fn(),
    onSelect: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
}

const card = (term) => screen.getByRole("button", { name: term });
const cardOrNull = (term) => screen.queryByRole("button", { name: term });

async function openRefine(user) {
  await user.click(screen.getByRole("button", { name: /^Refine/ }));
}

async function choose(user, label, value) {
  await user.selectOptions(screen.getByLabelText(label), value);
}

async function search(user, text) {
  await user.click(screen.getByRole("button", { name: "Search words and phrases" }));
  await user.type(screen.getByLabelText("Search words and phrases"), text);
}

afterEach(cleanup);

describe("the Words & phrases hub", () => {
  it("lists only lexical items, never pages", () => {
    render(<LexicalHub {...propsFor([lexical("madrugar"), page("Ser vs estar")])} />);

    expect(screen.getByRole("heading", { level: 1, name: "Words & phrases" })).toBeTruthy();
    expect(screen.queryByText("Your words and phrases")).toBeNull();
    expect(screen.queryByText("One vocabulary · many contexts")).toBeNull();
    expect(screen.queryByText("Practice this view")).toBeNull();
    expect(screen.queryByRole("region", { name: "Free practice" })).toBeNull();
    expect(card("madrugar")).toBeTruthy();
    expect(cardOrNull("Ser vs estar")).toBeNull();
  });

  it("narrows to words or phrases and back", async () => {
    const user = userEvent.setup();
    render(<LexicalHub {...propsFor([
      lexical("madrugar"),
      lexical("de repente", { form: "phrase" }),
    ])} />);

    await user.click(screen.getByRole("button", { name: "Phrases" }));
    expect(cardOrNull("madrugar")).toBeNull();
    expect(card("de repente")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Words" }));
    expect(card("madrugar")).toBeTruthy();
    expect(cardOrNull("de repente")).toBeNull();

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(card("madrugar")).toBeTruthy();
    expect(card("de repente")).toBeTruthy();
  });

  it("applies the chip the owner tapped in Cuaderno, and re-applies it on a second tap", () => {
    const items = [lexical("madrugar"), lexical("de repente", { form: "phrase" })];
    const { rerender } = render(
      <LexicalHub {...propsFor(items, { formRequest: { form: "phrase", key: 1 } })} />
    );
    expect(cardOrNull("madrugar")).toBeNull();

    // The owner widens the chip inside the hub, leaves, then taps frases again.
    rerender(<LexicalHub {...propsFor(items, { formRequest: { form: "all", key: 2 } })} />);
    expect(card("madrugar")).toBeTruthy();

    rerender(<LexicalHub {...propsFor(items, { formRequest: { form: "phrase", key: 3 } })} />);
    expect(cardOrNull("madrugar")).toBeNull();
    expect(card("de repente")).toBeTruthy();
  });

  describe("where a word lives", () => {
    const grouped = lexical("nomás");
    const captured = lexical("órale");
    const exemplified = lexical("ándale");
    const loose = lexical("madrugar");
    const items = [
      grouped,
      captured,
      exemplified,
      loose,
      page("Voces", {
        pageFocus: "vocabulary",
        linkedKeys: [grouped.id],
        collection: {
          enabled: true,
          groups: [{ id: "page-group:one", name: "Softening", itemKeys: [grouped.id] }],
        },
      }),
      page("Podcast", {
        pageFocus: "source",
        linkedKeys: [captured.id],
        source: {
          enabled: true,
          format: "audio",
          creator: "",
          scope: "",
          url: "",
          context: "",
          captures: [newSourceCapture({ text: "Órale.", location: "18:42", itemKeys: [captured.id] })],
        },
      }),
      page("Interjections", {
        pageFocus: "grammar",
        linkedKeys: [exemplified.id],
        grammar: {
          enabled: true,
          keyIdea: "",
          sections: [newGrammarSection({
            name: "Encouragement",
            examples: [newGrammarExample({ es: "¡Ándale!", itemKeys: [exemplified.id] })],
          })],
        },
      }),
    ];

    it("filters to each kind of page context", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor(items)} />);
      await openRefine(user);

      await choose(user, "Where it lives", "vocabulary");
      expect(card("nomás")).toBeTruthy();
      expect(cardOrNull("órale")).toBeNull();
      expect(cardOrNull("madrugar")).toBeNull();

      await choose(user, "Where it lives", "source");
      expect(card("órale")).toBeTruthy();
      expect(cardOrNull("nomás")).toBeNull();

      await choose(user, "Where it lives", "grammar");
      expect(card("ándale")).toBeTruthy();
      expect(cardOrNull("órale")).toBeNull();
    });

    it("finds the words that live in no page at all", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor(items)} />);
      await openRefine(user);

      await choose(user, "Where it lives", "none");

      expect(card("madrugar")).toBeTruthy();
      expect(cardOrNull("nomás")).toBeNull();
      expect(cardOrNull("órale")).toBeNull();
      expect(cardOrNull("ándale")).toBeNull();
    });

    it("counts a word held only by a DISABLED structure as living nowhere", async () => {
      const user = userEvent.setup();
      const hidden = items.map((item) => (
        item.id === "user:voces"
          ? { ...item, collection: { ...item.collection, enabled: false } }
          : item
      ));
      render(<LexicalHub {...propsFor(hidden)} />);
      await openRefine(user);

      await choose(user, "Where it lives", "none");
      expect(card("nomás")).toBeTruthy();

      await choose(user, "Where it lives", "vocabulary");
      expect(cardOrNull("nomás")).toBeNull();
    });

    it("summarizes the contexts on the card", () => {
      render(<LexicalHub {...propsFor(items)} />);

      expect(within(card("nomás")).getByText(/Used in 1 page context/)).toBeTruthy();
      expect(within(card("nomás")).getByText(/Voces · Vocabulary · Softening/)).toBeTruthy();
    });
  });

  describe("the learning lens", () => {
    const tricky = lexical("madrugar");
    const due = lexical("trasnochar");
    const quiet = lexical("dormir");
    const items = [tricky, due, quiet];
    const events = [
      { id: "e1", type: "tricky_on", itemKey: tricky.id, at: at(1), localDate: "2026-08-01", metadata: null },
      { id: "e2", type: "review_fail", itemKey: due.id, at: at(1), localDate: "2026-08-01", metadata: { grade: 0 } },
    ];

    it("filters to highlighted, in review and due without offering a session", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor(items, {
        notebook: { items, itemState: new Map(), events, reload: vi.fn() },
      })} />);
      await openRefine(user);

      await choose(user, "Learning", "tricky");
      expect(card("madrugar")).toBeTruthy();
      expect(cardOrNull("dormir")).toBeNull();

      await choose(user, "Learning", "due");
      expect(card("trasnochar")).toBeTruthy();
      expect(cardOrNull("dormir")).toBeNull();

      await choose(user, "Learning", "reviewing");
      expect(card("trasnochar")).toBeTruthy();
      expect(card("madrugar")).toBeTruthy();
      expect(cardOrNull("dormir")).toBeNull();

      // Repaso owns grading (§12); the hub must not grow a second review flow.
      expect(screen.queryByRole("button", { name: /Start/ })).toBeNull();
    });

    it("badges a due word on its card", () => {
      render(<LexicalHub {...propsFor(items, {
        notebook: { items, itemState: new Map(), events, reload: vi.fn() },
      })} />);

      expect(within(card("trasnochar")).getByText("Due today")).toBeTruthy();
    });
  });

  it("carries the completeness views over from Cuaderno", async () => {
    const user = userEvent.setup();
    const bare = lexical("madrugar", { meanings: [] });
    render(<LexicalHub {...propsFor([bare, lexical("dormir")])} />);
    await openRefine(user);

    await choose(user, "Vocabulary view", "missing-meaning");

    expect(card("madrugar")).toBeTruthy();
    expect(cardOrNull("dormir")).toBeNull();
  });

  it("counts the refinements it is hiding", async () => {
    const user = userEvent.setup();
    render(<LexicalHub {...propsFor([lexical("madrugar")])} />);
    expect(screen.getByRole("button", { name: "Refine" })).toBeTruthy();

    await openRefine(user);
    await choose(user, "Where it lives", "none");
    await choose(user, "Learning", "tricky");

    expect(screen.getByRole("button", { name: "Refine (2)" })).toBeTruthy();
  });

  describe("the A–Z index", () => {
    const items = [lexical("zorro"), lexical("ñoño"), lexical("árbol"), lexical("nube")];

    it("appears only in A–Z order, with ñ its own letter after n", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor(items)} />);
      await openRefine(user);
      expect(screen.queryByText("Ñ", { selector: "div" })).toBeNull();

      await choose(user, "Vocabulary order", "alphabetical");

      const letters = screen.getAllByText(/^[A-ZÑ#]$/, { selector: "div" }).map((node) => node.textContent);
      expect(letters).toEqual(["A", "N", "Ñ", "Z"]);
    });

    it("goes back to a flat list when the order changes", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor(items)} />);
      await openRefine(user);

      await choose(user, "Vocabulary order", "alphabetical");
      expect(screen.getAllByText(/^[A-ZÑ#]$/, { selector: "div" })).toHaveLength(4);

      await choose(user, "Vocabulary order", "touched");
      expect(screen.queryAllByText(/^[A-ZÑ#]$/, { selector: "div" })).toHaveLength(0);
    });
  });

  describe("pinning", () => {
    const items = [lexical("madrugar"), lexical("dormir")];

    it("separates pinned vocabulary while browsing", () => {
      render(<LexicalHub {...propsFor(items, { pinnedLexicalIds: ["user:dormir"] })} />);

      const pinned = screen.getByRole("region", { name: "Pinned" });
      expect(within(pinned).getByRole("button", { name: "dormir" })).toBeTruthy();
      expect(within(pinned).queryByRole("button", { name: "madrugar" })).toBeNull();
    });

    it("never reorders search results, so §8 relevance stays authoritative", async () => {
      const user = userEvent.setup();
      // madrugar is pinned but ranks BELOW dormir for "d": dormir starts with the query, while
      // madrugar merely contains it. If pinning leaked into search, madrugar would jump the queue.
      render(<LexicalHub {...propsFor(items, { pinnedLexicalIds: ["user:madrugar"] })} />);

      await search(user, "d");

      expect(screen.queryByRole("region", { name: "Pinned" })).toBeNull();
      const results = screen.getByRole("region", { name: "Matching vocabulary" });
      const order = within(results)
        .getAllByRole("button", { name: /^(dormir|madrugar)$/ })
        .map((node) => node.getAttribute("aria-label"));
      expect(order).toEqual(["dormir", "madrugar"]);
    });

    it("asks the owner's handler to pin", async () => {
      const user = userEvent.setup();
      const onLexicalPinnedChange = vi.fn();
      render(<LexicalHub {...propsFor(items, { onLexicalPinnedChange })} />);

      await user.click(screen.getByRole("button", { name: "Pin madrugar" }));

      expect(onLexicalPinnedChange).toHaveBeenCalledWith("user:madrugar", true);
    });
  });

  describe("search", () => {
    it("matches a personal meaning and says why", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor([lexical("madrugar"), lexical("dormir")])} />);

      await search(user, "meaning of madrugar");

      expect(card("madrugar")).toBeTruthy();
      expect(cardOrNull("dormir")).toBeNull();
      expect(within(card("madrugar")).getByText("English meaning")).toBeTruthy();
    });

    it("hands an empty result to the dictionary rather than widening its own scope", async () => {
      const user = userEvent.setup();
      const onSearchDictionary = vi.fn();
      render(<LexicalHub {...propsFor([lexical("madrugar")], { onSearchDictionary })} />);

      await search(user, "zzz");
      await user.click(screen.getByRole("button", { name: /Search the dictionary for/ }));

      expect(onSearchDictionary).toHaveBeenCalledWith("zzz");
    });

    it("stays inside the active filters", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor([
        lexical("madrugar"),
        lexical("madrugar de nuevo", { id: "user:phrase", form: "phrase" }),
      ])} />);

      await user.click(screen.getByRole("button", { name: "Phrases" }));
      await search(user, "madrugar");

      expect(card("madrugar de nuevo")).toBeTruthy();
      expect(cardOrNull("madrugar")).toBeNull();
    });
  });

  describe("free practice", () => {
    it("reports answerable and incomplete matches, then practices only eligible cards", async () => {
      const user = userEvent.setup();
      const ready = lexical("dormir");
      const incomplete = lexical("madrugar", { meanings: [] });
      render(<LexicalHub {...propsFor([ready, incomplete])} />);

      const practice = screen.getByRole("button", { name: "Practice" });
      expect(practice.getAttribute("aria-describedby")).toBe("lexical-hub-practice-status");
      expect(screen.getByText("1 answerable card. 1 entry needs a meaning.").classList.contains("sr-only")).toBe(true);
      await user.click(practice);

      expect(screen.getByRole("dialog", { name: "Set up practice" })).toBeTruthy();
      expect(screen.getByText("Practice 1 of 1 eligible card. 1 entry needs a meaning.")).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Hub order" }));
      await user.click(screen.getByRole("button", { name: "Start 1-card practice" }));

      expect(screen.getByText("dormir")).toBeTruthy();
      expect(screen.queryByText("madrugar")).toBeNull();
    });

    it("uses the active form and search narrowing as the deck source", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor([
        lexical("dormir"),
        lexical("dormir a pierna suelta", { id: "user:phrase", form: "phrase" }),
        lexical("dar con", { id: "user:dar-con", form: "phrase" }),
      ])} />);

      await user.click(screen.getByRole("button", { name: "Phrases" }));
      await search(user, "dormir");

      expect(screen.getByText("1 answerable card.").classList.contains("sr-only")).toBe(true);
      await user.click(screen.getByRole("button", { name: "Practice" }));
      await user.click(screen.getByRole("button", { name: "Hub order" }));
      await user.click(screen.getByRole("button", { name: "Start 1-card practice" }));

      expect(screen.getByText("dormir a pierna suelta")).toBeTruthy();
      expect(screen.queryByText("dormir", { exact: true })).toBeNull();
      expect(screen.queryByText("dar con")).toBeNull();
    });

    it("disables Practice when the current view has no meanings", async () => {
      const user = userEvent.setup();
      render(<LexicalHub {...propsFor([
        lexical("madrugar", { meanings: [] }),
        lexical("dormir"),
      ])} />);
      await openRefine(user);
      await choose(user, "Vocabulary view", "missing-meaning");

      const practice = screen.getByRole("button", { name: "Practice" });
      const status = screen.getByText("No answerable cards in this view. 1 entry needs a meaning.");
      expect(status.classList.contains("sr-only")).toBe(true);
      expect(practice.getAttribute("aria-describedby")).toBe(status.id);
      expect(practice.disabled).toBe(true);
    });

    it("preserves a revealed session while an entry detail temporarily hides the hub", async () => {
      const user = userEvent.setup();
      const items = [lexical("dormir")];
      const { rerender } = render(<LexicalHub {...propsFor(items)} />);

      await user.click(screen.getByRole("button", { name: "Practice" }));
      await user.click(screen.getByRole("button", { name: "Hub order" }));
      await user.click(screen.getByRole("button", { name: "Start 1-card practice" }));
      await user.click(screen.getByRole("button", { name: "Reveal meanings" }));
      expect(screen.getByText("meaning of dormir")).toBeTruthy();

      rerender(<LexicalHub {...propsFor(items, { active: false })} />);
      rerender(<LexicalHub {...propsFor(items, { active: true })} />);

      expect(screen.getByText("meaning of dormir")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Got it" })).toBeTruthy();
    });
  });

  describe("empty states", () => {
    it("distinguishes an empty notebook from an over-narrow filter", async () => {
      const user = userEvent.setup();
      const { unmount } = render(<LexicalHub {...propsFor([page("Ser vs estar")])} />);
      expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
      unmount();

      render(<LexicalHub {...propsFor([lexical("madrugar")])} />);
      await openRefine(user);
      await choose(user, "Learning", "graduated");

      expect(screen.getByText(/No words or phrases match these filters/)).toBeTruthy();
    });
  });

  it("returns to Cuaderno", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<LexicalHub {...propsFor([lexical("madrugar")], { onBack })} />);

    await user.click(screen.getByRole("button", { name: /Cuaderno/ }));

    expect(onBack).toHaveBeenCalled();
  });

  it("does nothing expensive while it is not the visible screen", () => {
    const items = [lexical("madrugar"), page("Voces", {
      pageFocus: "vocabulary",
      linkedKeys: ["user:madrugar"],
      collection: {
        enabled: true,
        groups: [{ id: "page-group:one", name: "Verbs", itemKeys: ["user:madrugar"] }],
      },
    })];
    render(<LexicalHub {...propsFor(items, { active: false })} />);

    // Contexts are what the derivation produces; while inactive there is nothing to show.
    expect(screen.queryByText(/Used in 1 page context/)).toBeNull();
  });
});
