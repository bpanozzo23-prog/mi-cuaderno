// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
    name: "Subjunctive after expressions of doubt and uncertainty",
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

describe("page media links", () => {
  it("edits a saved link in place, in read mode and in the details editor", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({
      title: "Ser vs estar",
      mediaLinks: [{ url: "https://vm.tiktok.com/serestar", label: "" }],
    }));
    renderPage(page, await allItems());

    // A populated Media links section starts expanded, so the row is already reachable.
    await user.click(screen.getByRole("button", { name: "Edit media https://vm.tiktok.com/serestar" }));
    expect(screen.getByRole("textbox", { name: "Media URL" }).value).toBe("https://vm.tiktok.com/serestar");

    await user.type(screen.getByRole("textbox", { name: "Media label" }), "The 0:40 explanation");
    await user.click(screen.getByRole("button", { name: "Save link" }));

    await waitFor(async () => {
      expect((await getItem(page.id)).mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/serestar", label: "The 0:40 explanation" },
      ]);
    });
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(1);

    // The details editor's draft list edits in place too, writing only when the sheet is saved.
    await user.click(screen.getByLabelText("Page actions"));
    await user.click(screen.getByRole("button", { name: "Edit details" }));
    await user.click(screen.getByRole("button", { name: "Edit media The 0:40 explanation" }));
    const labelField = screen.getByRole("textbox", { name: "Media label" });
    await user.clear(labelField);
    await user.type(labelField, "Renamed in the editor");
    await user.click(screen.getByRole("button", { name: "Save media link" }));

    expect((await getItem(page.id)).mediaLinks[0].label).toBe("The 0:40 explanation");
    await user.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(async () => {
      expect((await getItem(page.id)).mediaLinks).toEqual([
        { url: "https://vm.tiktok.com/serestar", label: "Renamed in the editor" },
      ]);
    });
  }, 15000);
});

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
    for (const action of ["Add Notes section", "Add vocabulary", "Capture", "Add grammar section", "link something related", "Add a media link"]) {
      expect(screen.getByRole("button", { name: action })).toBeTruthy();
    }
    await user.click(screen.getByRole("button", { name: "Expand Notes section" }));
    expect(screen.getByRole("button", { name: "Write Notes overview" })).toBeTruthy();

    await user.click(screen.getByLabelText("Page actions"));
    await user.click(screen.getByRole("button", { name: "Edit details" }));
    expect(screen.getByRole("textbox", { name: "Page notes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Block quote" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Note callout" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tip callout" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "¡Ojo! callout" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inline code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    const connections = screen.getByRole("heading", { name: "Connections" }).closest("section");
    const media = screen.getByRole("heading", { name: "Media links" }).closest("section");
    expect(within(connections).queryByText("Empty")).toBeNull();
    expect(within(media).queryByText("Empty")).toBeNull();
    expect(within(connections).getByRole("button", { name: "link something related" }).textContent).toBe("");
    expect(within(media).getByRole("button", { name: "Add a media link" }).textContent).toBe("");

    for (const heading of screen.getAllByRole("heading", { level: 2 })) {
      expect(heading.classList.contains("truncate")).toBe(false);
      expect(heading.classList.contains("break-words")).toBe(true);
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
    const grammarSectionHeading = screen.getByRole("heading", { name: "Subjunctive after expressions of doubt and uncertainty" });
    expect(grammarSectionHeading.classList.contains("truncate")).toBe(false);
    expect(grammarSectionHeading.classList.contains("break-words")).toBe(true);

    await user.click(screen.getByRole("button", { name: "Grammar", pressed: false }));
    await waitFor(async () => expect((await getItem(fixture.page.id)).pageFocus).toBe("grammar"));
    await waitFor(() => expect(appearsBefore(
      screen.getByRole("heading", { name: "Grammar guide" }),
      screen.getByRole("heading", { name: "Vocabulary" })
    )).toBe(true));
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(1);
  });

  it("renders Notes and Vocabulary leads in their exact orders and keeps Overview prose untruncated", async () => {
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
    expect(overview.closest(".note-markdown").classList.contains("line-clamp-4")).toBe(false);
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
