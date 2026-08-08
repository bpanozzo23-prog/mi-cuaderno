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
import { addDaysToLocalDate, localDate } from "../lib/dates.js";

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

describe("Phase 10a/10b: how a session is set up", () => {
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

  it("builds the same cloze when the attached dictionary key moved", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    await refDb("a").meta.put({
      key: META_KEYS.dataset,
      value: {
        datasetVersion: "phase-10-alias-fixture",
        counts: { entries: 1 },
        previousIds: { [OLD_SACAR]: SACAR },
      },
    });
    const word = dueWord({
      term: "sacar",
      dictKey: OLD_SACAR,
      myExamples: [{ es: "Ayer saqué la basura.", en: "Yesterday I took out the trash." }],
    });

    render(<Repaso notebook={notebookFor([word], [enrolls(word.id)])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Start/ }));

    await waitFor(() => expect(screen.getByText(/Ayer/)).toBeTruthy());
    expect(screen.queryByText(/saqué/)).toBeNull();
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

describe("Phase 10c: the conjugation drill", () => {
  const SACAR = "dict:wiktionary-es:sacar:verb";

  async function seedWithConjugations(entries, previousIds = {}) {
    await seedDictionary({ entries, previousIds });
    await refDb("a").conjugations.bulkPut(FIXTURE_CONJUGATIONS);
  }

  it("always offers the Conjugation Gym entry", async () => {
    await seedWithConjugations([SACAR]);
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
    expect(screen.getByText("Conjugation Gym")).toBeTruthy();
  });

  it("stays visible for a word with no conjugation table", async () => {
    await seedWithConjugations([CASA]);
    const noun = makeLexical({ id: "user:casa", term: "casa", pos: "noun", dictKey: CASA });

    render(<Repaso notebook={notebookFor([noun], [])} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Open" })).toBeTruthy();
  });

  it("opens to an honest unavailable state when no dictionary is installed", async () => {
    const user = userEvent.setup();
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByText("Dictionary not installed")).toBeTruthy());
  });

  it("keeps drilling a verb whose dictionary key moved in a rebuild", async () => {
    // §5: an alias must not quietly cost the owner a feature.
    await seedWithConjugations([SACAR], { [OLD_SACAR]: SACAR });
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: OLD_SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Saved" }).disabled).toBe(false));
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    expect(screen.getByText(/1 saved verb available/)).toBeTruthy();
  });

  it("runs a graded drill, and no longer promises that nothing is recorded", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Saved" })).toBeTruthy());
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.click(screen.getByRole("radio", { name: "Reveal" }));
    await user.click(screen.getByRole("button", { name: "Start quick session" }));

    expect(screen.getByRole("button", { name: "Tap to see the form" })).toBeTruthy();
    // Phase 13 records drill answers, so the old reassurance would now be a lie. Asserted
    // as an absence on both screens because stale copy is invisible to every other test.
    expect(screen.queryByText(/nothing here is recorded/i)).toBeNull();
    expect(screen.queryByText(/nothing is recorded/i)).toBeNull();
  });

  it("reloads the notebook as soon as a drill answer is recorded", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    const notebook = notebookFor([verb], []);

    render(<Repaso notebook={notebook} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Saved" })).toBeTruthy());
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.click(screen.getByRole("radio", { name: "Reveal" }));
    await user.click(screen.getByRole("button", { name: "Start quick session" }));
    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Got it" }));

    await waitFor(() => expect(notebook.reload).toHaveBeenCalledTimes(1));
  });
});

