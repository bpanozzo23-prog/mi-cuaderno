// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Detail from "./Detail.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { newLexical, newPage, createItem, allItems, getItem, linkItems } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { newMeaning } from "../lib/meanings.js";

/**
 * The cross-cutting acceptance criterion for Phase 4: **linking never requires navigating
 * away from what the owner is doing.** That is not a claim a database test can make — it
 * lives in the component, where an unsaved draft either survives or does not.
 *
 * The concrete mechanism being pinned: Detail resets its body draft only when `item.id`
 * changes. Quick-create-and-link must therefore not navigate, remount or re-key the item
 * being edited. AddSheet navigates on create, which is right for AddSheet and exactly wrong
 * here — this test is what stops that pattern leaking in.
 */

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

/**
 * Mounts Detail the way Cuaderno does, and — like Cuaderno — re-reads items from the
 * database when the screen reports a change, keeping the same `item.id` throughout.
 */
function renderDetail(item, onOpen = vi.fn(), state, initialItems = [item]) {
  function Harness() {
    const [items, setItems] = useState(initialItems);
    const current = items.find((i) => i.id === item.id) || item;
    return (
      <Detail
        item={current}
        state={state}
        items={items}
        onBack={vi.fn()}
        onOpen={onOpen}
        onChanged={async () => setItems(await allItems())}
      />
    );
  }
  return render(<Harness />);
}

describe("labels shared by lexical items and pages", () => {
  it("describes a page view count as opens rather than lookups", async () => {
    const page = await createItem(newPage({ title: "Study source" }));

    renderDetail(page, vi.fn(), { views: 2, lastViewedAt: null, tricky: false });

    expect(screen.getByText("opened 2×")).toBeTruthy();
    expect(screen.queryByText(/lookups?/i)).toBeNull();
  });
});

