// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemCard from "./ItemCard.jsx";
import { newPageGroup } from "../lib/collections.js";

afterEach(cleanup);

const lexical = (id, term) => ({
  id,
  type: "lexical",
  form: "word",
  term,
  meanings: [],
  notes: "",
  myExamples: [],
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
});

const page = (overrides = {}) => ({
  id: "user:collection",
  type: "page",
  title: "Travel essentials",
  body: "Words I want close at hand.",
  pageDate: null,
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
  pageFocus: "notes",
  collection: { enabled: false, groups: [] },
  source: { enabled: false, format: "", creator: "", scope: "", url: "", context: "", captures: [] },
  grammar: { enabled: false, keyIdea: "", sections: [] },
  createdAt: "2026-08-03T00:00:00.000Z",
  updatedAt: "2026-08-03T00:00:00.000Z",
  ...overrides,
});

describe("page cards", () => {
  it("shows Vocabulary member/group counts and keeps a dated enhanced page out of Journal presentation", () => {
    const question = lexical("user:question", "¿Cuánto cuesta?");
    const answer = lexical("user:answer", "Cuesta diez euros");
    const groups = [
      newPageGroup("Questions", [question.id]),
      newPageGroup("Answers", [answer.id]),
    ];
    const collection = page({
      pageFocus: "vocabulary",
      pageDate: "2026-08-03",
      linkedKeys: [question.id, answer.id, "dict:wiktionary-es:viaje:noun"],
      collection: { enabled: true, groups },
    });

    render(<ItemCard item={collection} items={[collection, question, answer]} onOpen={vi.fn()} />);

    expect(screen.getByText("Vocabulary")).toBeTruthy();
    expect(screen.getByText("2 items · 2 groups")).toBeTruthy();
    expect(screen.queryByText("2026-08-03")).toBeNull();
  });

  it("keeps the dated Notes-only page presentation", () => {
    render(<ItemCard item={page({ pageDate: "2026-08-03" })} onOpen={vi.fn()} />);

    expect(screen.getByText("2026-08-03")).toBeTruthy();
    expect(screen.queryByText("Vocabulary")).toBeNull();
  });

  it("exposes a separate accessible pin control without opening the page", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onPinnedChange = vi.fn();
    render(
      <ItemCard
        item={page()}
        onOpen={onOpen}
        pinned={false}
        onPinnedChange={onPinnedChange}
      />
    );

    const pin = screen.getByRole("button", { name: "Pin Travel essentials" });
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    await user.click(pin);
    expect(onPinnedChange).toHaveBeenCalledWith(true);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe("the meaning a card shows", () => {
  const meaning = (gloss) => ({
    id: `meaning:${gloss}`,
    gloss,
    usageCue: "",
    regions: [],
    usageLabels: [],
    posOverride: "",
    verbBehavior: [],
    note: "",
    examples: [],
  });

  it("shows the first meaning only, behind a dash", () => {
    const word = lexical("user:word", "sacar");
    word.meanings = [meaning("to take out"), meaning("to withdraw")];

    render(<ItemCard item={word} onOpen={vi.fn()} />);

    expect(screen.getByText("— to take out")).toBeTruthy();
    expect(screen.queryByText(/to withdraw/)).toBeNull();
  });

  it("shows no meaning line at all for an entry that has none yet", () => {
    render(<ItemCard item={lexical("user:bare", "madrugar")} onOpen={vi.fn()} />);

    expect(screen.queryByText(/^—/)).toBeNull();
  });
});

describe("global lexical-result contexts", () => {
  it("shows the first active page and a count of the rest", () => {
    const word = lexical("user:word", "nomás");
    const sourcePage = page({
      id: "user:source",
      title: "Market podcast",
      pageFocus: "source",
      linkedKeys: [word.id],
      source: {
        enabled: true,
        format: "audio",
        creator: "",
        scope: "",
        url: "",
        context: "",
        captures: [{
          id: "source-capture:one",
          type: "passage",
          text: "Nomás dígame.",
          location: "18:42",
          reflection: "",
          itemKeys: [word.id],
        }],
      },
    });
    const grammarPage = page({
      id: "user:grammar",
      title: "Softening requests",
      pageFocus: "grammar",
      linkedKeys: [word.id],
      grammar: {
        enabled: true,
        keyIdea: "",
        sections: [{
          id: "grammar-section:one",
          name: "Pragmatics",
          explanation: "",
          pattern: "",
          examples: [{
            id: "grammar-example:one",
            es: "Nomás dime.",
            en: "",
            note: "",
            itemKeys: [word.id],
            sourceCaptureRef: null,
          }],
        }],
      },
    });
    const vocabularyPage = page({
      id: "user:vocabulary",
      title: "Friendly conversation",
      pageFocus: "vocabulary",
      linkedKeys: [word.id],
      collection: {
        enabled: true,
        groups: [newPageGroup("Softening", [word.id])],
      },
    });
    const hiddenPage = page({
      id: "user:hidden",
      title: "Hidden source",
      linkedKeys: [word.id],
      source: {
        enabled: false,
        format: "book",
        creator: "",
        scope: "",
        url: "",
        context: "",
        captures: [{
          id: "source-capture:hidden",
          type: "reflection",
          text: "Nomás",
          location: "",
          reflection: "",
          itemKeys: [word.id],
        }],
      },
    });

    render(
      <ItemCard
        item={word}
        reason="exact match"
        items={[word, sourcePage, grammarPage, vocabularyPage, hiddenPage]}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("Market podcast")).toBeTruthy();
    expect(screen.getByText("+2 more")).toBeTruthy();
    // The kind of placement stays on the entry, where there is room for it.
    expect(screen.queryByText(/Passage/)).toBeNull();
    expect(screen.queryByText(/Softening requests/)).toBeNull();
    expect(screen.queryByText(/Hidden source/)).toBeNull();

    // Cuaderno renders this summary inside its own card button, so the rows must stay inert —
    // a button nested in a button is invalid HTML and would swallow the card's own tap.
    expect(screen.queryByRole("button", { name: /^Open / })).toBeNull();
  });

  it("keeps contextual summaries out of ordinary browsing cards", () => {
    const word = lexical("user:word", "nomás");
    const sourcePage = page({
      id: "user:source",
      title: "Market podcast",
      linkedKeys: [word.id],
      source: {
        enabled: true,
        format: "audio",
        creator: "",
        scope: "",
        url: "",
        context: "",
        captures: [{
          id: "source-capture:one",
          type: "passage",
          text: "Nomás dígame.",
          location: "",
          reflection: "",
          itemKeys: [word.id],
        }],
      },
    });

    render(<ItemCard item={word} items={[word, sourcePage]} onOpen={vi.fn()} />);
    expect(screen.queryByText("Market podcast")).toBeNull();
  });
});