describe("Phase 11 stats on the daily screen", () => {
  // These derivations read the real clock, so fixtures are built relative to it rather
  // than from fixed dates that would silently rot as the calendar moves past them.
  const today = localDate();
  const dayBefore = (n) => addDaysToLocalDate(today, -n);
  const on = (day, type = EVENT_TYPES.view, overrides = {}) =>
    makeEvent({ type, at: `${day}T10:00:00.000Z`, localDate: day, ...overrides });

  const pass = (key, day) =>
    on(day, EVENT_TYPES.reviewPass, { itemKey: key, metadata: { grade: 2 } });

  it("counts a streak of consecutive days ending today", async () => {
    const word = makeLexical({ id: "user:word" });
    const events = [on(today), on(dayBefore(1)), on(dayBefore(2))];

    render(<Repaso notebook={notebookFor([word], events)} onSelect={vi.fn()} />);

    const tile = screen.getByText("day streak").parentElement;
    expect(tile.textContent).toContain("3");
  });

  it("keeps the streak alive on a day the owner has not opened anything yet", async () => {
    const word = makeLexical({ id: "user:word" });
    const events = [on(dayBefore(1)), on(dayBefore(2))];

    render(<Repaso notebook={notebookFor([word], events)} onSelect={vi.fn()} />);

    const tile = screen.getByText("day streak").parentElement;
    expect(tile.textContent).toContain("2");
  });

  it("puts a word that was just missed in box 1", async () => {
    const word = makeLexical({ id: "user:word" });
    const events = [on(today, EVENT_TYPES.reviewFail, { itemKey: "user:word", metadata: { grade: 0 } })];

    render(<Repaso notebook={notebookFor([word], events)} onSelect={vi.fn()} />);

    const bar = screen.getByText("Box 1").parentElement;
    expect(bar.textContent).toContain("1");
    expect(screen.getByText("Box 5").parentElement.textContent).toContain("0");
  });

  it("counts a word that walked the whole ladder as retired rather than as box 5", async () => {
    const word = makeLexical({ id: "user:word" });
    // Five passes climb boxes 1→5; the sixth retires it (review.js replayReviews).
    const events = [5, 4, 3, 2, 1, 0].map((n) => pass("user:word", dayBefore(n + 20)));

    render(<Repaso notebook={notebookFor([word], events)} onSelect={vi.fn()} />);

    expect(screen.getByText("Retired").parentElement.textContent).toContain("1");
    expect(screen.getByText("Box 5").parentElement.textContent).toContain("0");
  });

  it("says nothing about the ladder when nothing is enrolled", async () => {
    const word = makeLexical({ id: "user:word" });

    render(<Repaso notebook={notebookFor([word], [])} onSelect={vi.fn()} />);

    expect(screen.queryByText("Box 1")).toBeNull();
    expect(screen.queryByText("Retired")).toBeNull();
  });
});

describe("Phase 11 Estadísticas sub-view", () => {
  it("swaps in the calendar and comes back with the daily screen intact", async () => {
    const user = userEvent.setup();
    const word = makeLexical({ id: "user:word" });

    render(<Repaso notebook={notebookFor([word], [])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Actividad y crecimiento/ }));

    expect(screen.getByText("Actividad")).toBeTruthy();
    expect(screen.queryByText("Para hoy")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Repaso/ }));

    expect(screen.getByText("Para hoy")).toBeTruthy();
    expect(screen.queryByText("Actividad")).toBeNull();
  });

  it("switches directly from general stats into dedicated Gym performance", async () => {
    const user = userEvent.setup();
    const drillEvent = makeEvent({
      type: EVENT_TYPES.drillPass,
      itemKey: "user:ser",
      metadata: {
        mode: "typed",
        stage: "initial",
        verdict: "exact",
        diagnosis: "exact",
        tense: "Indicative/Present",
        slot: "yo",
        verbKey: "lemma:ser",
        lemma: "ser",
        source: "saved",
      },
    });
    render(<Repaso notebook={notebookFor([], [drillEvent])} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Actividad y crecimiento/ }));
    await user.click(screen.getByRole("button", { name: /Conjugation Gym/ }));

    expect(screen.getByText("Conjugation performance")).toBeTruthy();
    expect(screen.queryByText("Actividad")).toBeNull();
  });
});

describe("Phase 14: choosing how the Gym asks", () => {
  // Redeclared rather than shared: the Phase 10a block scopes its own copies, and reaching
  // across describes would couple two suites that are otherwise independent.
  const SACAR = "dict:wiktionary-es:sacar:verb";

  async function seedWithConjugations(entries) {
    await seedDictionary({ entries });
    await refDb("a").conjugations.bulkPut(FIXTURE_CONJUGATIONS);
  }

  it("defaults to Type, and carries the choice into the session", async () => {
    const user = userEvent.setup();
    await seedWithConjugations([SACAR]);
    const verb = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });

    render(<Repaso notebook={notebookFor([verb], [])} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "Saved" })).toBeTruthy());
    expect(screen.getByRole("radio", { name: "Type" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Reveal" }).getAttribute("aria-checked")).toBe("false");

    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.click(screen.getByRole("button", { name: "Start quick session" }));

    // The chosen mode reached the drill: typed asks for the form instead of revealing it.
    expect(screen.getByLabelText("Type the form")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tap to see the form" })).toBeNull();
  });
});
