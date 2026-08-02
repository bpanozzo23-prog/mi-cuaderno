// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictDetail from "./DictDetail.jsx";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES } from "../test/dictFixture.js";

const CASA = "dict:wiktionary-es:casa:noun";

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

async function seedDictionary(entries = []) {
  const slot = "a";
  const reference = refDb(slot);
  if (entries.length) await reference.entries.bulkPut(entries);
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: {
      datasetVersion: "phase-5a-fixture",
      counts: { entries: entries.length },
      previousIds: {},
    },
  });
  setActiveSlot(slot);
}

describe("Phase 5a dictionary detail continuity", () => {
  it("keeps the trail-aware back action available while a seeded entry loads", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    await seedDictionary(FIXTURE_ENTRIES.filter((entry) => entry.id === CASA));

    render(
      <DictDetail
        entryId={CASA}
        items={[]}
        onBack={onBack}
        backLabel="Atrás"
        onOpen={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    const loadingBack = screen.getByRole("button", { name: "Atrás" });
    expect(screen.getByText("Looking that up…")).toBeTruthy();
    await user.click(loadingBack);
    expect(onBack).toHaveBeenCalledOnce();
    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();
  });

  it("keeps the back action when a dictionary key is no longer present", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    await seedDictionary();

    render(
      <DictDetail
        entryId="dict:wiktionary-es:missing:noun"
        items={[]}
        onBack={onBack}
        backLabel="Atrás"
        onOpen={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText(/not in the installed dataset/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
