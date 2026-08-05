// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageHub from "./PageHub.jsx";

const at = (day) => `2026-08-${String(day).padStart(2, "0")}T10:00:00.000Z`;

const lexical = (term) => ({
  id: `user:${term}`,
  type: "lexical",
  form: "word",
  term,
  meanings: [{ id: `meaning:${term}`, gloss: "meaning", usageCue: "", regions: [], usageLabels: [], posOverride: "", verbBehavior: [], note: "", examples: [] }],
  notes: "",
  myExamples: [],
  mediaLinks: [],
  tags: [],
  linkedKeys: [],
  linkAnnotations: [],
  createdAt: at(1),
  updatedAt: at(1),
});

const page = (title, over = {}) => ({
  id: `user:${title.toLowerCase().replaceAll(" ", "-")}`,
  type: "page",
  title,
  body: "",
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
    notebook: { items, itemState: new Map(), reload: vi.fn() },
    pinnedPageIds: [],
    onPagePinnedChange: vi.fn(),
    onSelect: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
}

function card(title) {
  return screen.getByRole("button", { name: title });
}

function expectBefore(first, second) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pages hub", () => {
  it("shows overlapping page roles and keeps Diario outside its filters", async () => {
    const user = userEvent.setup();
    const word = lexical("mercado");
    const notes = page("Restaurant notes", { body: "Useful expressions from dinner.", tags: ["food"] });
    word.linkedKeys = [notes.id];
    const source = page("Voces del mercado", {
      pageFocus: "source",
      linkedKeys: [word.id],
      tags: ["audio"],
      collection: { enabled: true, groups: [{ id: "page-group:market", name: "Words", itemKeys: [word.id] }] },
      source: {
        enabled: true,
        format: "audio",
        creator: "Camila Torres",
        scope: "Episode 1",
        url: "",
        context: "",
        captures: [{ id: "source-capture:market", type: "passage", text: "nomás", location: "18:42", reflection: "", itemKeys: [word.id] }],
      },
    });
    const grammar = page("Aquí vs. acá", {
      pageFocus: "grammar",
      grammar: {
        enabled: true,
        keyIdea: "A comparison",
        sections: [{ id: "grammar-section:compare", name: "Compare", explanation: "", pattern: "", examples: [{ id: "grammar-example:one", es: "Ven acá.", en: "Come here.", note: "", itemKeys: [], sourceCaptureRef: null }] }],
      },
    });
    const journal = page("Private moment", { pageDate: "2026-08-04", tags: ["journal-only"] });
    render(<PageHub {...propsFor([notes, source, grammar, journal, word])} />);

    expect(card("Restaurant notes")).toBeTruthy();
    expect(card("Voces del mercado")).toBeTruthy();
    expect(card("Aquí vs. acá")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Private moment" })).toBeNull();
    expect(screen.getByText("Audio · Camila Torres · 1 capture · 1 item · 1 group")).toBeTruthy();
    expect(screen.getByText("1 section · 1 example")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sources" }));
    expect(card("Voces del mercado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Restaurant notes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Aquí vs. acá" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Collections" }));
    expect(card("Voces del mercado")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Refine" }));
    expect(screen.getByRole("combobox", { name: "Page view" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "audio · 1" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /journal-only/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "All" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Page view" }), "unlinked");
    expect(screen.getByRole("button", { name: "Refine (1)" })).toBeTruthy();
    expect(card("Aquí vs. acá")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Restaurant notes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Voces del mercado" })).toBeNull();
  });

  it("separates pins during browsing but keeps relevance authoritative during search", async () => {
    const user = userEvent.setup();
    const misc = page("misc", { body: "A note about zorro.", createdAt: at(1), updatedAt: at(1) });
    const exact = page("zorro", { createdAt: at(2), updatedAt: at(2) });
    const abeja = page("abeja", { createdAt: at(3), updatedAt: at(3) });
    const pinSpy = vi.fn();

    function Harness() {
      const [pins, setPins] = useState([misc.id, abeja.id]);
      return (
        <PageHub
          {...propsFor([exact, misc, abeja])}
          pinnedPageIds={pins}
          onPagePinnedChange={(id, pinned) => {
            pinSpy(id, pinned);
            setPins((current) => pinned
              ? [...current.filter((candidate) => candidate !== id), id]
              : current.filter((candidate) => candidate !== id));
          }}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Pinned" })).toBeTruthy();
    expect(within(screen.getByRole("region", { name: /Pinned/ })).getByRole("button", { name: "misc" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "misc" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Refine" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Page order" }), "alphabetical");
    expectBefore(card("abeja"), card("misc"));
    expectBefore(card("misc"), card("zorro"));

    await user.click(screen.getByRole("button", { name: "Unpin misc" }));
    expect(pinSpy).toHaveBeenLastCalledWith(misc.id, false);
    expect(screen.getByRole("button", { name: "Pin misc" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "misc" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Pin misc" }));
    await user.click(screen.getByRole("button", { name: "Search pages" }));
    await user.type(screen.getByRole("textbox", { name: "Search pages" }), "zorro");
    expect(screen.queryByRole("heading", { name: "Pinned" })).toBeNull();
    expectBefore(card("zorro"), card("misc"));
    expect(screen.getByRole("combobox", { name: "Page order" }).value).toBe("relevance");
  });

  it("searches active contained vocabulary, preserves ñ, and never retrieves journals", async () => {
    const user = userEvent.setup();
    const word = lexical("nomás");
    const context = page("Context hub", {
      pageFocus: "source",
      linkedKeys: [word.id],
      source: {
        enabled: true,
        format: "audio",
        creator: "",
        scope: "",
        url: "",
        context: "",
        captures: [{ id: "source-capture:context", type: "passage", text: "Captured elsewhere.", location: "18:42", reflection: "", itemKeys: [word.id] }],
      },
    });
    const year = page("Año nuevo", { body: "Una reflexión." });
    const journal = page("nomás journal", { pageDate: "2026-08-04" });
    render(<PageHub {...propsFor([word, context, year, journal])} />);

    await user.click(screen.getByRole("button", { name: "Search pages" }));
    const search = screen.getByRole("textbox", { name: "Search pages" });
    await user.type(search, "nomás");
    expect(card("Context hub")).toBeTruthy();
    expect(screen.getByText("contained vocabulary “nomás”")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "nomás journal" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.type(search, "ano");
    expect(screen.queryByRole("button", { name: "Año nuevo" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await user.type(search, "año");
    expect(card("Año nuevo")).toBeTruthy();
  });

  it("opens page creation directly from the focused header", async () => {
    const user = userEvent.setup();
    render(<PageHub {...propsFor([])} />);

    await user.click(screen.getByRole("button", { name: "Add page" }));
    const gallery = screen.getByRole("dialog", { name: "What kind of page?" });
    expect(gallery).toBeTruthy();
    await user.click(within(gallery).getByRole("button", { name: /^Notes/ }));
    await user.click(within(gallery).getByRole("button", { name: /^Blank/ }));
    expect(screen.getByText("New notes page")).toBeTruthy();
  });
});
