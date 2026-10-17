// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { db, clearAllPersonalData } from "./db/db.js";
import * as items from "./db/items.js";
import * as events from "./db/events.js";
import { useNotebook } from "./useNotebook.js";
import { deferred } from "./test/async.js";
import { makeEvent, makeLexical } from "./test/factories.js";

let reads;
let gates;
let word;
beforeEach(async () => {
  await clearAllPersonalData();
  word = makeLexical({ id: "user:load", term: "casa" });
  await db.items.put(word);
  await db.events.put(makeEvent({ itemKey: word.id }));
  reads = { items: vi.spyOn(items, "allItems"), events: vi.spyOn(events, "allEvents") };
  gates = [];
});

afterEach(async () => {
  cleanup();
  for (const gate of gates) gate.resolve();
  await act(async () => {
    await Promise.allSettled(Object.values(reads).flatMap((spy) => spy.mock.results.map((result) => result.value)));
  });
  vi.restoreAllMocks();
});

const gateRead = () => { const gate = deferred(); gates.push(gate); return gate; };

describe("notebook read recovery", () => {
  it.each(["items", "events"])("reports a failed initial %s read and retries the complete notebook", async (table) => {
    reads[table].mockRejectedValueOnce(new Error("read failed"));
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.error?.message).toBe("read failed"));
    expect(result.current).toMatchObject({ loading: false, hasLoaded: false, items: [], events: [] });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    expect(result.current.error).toBeNull();
    expect(result.current.items.map((item) => item.id)).toEqual([word.id]);
    expect(result.current.itemState.get(word.id).views).toBe(1);
  });

  it("retains the last full snapshot during a failed refresh and a pending retry", async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const original = result.current;
    reads.events.mockRejectedValueOnce(new Error("refresh failed"));
    await db.items.update(word.id, { term: "hogar" });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error?.message).toBe("refresh failed"));
    expect(result.current.items).toBe(original.items);
    expect(result.current.events).toBe(original.events);
    expect(result.current.itemState).toBe(original.itemState);
    expect(result.current.loading).toBe(false);
    const gate = gateRead();
    reads.items.mockImplementationOnce(async () => { await gate.promise; return db.items.toArray(); });
    act(() => result.current.reload());
    expect(result.current).toMatchObject({ hasLoaded: true, loading: false, refreshing: true });
    expect(result.current.items).toBe(original.items);
    await act(async () => gate.resolve());
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.items[0].term).toBe("hogar");
    expect(result.current.error).toBeNull();
  });

  it.each(["resolve", "reject"])("ignores an older request that later %ss", async (outcome) => {
    const gate = gateRead();
    reads.items.mockImplementationOnce(async () => { await gate.promise; return [{ ...word, term: "stale" }]; });
    const { result } = renderHook(() => useNotebook());
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const successful = result.current;
    await act(async () => {
      gate[outcome](new Error("stale failure"));
      await Promise.allSettled([reads.items.mock.results[0].value]);
    });
    expect(result.current).toBe(successful);
    expect(result.current.items[0].term).toBe("casa");
  });

  it("settles rejected reads after unmount without publishing or leaving an unhandled error", async () => {
    const gate = gateRead();
    reads.items.mockImplementationOnce(() => gate.promise);
    const rendered = vi.fn();
    const { unmount } = renderHook(() => { const state = useNotebook(); rendered(state); return state; });
    unmount();
    rendered.mockClear();
    await act(async () => {
      gate.reject(new Error("closed after unmount"));
      await Promise.allSettled([reads.items.mock.results[0].value]);
    });
    expect(rendered).not.toHaveBeenCalled();
  });
});
