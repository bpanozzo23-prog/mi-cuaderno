// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictDetail from "./DictDetail.jsx";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_CONJUGATIONS, FIXTURE_ENTRIES } from "../test/dictFixture.js";
import { clearAllPersonalData, db } from "../db/db.js";
import { createItem, getItem, newLexical, newPage } from "../db/items.js";

const CASA = "dict:wiktionary-es:casa:noun";
const SACAR = "dict:wiktionary-es:sacar:verb";

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await db.open();
  await clearAllPersonalData();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

async function seedDictionary(entries = [], previousIds = {}, conjugations = [], patternFamilies = []) {
  const slot = "a";
  const reference = refDb(slot);
  if (entries.length) await reference.entries.bulkPut(entries);
  if (conjugations.length) await reference.conjugations.bulkPut(conjugations);
  if (patternFamilies.length) await reference.patternFamilies.bulkPut(patternFamilies);
  await reference.meta.put({
    key: META_KEYS.dataset,
    value: {
      datasetVersion: "phase-5a-fixture",
      counts: { entries: entries.length },
      previousIds,
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

  it("keeps attachments separate from grouped, read-only ordinary connections", async () => {
    await seedDictionary(FIXTURE_ENTRIES.filter((entry) => entry.id === CASA));
    const attached = newLexical({ term: "mi casa", dictKey: CASA });
    const linked = newPage({
      title: "Home lesson",
      body: "A longer generic preview that the shared note should replace.",
      linkedKeys: [CASA],
      linkAnnotations: [{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "The source page contains this dictionary word.",
      }],
    });

    render(
      <DictDetail
        entryId={CASA}
        items={[attached, linked]}
        onBack={vi.fn()}
        onOpen={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText("casa", { selector: ".text-2xl" })).toBeTruthy();
    expect(screen.getByText(/In your cuaderno as/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "mi casa" })).toBeTruthy();
    expect(await screen.findByText("Connections")).toBeTruthy();
    expect(screen.getByText("Contains")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Home lesson/ })).toBeTruthy();
    expect(screen.getByText("The source page contains this dictionary word.")).toBeTruthy();
    expect(screen.queryByText(/longer generic preview/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit connection to Home lesson" })).toBeNull();
  });

  it("shows preserved metadata immediately while an unambiguous alias canonicalizes", async () => {
    const oldCasa = "dict:wiktionary-es:casa:old";
    await seedDictionary(
      FIXTURE_ENTRIES.filter((entry) => entry.id === CASA),
      { [oldCasa]: CASA }
    );
    const linked = newPage({
      title: "Interview source",
      linkedKeys: [oldCasa, CASA],
      linkAnnotations: [{
        targetKey: oldCasa,
        type: "found_in",
        subject: "owner",
        note: "The interview contains this word.",
      }],
    });
    linked.updatedAt = "2026-05-06T07:08:09.000Z";
    await createItem(linked);
    const onChanged = vi.fn();

    render(
      <DictDetail
        entryId={CASA}
        // Deliberately never refresh this prop: the resolver result itself must carry the moved
        // metadata instead of waiting for the parent notebook reload.
        items={[linked]}
        onBack={vi.fn()}
        onOpen={vi.fn()}
        onChanged={onChanged}
      />
    );

    expect(await screen.findByText("Contains")).toBeTruthy();
    expect(screen.getByText("The interview contains this word.")).toBeTruthy();
    await waitFor(async () => {
      const stored = await getItem(linked.id);
      expect(stored.linkedKeys).toEqual([CASA]);
      expect(stored.linkAnnotations).toEqual([{
        targetKey: CASA,
        type: "found_in",
        subject: "owner",
        note: "The interview contains this word.",
      }]);
      expect(stored.updatedAt).toBe("2026-05-06T07:08:09.000Z");
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it("shows both conflicting values read-only and leaves their raw storage untouched", async () => {
    const user = userEvent.setup();
    const oldCasa = "dict:wiktionary-es:casa:old";
    await seedDictionary(
      FIXTURE_ENTRIES.filter((entry) => entry.id === CASA),
      { [oldCasa]: CASA }
    );
    const originalAnnotations = [
      {
        targetKey: oldCasa,
        type: "found_in",
        subject: "owner",
        note: "The old source note.",
      },
      {
        targetKey: CASA,
        type: "explained_by",
        subject: "owner",
        note: "The canonical explanation.",
      },
    ];
    const linked = newPage({
      title: "Home lesson",
      linkedKeys: [oldCasa, CASA],
      linkAnnotations: originalAnnotations,
    });
    linked.updatedAt = "2026-06-07T08:09:10.000Z";
    await createItem(linked);
    const onOpen = vi.fn();

    render(
      <DictDetail
        entryId={CASA}
        items={[linked]}
        onBack={vi.fn()}
        onOpen={onOpen}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText("Connection needs resolution")).toBeTruthy();
    expect(screen.getByText("Contains")).toBeTruthy();
    expect(screen.getByText("Explains")).toBeTruthy();
    expect(screen.getByText("The old source note.")).toBeTruthy();
    expect(screen.getByText("The canonical explanation.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit connection to Home lesson" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open Home lesson to resolve" }));
    expect(onOpen).toHaveBeenCalledWith(linked.id);

    const stored = await getItem(linked.id);
    expect(stored.linkedKeys).toEqual([oldCasa, CASA]);
    expect(stored.linkAnnotations).toEqual(originalAnnotations);
    expect(stored.updatedAt).toBe("2026-06-07T08:09:10.000Z");
  });
});

describe("Phase 21 conjugation teaching", () => {
  it("derives an r2 teaching notice from the table without showing an error or siblings", async () => {
    const sacar = FIXTURE_ENTRIES.find((entry) => entry.id === SACAR);
    await seedDictionary([sacar], {}, FIXTURE_CONJUGATIONS);

    render(
      <DictDetail
        entryId={SACAR}
        items={[]}
        onBack={vi.fn()}
        onOpen={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText("What to notice")).toBeTruthy();
    expect(screen.getByText("c becomes qu before e")).toBeTruthy();
    expect(screen.queryByText("Shares this pattern")).toBeNull();
    expect(screen.queryByText(/orphan|error|incomplete/i)).toBeNull();
  });

  it("opens a packaged family sibling through the existing onOpen callback", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const sacar = FIXTURE_ENTRIES.find((entry) => entry.id === SACAR);
    const buscar = {
      id: "dict:fixture:buscar:verb",
      lemma: "buscar",
      pos: "verb",
      senses: [{ gloss: "to look for" }],
      conjugationId: "conj:fixture:buscar",
      freqRank: 50,
    };
    await seedDictionary(
      [sacar, buscar],
      {},
      FIXTURE_CONJUGATIONS,
      [{ id: "spelling:c-qu", memberIds: [SACAR, buscar.id] }]
    );

    render(
      <DictDetail
        entryId={SACAR}
        items={[]}
        onBack={vi.fn()}
        onOpen={onOpen}
        onChanged={vi.fn()}
      />
    );

    expect(await screen.findByText("Shares this pattern")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "buscar" }));
    expect(onOpen).toHaveBeenCalledWith(buscar.id);
  });
});
