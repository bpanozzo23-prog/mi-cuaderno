// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Wander from "./Wander.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import { allItems, createItem, linkItems, newLexical, newPage } from "../db/items.js";
import { FIXTURE_ENTRIES, FIXTURE_PATTERN_CONJUGATIONS } from "../test/dictFixture.js";
import { newMeaning } from "../lib/meanings.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Wander", () => {
  it("renders all three groups, keeps the Diario stub inert, and writes nothing while hopping or exiting", async () => {
    const user = userEvent.setup();
    const onHop = vi.fn();
    const onOpen = vi.fn();
    const sacarEntry = FIXTURE_ENTRIES.find((entry) => entry.lemma === "sacar");
    const sacarTable = FIXTURE_PATTERN_CONJUGATIONS.find((table) => table.id === sacarEntry.conjugationId);
    const buscarEntry = {
      id: "dict:fixture:buscar:verb",
      lemma: "buscar",
      pos: "verb",
      conjugationId: "conj:fixture:buscar",
    };
    const casaEntry = { id: "dict:fixture:casa:noun", lemma: "casa", pos: "noun" };

    const center = await createItem(newLexical({
      term: "sacar",
      dictKey: sacarEntry.id,
      meanings: [newMeaning({ gloss: "to take out" })],
      linkedKeys: [casaEntry.id],
      linkAnnotations: [{
        targetKey: casaEntry.id,
        type: "variant",
        subject: "owner",
        note: "A reference exit.",
      }],
    }));
    const neighbor = await createItem(newLexical({ term: "quitar" }));
    const sibling = await createItem(newLexical({ term: "buscar", dictKey: buscarEntry.id }));
    await createItem(newPage({ title: "Journal fixture", pageDate: "2026-08-12", body: "Ayer saqué la basura." }));
    await linkItems(center.id, neighbor.id, { type: "contrast", note: "Different shades of removing." });
    const items = await allItems();
    const current = items.find((item) => item.id === center.id);
    const beforeItems = JSON.stringify(items);
    const beforeEvents = JSON.stringify(await allEvents());

    const resolveReference = vi.fn(async (key) => ({
      entry: key === sacarEntry.id ? sacarEntry : key === casaEntry.id ? casaEntry : null,
      resolvedFrom: null,
    }));
    render(
      <Wander
        item={current}
        items={items}
        onHop={onHop}
        onOpen={onOpen}
        onBack={vi.fn()}
        resolveReference={resolveReference}
        loadConjugations={vi.fn(async () => [sacarTable])}
        loadFamilies={vi.fn(async () => [{
          id: "spelling:c-qu",
          members: [sacarEntry, buscarEntry],
        }])}
        loadMeta={vi.fn(async () => ({ previousIds: {} }))}
        prepareJournal={vi.fn(async () => [{ journal: true }, { journal: true }])}
      />
    );

    expect(await screen.findByText("Conjugation family")).toBeTruthy();
    expect(screen.getByText("Connections")).toBeTruthy();
    expect(screen.getByText(/Different shades of removing/)).toBeTruthy();
    expect(screen.getByText(/A reference exit/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /What to notice/ })).toBeTruthy();

    const stub = screen.getByText("En tu Diario · 2");
    expect(stub.closest("button")).toBeNull();
    expect(screen.queryByRole("button", { name: /En tu Diario/ })).toBeNull();
    fireEvent.click(stub);
    expect(onHop).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: new RegExp(`^${neighbor.term}`) }));
    expect(onHop).toHaveBeenLastCalledWith(neighbor.id);
    await user.click(screen.getByRole("button", { name: new RegExp(`^${sibling.term}`) }));
    expect(onHop).toHaveBeenLastCalledWith(sibling.id);
    await user.click(screen.getByRole("button", { name: /^casa/ }));
    expect(onOpen).toHaveBeenLastCalledWith(casaEntry.id);
    await user.click(screen.getByRole("button", { name: /What to notice/ }));
    expect(onOpen).toHaveBeenLastCalledWith(sacarEntry.id);
    await user.click(screen.getByRole("button", { name: "Open full entry" }));
    expect(onOpen).toHaveBeenLastCalledWith(center.id);

    await waitFor(async () => {
      expect(JSON.stringify(await allItems())).toBe(beforeItems);
      expect(JSON.stringify(await allEvents())).toBe(beforeEvents);
    });
  });

  it("renders a linked non-journal page as a reduced center with typed hops only", async () => {
    const user = userEvent.setup();
    const onHop = vi.fn();
    const onOpen = vi.fn();
    const word = newLexical({ term: "casa" });
    const page = newPage({
      title: "Architecture notes",
      linkedKeys: [word.id],
      linkAnnotations: [{
        targetKey: word.id,
        type: "explained_by",
        subject: "owner",
        note: "This page explains the word.",
      }],
    });
    const prepareJournal = vi.fn(async () => [{ journal: true }]);

    render(
      <Wander
        item={page}
        items={[page, word]}
        onHop={onHop}
        onOpen={onOpen}
        onBack={vi.fn()}
        prepareJournal={prepareJournal}
      />
    );

    expect(screen.getByText("Architecture notes")).toBeTruthy();
    expect(screen.getByText("Explained by · This page explains the word.")).toBeTruthy();
    expect(screen.queryByText("Conjugation family")).toBeNull();
    expect(screen.queryByText(/En tu Diario/)).toBeNull();
    expect(prepareJournal).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^casa/ }));
    expect(onHop).toHaveBeenCalledWith(word.id);
    await user.click(screen.getByRole("button", { name: "Open full entry" }));
    expect(onOpen).toHaveBeenCalledWith(page.id);
  });
});
