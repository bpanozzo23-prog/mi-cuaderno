// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Detail from "./Detail.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { createItem, getItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../test/dictFixture.js";

/**
 * The "personal twin" merge offer end-to-end: a page linked a dictionary entry before the owner
 * created their own attached word for it. The offer is prompted, per-row, and bookkeeping-only —
 * no event, no recency change — and a conflict between explicit descriptions goes through the
 * resolver instead of silently picking a survivor.
 */

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
});

async function seedDictionary(previousIds = {}) {
  const reference = refDb("a");
  await reference.entries.put(FIXTURE_ENTRIES.find((entry) => entry.id === CASA));
  await reference.formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca"));
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: { datasetVersion: "twin-merge-fixture", counts: { entries: 1 }, previousIds },
  });
  setActiveSlot("a");
}

const renderDetail = (page, items) => render(
  <Detail
    item={page}
    items={items}
    onBack={vi.fn()}
    onOpen={vi.fn()}
    onChanged={vi.fn()}
  />
);

describe("Detail personal-twin merge", () => {
  it("re-points the link at the twin with the annotation carried, no event, no recency change", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const twin = await createItem(newLexical({ term: "casa", pos: "noun", dictKey: CASA }));
    const page = newPage({
      title: "Interview",
      linkedKeys: [CASA],
      linkAnnotations: [{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the interview.",
      }],
    });
    page.updatedAt = "2026-01-02T03:04:05.000Z";
    await createItem(page);

    renderDetail(page, [page, twin]);

    await user.click(await screen.findByRole("button", { name: /Point this link at “casa”/ }));

    await waitFor(async () => {
      const stored = await getItem(page.id);
      expect(stored.linkedKeys).toEqual([twin.id]);
      expect(stored.linkAnnotations).toEqual([{
        targetKey: twin.id,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the interview.",
      }]);
      expect(stored.updatedAt).toBe("2026-01-02T03:04:05.000Z");
    });
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
    // The twin's Detail now derives this page as an incoming connection — the point of merging.
    expect((await getItem(twin.id)).dictKey).toBe(CASA);
  });

  it("routes conflicting explicit descriptions through the resolver, storing the edited survivor", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const twin = await createItem(newLexical({ term: "casa", pos: "noun", dictKey: CASA }));
    const page = await createItem(newPage({
      title: "Interview",
      linkedKeys: [CASA, twin.id],
      linkAnnotations: [
        { targetKey: CASA, type: "found_in", subject: "owner", note: "The interview." },
        { targetKey: twin.id, type: "contrast", subject: "owner", note: "My note." },
      ],
    }));

    renderDetail(page, [page, twin]);

    await user.click(await screen.findByRole("button", { name: /Point this link at “casa”/ }));
    // Both explicit values are visible; nothing has been written yet.
    expect(await screen.findByRole("heading", { name: "Point this link at “casa”" })).toBeTruthy();
    expect(screen.getByText("From the dictionary link")).toBeTruthy();
    expect(screen.getByText("From your existing link")).toBeTruthy();
    expect((await getItem(page.id)).linkedKeys).toEqual([CASA, twin.id]);

    const note = screen.getByRole("textbox", { name: "Surviving shared note" });
    await user.clear(note);
    await user.type(note, "Final shared note.");
    await user.click(screen.getByRole("button", { name: "Merge into my entry" }));

    await waitFor(async () => {
      const stored = await getItem(page.id);
      expect(stored.linkedKeys).toEqual([twin.id]);
      expect(stored.linkAnnotations).toEqual([{
        targetKey: twin.id,
        type: "found_in",
        subject: "owner",
        note: "Final shared note.",
      }]);
    });
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
  });

  it("makes no offer when no attached twin exists", async () => {
    await seedDictionary();
    const page = await createItem(newPage({ title: "Interview", linkedKeys: [CASA] }));

    renderDetail(page, [page]);

    // Wait for the dictionary row itself so the absence check runs after resolution settles.
    expect(await screen.findByRole("button", { name: "Edit connection to casa" })).toBeTruthy();
    expect(screen.queryByText(/You now have/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Point this link at/ })).toBeNull();
  });

  it("suppresses the offer on a vocabulary-enabled Collection page, where a link is membership", async () => {
    await seedDictionary();
    const twin = await createItem(newLexical({ term: "casa", pos: "noun", dictKey: CASA }));
    const page = await createItem(newPage({
      title: "Sources",
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [] },
      linkedKeys: [CASA],
    }));

    renderDetail(page, [page, twin]);

    expect(await screen.findByRole("button", { name: "Edit connection to casa" })).toBeTruthy();
    expect(screen.queryByText(/You now have/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Point this link at/ })).toBeNull();
  });
});
