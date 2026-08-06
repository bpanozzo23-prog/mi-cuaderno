// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Repaso from "./Repaso.jsx";
import { EVENT_TYPES } from "../db/events.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_CONJUGATIONS, FIXTURE_ENTRIES } from "../test/dictFixture.js";
import { makeEvent, makeLexical, makePage } from "../test/factories.js";
import { newPageGroup } from "../lib/collections.js";

const CASA = "dict:wiktionary-es:casa:noun";
const OLD_CASA = "dict:wiktionary-es:casa:noun:old";
const OLD_SACAR = "dict:wiktionary-es:sacar:verb:old";
const MISSING = "dict:wiktionary-es:missing:noun";
const at = (minute) => `2026-08-02T15:${String(minute).padStart(2, "0")}:00.000Z`;

function notebookFor(items, events, itemState = new Map()) {
  return {
    items,
    events,
    itemState,
    reload: vi.fn(),
  };
}

async function seedDictionary({ previousIds = {}, entries = [CASA] } = {}) {
  const reference = refDb("a");
  const selected = FIXTURE_ENTRIES.filter((entry) => entries.includes(entry.id));
  await Promise.all([
    reference.entries.bulkPut(selected),
    reference.meta.put({
      key: META_KEYS.dataset,
      value: {
        datasetVersion: "phase-5d-fixture",
        counts: { entries: selected.length },
        previousIds,
      },
    }),
  ]);
  setActiveSlot("a");
}

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

describe("Phase 5d actionable activity", () => {
  it("reopens active lexical items and pages through the shared selection callback", async () => {
    const user = userEvent.setup();
    const word = makeLexical({ id: "user:word", term: "madrugar" });
    const page = makePage({
      id: "user:page",
      title: "Study source",
      pageFocus: "vocabulary",
      linkedKeys: [word.id],
      collection: { enabled: true, groups: [newPageGroup("Study words", [word.id])] },
    });
    const events = [
      makeEvent({ type: EVENT_TYPES.view, itemKey: word.id, at: at(1) }),
      makeEvent({ type: EVENT_TYPES.view, itemKey: page.id, at: at(2) }),
    ];
    const itemState = new Map([
      [word.id, { views: 1, tricky: false }],
      [page.id, { views: 1, tricky: true }],
    ]);
    const onSelect = vi.fn();

    render(<Repaso notebook={notebookFor([word, page], events, itemState)} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: /Opened Study source/ }));
    expect(onSelect).toHaveBeenLastCalledWith(page.id);
    await user.click(screen.getByRole("button", { name: /Opened madrugar/ }));
    expect(onSelect).toHaveBeenLastCalledWith(word.id);

    expect(screen.getByText("Highlighted items")).toBeTruthy();
    expect(screen.getByText("Vocabulary")).toBeTruthy();
    expect(screen.getByText("1 item · 1 group")).toBeTruthy();
    expect(screen.getByText("Most opened")).toBeTruthy();
    expect(screen.getByText("opens")).toBeTruthy();
  });

  it("keeps deleted items and search misses visible but non-actionable", () => {
    const events = [
      makeEvent({ type: EVENT_TYPES.view, itemKey: "user:deleted", at: at(1) }),
      makeEvent({
        type: EVENT_TYPES.searchMiss,
        itemKey: null,
        metadata: { query: "chamarra" },
        at: at(2),
      }),
    ];

    render(<Repaso notebook={notebookFor([], events)} onSelect={vi.fn()} />);

    expect(screen.getByText("(deleted item)")).toBeTruthy();
    expect(screen.getAllByText("chamarra").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /deleted item/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Couldn't find.*chamarra/i })).toBeNull();
  });

  it("resolves current and aliased dictionary activity to the canonical entry", async () => {
    const user = userEvent.setup();
    await seedDictionary({ previousIds: { [OLD_CASA]: CASA } });
    const events = [
      makeEvent({ type: EVENT_TYPES.view, itemKey: CASA, at: at(1) }),
      makeEvent({ type: EVENT_TYPES.view, itemKey: OLD_CASA, at: at(2) }),
    ];
    const onSelect = vi.fn();

    render(<Repaso notebook={notebookFor([], events)} onSelect={onSelect} />);

    const rows = await screen.findAllByRole("button", { name: /Opened casa/ });
    expect(rows).toHaveLength(2);
    await user.click(rows[0]);
    await user.click(rows[1]);
    expect(onSelect).toHaveBeenNthCalledWith(1, CASA);
    expect(onSelect).toHaveBeenNthCalledWith(2, CASA);
    expect(screen.queryByText(/deleted/i)).toBeNull();
  });

  it("distinguishes an installed orphan from a dictionary that is not installed", async () => {
    await seedDictionary();
    const first = render(
      <Repaso
        notebook={notebookFor([], [makeEvent({ type: EVENT_TYPES.view, itemKey: MISSING })])}
        onSelect={vi.fn()}
      />
    );

    expect(await screen.findByText("(reference unavailable)")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /reference unavailable/i })).toBeNull();
    expect(screen.queryByText(/deleted/i)).toBeNull();

    first.unmount();
    await removeDictionary();
    render(
      <Repaso
        notebook={notebookFor([], [makeEvent({ type: EVENT_TYPES.view, itemKey: MISSING })])}
        onSelect={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText("(dictionary entry)")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /dictionary entry/i })).toBeNull();
    expect(screen.queryByText(/deleted/i)).toBeNull();
  });

  it("ignores unknown event types before taking the twelve most recent rows", () => {
    const known = Array.from({ length: 12 }, (_, index) =>
      makeEvent({
        type: EVENT_TYPES.searchMiss,
        metadata: { query: `missing-${index}` },
        at: at(index),
      })
    );
    const unknown = makeEvent({
      type: "future_event_type",
      itemKey: "user:anything",
      at: at(59),
    });

    render(<Repaso notebook={notebookFor([], [...known, unknown])} onSelect={vi.fn()} />);

    expect(screen.getByText("“missing-0”")).toBeTruthy();
    expect(screen.queryByText(/future_event_type/)).toBeNull();
  });
});

