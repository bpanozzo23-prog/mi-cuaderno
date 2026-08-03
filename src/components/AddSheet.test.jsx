// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSheet from "./AddSheet.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { allItems, createItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("AddSheet duplicate guard", () => {
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
    expect(screen.getByRole("button", { name: "Add page" }).disabled).toBe(false);
  });

  it("creates a Collection from editable group seeds without persisting template identity", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageProfile: "collection",
          groupNames: ["Questions", "Answers", "Reactions and follow-ups"],
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
    await user.click(screen.getByRole("button", { name: "Add collection" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    const created = await db.items.get(onCreated.mock.calls[0][0]);
    expect(created.pageProfile).toBe("collection");
    expect(created.pageDate).toBeNull();
    expect(created.collection.groups.map((group) => group.name)).toEqual([
      "Prompts",
      "Answers",
      "Reactions and follow-ups",
    ]);
    expect(created.collection.groups.every((group) => /^page-group:[0-9a-f-]+$/i.test(group.id))).toBe(true);
    expect(created.collection.groups.every((group) => group.itemKeys.length === 0)).toBe(true);
    expect(created).not.toHaveProperty("templateId");

    const events = await allEvents();
    expect(events.filter((event) => event.type === EVENT_TYPES.create)).toHaveLength(1);
    expect(events.filter((event) => event.type === EVENT_TYPES.edit)).toHaveLength(0);
  });

  it("blocks blank or Unicode-normalized duplicate Collection group names", async () => {
    const user = userEvent.setup();
    render(
      <AddSheet
        kind="page"
        pageStarter={{
          pageProfile: "collection",
          groupNames: ["Neutral", "Ｎｅｕｔｒａｌ"],
        }}
        items={[]}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    );

    await user.type(screen.getByPlaceholderText("Title *"), "Register");
    expect(screen.getByRole("button", { name: "Add collection" }).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/unique|duplicate/i);

    const second = screen.getByRole("textbox", { name: "Group 2 name" });
    await user.clear(second);
    expect(screen.getByRole("button", { name: "Add collection" }).disabled).toBe(true);
    await user.type(second, "Formal");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Add collection" }).disabled).toBe(false);
  });
});
