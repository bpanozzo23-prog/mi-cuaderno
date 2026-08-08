// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Detail from "./Detail.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allItems, createItem, getItem, newLexical, newPage, updateItem } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { newMeaning } from "../lib/meanings.js";
import { newPageGroupKey } from "../lib/ids.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

function renderDetail(opened, initialItems, onOpen = vi.fn()) {
  function Harness() {
    const [items, setItems] = useState(initialItems);
    const current = items.find((item) => item.id === opened.id) || opened;
    return (
      <Detail
        item={current}
        state={{ views: 0, lastViewedAt: null, tricky: false }}
        items={items}
        onBack={vi.fn()}
        onOpen={onOpen}
        onChanged={async () => setItems(await allItems())}
        pagePinned={false}
        onPagePinnedChange={vi.fn()}
      />
    );
  }
  return render(<Harness />);
}

async function collectionFixture() {
  const ask = await createItem(newLexical({
    term: "¿Qué opinas?",
    form: "phrase",
    meanings: [newMeaning({ gloss: "What do you think?", usageCue: "asking for an opinion", usageLabels: ["informal"] })],
    notes: "Useful with friends.",
    myExamples: [{ es: "¿Qué opinas de la película?", en: "What do you think of the movie?" }],
  }));
  const seem = await createItem(newLexical({
    term: "¿Cómo te parece?",
    form: "phrase",
    meanings: [newMeaning({ gloss: "How does it seem to you?" })],
  }));
  const missing = await createItem(newLexical({ term: "pensándolo bien", form: "phrase" }));
  const relatedPage = await createItem(newPage({ title: "Conversation notes" }));
  const groupId = newPageGroupKey();
  const page = await createItem(newPage({
    title: "Thinking and opinions",
    body: "Ways to ask for and respond to opinions.",
    pageProfile: "collection",
    linkedKeys: [ask.id, seem.id, missing.id, relatedPage.id],
    collection: {
      groups: [
        { id: groupId, name: "Questions", itemKeys: [ask.id, seem.id] },
        { id: newPageGroupKey(), name: "Responses", itemKeys: [] },
      ],
    },
  }));
  return { page, ask, seem, missing, relatedPage, groupId };
}

