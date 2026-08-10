// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSheet from "./AddSheet.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { allItems, createItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { newPageGroup } from "../lib/collections.js";
import {
  emptyGrammar,
  emptySource,
  newGrammarSection,
  newSourceCapture,
} from "../lib/pageKinds.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("AddSheet", () => {
  it("keeps journal creation in Diario rather than the Notes page form", () => {
    render(
      <AddSheet
        kind="page"
        items={[]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/date/i)).toBeNull();
    expect(screen.queryByText(/journal entry/i)).toBeNull();
    expect(screen.getByRole("textbox", { name: "Page overview" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add notes page" })).toBeTruthy();
  });

  it("warns for a cleaned lexical heading but still creates another with the chosen form", async () => {
    const user = userEvent.setup();
    const existing = await createItem(
      newLexical({ term: "buenos días", form: "phrase" })
    );
    const onCreated = vi.fn();

    render(
      <AddSheet
        kind="lexical"
        items={[existing]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText("Spanish word or phrase *"), "  BUENOS   DÍAS  ");
    expect(screen.getByRole("status").textContent).toMatch(/already in your cuaderno/i);

    // Word and phrase are the same lexical content type for the warning, but the owner still
    // controls the form of the new homograph.
    await user.click(screen.getByRole("button", { name: "word" }));
    const add = screen.getByRole("button", { name: "Add to cuaderno" });
    expect(add.disabled).toBe(false);
    await user.click(add);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const items = await allItems();
    const created = items.find((item) => item.id === onCreated.mock.calls[0][0]);
    expect(created.term).toBe("BUENOS   DÍAS");
    expect(created.form).toBe("word");
    expect(created.meanings).toEqual([]);
    expect(items).toHaveLength(2);

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(2);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("creates ordered meaning blocks with stable personal ids", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <AddSheet
        kind="lexical"
        items={[]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText("Spanish word or phrase *"), "sacar");
    await user.type(screen.getByRole("textbox", { name: "English gloss" }), "take out");
    await user.type(screen.getByRole("textbox", { name: "Spanish usage cue" }), "sacar la basura");
    await user.click(screen.getByRole("button", { name: "Add meaning" }));
    const glosses = screen.getAllByRole("textbox", { name: "English gloss" });
    await user.type(glosses[1], "withdraw");
    const cues = screen.getAllByRole("textbox", { name: "Spanish usage cue" });
    await user.type(cues[1], "sacar dinero");
    await user.click(screen.getByRole("button", { name: "Add to cuaderno" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const created = await db.items.get(onCreated.mock.calls[0][0]);
    expect(created.meanings.map((meaning) => meaning.gloss)).toEqual(["take out", "withdraw"]);
    expect(created.meanings.map((meaning) => meaning.usageCue)).toEqual(["sacar la basura", "sacar dinero"]);
    expect(created.meanings.every((meaning) => /^meaning:/.test(meaning.id))).toBe(true);
    expect(created).not.toHaveProperty("translation");
  });

  it("warns pages only for page titles, not lexical or accent-distinct headings", async () => {
    const user = userEvent.setup();
    const lexicalRoma = await createItem(newLexical({ term: "Roma" }));
    const accentedPage = await createItem(newPage({ title: "sí" }));

    render(
      <AddSheet
        kind="page"
        items={[lexicalRoma, accentedPage]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    const title = screen.getByPlaceholderText("Title *");
    await user.type(title, "roma");
    expect(screen.queryByRole("status")).toBeNull();

    await user.clear(title);
    await user.type(title, "si");
    expect(screen.queryByRole("status")).toBeNull();

    await user.clear(title);
    await user.type(title, " SÍ ");
    expect(screen.getByRole("status").textContent).toMatch(/page with this title/i);
    expect(screen.getByRole("button", { name: "Add notes page" }).disabled).toBe(false);
  });

  it("creates a Vocabulary page from editable group seeds without persisting recipe identity", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageFocus: "vocabulary",
          collectionEnabled: true,
          sourceEnabled: false,
          grammarEnabled: false,
          groupNames: ["Questions", "Answers", "Reactions and follow-ups"],
          sectionNames: [],
          sourceFormat: "",
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "Conversation tools");
    const firstGroup = screen.getByRole("textbox", { name: "Group 1 name" });
    await user.clear(firstGroup);
    await user.type(firstGroup, "  Prompts  ");
    await user.click(screen.getByRole("button", { name: "Add vocabulary page" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const created = await db.items.get(onCreated.mock.calls[0][0]);
    expect(created.pageFocus).toBe("vocabulary");
    expect(created).not.toHaveProperty("pageProfile");
    expect(created.pageDate).toBeNull();
    expect(created.collection.enabled).toBe(true);
    expect(created.collection.groups.map((group) => group.name)).toEqual([
      "Prompts",
      "Answers",
      "Reactions and follow-ups",
    ]);
    expect(created.collection.groups.every((group) => /^page-group:[0-9a-f-]+$/i.test(group.id))).toBe(true);
    expect(created.collection.groups.every((group) => group.itemKeys.length === 0)).toBe(true);
    expect(created.source.enabled).toBe(false);
    expect(created.grammar.enabled).toBe(false);
    expect(created).not.toHaveProperty("recipeId");
    expect(created).not.toHaveProperty("templateId");

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(1);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("blocks blank or Unicode-normalized duplicate Vocabulary group names", async () => {
    const user = userEvent.setup();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageFocus: "vocabulary",
          collectionEnabled: true,
          sourceEnabled: false,
          grammarEnabled: false,
          groupNames: ["Neutral", "Ｎｅｕｔｒａｌ"],
          sectionNames: [],
          sourceFormat: "",
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "Register");
    expect(screen.getByRole("button", { name: "Add vocabulary page" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/unique|duplicate/i);

    const second = screen.getByRole("textbox", { name: "Group 2 name" });
    await user.clear(second);
    expect(screen.getByRole("button", { name: "Add vocabulary page" }).disabled).toBe(true);
    await user.type(second, "Formal");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Add vocabulary page" }).disabled).toBe(false);
  });

  it("creates an audio Source notebook with optional identity fields and Vocabulary enabled", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageFocus: "source",
          collectionEnabled: true,
          sourceEnabled: true,
          grammarEnabled: false,
          groupNames: [],
          sectionNames: [],
          sourceFormat: "audio",
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "Radio Ambulante — La noche más larga");
    expect(screen.getByLabelText("Format").value).toBe("audio");
    await user.type(screen.getByLabelText("Creator"), "Radio Ambulante");
    await user.type(screen.getByLabelText("Scope"), "Episode 241");
    await user.type(screen.getByLabelText("Primary URL"), "https://example.com/episode");
    await user.type(screen.getByLabelText("Source context"), "Recommended in class");
    await user.click(screen.getByRole("button", { name: "Add group" }));
    await user.type(screen.getByRole("textbox", { name: "Group 1 name" }), "Useful expressions");
    await user.click(screen.getByRole("button", { name: "Add Source notebook" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const created = await db.items.get(onCreated.mock.calls[0][0]);
    expect(created).toMatchObject({
      pageFocus: "source",
      collection: { enabled: true },
      source: {
        enabled: true,
        format: "audio",
        creator: "Radio Ambulante",
        scope: "Episode 241",
        url: "https://example.com/episode",
        context: "Recommended in class",
        captures: [],
      },
      grammar: { enabled: false },
    });
    expect(created.collection.groups.map(({ name }) => name)).toEqual(["Useful expressions"]);
    expect(created.collection.groups[0].id).toMatch(/^page-group:/);
    expect(created).not.toHaveProperty("recipeId");
  });

  it("validates a Source primary URL before creation", async () => {
    const user = userEvent.setup();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageFocus: "source",
          collectionEnabled: true,
          sourceEnabled: true,
          grammarEnabled: false,
          groupNames: [],
          sectionNames: [],
          sourceFormat: "book",
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "A book");
    await user.type(screen.getByLabelText("Primary URL"), "https://");
    expect(screen.getByRole("alert").textContent).toMatch(/valid http:\/\/ or https:\/\/ URL/i);
    expect(screen.getByRole("button", { name: "Add Source notebook" }).disabled).toBe(true);
  });

  it("creates a Grammar guide from editable, unique seeded section names", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageFocus: "grammar",
          collectionEnabled: true,
          sourceEnabled: false,
          grammarEnabled: true,
          groupNames: [],
          sectionNames: ["Form A", "Form B", "Choosing between them"],
          sourceFormat: "",
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "Preterite vs imperfect");
    await user.type(screen.getByLabelText(/Key idea/i), "Completed event or ongoing background?");
    const firstSection = screen.getByRole("textbox", { name: "Grammar section 1 name" });
    await user.clear(firstSection);
    await user.type(firstSection, "Preterite");
    await user.click(screen.getByRole("button", { name: "Add Grammar guide" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const created = await db.items.get(onCreated.mock.calls[0][0]);
    expect(created.pageFocus).toBe("grammar");
    expect(created.collection.enabled).toBe(true);
    expect(created.grammar.enabled).toBe(true);
    expect(created.grammar.keyIdea).toBe("Completed event or ongoing background?");
    expect(created.grammar.sections.map(({ name }) => name)).toEqual([
      "Preterite",
      "Form B",
      "Choosing between them",
    ]);
    expect(created.grammar.sections.every(({ id }) => /^grammar-section:/.test(id))).toBe(true);
    expect(created.grammar.sections.every(({ parentId }) => parentId === null)).toBe(true);
    expect(created.grammar.sections.every(({ examples }) => examples.length === 0)).toBe(true);
    expect(created.source.enabled).toBe(false);
  });

  it("blocks Unicode-normalized duplicate Grammar section names", async () => {
    const user = userEvent.setup();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageFocus: "grammar",
          collectionEnabled: true,
          sourceEnabled: false,
          grammarEnabled: true,
          groupNames: [],
          sectionNames: ["Use", "Ｕｓｅ"],
          sourceFormat: "",
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "Uses");
    expect(screen.getByRole("button", { name: "Add Grammar guide" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/unique/i);
  });

  it("copies only the approved empty structure with fresh nested IDs", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const originalGroup = newPageGroup("Softening");
    const originalSection = newGrammarSection({
      name: "Formation",
      explanation: "Do not copy this explanation",
    });
    const original = await createItem(newPage({
      title: "Original guide",
      body: "Do not copy these notes",
      pageDate: "2026-08-01",
      pageFocus: "grammar",
      collection: { enabled: true, groups: [originalGroup] },
      source: emptySource({
        enabled: true,
        format: "book",
        creator: "Do not copy",
        captures: [newSourceCapture({ text: "Do not copy this capture" })],
      }),
      grammar: emptyGrammar({
        enabled: true,
        keyIdea: "Do not copy",
        sections: [originalSection],
      }),
      tags: ["private"],
    }));
    render(
      <AddSheet
        kind="page"
        pageStarter={{ copySourcePageId: original.id }}
        items={[original]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    );

    expect(screen.queryByRole("textbox", { name: "Page overview" })).toBeNull();
    await user.type(screen.getByPlaceholderText("Title *"), "Reusable guide");
    await user.click(screen.getByRole("button", { name: "Copy page" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const copy = await db.items.get(onCreated.mock.calls[0][0]);
    expect(copy).toMatchObject({
      title: "Reusable guide",
      body: "",
      pageDate: null,
      pageFocus: "grammar",
      tags: [],
      linkedKeys: [],
      collection: { enabled: true },
      source: { enabled: true, creator: "", captures: [] },
      grammar: { enabled: true, keyIdea: "" },
    });
    expect(copy.collection.groups.map(({ name }) => name)).toEqual(["Softening"]);
    expect(copy.collection.groups[0].id).not.toBe(originalGroup.id);
    expect(copy.grammar.sections.map(({ name }) => name)).toEqual(["Formation"]);
    expect(copy.grammar.sections[0].id).not.toBe(originalSection.id);
    expect(copy.grammar.sections[0].explanation).toBe("");

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(2);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });
});