describe("Phase 7a/7b: how a session is set up", () => {
  const SACAR = "dict:wiktionary-es:sacar:verb";

  async function seedWithConjugations(entries) {
    await seedDictionary({ entries });
    await refDb("a").conjugations.bulkPut(FIXTURE_CONJUGATIONS);
  }

  /** Highlighting a word enrolls it, and an unreviewed word is due the same day. */
  const dueWord = (overrides) => makeLexical({ id: "user:due", ...overrides });
  const enrolls = (id) => makeEvent({ type: EVENT_TYPES.trickyOn, itemKey: id, at: at(1) });

  it("defaults to asking Spanish first, and offers the other two ways", () => {
    const word = dueWord({});
    render(<Repaso notebook={notebookFor([word], [enrolls(word.id)])} onSelect={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "es→en" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "en→es" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByRole("radio", { name: "mixed" })).toBeTruthy();
  });

  it("offers no direction control on a day with nothing due", () => {
    render(<Repaso notebook={notebookFor([dueWord({})], [])} onSelect={vi.fn()} />);

    expect(screen.queryByRole("radio", { name: "es→en" })).toBeNull();
  });

  it("builds a cloze from the owner's own example, blanking the conjugated form", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    const word = dueWord({
      term: "sacar",
      dictKey: SACAR,
      myExamples: [{ es: "Ayer saqué la basura.", en: "Yesterday I took out the trash." }],
    });

    render(<Repaso notebook={notebookFor([word], [enrolls(word.id)])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Start/ }));

    // The sentence is the question; the inflected word it contains is the answer.
    await waitFor(() => expect(screen.getByText(/Ayer/)).toBeTruthy());
    expect(screen.queryByText(/saqué/)).toBeNull();
    expect(screen.getByRole("button", { name: "Tap to see the word" })).toBeTruthy();
  });

  it("falls back to a stock dictionary example when the owner wrote none", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([CASA]);
    const word = dueWord({ term: "casa", pos: "noun", dictKey: CASA, myExamples: [] });

    render(<Repaso notebook={notebookFor([word], [enrolls(word.id)])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Start/ }));

    await waitFor(() => expect(screen.getByText(/es tu/)).toBeTruthy());
  });

  it("starts an ordinary session when no dictionary is installed at all", async () => {
    const user = userEvent.setup();
    const word = dueWord({ term: "madrugar", dictKey: SACAR, myExamples: [] });

    render(<Repaso notebook={notebookFor([word], [enrolls(word.id)])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Start/ }));

    // The reference layer is optional: a missing dictionary costs cloze, not the session.
    await waitFor(() => expect(screen.getByText("madrugar")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Tap to see the meaning" })).toBeTruthy();
  });

  it("never puts a cloze on a reverse card, which would give the word away", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    const word = dueWord({
      term: "sacar",
      dictKey: SACAR,
      myExamples: [{ es: "Ayer saqué la basura.", en: "" }],
    });

    render(<Repaso notebook={notebookFor([word], [enrolls(word.id)])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "en→es" }));
    await user.click(screen.getByRole("button", { name: /Start/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Tap to see the word" })).toBeTruthy());
    expect(screen.queryByText(/Ayer/)).toBeNull();
    expect(screen.getByText("to take out")).toBeTruthy();
  });
});

describe("Phase 7c: the conjugation drill", () => {
  const SACAR = "dict:wiktionary-es:sacar:verb";

  async function seedWithConjugations(entries, previousIds = {}) {
    await seedDictionary({ entries, previousIds });
    await refDb("a").conjugations.bulkPut(FIXTURE_CONJUGATIONS);
  }

  it("offers the drill for a verb the dictionary can conjugate", async () => {
    await seedWithConjugations([SACAR]);
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Drill/ })).toBeTruthy());
    expect(screen.getByText(/1 verb/)).toBeTruthy();
  });

  it("stays hidden for a word with no conjugation table", async () => {
    await seedWithConjugations([CASA]);
    const noun = makeLexical({ id: "user:casa", term: "casa", pos: "noun", dictKey: CASA });

    render(<Repaso notebook={notebookFor([noun], [])} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Recent activity")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Drill/ })).toBeNull();
  });

  it("stays hidden when no dictionary is installed", async () => {
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Recent activity")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Drill/ })).toBeNull();
  });

  it("keeps drilling a verb whose dictionary key moved in a rebuild", async () => {
    // §5: an alias must not quietly cost the owner a feature.
    await seedWithConjugations([SACAR], { [OLD_SACAR]: SACAR });
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: OLD_SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Drill/ })).toBeTruthy());
  });

  it("runs an ungraded drill that records nothing", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Drill/ })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Drill/ }));

    expect(screen.getByRole("button", { name: "Tap to see the form" })).toBeTruthy();
    expect(screen.getByText(/nothing here is recorded/i)).toBeTruthy();
  });
});
