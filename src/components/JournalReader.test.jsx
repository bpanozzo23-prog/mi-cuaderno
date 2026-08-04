// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JournalReader from "./JournalReader.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allItems, createItem, getItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES } from "../test/dictFixture.js";
import { newMeaning } from "../lib/meanings.js";

const CASA = "dict:wiktionary-es:casa:noun";

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await db.open();
  await clearAllPersonalData();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

async function seedDictionary() {
  const reference = refDb("a");
  const entry = FIXTURE_ENTRIES.find((candidate) => candidate.id === CASA);
  await reference.entries.put(entry);
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: { datasetVersion: "journal-reader-fixture", counts: { entries: 1 }, previousIds: {} },
  });
  setActiveSlot("a");
}

const propsFor = (entry, items, overrides = {}) => ({
  entry,
  items,
  state: { views: 2, lastViewedAt: "2026-08-02T12:00:00.000Z", tricky: false },
  onBack: vi.fn(),
  onOpen: vi.fn(),
  onEdit: vi.fn(),
  onStart: vi.fn(),
  onChanged: vi.fn(),
  now: new Date(2026, 7, 3, 12),
  ...overrides,
});

describe("JournalReader", () => {
  it("keeps reading primary while exposing vocabulary, related moments, reflection, and Más", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "madrugar", meanings: [newMeaning({ gloss: "to get up early" })] }));
    const page = await createItem(newPage({ title: "Sleep notes", body: "A durable page." }));
    const related = await createItem(newPage({ title: "Earlier thought", body: "Otra idea.", pageDate: "2026-08-01" }));
    const entry = await createItem(newPage({
      title: "Morning reflection",
      body: "Hoy me levanté temprano.\nTuve más energía.",
      pageDate: "2026-08-03",
      tags: ["rutina"],
      linkedKeys: [word.id, page.id, related.id],
    }));
    const props = propsFor(entry, await allItems());
    render(<JournalReader {...props} />);

    expect(screen.getByRole("heading", { name: "Morning reflection" })).toBeTruthy();
    expect(screen.getByText(/Hoy me levanté temprano/)).toBeTruthy();
    expect(screen.getByText("rutina")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^madrugar/ })).toBeTruthy();
    expect(screen.getByText("Earlier thought")).toBeTruthy();
    expect(screen.queryByText("Sleep notes")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Edit journal entry" }));
    expect(props.onEdit).toHaveBeenCalledWith(entry.id);
    await user.click(screen.getByRole("button", { name: "Reflect" }));
    expect(props.onStart).toHaveBeenCalledWith(expect.objectContaining({
      date: "2026-08-03",
      linkedEntryId: entry.id,
      prompt: expect.objectContaining({ id: "reflection" }),
    }));

    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    expect(screen.getByText("Sleep notes")).toBeTruthy();
    expect(screen.getByText("opened 2×")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Move to Pages" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Vocabulary Collection/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Pin/i })).toBeNull();
  });

  it("links only existing personal vocabulary without logging an edit", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "sobremesa", form: "word" }));
    const page = await createItem(newPage({ title: "Not vocabulary" }));
    const otherJournal = await createItem(newPage({ title: "Also not vocabulary", pageDate: "2026-08-02" }));
    const entry = await createItem(newPage({ body: "Hoy aprendí algo.", pageDate: "2026-08-03" }));
    render(<JournalReader {...propsFor(entry, await allItems())} />);

    await user.click(screen.getByRole("button", { name: "Add vocabulary" }));
    expect(screen.getByRole("button", { name: "Link sobremesa" })).toBeTruthy();
    expect(screen.queryByText("Not vocabulary")).toBeNull();
    expect(screen.queryByText("Also not vocabulary")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Link sobremesa" }));

    await waitFor(async () => expect((await getItem(entry.id)).linkedKeys).toContain(word.id));
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
    expect((await getItem(entry.id)).linkedKeys).not.toContain(page.id);
    expect((await getItem(entry.id)).linkedKeys).not.toContain(otherJournal.id);
  });

  it("keeps content actions and bookkeeping actions distinct inside Más", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Grammar notes" }));
    const otherJournal = await createItem(newPage({ title: "Another moment", pageDate: "2026-08-02" }));
    const entry = await createItem(newPage({ body: "Un día.", pageDate: "2026-08-03" }));
    const props = propsFor(entry, await allItems());
    render(<JournalReader {...props} />);

    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    await user.click(screen.getByRole("button", { name: "Relate a page" }));
    expect(screen.getByRole("button", { name: "Link Grammar notes" })).toBeTruthy();
    expect(screen.queryByText("Another moment")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Link Grammar notes" }));
    await waitFor(async () => expect((await getItem(entry.id)).linkedKeys).toContain(page.id));

    const tagInput = screen.getByPlaceholderText("new tag");
    await user.type(tagInput, "gratitud");
    await user.click(within(tagInput.parentElement).getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add a media link" }));
    await user.type(screen.getByRole("textbox", { name: "Journal media URL" }), "https://example.com/photo");
    await user.type(screen.getByRole("textbox", { name: "Journal media label" }), "Photo");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.click(screen.getByRole("button", { name: "Highlight as tricky" }));
    await user.click(screen.getByRole("button", { name: "Move to Pages" }));
    await user.click(screen.getByRole("button", { name: "Confirm move" }));

    await waitFor(async () => expect((await getItem(entry.id)).pageDate).toBeNull());
    const updated = await getItem(entry.id);
    expect(updated.body).toBe("Un día.");
    expect(updated.tags).toEqual(["gratitud"]);
    expect(updated.mediaLinks).toEqual([{ url: "https://example.com/photo", label: "Photo" }]);
    expect(updated.linkedKeys).toContain(page.id);
    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(3);
    expect(events.filter((event) => event.type === EVENT_TYPES.trickyOn)).toHaveLength(1);
  });

  it("resolves existing dictionary links and reports unresolved ones in Más", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const entry = await createItem(newPage({
      body: "Palabras de hoy.",
      pageDate: "2026-08-03",
      linkedKeys: [CASA, "dict:missing:entry"],
    }));
    const props = propsFor(entry, [entry]);
    render(<JournalReader {...props} />);

    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^casa/ }));
    expect(props.onOpen).toHaveBeenCalledWith(CASA);
    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    expect(await screen.findByText("No longer in the dictionary. Your notes are untouched.")).toBeTruthy();
  });

  it("requires a second tap before deleting the entry", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({ body: "Disposable fixture.", pageDate: "2026-08-03" }));
    const props = propsFor(entry, [entry]);
    render(<JournalReader {...props} />);

    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    await user.click(screen.getByRole("button", { name: "Delete journal entry" }));
    expect(await getItem(entry.id)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tap again to confirm" }));

    await waitFor(async () => expect(await getItem(entry.id)).toBeUndefined());
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.delete)).toHaveLength(1);
  });
});
