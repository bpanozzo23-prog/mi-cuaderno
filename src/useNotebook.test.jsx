// @vitest-environment jsdom
import { StrictMode, Suspense, useLayoutEffect } from "react";
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
    act(() => { result.current.reload(); });
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
    act(() => { result.current.reload(); });
    await waitFor(() => expect(result.current.error?.message).toBe("refresh failed"));
    expect(result.current.items).toBe(original.items);
    expect(result.current.events).toBe(original.events);
    expect(result.current.itemState).toBe(original.itemState);
    expect(result.current.loading).toBe(false);
    const gate = gateRead();
    reads.items.mockImplementationOnce(async () => { await gate.promise; return db.items.toArray(); });
    act(() => { result.current.reload(); });
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
    act(() => { result.current.reload(); });
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

describe("awaitable notebook refresh", () => {
  it("waits for both reads and the committed snapshot, keeping reload stable", async () => {
    let committed;
    let allowCommit = false;
    const commitGate = gateRead();
    const { result } = renderHook(() => {
      const notebook = useNotebook();
      useLayoutEffect(() => { committed = notebook; });
      // Hold React's commit after reads finish, independently of database timing.
      if (notebook.items[0]?.term === "hogar" && !allowCommit) throw commitGate.promise;
      return notebook;
    }, { wrapper: ({ children }) => <Suspense fallback="Waiting">{children}</Suspense> });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const reload = result.current.reload;
    const itemGate = gateRead();
    const eventGate = gateRead();
    reads.items.mockImplementationOnce(() => itemGate.promise);
    reads.events.mockImplementationOnce(() => eventGate.promise);
    const finished = vi.fn(() => committed.items[0].term);
    let completion;
    act(() => { completion = reload().then(finished); });
    expect(finished).not.toHaveBeenCalled();
    await act(async () => { itemGate.resolve([{ ...word, term: "hogar" }]); });
    expect(finished).not.toHaveBeenCalled();
    await act(async () => { eventGate.resolve([]); });
    expect(finished).not.toHaveBeenCalled();
    expect(committed.items[0].term).toBe("casa");
    await act(async () => { allowCommit = true; commitGate.resolve(); });
    await waitFor(() => expect(finished).toHaveBeenCalledWith({ status: "loaded" }));
    expect(await completion).toBe("hogar");
    expect(committed.events).toEqual([]);
    expect(committed.itemState.get(word.id)).toBeUndefined();
    expect(result.current.reload).toBe(reload);
  });

  it("coalesces same-turn callers into reads started after their writes", async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    await db.items.update(word.id, { term: "hogar" });
    const before = reads.items.mock.calls.length;
    let first, second;
    act(() => {
      first = result.current.reload();
      second = result.current.reload();
    });
    await waitFor(() => expect(result.current.items[0].term).toBe("hogar"));
    expect(await first).toEqual({ status: "loaded" });
    expect(await second).toEqual({ status: "loaded" });
    expect(reads.items).toHaveBeenCalledTimes(before + 1);
  });

  it.each(["resolve", "reject"])("keeps superseded waiters pending when an older read %ss", async (outcome) => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const oldGate = gateRead();
    const newGate = gateRead();
    reads.items.mockImplementationOnce(() => oldGate.promise).mockImplementationOnce(() => newGate.promise);
    const settled = vi.fn();
    act(() => { result.current.reload().then(settled); });
    act(() => { result.current.reload().then(settled); });
    await act(async () => {
      oldGate[outcome](outcome === "resolve" ? [{ ...word, term: "stale" }] : new Error("old"));
    });
    expect(settled).not.toHaveBeenCalled();
    expect(result.current.items[0].term).toBe("casa");
    await act(async () => { newGate.resolve([{ ...word, term: "newest" }]); });
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(2));
    expect(settled).toHaveBeenNthCalledWith(1, { status: "loaded" });
    expect(result.current.items[0].term).toBe("newest");
  });

  it("settles every waiter on the newest failure, preserves the snapshot, and allows retry", async () => {
    const { result } = renderHook(() => useNotebook());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const original = result.current;
    const oldGate = gateRead();
    const newGate = gateRead();
    reads.items.mockImplementationOnce(() => oldGate.promise).mockImplementationOnce(() => newGate.promise);
    const settled = vi.fn();
    act(() => { result.current.reload().then(settled); });
    act(() => { result.current.reload().then(settled); });
    const error = new Error("latest failed");
    await act(async () => { newGate.reject(error); });
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(2));
    expect(settled).toHaveBeenNthCalledWith(1, { status: "failed", error });
    expect(settled).toHaveBeenNthCalledWith(2, { status: "failed", error });
    expect(result.current.items).toBe(original.items);
    expect(result.current.events).toBe(original.events);
    expect(result.current.itemState).toBe(original.itemState);
    act(() => { result.current.reload().then(settled); });
    await waitFor(() => expect(settled).toHaveBeenCalledTimes(3));
    expect(settled).toHaveBeenLastCalledWith({ status: "loaded" });
    expect(result.current.error).toBeNull();
  });

  it("cancels outstanding and later calls after unmount, including under StrictMode", async () => {
    const { result, unmount } = renderHook(() => useNotebook(), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const reload = result.current.reload;
    const gate = gateRead();
    reads.items.mockImplementationOnce(() => gate.promise);
    let completion;
    act(() => { completion = reload(); });
    unmount();
    expect(await completion).toEqual({ status: "cancelled" });
    expect(await reload()).toEqual({ status: "cancelled" });
    await act(async () => { gate.reject(new Error("late failure")); });
  });
});


it.each(["loaded", "failed"])("does not publish a queued older snapshot when the newer refresh %s", async (outcome) => {
  const commitGate = gateRead();
  const attempted = vi.fn();
  const committed = vi.fn();
  const { result } = renderHook(() => {
    const notebook = useNotebook();
    useLayoutEffect(() => { committed(notebook); });
    if (notebook.items[0]?.term === "stale") {
      attempted();
      throw commitGate.promise;
    }
    return notebook;
  }, { wrapper: ({ children }) => <Suspense fallback="Waiting">{children}</Suspense> });
  await waitFor(() => expect(result.current.hasLoaded).toBe(true));
  const reload = result.current.reload;
  const oldGate = gateRead();
  const newGate = gateRead();
  reads.items.mockImplementationOnce(() => oldGate.promise).mockImplementationOnce(() => newGate.promise);
  const settled = vi.fn();
  act(() => { reload().then(settled); });
  await act(async () => { oldGate.resolve([{ ...word, term: "stale" }]); });
  expect(attempted).toHaveBeenCalled();
  act(() => { reload().then(settled); });
  expect(result.current.items[0].term).toBe("casa");
  expect(result.current.refreshing).toBe(true);
  expect(settled).not.toHaveBeenCalled();
  await act(async () => {
    commitGate.resolve();
    if (outcome === "loaded") newGate.resolve([{ ...word, term: "newest" }]);
    else newGate.reject(new Error("Newest failed"));
  });
  await waitFor(() => expect(settled).toHaveBeenCalledTimes(2));
  expect(result.current.items[0].term).toBe(outcome === "loaded" ? "newest" : "casa");
  expect(committed.mock.calls.some(([value]) => value.items[0]?.term === "stale")).toBe(false);
});
