// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Biography from "./Biography.jsx";
import Detail from "./Detail.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { createItem, linkItems, newLexical, newPage } from "../db/items.js";
import { newMeaning } from "../lib/meanings.js";
import { connectionsFor } from "../lib/relationships.js";
import { emptyItemState } from "../useNotebook.js";
import { emptyReviewState } from "../lib/review.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Biography", () => {
  it("discloses Diario with snippets and keeps every habitat row read-only", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const subject = newLexical({ term: "casa", meanings: [newMeaning({ gloss: "house" })] });
    const neighbor = newLexical({ term: "hogar", meanings: [newMeaning({ gloss: "home" })] });
    const journal = newPage({
      title: "Un paseo",
      pageDate: "2026-08-11",
      body: "Ayer volví temprano a casa después del paseo.",
    });
    const page = newPage({ title: "Architecture notes", body: "La **casa** tiene un patio." });
    const phrase = newLexical({ term: "mi casa es tu casa", form: "phrase" });
    subject.linkedKeys = [neighbor.id];
    subject.linkAnnotations = [{
      targetKey: neighbor.id,
      type: "similar_meaning",
      subject: "owner",
      note: "A home can be more personal.",
    }];
    const items = [subject, neighbor, page, phrase, journal];

    render(
      <Biography
        item={subject}
        items={items}
        events={[]}
        state={emptyItemState}
        reviewState={emptyReviewState}
        connections={connectionsFor(subject, items)}
        onOpen={onOpen}
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByText("En tu Diario")).toBeTruthy();
    expect(screen.getByText(/Ayer volví temprano a casa después del paseo/)).toBeTruthy();
    expect(screen.getByText("In your pages")).toBeTruthy();
    expect(screen.getByText("Phrases")).toBeTruthy();
    expect(screen.queryByText("Matched as casa")).toBeNull();
    expect(screen.getByText("Connections")).toBeTruthy();
    expect(screen.getByText("A home can be more personal.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Un paseo/ }));
    expect(onOpen).toHaveBeenLastCalledWith(journal.id);
    await user.click(screen.getByRole("button", { name: /^mi casa es tu casa/ }));
    expect(onOpen).toHaveBeenLastCalledWith(phrase.id);
    await user.click(screen.getByRole("button", { name: /hogar/ }));
    expect(onOpen).toHaveBeenLastCalledWith(neighbor.id);

    expect(screen.queryByRole("button", { name: /remove|unlink|edit|save relationship/i })).toBeNull();
  });

  it("shows five evidence-backed neighbors between Phrases and Connections, then expands", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const subject = newLexical({ term: "sacar", dictKey: null });
    const phrase = newLexical({ term: "sacar la basura", form: "phrase" });
    const neighbors = ["basura", "casa", "tarea", "cocina", "bolsa", "calle"]
      .map((term) => newLexical({ term, dictKey: null }));
    subject.linkedKeys = [neighbors[0].id];
    const items = [subject, phrase, ...neighbors];
    const prepared = neighbors.map((item, index) => ({
      item,
      itemId: item.id,
      explicitCount: index === 0 ? 1 : 0,
      proseCount: index === 0 ? 0 : 2,
      contextCount: index === 0 ? 1 : 2,
      contexts: [{ pageTitle: "Housework", label: index === 0 ? "Chores" : "Notes overview" }],
    }));

    render(
      <Biography
        item={subject}
        items={items}
        connections={connectionsFor(subject, items)}
        onOpen={onOpen}
        onClose={vi.fn()}
        preparePhrases={vi.fn(async () => [{ item: phrase, word: subject, surface: "sacar" }])}
        prepareProse={vi.fn(async () => [])}
        prepareNeighborhoods={vi.fn(async () => prepared)}
      />
    );

    const seen = await screen.findByText("Seen together");
    const phrases = screen.getByText("Phrases");
    const connections = screen.getByText("Connections");
    expect(phrases.compareDocumentPosition(seen) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(seen.compareDocumentPosition(connections) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^calle/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show all 6" }));
    await user.click(screen.getByRole("button", { name: /^calle/ }));
    expect(onOpen).toHaveBeenLastCalledWith(neighbors[5].id);
    expect(screen.getAllByRole("button", { name: /^basura/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /remove|unlink|edit|save relationship/i })).toBeNull();
  });

  it("names the containment section for the subject's own side of the relationship", async () => {
    const onOpen = vi.fn();
    const word = newLexical({ term: "sacar", dictKey: null });
    const phrase = newLexical({ term: "sacar las uñas", form: "phrase" });
    const shared = {
      items: [word, phrase],
      events: [],
      state: emptyItemState,
      reviewState: emptyReviewState,
      onOpen,
      onClose: vi.fn(),
      prepareProse: vi.fn(async () => []),
      prepareNeighborhoods: vi.fn(async () => []),
    };

    const view = render(<Biography item={phrase} {...shared} />);

    expect(await screen.findByText("Built on")).toBeTruthy();
    expect(screen.queryByText("Phrases")).toBeNull();
    expect(screen.getByRole("button", { name: /^sacar$/ })).toBeTruthy();

    view.rerender(<Biography item={word} {...shared} />);

    expect(await screen.findByText("Phrases")).toBeTruthy();
    expect(screen.queryByText("Built on")).toBeNull();
    expect(screen.getByRole("button", { name: /^sacar las uñas/ })).toBeTruthy();
  });

  it("shows the saved conjugation family and marked teaching exit without changing the story", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const entry = {
      id: "dict:fixture:sacar:verb",
      lemma: "sacar",
      conjugationId: "conj:fixture:sacar",
    };
    const subject = newLexical({
      id: "user:sacar",
      term: "sacar",
      dictKey: entry.id,
      meanings: [newMeaning({ gloss: "to take out" })],
    });
    const sibling = newLexical({
      id: "user:buscar",
      term: "buscar",
      dictKey: "dict:fixture:buscar:verb",
      meanings: [newMeaning({ gloss: "to look for" })],
    });
    const prepareFamily = vi.fn(async () => ({ entry, siblings: [sibling] }));

    render(
      <Biography
        item={subject}
        items={[subject, sibling]}
        events={[]}
        state={emptyItemState}
        reviewState={emptyReviewState}
        onOpen={onOpen}
        onClose={vi.fn()}
        prepareFamily={prepareFamily}
        preparePhrases={vi.fn(async () => [])}
        prepareProse={vi.fn(async () => [])}
      />
    );

    expect(await screen.findByText("Familia de conjugación")).toBeTruthy();
    expect(screen.getByText("Learning story")).toBeTruthy();
    expect(screen.queryByText("No other contexts found yet.")).toBeNull();
    expect(screen.getByRole("button", { name: /^buscar/ }).className).toContain("min-h-11");
    const teaching = screen.getByRole("button", { name: /What to notice/ });
    expect(teaching.querySelector('[aria-label="Dictionary exit"]')).toBeTruthy();
    expect(screen.queryByRole("button", {
      name: /remove|unlink|edit|save relationship|save changes/i,
    })).toBeNull();

    await user.click(screen.getByRole("button", { name: /^buscar/ }));
    expect(onOpen).toHaveBeenLastCalledWith(sibling.id);
    await user.click(teaching);
    expect(onOpen).toHaveBeenLastCalledWith(entry.id);
  });

  it("keeps the teaching exit with zero siblings and never prepares phrases or unattached words", async () => {
    const entry = {
      id: "dict:fixture:sacar:verb",
      lemma: "sacar",
      conjugationId: "conj:fixture:sacar",
    };
    const subject = newLexical({ term: "sacar", dictKey: entry.id });
    const prepareFamily = vi.fn(async () => ({ entry, siblings: [] }));
    const view = render(
      <Biography
        item={subject}
        items={[subject]}
        state={emptyItemState}
        reviewState={emptyReviewState}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        prepareFamily={prepareFamily}
        preparePhrases={vi.fn(async () => [])}
        prepareProse={vi.fn(async () => [])}
      />
    );
    expect(await screen.findByRole("button", { name: /What to notice/ })).toBeTruthy();

    const ineligiblePrepare = vi.fn(async () => ({ entry, siblings: [] }));
    view.rerender(
      <Biography
        item={newLexical({ form: "phrase", term: "a veces", dictKey: entry.id })}
        items={[]}
        state={emptyItemState}
        reviewState={emptyReviewState}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        prepareFamily={ineligiblePrepare}
        preparePhrases={vi.fn(async () => [])}
        prepareProse={vi.fn(async () => [])}
      />
    );
    await waitFor(() => expect(screen.queryByText("Familia de conjugación")).toBeNull());
    expect(ineligiblePrepare).not.toHaveBeenCalled();

    view.rerender(
      <Biography
        item={newLexical({ term: "casa", dictKey: null })}
        items={[]}
        state={emptyItemState}
        reviewState={emptyReviewState}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        prepareFamily={ineligiblePrepare}
        preparePhrases={vi.fn(async () => [])}
        prepareProse={vi.fn(async () => [])}
      />
    );
    await waitFor(() => expect(screen.queryByText("Familia de conjugación")).toBeNull());
    expect(ineligiblePrepare).not.toHaveBeenCalled();

    const failedPrepare = vi.fn(async () => {
      throw new Error("optional dictionary unavailable");
    });
    view.rerender(
      <Biography
        item={newLexical({ term: "sacar", dictKey: entry.id })}
        items={[]}
        state={emptyItemState}
        reviewState={emptyReviewState}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        prepareFamily={failedPrepare}
        preparePhrases={vi.fn(async () => [])}
        prepareProse={vi.fn(async () => [])}
      />
    );
    await waitFor(() => expect(failedPrepare).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Familia de conjugación")).toBeNull();
  });

  it("opens and closes inside Detail without changing the log or scan-first notes layout", async () => {
    const user = userEvent.setup();
    const subject = await createItem(newLexical({
      term: "sacar",
      dictKey: "dict:fixture:sacar:verb",
      notes: "A verb I use around the house.",
      meanings: [newMeaning({ gloss: "to take out" })],
    }));
    const phrase = await createItem(newLexical({ term: "sacar la basura", form: "phrase" }));
    const sibling = await createItem(newLexical({
      term: "buscar",
      dictKey: "dict:fixture:buscar:verb",
    }));
    const journal = await createItem(newPage({
      title: "Housework",
      pageDate: "2026-08-12",
      body: "Hoy tengo que sacar la basura.",
    }));
    await linkItems(subject.id, phrase.id, { type: "related" });
    const items = [subject, phrase, sibling, journal];
    const events = await allEvents();
    const onOpen = vi.fn();

    render(
      <Detail
        item={subject}
        items={items}
        events={events}
        state={emptyItemState}
        reviewState={emptyReviewState}
        onBack={vi.fn()}
        onOpen={onOpen}
        onChanged={vi.fn()}
        prepareBiographyFamily={vi.fn(async () => ({
          entry: {
            id: "dict:fixture:sacar:verb",
            lemma: "sacar",
            conjugationId: "conj:fixture:sacar",
          },
          siblings: [sibling],
        }))}
      />
    );

    expect(screen.getByText("A verb I use around the house.")).toBeTruthy();
    await waitFor(async () => {
      expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.view && event.itemKey === subject.id)).toHaveLength(1);
    });
    const before = JSON.stringify(await allEvents());

    const history = screen.getByRole("button", { name: "Historia" });
    expect(history.className).toContain("min-h-11");
    await user.click(history);
    expect(await screen.findByText("Familia de conjugación")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^buscar/ })).toBeTruthy();
    expect(await screen.findByText("En tu Diario")).toBeTruthy();
    expect(screen.getByText(/Hoy tengo que sacar la basura/)).toBeTruthy();
    expect(JSON.stringify(await allEvents())).toBe(before);

    await user.click(screen.getByRole("button", { name: "sacar" }));
    expect(screen.getByText("A verb I use around the house.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit note" })).toBeTruthy();
    expect(JSON.stringify(await allEvents())).toBe(before);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
