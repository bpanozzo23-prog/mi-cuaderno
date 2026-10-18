import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { allItems } from "./db/items.js";
import { allEvents, deriveItemState } from "./db/events.js";

/**
 * Loads the notebook and re-derives per-item state (views, tricky) from the event
 * log on every change. Deliberately a full reload rather than incremental patching:
 * a personal notebook is small, and one code path means the screen can never drift
 * out of step with what the log actually says.
 */
export function useNotebook() {
  const [state, setState] = useState({
    loading: true, hasLoaded: false, refreshing: false, error: null,
    items: [], events: [], itemState: new Map(), completion: null,
  });
  const [epoch, setEpoch] = useState(0);
  const committed = useRef(state);

  const requested = useRef(0);
  const mounted = useRef(true);
  const waiters = useRef([]);

  useEffect(() => {
    mounted.current = true;
    const pending = waiters.current;
    return () => {
      mounted.current = false;
      for (const resolve of pending.splice(0)) resolve({ status: "cancelled" });
    };
  }, []);

  useLayoutEffect(() => {
    if ((state.completion?.epoch ?? 0) === requested.current) committed.current = state;
  }, [state]);

  // Resolve after React commits the accepted snapshot, never just after scheduling it.
  useEffect(() => {
    if (!state.completion || state.completion.epoch !== requested.current) return;
    for (const resolve of waiters.current.splice(0)) resolve(state.completion.result);
  }, [state.completion]);

  useEffect(() => {
    let alive = true;
    if (epoch !== requested.current) return;
    setState((previous) => ({
      ...previous, loading: !previous.hasLoaded, refreshing: previous.hasLoaded, error: null,
    }));
    (async () => {
      try {
        const [items, events] = await Promise.all([allItems(), allEvents()]);
        if (!alive || epoch !== requested.current) return;
        const knownKeys = new Set(items.map((i) => i.id));
        const itemState = deriveItemState(events, knownKeys);
        setState((previous) => epoch !== requested.current ? previous : ({
          loading: false, hasLoaded: true, refreshing: false, error: null,
          items, events, itemState,
          completion: { epoch, result: { status: "loaded" } },
        }));
      } catch (error) {
        if (!alive || epoch !== requested.current) return;
        // Keep the last successful snapshot: a read failure is never an empty notebook.
        setState((previous) => epoch !== requested.current ? previous : ({
          ...committed.current, loading: false, refreshing: false, error,
          completion: { epoch, result: { status: "failed", error } },
        }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [epoch]);

  // A refresh failure is a fulfilled outcome: fire-and-forget callers are safe, and
  // a committed write must never look like a failed save. Superseded callers follow
  // the newest request, whose reads must start after every coalesced reload call.
  const reload = useCallback(() => {
    if (!mounted.current) return Promise.resolve({ status: "cancelled" });
    const promise = new Promise((resolve) => waiters.current.push(resolve));
    requested.current += 1;
    setEpoch(requested.current);
    return promise;
  }, []);

  // React may already have evaluated a read's state update before a newer reload
  // invalidates it. Do not expose that queued snapshot (or its route-pruning authority).
  const current = (state.completion?.epoch ?? 0) === requested.current
    ? state
    : { ...committed.current, loading: !committed.current.hasLoaded,
      refreshing: committed.current.hasLoaded, error: null };
  const { completion: _completion, ...snapshot } = current;
  return { ...snapshot, reload };
}

export const emptyItemState = { views: 0, lastViewedAt: null, tricky: false };
