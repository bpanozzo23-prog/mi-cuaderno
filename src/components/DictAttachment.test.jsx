// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictAttachment from "./DictAttachment.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { createItem, getItem, newLexical } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../test/dictFixture.js";
import * as referenceEntries from "../db/ref/entries.js";
import * as referenceSearch from "../db/ref/search.js";
import { deferred, settleAsyncCalls } from "../test/async.js";

const realDictionaryInstalled = referenceEntries.dictionaryInstalled;
let readiness;
let referenceWork;
let readinessGate;

/**
 * Attach-later for the §5 seam: a word created without its dictionary entry can gain the
 * reversible attachment from its own Detail card. "Not installed" stays silent — the control
 * only exists where it can succeed.
 */

const CASA = "dict:wiktionary-es:casa:noun";

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await db.open();
  await clearAllPersonalData();
  readiness = vi.spyOn(referenceEntries, "dictionaryInstalled");
  referenceWork = [readiness, vi.spyOn(referenceEntries, "resolveEntry"), vi.spyOn(referenceSearch, "searchDictionary")];
  readinessGate = null;
});

afterEach(async () => {
  try {
    readinessGate?.resolve();
    cleanup();
    await act(async () => { await settleAsyncCalls(...referenceWork); });
    await removeDictionary();
  } finally {
    vi.restoreAllMocks();
  }
});

async function seedDictionary() {
  const reference = refDb("a");
  await reference.entries.put(FIXTURE_ENTRIES.find((entry) => entry.id === CASA));
  await reference.formShards.bulkPut(FIXTURE_FORM_SHARDS.filter((row) => row.id === "ca"));
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: { datasetVersion: "attach-later-fixture", counts: { entries: 1 }, previousIds: {} },
  });
  setActiveSlot("a");
}

describe("DictAttachment attach-later", () => {
  it("offers attaching an unattached word and stores the pick without an edit event", async () => {
    const user = userEvent.setup();
    await seedDictionary();
    const word = await createItem(newLexical({ term: "casa" }));
    const onChanged = vi.fn();

    render(<DictAttachment item={word} onOpen={vi.fn()} onChanged={onChanged} />);

    await user.click(await screen.findByRole("button", { name: /Attach dictionary entry/ }));
    // The picker arrives pre-filled with the word's own term, so the entry is one tap away.
    expect(screen.getByPlaceholderText("Find the dictionary entry…").value).toBe("casa");
    const resultGloss = await screen.findByText("house");
    await user.click(resultGloss.closest("button"));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect((await getItem(word.id)).dictKey).toBe(CASA);
    // Attachment is bookkeeping, the same as re-attach and forget: no edit event.
    expect((await allEvents()).filter((event) => event.type === EVENT_TYPES.edit)).toEqual([]);
  });

  it.each([false, true])("settles attachment availability after dictionary readiness: installed=%s", async (installed) => {
    if (installed) await seedDictionary();
    const word = await createItem(newLexical({ term: "casa" }));
    readinessGate = deferred();
    readiness.mockImplementationOnce(async () => {
      const result = await realDictionaryInstalled();
      await readinessGate.promise;
      return result;
    });

    const { container } = render(
      <DictAttachment item={word} onOpen={vi.fn()} onChanged={vi.fn()} />
    );

    expect(readiness).toHaveBeenCalledTimes(1);
    // This was the old oracle: loading is also empty, even if the eventual state is wrong.
    expect(container.innerHTML).toBe("");
    expect(screen.queryByRole("button", { name: /Attach dictionary entry/ })).toBeNull();
    await act(async () => {
      readinessGate.resolve();
      await settleAsyncCalls(readiness);
    });
    if (installed) {
      expect(screen.getByRole("button", { name: /Attach dictionary entry/ })).toBeTruthy();
    } else {
      expect(container.innerHTML).toBe("");
      expect(screen.queryByRole("button", { name: /Attach dictionary entry/ })).toBeNull();
    }
  });

  it("still renders the attached entry row, not the attach control, once attached", async () => {
    await seedDictionary();
    const word = await createItem(newLexical({ term: "casa", dictKey: CASA }));

    render(<DictAttachment item={word} onOpen={vi.fn()} onChanged={vi.fn()} />);

    expect(await screen.findByText("house")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Attach dictionary entry/ })).toBeNull();
  });
});