describe("Collection reading and practice", () => {
  it("keeps incoming lexical connections manageable but routes new vocabulary through Add vocabulary", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({
      title: "Sources",
      pageProfile: "collection",
      collection: { groups: [] },
    }));
    const incoming = await createItem(newLexical({
      term: "legacy word",
      linkedKeys: [page.id],
      linkAnnotations: [{
        targetKey: page.id,
        type: "contrast",
        subject: "owner",
        note: "An older incoming connection",
      }],
    }));
    await createItem(newLexical({ term: "outside word" }));

    renderDetail(page, await allItems());

    expect(screen.getByText("Connections")).toBeTruthy();
    expect(screen.getByText("Contrast")).toBeTruthy();
    expect(screen.getByText("An older incoming connection")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit connection to legacy word" })).toBeTruthy();

    await user.click(screen.getByText("link something related"));
    await user.type(
      screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/),
      "outside word"
    );
    expect(screen.queryByRole("button", { name: /^outside word/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Create word .*outside word/i })).toBeNull();
    expect(screen.getByText(/Use the \+ Vocabulary action/)).toBeTruthy();
    expect((await getItem(incoming.id)).linkedKeys).toEqual([page.id]);
  });

  it("leads with grouped vocabulary, keeps empty groups useful, expands several cards, and separates Related", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    renderDetail(fixture.page, await allItems());

    expect(screen.getByText("Vocabulary collection")).toBeTruthy();
    expect(screen.getByText("3 items · 2 groups")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Questions" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Responses" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand group Responses" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("heading", { name: "Not grouped yet" })).toBeTruthy();
    expect(screen.getByText("Conversation notes")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /¿Qué opinas\?.*What do you think/i }));
    await user.click(screen.getByRole("button", { name: /¿Cómo te parece\?.*How does it seem/i }));
    expect(screen.getAllByRole("button", { name: "Open full entry" })).toHaveLength(2);
    expect(screen.getByText("¿Qué opinas de la película?")).toBeTruthy();
    expect(screen.getByText("Useful with friends.")).toBeTruthy();
  });

  it("collapses and expands each vocabulary group independently", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    renderDetail(fixture.page, await allItems());

    const questions = screen.getByRole("heading", { name: "Questions" }).closest("section");
    const ungrouped = screen.getByRole("heading", { name: "Not grouped yet" }).closest("section");
    const questionsToggle = within(questions).getByRole("button", { name: "Collapse group Questions" });
    const ungroupedToggle = within(ungrouped).getByRole("button", { name: "Collapse group Not grouped yet" });

    expect(questionsToggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Expand group Responses" }).getAttribute("aria-expanded")).toBe("false");
    expect(within(questions).getByRole("button", { name: /¿Qué opinas\?.*What do you think/i })).toBeTruthy();
    expect(within(ungrouped).getByRole("button", { name: /pensándolo bien/i })).toBeTruthy();

    await user.click(questionsToggle);
    expect(within(questions).getByRole("button", { name: "Expand group Questions" }).getAttribute("aria-expanded")).toBe("false");
    expect(within(questions).queryByRole("button", { name: /¿Qué opinas\?.*What do you think/i })).toBeNull();
    expect(within(questions).getByText("2 items")).toBeTruthy();
    await user.click(within(questions).getByRole("button", { name: "Add vocabulary" }));
    expect(within(questions).getByRole("button", { name: "Collapse group Questions" })).toBeTruthy();
    expect(within(questions).getByText("Adding to Questions")).toBeTruthy();
    await user.click(within(questions).getByRole("button", { name: "Cancel adding vocabulary" }));
    await user.click(within(questions).getByRole("button", { name: "Collapse group Questions" }));
    expect(within(ungrouped).getByRole("button", { name: /pensándolo bien/i })).toBeTruthy();

    await user.click(ungroupedToggle);
    expect(within(ungrouped).queryByRole("button", { name: /pensándolo bien/i })).toBeNull();

    await user.click(within(questions).getByRole("button", { name: "Expand group Questions" }));
    expect(within(questions).getByRole("button", { name: /¿Qué opinas\?.*What do you think/i })).toBeTruthy();
  });

  it("reveals answers locally, leaves missing meanings disabled, and writes no Practice events", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    renderDetail(fixture.page, await allItems());

    await waitFor(async () => {
      expect((await allEvents()).some((event) => event.type === EVENT_TYPES.view)).toBe(true);
    });
    const before = await allEvents();

    const practice = screen.getByRole("button", { name: "Practice" });
    const organize = screen.getByRole("button", { name: "Organize" });
    expect(practice.textContent).toBe("");
    expect(organize.textContent).toBe("");
    await user.click(practice);
    expect(screen.getByText("Practice collection")).toBeTruthy();
    expect(screen.getByText("Add a meaning before practicing this entry.")).toBeTruthy();
    const reveals = screen.getAllByRole("button", { name: "Reveal" });
    await user.click(reveals[0]);
    expect(screen.getByText("asking for an opinion")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(await allEvents()).toEqual(before);
  });
});