describe("scan-first notes and page bodies", () => {
  it("reads a multiline note first, then cancels or explicitly saves without changing event rules", async () => {
    const user = userEvent.setup();
    const original = "Primera línea\nSegunda línea";
    const word = await createItem(newLexical({ term: "madrugar", notes: original }));

    renderDetail(word);

    const reading = screen.getByText(/Primera línea/);
    expect(reading.textContent).toBe(original);
    expect(reading.className).toContain("whitespace-pre-wrap");
    expect(reading.className).toContain("break-words");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Note" })).toBeNull());

    await user.click(screen.getByRole("button", { name: "Edit note" }));
    let editor = screen.getByRole("textbox", { name: "Note" });
    expect(editor.value).toBe(original);
    await user.clear(editor);
    await user.type(editor, "Discard me");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("textbox", { name: "Note" })).toBeNull();
    expect(screen.getByText(/Primera línea/).textContent).toBe(original);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Edit note" }));
    editor = screen.getByRole("textbox", { name: "Note" });
    await user.clear(editor);
    await user.type(editor, "  Nueva línea{enter}Otra línea  ");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(async () => {
      const saved = (await allItems()).find((candidate) => candidate.id === word.id);
      expect(saved.notes).toBe("  Nueva línea\nOtra línea  ");
    });
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Note" })).toBeNull());
    expect(screen.getByText(/Nueva línea/).textContent).toBe("  Nueva línea\nOtra línea  ");
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(1);
  });

  it("writes and saves a page body through the existing body field", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Study source", body: "Uno\nDos" }));

    renderDetail(page);

    expect(screen.getByText(/Uno/).textContent).toBe("Uno\nDos");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Page body" })).toBeNull());
    await user.click(screen.getByRole("button", { name: "Edit page" }));
    const editor = screen.getByRole("textbox", { name: "Page body" });
    await user.clear(editor);
    await user.type(editor, "Tres{enter}Cuatro");
    await user.click(screen.getByRole("button", { name: "Save page" }));

    await waitFor(async () => {
      const saved = (await allItems()).find((candidate) => candidate.id === page.id);
      expect(saved.body).toBe("Tres\nCuatro");
    });
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Page body" })).toBeNull());
    expect(screen.getByText(/Tres/).textContent).toBe("Tres\nCuatro");
  });

  it("keeps empty notes and pages compact until their explicit action", async () => {
    const word = await createItem(newLexical({ term: "vacío" }));
    const page = await createItem(newPage({ title: "Blank page" }));

    renderDetail(word);
    expect(screen.getByText("No notes yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add note" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Note" })).toBeNull();

    cleanup();
    renderDetail(page);
    expect(screen.getByText("This page is empty.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Write page" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Page body" })).toBeNull();
  });
});

describe("compact empty entry details", () => {
  it("combines all available empty actions into one phone-safe row", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "vacío" }));
    const collection = await createItem(newPage({
      title: "Useful vocabulary",
      pageProfile: "collection",
      collection: { groups: [] },
    }));

    renderDetail(word, vi.fn(), undefined, [word, collection]);

    const actions = screen.getByRole("group", { name: "Add entry details" });
    expect(actions.className).toContain("flex-nowrap");
    expect(within(actions).getAllByRole("button").map((button) => button.textContent.trim())).toEqual([
      "Example",
      "Media",
      "Collection",
    ]);
    expect(within(actions).getAllByRole("button").every((button) => button.className.includes("min-h-11"))).toBe(true);
    expect(screen.queryByText("General examples")).toBeNull();
    expect(screen.queryByText("Media links")).toBeNull();
    expect(screen.queryByText("Collections")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add an example" }));
    expect(screen.getByRole("button", { name: "Close example form" }).getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("example-composer")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Add entry details" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Close example form" }));
    expect(document.getElementById("example-composer")).toBeNull();
  });

  it("keeps saved sections full and groups only the remaining empty actions", async () => {
    const word = await createItem(newLexical({
      term: "madrugar",
      myExamples: [{ es: "Madrugo mucho.", en: "I get up early a lot." }],
    }));
    const collection = await createItem(newPage({
      title: "Useful vocabulary",
      pageProfile: "collection",
      collection: { groups: [] },
    }));

    renderDetail(word, vi.fn(), undefined, [word, collection]);

    expect(screen.getByText("General examples")).toBeTruthy();
    expect(screen.getByText("Madrugo mucho.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add an example" })).toBeTruthy();
    expect(screen.queryByText("Media links")).toBeNull();
    expect(screen.queryByText("Collections")).toBeNull();
    const actions = screen.getByRole("group", { name: "Add entry details" });
    expect(within(actions).getAllByRole("button").map((button) => button.textContent.trim())).toEqual([
      "Media",
      "Collection",
    ]);
  });

  it("does not offer Collection when no destination is available", async () => {
    const word = await createItem(newLexical({ term: "solo" }));

    renderDetail(word);

    const actions = screen.getByRole("group", { name: "Add entry details" });
    expect(within(actions).getAllByRole("button").map((button) => button.textContent.trim())).toEqual([
      "Example",
      "Media",
    ]);
    expect(screen.queryByRole("button", { name: "Add to Collection" })).toBeNull();
  });
});

