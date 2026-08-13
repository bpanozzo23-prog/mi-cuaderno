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

  it("opens and closes inside Detail without changing the log or scan-first notes layout", async () => {
    const user = userEvent.setup();
    const subject = await createItem(newLexical({
      term: "casa",
      notes: "A place to return to.",
      meanings: [newMeaning({ gloss: "house" })],
    }));
    const phrase = await createItem(newLexical({ term: "mi casa es tu casa", form: "phrase" }));
    const journal = await createItem(newPage({
      title: "At home",
      pageDate: "2026-08-12",
      body: "Hoy descansé en casa.",
    }));
    await linkItems(subject.id, phrase.id, { type: "related" });
    const items = [subject, phrase, journal];
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
      />
    );

    expect(screen.getByText("A place to return to.")).toBeTruthy();
    await waitFor(async () => {
      expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.view && event.itemKey === subject.id)).toHaveLength(1);
    });
    const before = JSON.stringify(await allEvents());

    const history = screen.getByRole("button", { name: "Historia" });
    expect(history.className).toContain("min-h-11");
    await user.click(history);
    expect(await screen.findByText("En tu Diario")).toBeTruthy();
    expect(screen.getByText(/Hoy descansé en casa/)).toBeTruthy();
    expect(JSON.stringify(await allEvents())).toBe(before);

    await user.click(screen.getByRole("button", { name: "casa" }));
    expect(screen.getByText("A place to return to.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit note" })).toBeTruthy();
    expect(JSON.stringify(await allEvents())).toBe(before);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
