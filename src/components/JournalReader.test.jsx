// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JournalReader from "./JournalReader.jsx";
import { clearAllPersonalData, db, setPref } from "../db/db.js";
import { AI_ENABLED_PREF, AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { allItems, createItem, getItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES } from "../test/dictFixture.js";
import { newMeaning } from "../lib/meanings.js";
import { journalDateLabel } from "./JournalHome.jsx";

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

async function seedDictionary(previousIds = {}) {
  const reference = refDb("a");
  const entry = FIXTURE_ENTRIES.find((candidate) => candidate.id === CASA);
  await reference.entries.put(entry);
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: { datasetVersion: "journal-reader-fixture", counts: { entries: 1 }, previousIds },
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
      body: "Hoy me levanté temprano.\n\n<br>\n\nTuve más energía.",
      pageDate: "2026-08-03",
      tags: ["rutina"],
      linkedKeys: [word.id, page.id, related.id],
    }));
    const props = propsFor(entry, await allItems());
    const { container } = render(<JournalReader {...props} />);

    expect(screen.getByRole("heading", { name: "Morning reflection" })).toBeTruthy();
    expect(screen.getByText(/Hoy me levanté temprano/)).toBeTruthy();
    expect(container.querySelectorAll(".note-blank-line")).toHaveLength(1);
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

  it("confirms a Diario prose mention without silently linking it", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "casa", dictKey: null }));
    const entry = await createItem(newPage({ body: "Hoy limpié la casa.", pageDate: "2026-08-03" }));
    const props = propsFor(entry, await allItems());
    render(<JournalReader {...props} />);

    expect((await getItem(entry.id)).linkedKeys).toEqual([]);
    await user.click(await screen.findByRole("button", { name: "Mentioned here · 1" }));
    await user.click(screen.getByRole("button", { name: "Add mentioned vocabulary casa" }));
    await waitFor(async () => expect(await getItem(entry.id)).toMatchObject({
      linkedKeys: [word.id],
      linkAnnotations: [{ targetKey: word.id, type: "found_in", subject: "target", note: "" }],
    }));
    expect(props.onChanged).toHaveBeenCalled();
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
    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "often_confused:owner");
    await user.click(screen.getByRole("button", { name: "Link sobremesa" }));

    await waitFor(async () => expect((await getItem(entry.id)).linkedKeys).toContain(word.id));
    expect((await getItem(entry.id)).linkAnnotations).toEqual([{
      targetKey: word.id,
      type: "often_confused",
      subject: "owner",
      note: "",
    }]);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
    expect((await getItem(entry.id)).linkedKeys).not.toContain(page.id);
    expect((await getItem(entry.id)).linkedKeys).not.toContain(otherJournal.id);
  });

  it("groups every Journal section by relationship and edits a connection inline", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({
      term: "ser",
      meanings: [newMeaning({ gloss: "to be" })],
    }));
    const page = await createItem(newPage({ title: "Grammar notes", body: "A durable explanation." }));
    const moment = await createItem(newPage({
      title: "Earlier contrast",
      body: "A different day.",
      pageDate: "2026-08-01",
    }));
    const entry = await createItem(newPage({
      body: "Hoy pensé en estas conexiones.",
      pageDate: "2026-08-03",
      linkedKeys: [word.id, page.id, moment.id],
      linkAnnotations: [
        {
          targetKey: word.id,
          type: "often_confused",
          subject: "owner",
          note: "Compare this with estar.",
        },
        {
          targetKey: page.id,
          type: "explained_by",
          subject: "owner",
          note: "The rule lives here.",
        },
        {
          targetKey: moment.id,
          type: "contrast",
          subject: "owner",
          note: "My view changed.",
        },
      ],
    }));
    render(<JournalReader {...propsFor(entry, await allItems())} />);

    const vocabulary = screen.getByRole("region", { name: "Journal vocabulary" });
    expect(within(vocabulary).getByText("Often confused")).toBeTruthy();
    expect(within(vocabulary).getByText("Compare this with estar.")).toBeTruthy();
    const moments = screen.getByRole("region", { name: "Related journal moments" });
    expect(within(moments).getByText("Contrast")).toBeTruthy();
    expect(within(moments).getByText("My view changed.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    expect(screen.getByText("Explained by")).toBeTruthy();
    expect(screen.getByText("The rule lives here.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit connection to Grammar notes" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "found_in:target");
    const note = screen.getByRole("textbox", { name: "Connection note" });
    await user.clear(note);
    await user.type(note, "This page contains the example.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () => expect((await getItem(entry.id)).linkAnnotations).toContainEqual({
      targetKey: page.id,
      type: "found_in",
      subject: "target",
      note: "This page contains the example.",
    }));
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
      linkAnnotations: [{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the house lesson.",
      }],
    }));
    const props = propsFor(entry, [entry]);
    render(<JournalReader {...props} />);

    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();
    expect(screen.getByText("Found in")).toBeTruthy();
    expect(screen.getByText("Vocabulary from the house lesson.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit connection to casa" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^casa/ }));
    expect(props.onOpen).toHaveBeenCalledWith(CASA);
    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    expect(await screen.findByText("No longer in the dictionary. Your notes are untouched.")).toBeTruthy();
  });

  it("offers the personal-twin merge inside Más, never in the reader body", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const twin = await createItem(newLexical({ term: "casa", dictKey: CASA }));
    const entry = await createItem(newPage({
      body: "Palabras de hoy.",
      pageDate: "2026-08-03",
      linkedKeys: [CASA],
    }));
    render(<JournalReader {...propsFor(entry, [entry, twin])} />);

    // The reader body renders its vocabulary card without the offer.
    expect(await screen.findByRole("button", { name: /^casa/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Point this link at/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    const offer = await screen.findByRole("button", { name: /Point this link at “casa”/ });
    await user.click(offer);

    await waitFor(async () => {
      expect((await getItem(entry.id)).linkedKeys).toEqual([twin.id]);
    });
  });

  it("renders preserved alias metadata immediately without waiting for refreshed entry props", async () => {
    const user = userEvent.setup();
    const oldCasa = "dict:wiktionary-es:casa:old";
    await seedDictionary({ [oldCasa]: CASA });
    const entry = await createItem(newPage({
      body: "Una fuente con alias.",
      pageDate: "2026-08-03",
      linkedKeys: [oldCasa, CASA],
      linkAnnotations: [{
        targetKey: oldCasa,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the aliased source.",
      }],
    }));
    // propsFor intentionally never reloads entry: this pins the render between the atomic DB
    // rewrite and the parent notebook refresh, where stale derivation used to show Related/blank.
    render(<JournalReader {...propsFor(entry, [entry])} />);

    expect(await screen.findByText("Found in")).toBeTruthy();
    expect(screen.getByText("Vocabulary from the aliased source.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit connection to casa" }));
    expect(screen.getByRole("combobox", { name: "Relationship" }).value).toBe("found_in:owner");
    expect(screen.getByRole("textbox", { name: "Connection note" }).value)
      .toBe("Vocabulary from the aliased source.");

    await waitFor(async () => {
      expect((await getItem(entry.id)).linkAnnotations).toEqual([{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the aliased source.",
      }]);
    });
  });

  it("surfaces unresolved dictionary alias descriptions in Más and keeps the chosen one", async () => {
    const user = userEvent.setup();
    const oldCasa = "dict:wiktionary-es:casa:old";
    await seedDictionary({ [oldCasa]: CASA });
    const entry = await createItem(newPage({
      body: "Dos descripciones antiguas.",
      pageDate: "2026-08-03",
      linkedKeys: [oldCasa, CASA],
      linkAnnotations: [
        {
          targetKey: oldCasa,
          type: "contrast",
          subject: "owner",
          note: "Keep the old comparison.",
        },
        {
          targetKey: CASA,
          type: "variant",
          subject: "owner",
          note: "Keep the canonical variant.",
        },
      ],
    }));
    const props = propsFor(entry, [entry]);
    render(<JournalReader {...props} />);

    expect(await screen.findByText("1 dictionary connection needs resolution in Más.")).toBeTruthy();
    expect(screen.queryByText("No vocabulary connected yet.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "More journal tools" }));
    expect(await screen.findByRole("heading", { name: "Resolve dictionary connection" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^casa/ })).toBeNull();
    expect(screen.getAllByText("Keep the old comparison.")).toHaveLength(2);
    expect(screen.getAllByText("Keep the canonical variant.").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("radio", { name: `Use Variant from ${CASA}` }));
    await user.click(screen.getByRole("button", { name: "Resolve connection" }));

    await waitFor(async () => {
      const stored = await getItem(entry.id);
      expect(stored.linkedKeys).toEqual([CASA]);
      expect(stored.linkAnnotations).toEqual([{
        targetKey: CASA,
        type: "variant",
        subject: "owner",
        note: "Keep the canonical variant.",
      }]);
    });
    expect(props.onChanged).toHaveBeenCalled();
  });

  it("keeps body-first identity and a human date for an untitled related moment", async () => {
    const moment = await createItem(newPage({
      body: "The bus finally arrived\nA second line should not become a duplicate preview.",
      pageDate: "2025-01-02",
    }));
    const entry = await createItem(newPage({
      body: "Waiting today.",
      pageDate: "2026-08-03",
      linkedKeys: [moment.id],
      linkAnnotations: [{
        targetKey: moment.id,
        type: "contrast",
        subject: "owner",
        note: "",
      }],
    }));
    render(<JournalReader {...propsFor(entry, [entry, moment])} />);

    const date = journalDateLabel(moment.pageDate);
    expect(screen.getByText("The bus finally arrived")).toBeTruthy();
    expect(screen.getByText(date)).toBeTruthy();
    expect(screen.queryByText("Untitled page")).toBeNull();
    expect(screen.queryByText(/second line should not become/i)).toBeNull();
    expect(screen.getByRole("button", {
      name: `Edit connection to The bus finally arrived from ${date}`,
    })).toBeTruthy();
  });

  it("offers no Feedback button until the AI feature is on with a key", async () => {
    const entry = await createItem(newPage({ body: "Hoy escribí un poco.", pageDate: "2026-08-03" }));
    render(<JournalReader {...propsFor(entry, [entry])} />);

    // The mount-time preference read has to settle before absence means anything.
    await waitFor(() => expect(screen.getByText(/Hoy escribí un poco/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Feedback/i })).toBeNull();

    // Enabled but keyless is what a restored backup leaves behind, and must not offer the button.
    await setPref(AI_ENABLED_PREF, true);
    cleanup();
    render(<JournalReader {...propsFor(entry, [entry])} />);
    await waitFor(() => expect(screen.getByText(/Hoy escribí un poco/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Feedback/i })).toBeNull();
  });

  it("keeps a stored review reachable and readable even when the AI feature is off", async () => {
    const user = userEvent.setup();
    const entry = await createItem(newPage({ body: "Hoy escribí un poco.", pageDate: "2026-08-03" }));
    const withFeedback = {
      ...entry,
      feedback: {
        verdict: "clear",
        summary: "Reads well.",
        items: [],
        reviewedAt: "2026-08-03T10:00:00.000Z",
        reviewedHash: "abc123",
      },
    };
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<JournalReader {...propsFor(withFeedback, [withFeedback])} />);

    await user.click(await screen.findByRole("button", { name: /Feedback/i }));

    expect(screen.getByText("Clear")).toBeTruthy();
    expect(screen.getByText(/Reads well/)).toBeTruthy();
    // No key means no request controls — only reading and removing what is already stored.
    expect(screen.queryByRole("button", { name: /Ask again/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Send and review/i })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("opens the feedback panel once the feature is on, disclosing what would be sent", async () => {
    const user = userEvent.setup();
    await setPref(AI_ENABLED_PREF, true);
    await setPref(AI_API_KEY_PREF, "sk-ant-owners-key");
    const entry = await createItem(newPage({ body: "Hoy escribí un poco.", pageDate: "2026-08-03" }));
    render(<JournalReader {...propsFor(entry, [entry])} />);

    const button = await screen.findByRole("button", { name: /Feedback/i });
    expect(button.getAttribute("aria-expanded")).toBe("false");

    await user.click(button);

    expect(screen.getByText(/nothing else from your notebook/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Send and review/i })).toBeTruthy();
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

    await waitFor(() => expect(props.onBack).toHaveBeenCalledTimes(1));
    expect(await getItem(entry.id)).toBeUndefined();
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.delete)).toHaveLength(1);
  });
});
