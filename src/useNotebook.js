import { useCallback, useEffect, useState } from "react";
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
    items: [], events: [], itemState: new Map(),
  });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((previous) => ({
      ...previous, loading: !previous.hasLoaded, refreshing: previous.hasLoaded, error: null,
    }));
    (async () => {
      try {
        const [items, events] = await Promise.all([allItems(), allEvents()]);
        if (!alive) return;
        const knownKeys = new Set(items.map((i) => i.id));
        setState({
          loading: false, hasLoaded: true, refreshing: false, error: null,
          items, events, itemState: deriveItemState(events, knownKeys),
        });
      } catch (error) {
        if (!alive) return;
        // Keep the last successful snapshot: a read failure is never an empty notebook.
        setState((previous) => ({ ...previous, loading: false, refreshing: false, error }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [epoch]);

  const reload = useCallback(() => setEpoch((n) => n + 1), []);

  return { ...state, reload };
}

export const emptyItemState = { views: 0, lastViewedAt: null, tricky: false };