describe("collapsed optional-field composers", () => {
  it("keeps saved rows visible and collapses each composer again after a valid add", async () => {
    const user = userEvent.setup();
    const word = await createItem(
      newLexical({
        term: "madrugar",
        myExamples: [{ es: "Madrugo mucho.", en: "I get up early a lot." }],
        mediaLinks: [{ url: "https://example.com/old", label: "Existing source" }],
      })
    );

    renderDetail(word);

    expect(screen.getByText("Madrugo mucho.")).toBeTruthy();
    expect(screen.getByText("Existing source")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Sentence in Spanish" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Media URL" })).toBeNull();

    const exampleDisclosure = screen.getByRole("button", { name: "Add an example" });
    expect(exampleDisclosure.getAttribute("aria-expanded")).toBe("false");
    await user.click(exampleDisclosure);
    expect(screen.getByRole("button", { name: "Close example form" }).getAttribute("aria-expanded")).toBe("true");
    await user.type(screen.getByRole("textbox", { name: "Sentence in Spanish" }), "  Me levanto temprano.  ");
    await user.type(screen.getByRole("textbox", { name: "English (optional)" }), "  I get up early.  ");
    await user.click(screen.getByRole("button", { name: "Add example" }));

    await waitFor(() => expect(screen.getByText("Me levanto temprano.")).toBeTruthy());
    expect(screen.queryByRole("textbox", { name: "Sentence in Spanish" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add an example" }).getAttribute("aria-expanded")).toBe("false");

    await user.click(screen.getByRole("button", { name: "Add a media link" }));
    expect(screen.getByRole("button", { name: "Close media form" }).getAttribute("aria-expanded")).toBe("true");
    await user.type(screen.getByRole("textbox", { name: "Media URL" }), "  https://example.com/new  ");
    await user.type(screen.getByRole("textbox", { name: "Media label" }), "  New source  ");
    await user.click(screen.getByRole("button", { name: "Add link" }));

    await waitFor(() => expect(screen.getByText("New source")).toBeTruthy());
    expect(screen.queryByRole("textbox", { name: "Media URL" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add a media link" }).getAttribute("aria-expanded")).toBe("false");

    const saved = (await allItems()).find((candidate) => candidate.id === word.id);
    expect(saved.myExamples.at(-1)).toEqual({ es: "Me levanto temprano.", en: "I get up early." });
    expect(saved.mediaLinks.at(-1)).toEqual({ url: "https://example.com/new", label: "New source" });
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(2);
  }, 10000);

  it("keeps invalid drafts open and lets Cancel discard them without writing", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "madrugar" }));

    renderDetail(word);

    await user.click(screen.getByRole("button", { name: "Add an example" }));
    await user.click(screen.getByRole("button", { name: "Add example" }));
    expect(screen.getByRole("textbox", { name: "Sentence in Spanish" })).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Sentence in Spanish" }), "Unsaved");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Add an example" }));
    expect(screen.getByRole("textbox", { name: "Sentence in Spanish" }).value).toBe("");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Add a media link" }));
    await user.type(screen.getByRole("textbox", { name: "Media URL" }), "HTTPS://example.com");
    await user.click(screen.getByRole("button", { name: "Add link" }));
    expect(screen.getByRole("textbox", { name: "Media URL" }).value).toBe("HTTPS://example.com");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    const saved = (await allItems()).find((candidate) => candidate.id === word.id);
    expect(saved.myExamples).toEqual([]);
    expect(saved.mediaLinks).toEqual([]);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("offers media but not personal examples on a page", async () => {
    const page = await createItem(
      newPage({ title: "Source", mediaLinks: [{ url: "https://example.com", label: "Article" }] })
    );

    renderDetail(page);

    expect(screen.getByText("Article")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a media link" })).toBeTruthy();
    expect(screen.queryByText("My examples")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add an example" })).toBeNull();
  });
});

describe("quick-create-and-link keeps the owner where they are", () => {
  it("warns about a homograph but still creates and links it without losing the draft", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Grammar notes" }));
    const existing = await createItem(
      newLexical({ term: "de repente", form: "phrase" })
    );
    const onOpen = vi.fn();

    renderDetail(page, onOpen, undefined, [page, existing]);

    await user.click(screen.getByRole("button", { name: "Write page" }));
    const body = screen.getByRole("textbox", { name: "Page body" });
    await user.type(body, "Un borrador que todavía no está guardado");

    await user.click(screen.getByText("link something"));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Relationship" }),
      "often_confused:owner"
    );
    await user.type(
      screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/),
      "DE   REPENTE"
    );
    expect(screen.getByRole("status").textContent).toMatch(/word or phrase/i);

    const create = screen.getByRole("button", {
      name: /Create phrase .*DE REPENTE.* and link it/,
    });
    expect(create.disabled).toBe(false);
    await user.click(create);

    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /^DE REPENTE/ }).length
      ).toBeGreaterThan(1)
    );

    expect(body.value).toBe("Un borrador que todavía no está guardado");
    expect(onOpen).not.toHaveBeenCalled();

    const items = await allItems();
    const source = items.find((item) => item.id === page.id);
    const created = items.find((item) => item.term === "DE   REPENTE");
    expect(created.form).toBe("phrase");
    expect(source.linkedKeys).toEqual([created.id]);
    expect(source.linkAnnotations).toEqual([{
      targetKey: created.id,
      type: "often_confused",
      subject: "owner",
      note: "",
    }]);
    expect(created.linkedKeys).toEqual([]);
    expect(existing.linkedKeys).toEqual([]);

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(3);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("creates, links, and leaves an unsaved draft untouched without navigating", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Preterite vs imperfect" }));
    const onOpen = vi.fn();

    renderDetail(page, onOpen);

    // Start writing, and do NOT save. This is the work that must survive.
    const draft = "El pretérito para acciones terminadas";
    await user.click(screen.getByRole("button", { name: "Write page" }));
    const body = screen.getByRole("textbox", { name: "Page body" });
    await user.type(body, draft);
    expect(body.value).toBe(draft);

    // Link something that does not exist yet.
    await user.click(screen.getByText("link something"));
    await user.type(screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/), "madrugar");
    await user.click(await screen.findByText(/Create word .*madrugar.* and link it/));

    /**
     * Wait for the RENDERED result, not for the row to appear in the database. Creating,
     * linking and reloading are three awaits inside one handler; a database assertion is
     * satisfied by the first of them and races past the rest, which made an earlier version
     * of this test pass even with a deliberate onOpen() call added to the handler. The new
     * link showing up in the Linked section means the whole handler ran.
     */
    await waitFor(() => expect(screen.getAllByText("madrugar").length).toBeGreaterThan(1));

    // The three things that make this requirement 2 rather than "a second Add button":
    expect(body.value).toBe(draft); // the draft survived
    expect(onOpen).not.toHaveBeenCalled(); // nothing navigated

    const items = await allItems();
    const saved = items.find((i) => i.id === page.id);
    const created = items.find((i) => i.term === "madrugar");
    expect(saved.linkedKeys).toContain(created.id); // and it really is linked
  });

  it("logs a create for the new item and no edit for the link", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Verbs" }));

    renderDetail(page);

    await user.click(screen.getByText("link something"));
    await user.type(screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/), "de repente");
    await user.click(await screen.findByText(/Create phrase .*de repente.* and link it/));

    await waitFor(async () => {
      expect((await allItems()).some((i) => i.term === "de repente")).toBe(true);
    });

    const events = await allEvents();
    // Content the owner made: two creates (the page, then the phrase). Linking is
    // bookkeeping and stays out of the feed — the Phase 1c rule, inherited by construction.
    expect(events.filter((e) => e.type === EVENT_TYPES.create)).toHaveLength(2);
    expect(events.filter((e) => e.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("makes a multi-word entry a phrase and a single word a word", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Notes" }));

    renderDetail(page);

    await user.click(screen.getByText("link something"));
    const input = screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/);
    await user.type(input, "de repente");
    await user.click(await screen.findByText(/Create phrase/));

    await waitFor(async () => {
      const made = (await allItems()).find((i) => i.term === "de repente");
      expect(made?.form).toBe("phrase");
    });

    await user.clear(input);
    await user.type(input, "madrugar");
    await user.click(await screen.findByText(/Create word/));

    await waitFor(async () => {
      const made = (await allItems()).find((i) => i.term === "madrugar");
      expect(made?.form).toBe("word");
    });
  });
});

