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
  const [state, setState] = useState({ loading: true, items: [], events: [], itemState: new Map() });
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [items, events] = await Promise.all([allItems(), allEvents()]);
      if (!alive) return;
      const knownKeys = new Set(items.map((i) => i.id));
      setState({ loading: false, items, events, itemState: deriveItemState(events, knownKeys) });
    })();
    return () => {
      alive = false;
    };
  }, [epoch]);

  const reload = useCallback(() => setEpoch((n) => n + 1), []);

  return { ...state, reload };
}

export const emptyItemState = { views: 0, lastViewedAt: null, tricky: false };
