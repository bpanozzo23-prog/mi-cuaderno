// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Detail from "./Detail.jsx";
import { allItems, createItem, getItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { clearAllPersonalData, db } from "../db/db.js";
import { newPageGroup } from "../lib/collections.js";
import {
  emptyGrammar,
  emptySource,
  newGrammarExample,
  newGrammarSection,
  newSourceCapture,
} from "../lib/pageKinds.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

function renderPage(opened, initialItems) {
  function Harness() {
    const [items, setItems] = useState(initialItems);
    const current = items.find((item) => item.id === opened.id) || opened;
    return (
      <Detail
        item={current}
        state={{ views: 0, lastViewedAt: null, tricky: false }}
        items={items}
        onBack={vi.fn()}
        onOpen={vi.fn()}
        onChanged={async () => setItems(await allItems())}
      />
    );
  }
  return render(<Harness />);
}

async function composableFixture({
  title = "Impressions in a podcast",
  pageFocus = "source",
} = {}) {
  const phrase = await createItem(newLexical({ term: "me da la impresión", form: "phrase" }));
  const capture = newSourceCapture({
    type: "language_note",
    text: "Me da la impresión de que ya lo sabía.",
    location: "12:40",
    itemKeys: [phrase.id],
  });
  const section = newGrammarSection({
    name: "Choosing the form",
    explanation: "Use the indicative for information presented as likely.",
    examples: [newGrammarExample({ es: "Me da la impresión de que viene.", itemKeys: [phrase.id] })],
  });
  const page = await createItem(newPage({
    title,
    body: "These notes explain how the speaker softens an opinion and how the construction behaves.",
    pageFocus,
    linkedKeys: [phrase.id],
    collection: { enabled: true, groups: [newPageGroup("Opinion phrases", [phrase.id])] },
    source: emptySource({ enabled: true, format: "audio", captures: [capture] }),
    grammar: emptyGrammar({ enabled: true, keyIdea: "Softening a claim", sections: [section] }),
  }));
  return { page, phrase, capture, section };
}

function appearsBefore(first, second) {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("composable page workspace", () => {
  it("keeps empty page sections compact and gives every populated section a disclosure", async () => {
    const user = userEvent.setup();
    const emptyPage = await createItem(newPage({
      title: "Empty workspace",
      pageFocus: "vocabulary",
      tags: ["study"],
      collection: { enabled: true, groups: [newPageGroup("Empty group")] },
      source: emptySource({ enabled: true }),
      grammar: emptyGrammar({
        enabled: true,
        sections: [newGrammarSection({ name: "Empty rule" })],
      }),
    }));
    renderPage(emptyPage, await allItems());

    for (const name of [
      "Expand Notes section",
      "Expand Vocabulary section",
      "Expand Source notebook section",
      "Expand Grammar guide section",
      "Expand Connections section",
      "Expand Media links section",
    ]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-expanded")).toBe("false");
    }
    expect(screen.getByRole("button", { name: "Collapse Tags section" })).toBeTruthy();
    for (const action of ["Write page", "Add vocabulary", "Capture", "Section", "link something related", "Add a media link"]) {
      expect(screen.getByRole("button", { name: action })).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: "Expand Vocabulary section" }));
    expect(screen.getByRole("button", { name: "Expand group Empty group" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Expand Grammar guide section" }));
    expect(screen.getByRole("button", { name: "Expand grammar section Empty rule" })).toBeTruthy();
  });

  it("uses the saved focus order and persists focus chips with one edit", async () => {
    const user = userEvent.setup();
    const fixture = await composableFixture();
    renderPage(fixture.page, await allItems());

    const source = screen.getByRole("heading", { name: "Source notebook" });
    const vocabulary = screen.getByRole("heading", { name: "Vocabulary" });
    const grammar = screen.getByRole("heading", { name: "Grammar guide" });
    expect(appearsBefore(source, vocabulary)).toBe(true);
    expect(appearsBefore(vocabulary, grammar)).toBe(true);
    expect(screen.getByText(/These notes explain how the speaker/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^(Notes|Vocabulary|Source|Grammar)$/ })).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Grammar", pressed: false }));
    await waitFor(async () => expect((await getItem(fixture.page.id)).pageFocus).toBe("grammar"));
    await waitFor(() => expect(appearsBefore(
      screen.getByRole("heading", { name: "Grammar guide" }),
      screen.getByRole("heading", { name: "Vocabulary" })
    )).toBe(true));
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(1);
  });

  it("renders Notes and Vocabulary leads in their exact orders and clamps only specialized overviews", async () => {
    const notesFixture = await composableFixture({ title: "Notes-led page", pageFocus: "notes" });
    const notesView = renderPage(notesFixture.page, await allItems());

    const notes = screen.getByRole("heading", { name: "Notes" });
    const source = screen.getByRole("heading", { name: "Source notebook" });
    const grammar = screen.getByRole("heading", { name: "Grammar guide" });
    const vocabulary = screen.getByRole("heading", { name: "Vocabulary" });
    const fullBody = screen.getByText(/These notes explain how the speaker/);
    expect(fullBody.closest(".note-markdown").classList.contains("line-clamp-4")).toBe(false);
    expect(appearsBefore(notes, source)).toBe(true);
    expect(appearsBefore(source, grammar)).toBe(true);
    expect(appearsBefore(grammar, vocabulary)).toBe(true);

    notesView.unmount();

    const vocabularyFixture = await composableFixture({ title: "Vocabulary-led page", pageFocus: "vocabulary" });
    renderPage(vocabularyFixture.page, await allItems());

    const overview = screen.getByText(/These notes explain how the speaker/);
    const vocabularyLead = screen.getByRole("heading", { name: "Vocabulary" });
    const sourceAfter = screen.getByRole("heading", { name: "Source notebook" });
    const grammarAfter = screen.getByRole("heading", { name: "Grammar guide" });
    expect(overview.closest(".note-markdown").classList.contains("line-clamp-4")).toBe(true);
    expect(appearsBefore(overview, vocabularyLead)).toBe(true);
    expect(appearsBefore(vocabularyLead, sourceAfter)).toBe(true);
    expect(appearsBefore(sourceAfter, grammarAfter)).toBe(true);
  });

  it("hides a leading structure without deleting it and restores the preserved capture", async () => {
    const user = userEvent.setup();
    const fixture = await composableFixture();
    renderPage(fixture.page, await allItems());

    await user.click(screen.getByLabelText("Page actions"));
    await user.click(screen.getByRole("button", { name: /Customize page/ }));
    await user.click(screen.getByRole("checkbox", { name: "Source notebook" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Source notebook" })).toBeNull());
    let stored = await getItem(fixture.page.id);
    expect(stored.pageFocus).toBe("notes");
    expect(stored.source.enabled).toBe(false);
    expect(stored.source.captures).toEqual([fixture.capture]);

    await user.click(screen.getByLabelText("Page actions"));
    await user.click(screen.getByRole("button", { name: /Customize page/ }));
    await user.click(screen.getByRole("checkbox", { name: "Source notebook" }));
    await user.click(screen.getByRole("radio", { name: "Source notes" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Source notebook" })).toBeTruthy());
    stored = await getItem(fixture.page.id);
    expect(stored.pageFocus).toBe("source");
    expect(stored.source.captures).toEqual([fixture.capture]);
  });
});
