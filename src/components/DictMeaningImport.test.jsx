// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MeaningsSection from "./MeaningsSection.jsx";
import { dictionaryInstalled, resolveEntry } from "../db/ref/entries.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { newMeaning } from "../lib/meanings.js";

const CASA = "dict:wiktionary-es:casa:noun";

const ENTRY = {
  id: CASA,
  lemma: "casa",
  pos: "noun",
  gender: "f",
  senses: [
    { gloss: "house", regionLabels: [], labels: [] },
    { gloss: "home", regionLabels: ["Mexico"], labels: ["colloquial", "obsolete"] },
    { gloss: "household", regionLabels: [], labels: [] },
  ],
};

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
});

async function seedDictionary(entries = [ENTRY], previousIds = {}) {
  const reference = refDb("a");
  if (entries.length) await reference.entries.bulkPut(entries);
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: { datasetVersion: "import-fixture", counts: { entries: entries.length }, previousIds },
  });
  setActiveSlot("a");
}

function item(overrides = {}) {
  return {
    id: "user:casa",
    type: "lexical",
    term: "casa",
    notes: "",
    myExamples: [],
    dictKey: CASA,
    meanings: [newMeaning({ id: "meaning:mine", gloss: "house", note: "My own note" })],
    ...overrides,
  };
}

const openSheet = async (user) =>
  user.click(await screen.findByRole("button", { name: /Import from the dictionary/ }));

/**
 * "Nothing is offered" is an absence, and an absence asserted too early passes for free — the
 * first version of these three tests stayed green against a deliberately broken guard because
 * they ran before the lookup came back. So mirror the component's own reads on the same
 * reference connection, which queues behind them, then let React flush: what is asserted after
 * this is a decision the component reached, not one it has not got to yet.
 */
async function importDecisionSettled(key = CASA) {
  await dictionaryInstalled();
  await resolveEntry(key);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("importing meanings from the attached dictionary entry", () => {
  it("offers nothing when the item is attached to no entry", async () => {
    await seedDictionary();
    render(<MeaningsSection item={item({ dictKey: null })} onPatch={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Organize meanings/ })).toBeTruthy());
    await importDecisionSettled();
    expect(screen.queryByRole("button", { name: /Import from the dictionary/ })).toBeNull();
  });

  it("offers nothing when no dictionary is installed", async () => {
    render(<MeaningsSection item={item()} onPatch={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Organize meanings/ })).toBeTruthy());
    await importDecisionSettled();
    expect(screen.queryByRole("button", { name: /Import from the dictionary/ })).toBeNull();
  });

  it("offers nothing when the attachment is orphaned", async () => {
    await seedDictionary([]);
    render(<MeaningsSection item={item()} onPatch={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Organize meanings/ })).toBeTruthy());
    await importDecisionSettled();
    expect(screen.queryByRole("button", { name: /Import from the dictionary/ })).toBeNull();
  });

  it("previews each sense with the labels that cross and the ones that do not", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    render(<MeaningsSection item={item()} onPatch={vi.fn()} />);
    await openSheet(user);

    expect(screen.getByText("Mexico")).toBeTruthy();
    expect(screen.getByText("colloquial")).toBeTruthy();
    expect(screen.getByText("Not carried across: obsolete")).toBeTruthy();
  });

  it("starts with nothing selected and cannot import until a sense is chosen", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    await seedDictionary();
    render(<MeaningsSection item={item()} onPatch={onPatch} />);
    await openSheet(user);

    for (const box of screen.getAllByRole("checkbox")) expect(box.checked).toBe(false);
    expect(screen.getByRole("button", { name: /Import 0 meanings/ }).disabled).toBe(true);

    await user.click(screen.getByRole("checkbox", { name: "Import home" }));
    expect(screen.getByRole("button", { name: /Import 1 meaning/ }).disabled).toBe(false);
  });

  it("appends the chosen senses without touching an existing meaning", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    await seedDictionary();
    render(<MeaningsSection item={item()} onPatch={onPatch} />);
    await openSheet(user);

    await user.click(screen.getByRole("checkbox", { name: "Import home" }));
    await user.click(screen.getByRole("checkbox", { name: "Import household" }));
    await user.click(screen.getByRole("button", { name: /Import 2 meanings/ }));

    expect(onPatch).toHaveBeenCalledTimes(1);
    const saved = onPatch.mock.calls[0][0].meanings;
    expect(saved.map((meaning) => meaning.gloss)).toEqual(["house", "home", "household"]);
    expect(saved[0]).toMatchObject({ id: "meaning:mine", note: "My own note" });
    expect(saved[1].id.startsWith("meaning:")).toBe(true);
    expect(saved[1]).toMatchObject({ regions: ["Mexico"], usageLabels: ["colloquial"] });
    expect(Object.keys(onPatch.mock.calls[0][0])).toEqual(["meanings"]);
  });

  it("will not re-import a sense the owner already has a meaning for", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    render(<MeaningsSection item={item()} onPatch={vi.fn()} />);
    await openSheet(user);

    const already = screen.getByRole("checkbox", { name: "Import house" });
    expect(already.disabled).toBe(true);
    expect(screen.getByText("Already in your meanings.")).toBeTruthy();
  });

  it("saves nothing when the sheet is cancelled", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    await seedDictionary();
    render(<MeaningsSection item={item()} onPatch={onPatch} />);
    await openSheet(user);

    await user.click(screen.getByRole("checkbox", { name: "Import home" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onPatch).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: /Import from the dictionary/ })).toBeTruthy();
  });

  it("hands back an ordinary meaning the owner can then edit", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    let current = item({ meanings: [] });
    const onPatch = vi.fn(async (fields) => {
      current = { ...current, ...fields };
    });
    const { rerender } = render(<MeaningsSection item={current} onPatch={onPatch} />);

    await openSheet(user);
    await user.click(screen.getByRole("checkbox", { name: "Import home" }));
    await user.click(screen.getByRole("button", { name: /Import 1 meaning/ }));
    rerender(<MeaningsSection item={current} onPatch={onPatch} />);

    const importedId = current.meanings[0].id;
    await user.click(await screen.findByRole("button", { name: "Expand meaning" }));
    await user.click(screen.getByRole("button", { name: /Edit this meaning/ }));
    const gloss = screen.getByRole("textbox", { name: "English gloss" });
    await user.clear(gloss);
    await user.type(gloss, "my own wording");
    await user.click(screen.getByRole("button", { name: "Save meaning" }));

    expect(current.meanings).toHaveLength(1);
    expect(current.meanings[0]).toMatchObject({ id: importedId, gloss: "my own wording" });
  });
});