describe("Collection organization and capture", () => {
  it("discards an organizer draft, then saves one coherent rename", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    renderDetail(fixture.page, await allItems());

    await user.click(screen.getByRole("button", { name: "Organize" }));
    const name = screen.getByRole("textbox", { name: "Group 1 name" });
    await user.clear(name);
    await user.type(name, "Asking opinions");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect((await getItem(fixture.page.id)).collection.groups[0].name).toBe("Questions");

    await user.click(screen.getByRole("button", { name: "Organize" }));
    const secondDraft = screen.getByRole("textbox", { name: "Group 1 name" });
    await user.clear(secondDraft);
    await user.type(secondDraft, "Asking opinions");
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    await waitFor(async () => {
      expect((await getItem(fixture.page.id)).collection.groups[0].name).toBe("Asking opinions");
    });
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(1);
  });

  it("promotes an incoming backlink into one page-owned Collection membership", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({
      title: "Travel",
      pageProfile: "collection",
      collection: { groups: [{ id: newPageGroupKey(), name: "Essentials", itemKeys: [] }] },
    }));
    const phrase = await createItem(newLexical({ term: "¿Dónde queda?", form: "phrase" }));
    await updateItem(phrase.id, { linkedKeys: [page.id] }, { logEdit: false });
    const baselineEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;
    renderDetail(page, await allItems());

    await user.click(screen.getByRole("button", { name: "Expand Vocabulary section" }));
    const essentials = screen.getByRole("heading", { name: "Essentials" }).closest("section");
    await user.click(within(essentials).getByRole("button", { name: "Add vocabulary" }));
    const search = screen.getByPlaceholderText(/Search words, phrases, or the dictionary/);
    await user.type(search, "Dónde queda");
    const candidates = await screen.findAllByRole("button", { name: /¿Dónde queda\?/ });
    await user.click(candidates.find((candidate) => candidate.hasAttribute("aria-pressed")));
    await user.click(screen.getByRole("button", { name: "Add 1" }));

    await waitFor(async () => {
      expect((await getItem(page.id)).linkedKeys).toEqual([phrase.id]);
    });
    expect((await getItem(phrase.id)).linkedKeys).toEqual([]);
    expect((await getItem(page.id)).collection.groups[0].itemKeys).toEqual([phrase.id]);
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(baselineEdits);
  });

  it("keeps a multi-selection across searches and disables existing members with their group", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    const first = await createItem(newLexical({
      term: "me parece bien",
      form: "phrase",
      meanings: [newMeaning({ gloss: "sounds good to me" })],
    }));
    const second = await createItem(newLexical({
      term: "no estoy seguro",
      form: "phrase",
      meanings: [newMeaning({ gloss: "I'm not sure" })],
    }));
    renderDetail(fixture.page, await allItems());

    const responses = screen.getByRole("heading", { name: "Responses" }).closest("section");
    await user.click(within(responses).getByRole("button", { name: "Add vocabulary" }));
    const search = screen.getByPlaceholderText(/Search words, phrases, or the dictionary/);

    await user.type(search, "Qué opinas");
    expect(screen.getByRole("button", { name: /¿Qué opinas\?.*already in Questions/i }).disabled).toBe(true);

    await user.clear(search);
    await user.type(search, "me parece bien");
    const firstRows = screen.getAllByRole("button", { name: /me parece bien/i });
    await user.click(firstRows.find((row) => row.hasAttribute("aria-pressed")));

    await user.clear(search);
    await user.type(search, "no estoy seguro");
    const secondRows = screen.getAllByRole("button", { name: /no estoy seguro/i });
    await user.click(secondRows.find((row) => row.hasAttribute("aria-pressed")));

    expect(screen.getByLabelText("Selected vocabulary").textContent).toContain("me parece bien");
    expect(screen.getByLabelText("Selected vocabulary").textContent).toContain("no estoy seguro");
    await user.click(screen.getByRole("button", { name: "Add 2" }));

    await waitFor(async () => {
      expect((await getItem(fixture.page.id)).collection.groups[1].itemKeys).toEqual([first.id, second.id]);
    });
  });

  it("bulk-adds every available phrase with a chosen tag to one Collection group", async () => {
    const user = userEvent.setup();
    const groupId = newPageGroupKey();
    const alreadyPlaced = await createItem(newLexical({
      term: "buen viaje",
      form: "phrase",
      tags: ["travel"],
    }));
    const first = await createItem(newLexical({
      term: "¿Dónde queda?",
      form: "phrase",
      tags: ["travel"],
    }));
    const second = await createItem(newLexical({
      term: "ida y vuelta",
      form: "phrase",
      tags: ["travel", "tickets"],
    }));
    await createItem(newLexical({ term: "por supuesto", form: "phrase", tags: ["conversation"] }));
    await createItem(newLexical({ term: "maleta", form: "word", tags: ["travel"] }));
    const page = await createItem(newPage({
      title: "Travel phrases",
      pageProfile: "collection",
      linkedKeys: [alreadyPlaced.id],
      collection: {
        groups: [{ id: groupId, name: "Useful phrases", itemKeys: [alreadyPlaced.id] }],
      },
    }));
    renderDetail(page, await allItems());

    const group = screen.getByRole("heading", { name: "Useful phrases" }).closest("section");
    await user.click(within(group).getByRole("button", { name: "Add vocabulary" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Vocabulary form" }), "phrase");
    await user.selectOptions(screen.getByRole("combobox", { name: "Vocabulary tag" }), "travel");

    expect(screen.getByText("3 matching · 2 available")).toBeTruthy();
    expect(screen.getByRole("button", { name: /buen viaje.*already in Useful phrases/i }).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Select all 2" }));
    expect(screen.getByLabelText("Selected vocabulary").textContent).toContain("¿Dónde queda?");
    expect(screen.getByLabelText("Selected vocabulary").textContent).toContain("ida y vuelta");
    expect(screen.getByLabelText("Selected vocabulary").textContent).not.toContain("maleta");
    await user.click(screen.getByRole("button", { name: "Add 2" }));

    await waitFor(async () => {
      const stored = await getItem(page.id);
      expect(stored.linkedKeys).toEqual([alreadyPlaced.id, second.id, first.id]);
      expect(stored.collection.groups[0].itemKeys).toEqual([alreadyPlaced.id, second.id, first.id]);
    });
  });

  it("moves, reorders, deletes a populated group, and removes membership only on Save", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    const beforeEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;
    renderDetail(fixture.page, await allItems());

    await user.click(screen.getByRole("button", { name: "Organize" }));
    await user.click(screen.getByRole("button", { name: "Delete group Questions" }));
    await user.click(screen.getByRole("button", { name: "Move pensándolo bien down" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Move ¿Qué opinas? to" }), "Responses");
    await user.click(screen.getByRole("button", { name: "Remove ¿Cómo te parece? from collection" }));
    await user.click(screen.getByRole("button", { name: "Remove and clear references" }));
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    await waitFor(async () => {
      const stored = await getItem(fixture.page.id);
      expect(stored.collection.groups).toEqual([
        expect.objectContaining({ name: "Responses", itemKeys: [fixture.ask.id] }),
      ]);
      expect(stored.linkedKeys).toEqual([fixture.ask.id, fixture.missing.id, fixture.relatedPage.id]);
    });
    expect(await getItem(fixture.seem.id)).toBeTruthy();
    const afterEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;
    expect(afterEdits - beforeEdits).toBe(1);
  });

  it("does not keep a draft Add-group seed after leaving Organizer through its back control", async () => {
    const user = userEvent.setup();
    const fixture = await collectionFixture();
    renderDetail(fixture.page, await allItems());

    await user.click(screen.getByRole("button", { name: "Add group" }));
    expect(screen.getByRole("textbox", { name: "Group 3 name" }).value).toBe("New group");
    await user.click(screen.getByRole("button", { name: "Page" }));
    await user.click(screen.getByRole("button", { name: "Organize" }));

    expect(screen.getAllByRole("textbox", { name: /Group \d+ name/ })).toHaveLength(2);
    expect((await getItem(fixture.page.id)).collection.groups).toHaveLength(2);
  });
});

describe("lexical Collection placement", () => {
  it("shows the Collection and group separately from generic Linked", async () => {
    const fixture = await collectionFixture();
    renderDetail(fixture.ask, await allItems());

    expect(screen.getByText("Collections")).toBeTruthy();
    expect(screen.getByText("Thinking and opinions")).toBeTruthy();
    expect(screen.getByText("Questions")).toBeTruthy();
    expect(screen.getAllByText("Thinking and opinions")).toHaveLength(1);
  });

  it("assigns a phrase to a chosen Collection group and stays on the phrase", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const phrase = await createItem(newLexical({ term: "¿Dónde queda?", form: "phrase" }));
    const essentials = newPageGroupKey();
    const extras = newPageGroupKey();
    const page = await createItem(newPage({
      title: "Travel",
      pageProfile: "collection",
      collection: {
        groups: [
          { id: essentials, name: "Essentials", itemKeys: [] },
          { id: extras, name: "Extras", itemKeys: [] },
        ],
      },
    }));
    const beforeEdits = (await allEvents()).filter((event) => event.type === EVENT_TYPES.edit).length;

    renderDetail(phrase, await allItems(), onOpen);
    await user.click(screen.getByRole("button", { name: "Add to Collection" }));

    expect(screen.getByRole("combobox", { name: "Collection" }).value).toBe(page.id);
    const group = screen.getByRole("combobox", { name: "Collection group" });
    expect(group.value).toBe("");
    expect([...group.options].map((option) => option.textContent)).toEqual([
      "Not grouped yet",
      "Essentials",
      "Extras",
    ]);

    await user.selectOptions(group, extras);
    await user.click(screen.getByRole("button", { name: "Save Collection assignment" }));

    await waitFor(async () => {
      const stored = await getItem(page.id);
      expect(stored.linkedKeys).toEqual([phrase.id]);
      expect(stored.collection.groups[1].itemKeys).toEqual([phrase.id]);
    });
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox", { name: "Collection" })).toBeNull();
    expect(screen.getByText("Travel")).toBeTruthy();
    expect(screen.getByText("Extras")).toBeTruthy();
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(beforeEdits);
  });

  it("requires a choice among several destinations and omits an existing placement", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "rumbo" }));
    const existing = await createItem(newPage({
      title: "Already placed",
      pageProfile: "collection",
      linkedKeys: [word.id],
      collection: { groups: [] },
    }));
    const alpha = await createItem(newPage({
      title: "Alpha",
      pageProfile: "collection",
      collection: { groups: [] },
    }));
    const beta = await createItem(newPage({
      title: "Beta",
      pageProfile: "collection",
      collection: { groups: [] },
    }));

    renderDetail(word, await allItems());
    await user.click(screen.getByRole("button", { name: "Add to Collection" }));

    const collection = screen.getByRole("combobox", { name: "Collection" });
    expect(collection.value).toBe("");
    expect([...collection.options].map((option) => option.textContent)).toEqual([
      "Choose a Collection",
      "Alpha",
      "Beta",
    ]);
    expect([...collection.options].some((option) => option.value === existing.id)).toBe(false);
    expect(screen.getByRole("button", { name: "Save Collection assignment" }).disabled).toBe(true);

    await user.selectOptions(collection, beta.id);
    expect(screen.getByRole("combobox", { name: "Collection group" }).value).toBe("");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect((await getItem(alpha.id)).linkedKeys).toEqual([]);
    expect((await getItem(beta.id)).linkedKeys).toEqual([]);
  });

  it("keeps active Collections out of lexical Connections while retaining General and Diario pages", async () => {
    const user = userEvent.setup();
    const word = await createItem(newLexical({ term: "viaje" }));
    await createItem(newPage({
      title: "Travel Collection",
      pageProfile: "collection",
      collection: { groups: [] },
    }));
    await createItem(newPage({ title: "Travel notes" }));
    await createItem(newPage({ title: "Travel diary", pageDate: "2026-08-04" }));

    renderDetail(word, await allItems());
    await user.click(screen.getByRole("button", { name: "link something" }));
    await user.type(
      screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/),
      "Travel"
    );

    expect(screen.queryByRole("button", { name: /Travel Collection/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Travel notes/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Travel diary/ })).toBeTruthy();
  });

  it("promotes an incoming typed connection and keeps its annotation dormant", async () => {
    const user = userEvent.setup();
    const groupId = newPageGroupKey();
    const page = await createItem(newPage({
      title: "Work vocabulary",
      pageProfile: "collection",
      collection: { groups: [{ id: groupId, name: "Meetings", itemKeys: [] }] },
    }));
    const phrase = await createItem(newLexical({
      term: "quedamos en eso",
      form: "phrase",
      linkedKeys: [page.id],
      linkAnnotations: [{
        targetKey: page.id,
        type: "found_in",
        subject: "owner",
        note: "From a team meeting.",
      }],
    }));

    renderDetail(phrase, await allItems());
    expect(screen.getByText("From a team meeting.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add to Collection" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Collection group" }), groupId);
    await user.click(screen.getByRole("button", { name: "Save Collection assignment" }));

    await waitFor(async () => {
      expect((await getItem(phrase.id))).toMatchObject({ linkedKeys: [], linkAnnotations: [] });
      expect((await getItem(page.id))).toMatchObject({
        linkedKeys: [phrase.id],
        linkAnnotations: [{
          targetKey: phrase.id,
          type: "found_in",
          subject: "target",
          note: "From a team meeting.",
        }],
        collection: { groups: [{ id: groupId, name: "Meetings", itemKeys: [phrase.id] }] },
      });
    });
    expect(screen.getByText("Work vocabulary")).toBeTruthy();
    expect(screen.getByText("Meetings")).toBeTruthy();
    expect(screen.queryByText("From a team meeting.")).toBeNull();
  });

  it.each([
    "deleted group",
    "disabled vocabulary",
    "deleted Collection",
  ])("keeps the assignment form and writes nothing for a %s", async (failure) => {
    const user = userEvent.setup();
    const groupId = newPageGroupKey();
    const word = await createItem(newLexical({ term: `stale ${failure}` }));
    const page = await createItem(newPage({
      title: "Changing Collection",
      pageProfile: "collection",
      collection: { groups: [{ id: groupId, name: "Target", itemKeys: [] }] },
    }));
    renderDetail(word, await allItems());
    await user.click(screen.getByRole("button", { name: "Add to Collection" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Collection group" }), groupId);

    if (failure === "deleted group") {
      await db.items.update(page.id, { collection: { groups: [] } });
    } else if (failure === "disabled vocabulary") {
      await db.items.update(page.id, { collection: { ...page.collection, enabled: false } });
    } else {
      await db.items.delete(page.id);
    }

    await user.click(screen.getByRole("button", { name: "Save Collection assignment" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Collection" }).value).toBe(page.id);
    expect(screen.getByRole("combobox", { name: "Collection group" }).value).toBe(groupId);
    expect((await getItem(word.id)).linkedKeys).toEqual([]);
    const storedPage = await getItem(page.id);
    if (storedPage) expect(storedPage.linkedKeys).toEqual([]);
  });
});
