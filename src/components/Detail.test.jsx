// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Detail from "./Detail.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { newLexical, newPage, createItem, allItems } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";

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
function renderDetail(item, onOpen = vi.fn(), state) {
  function Harness() {
    const [items, setItems] = useState([item]);
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

describe("quick-create-and-link keeps the owner where they are", () => {
  it("creates, links, and leaves an unsaved draft untouched without navigating", async () => {
    const user = userEvent.setup();
    const page = await createItem(newPage({ title: "Preterite vs imperfect" }));
    const onOpen = vi.fn();

    renderDetail(page, onOpen);

    // Start writing, and do NOT save. This is the work that must survive.
    const draft = "El pretérito para acciones terminadas";
    const body = screen.getByPlaceholderText(/Write the page/);
    await user.type(body, draft);
    expect(body.value).toBe(draft);

    // Link something that does not exist yet.
    await user.click(screen.getByText("link something"));
    await user.type(screen.getByPlaceholderText(/Link a word, page or dictionary entry/), "madrugar");
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
    await user.type(screen.getByPlaceholderText(/Link a word, page or dictionary entry/), "de repente");
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
    const input = screen.getByPlaceholderText(/Link a word, page or dictionary entry/);
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
    const word = await createItem(newLexical({ term: "madrugar", translation: "to get up early" }));
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

    expect(await screen.findByText("linked")).toBeTruthy();
  });
});
