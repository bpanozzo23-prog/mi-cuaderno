// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Detail from "./Detail.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { createItem, getItem, newLexical, newPage } from "../db/items.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../test/dictFixture.js";

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

async function seedDictionary(previousIds) {
  const reference = refDb("a");
  await reference.entries.put(FIXTURE_ENTRIES.find((entry) => entry.id === CASA));
  await reference.formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca"));
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: { datasetVersion: "detail-alias-fixture", counts: { entries: 1 }, previousIds },
  });
  setActiveSlot("a");
}

const renderStaleDetail = (page) => render(
  <Detail
    item={page}
    items={[page]}
    onBack={vi.fn()}
    onOpen={vi.fn()}
    // Deliberately do not reload props: the resolver payload must render correctly immediately.
    onChanged={vi.fn()}
  />
);

describe("Detail dictionary alias safety", () => {
  it("shows English noun abbreviation and dictionary gender in the personal heading", async () => {
    await seedDictionary({});
    const word = await createItem(newLexical({
      term: "casa",
      pos: "noun",
      dictKey: CASA,
    }));

    renderStaleDetail(word);

    const heading = document.querySelector(".text-2xl");
    expect(heading).toBeTruthy();
    await waitFor(() => expect(heading.textContent).toContain("n. · f."));
    expect(heading.textContent).not.toContain("s.");
  });

  it("renders the preserved relationship immediately after automatic canonicalization", async () => {
    const user = userEvent.setup();
    const oldCasa = "dict:wiktionary-es:casa:old";
    await seedDictionary({ [oldCasa]: CASA });
    const page = await createItem(newPage({
      title: "Interview",
      linkedKeys: [oldCasa, CASA],
      linkAnnotations: [{
        targetKey: oldCasa,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the interview.",
      }],
    }));

    renderStaleDetail(page);

    expect(await screen.findByText("Found in")).toBeTruthy();
    expect(screen.getByText("Vocabulary from the interview.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit connection to casa" }));
    expect(screen.getByRole("combobox", { name: "Relationship" }).value).toBe("found_in:owner");
    expect(screen.getByRole("textbox", { name: "Connection note" }).value)
      .toBe("Vocabulary from the interview.");

    await waitFor(async () => {
      const stored = await getItem(page.id);
      expect(stored.linkedKeys).toEqual([CASA]);
      expect(stored.linkAnnotations).toEqual([{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "Vocabulary from the interview.",
      }]);
    });
  });

  it("keeps a canonical search result disabled when two old aliases are unresolved", async () => {
    const user = userEvent.setup();
    const firstOld = "dict:wiktionary-es:casa:old-1";
    const secondOld = "dict:wiktionary-es:casa:old-2";
    await seedDictionary({ [firstOld]: CASA, [secondOld]: CASA });
    const page = await createItem(newPage({
      title: "Conflicted source",
      linkedKeys: [firstOld, secondOld],
      linkAnnotations: [
        { targetKey: firstOld, type: "contrast", subject: "owner", note: "First value." },
        { targetKey: secondOld, type: "variant", subject: "owner", note: "Second value." },
      ],
    }));

    renderStaleDetail(page);
    expect(await screen.findByRole("heading", { name: "Resolve dictionary connection" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "link" }));
    await user.type(screen.getByPlaceholderText(/Link a word, phrase, page or dictionary entry/), "casa");

    const canonicalRow = await screen.findByRole("button", { name: /casa.*Needs resolution/i });
    expect(canonicalRow.disabled).toBe(true);
    expect(canonicalRow.textContent).toContain("Needs resolution");
    expect((await getItem(page.id)).linkedKeys).toEqual([firstOld, secondOld]);
  });

  it("keeps resolved dictionary metadata visible on a Collection before parent props refresh", async () => {
    const user = userEvent.setup();
    const oldCasa = "dict:wiktionary-es:casa:collection-old";
    await seedDictionary({ [oldCasa]: CASA });
    const page = await createItem(newPage({
      title: "Sources",
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [] },
      linkedKeys: [oldCasa, CASA],
      linkAnnotations: [{
        targetKey: oldCasa,
        type: "found_in",
        subject: "owner",
        note: "Collection source vocabulary.",
      }],
    }));

    renderStaleDetail(page);

    expect(await screen.findByText("Found in")).toBeTruthy();
    expect(screen.getByText("Collection source vocabulary.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit connection to casa" }));
    expect(screen.getByRole("combobox", { name: "Relationship" }).value).toBe("found_in:owner");
    expect(screen.getByRole("textbox", { name: "Connection note" }).value)
      .toBe("Collection source vocabulary.");
  });

  it("refreshes dictionary rows when only relationship metadata changes", async () => {
    await seedDictionary({});
    const page = await createItem(newPage({
      title: "Metadata refresh",
      linkedKeys: [CASA],
      linkAnnotations: [{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "Original relationship note.",
      }],
    }));
    const stableLinkedKeys = page.linkedKeys;
    const props = {
      items: [page],
      onBack: vi.fn(),
      onOpen: vi.fn(),
      onChanged: vi.fn(),
    };
    const view = render(<Detail {...props} item={page} />);

    expect(await screen.findByText("Original relationship note.")).toBeTruthy();

    const changedAnnotations = [{
      targetKey: CASA,
      type: "contrast",
      subject: "owner",
      note: "Changed relationship note.",
    }];
    await db.items.update(page.id, { linkAnnotations: changedAnnotations });
    const changedPage = {
      ...page,
      linkedKeys: stableLinkedKeys,
      linkAnnotations: changedAnnotations,
    };
    view.rerender(<Detail {...props} item={changedPage} items={[changedPage]} />);

    expect(await screen.findByText("Changed relationship note.")).toBeTruthy();
    expect(screen.getByText("Contrast")).toBeTruthy();
    expect(screen.queryByText("Original relationship note.")).toBeNull();
  });
});
