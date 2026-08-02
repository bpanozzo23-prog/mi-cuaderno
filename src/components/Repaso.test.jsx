// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Repaso from "./Repaso.jsx";
import { EVENT_TYPES } from "../db/events.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_ENTRIES } from "../test/dictFixture.js";
import { makeEvent, makeLexical, makePage } from "../test/factories.js";

const CASA = "dict:wiktionary-es:casa:noun";
const OLD_CASA = "dict:wiktionary-es:casa:noun:old";
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
    const page = makePage({ id: "user:page", title: "Study source" });
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