describe("linking an existing item", () => {
  it("stores the link on this item only, and marks it linked in the picker", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "madrugar", meanings: [newMeaning({ gloss: "to get up early" })] }));
    const page = await createItem(newPage({ title: "Verbs" }));

    renderDetail(page);

    await user.click(screen.getByText("link something"));
    await user.click(await screen.findByText("madrugar"));

    await waitFor(async () => {
      const saved = (await allItems()).find((i) => i.id === page.id);
      expect(saved.linkedKeys).toEqual([word.id]);
    });

    // Stored once: the target keeps an empty linkedKeys, because it could as easily have
    // been a read-only dictionary entry (Phase 1c).
    const target = (await allItems()).find((i) => i.id === word.id);
    expect(target.linkedKeys).toEqual([]);

    expect((await screen.findAllByText("Related")).length).toBeGreaterThan(0);
  });

  it("edits a directional relationship from the backlink without moving either item", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "por" }));
    const page = await createItem(newPage({ title: "Grammar explanation" }));
    await linkItems(page.id, word.id, {
      type: "often_confused",
      subject: "owner",
      note: "Initial shared note",
    });
    const beforeWord = await getItem(word.id);
    const beforePage = await getItem(page.id);
    const baselineEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;

    // Open the target endpoint: the physical edge and annotation remain stored on the page.
    renderDetail(word, vi.fn(), undefined, await allItems());
    expect(screen.getByText("Often confused")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit connection to Grammar explanation" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "explained_by:target");
    const note = screen.getByRole("textbox", { name: "Connection note" });
    await user.clear(note);
    await user.type(note, "The word explains this grammar page");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () => {
      expect((await getItem(page.id)).linkAnnotations).toEqual([{
        targetKey: word.id,
        type: "explained_by",
        subject: "owner",
        note: "The word explains this grammar page",
      }]);
    });
    expect((await getItem(word.id)).linkedKeys).toEqual([]);
    expect((await getItem(word.id)).updatedAt).toBe(beforeWord.updatedAt);
    expect((await getItem(page.id)).updatedAt).toBe(beforePage.updatedAt);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(baselineEdits);
    expect(await screen.findByText("Explains")).toBeTruthy();
  });
});

describe("Phase 11: the per-item stats strip", () => {
  const strip = () => screen.getByText(/opened \d+×/).parentElement;

  function renderWithReview(item, reviewState) {
    return render(
      <Detail
        item={item}
        reviewState={reviewState}
        items={[item]}
        onBack={vi.fn()}
        onOpen={vi.fn()}
        onChanged={vi.fn()}
      />
    );
  }

  it("says when the word was added", async () => {
    const word = await createItem(newLexical({ term: "madrugar" }));
    renderWithReview(word, undefined);

    expect(strip().textContent).toMatch(/added \d{4}-\d{2}-\d{2}/);
  });

  it("says a word nothing has happened to is not in review", async () => {
    const word = await createItem(newLexical({ term: "madrugar" }));
    renderWithReview(word, undefined);

    expect(strip().textContent).toContain("not in review");
    expect(strip().textContent).not.toContain("box");
  });

  it("names the box a word is sitting in", async () => {
    const word = await createItem(newLexical({ term: "madrugar" }));
    renderWithReview(word, {
      enrolled: true,
      box: 3,
      graduated: false,
      dueDate: "2099-01-01",
      lastReviewedAt: null,
    });

    expect(strip().textContent).toContain("box 3");
    expect(strip().textContent).toContain("due 2099-01-01");
  });

  it("says retired rather than naming a box for a word that finished the ladder", async () => {
    const word = await createItem(newLexical({ term: "madrugar" }));
    renderWithReview(word, {
      enrolled: false,
      box: 5,
      graduated: true,
      dueDate: "2099-01-01",
      lastReviewedAt: null,
    });

    expect(strip().textContent).toContain("retired");
    expect(strip().textContent).not.toContain("box");
    // A retired word is not waiting for anything, so it carries no due date.
    expect(strip().textContent).not.toContain("due");
  });

  it("says due today rather than printing today's date", async () => {
    const word = await createItem(newLexical({ term: "madrugar" }));
    const { localDate } = await import("../lib/dates.js");
    renderWithReview(word, {
      enrolled: true,
      box: 1,
      graduated: false,
      dueDate: localDate(),
      lastReviewedAt: null,
    });

    expect(strip().textContent).toContain("due today");
  });

  it("says how long ago the word was last reviewed", async () => {
    const word = await createItem(newLexical({ term: "madrugar" }));
    renderWithReview(word, {
      enrolled: true,
      box: 2,
      graduated: false,
      dueDate: "2099-01-01",
      lastReviewedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    });

    expect(strip().textContent).toContain("reviewed 3d ago");
  });

  it("tells a page nothing about review, which pages do not have", async () => {
    const page = await createItem(newPage({ title: "Study source" }));
    renderWithReview(page, undefined);

    const text = document.body.textContent;
    expect(text).not.toContain("not in review");
    expect(text).not.toContain("box ");
  });
});
