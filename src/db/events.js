import { db } from "./db.js";
import { newEventId } from "../lib/ids.js";
import { nowIso, localDate } from "../lib/dates.js";

/**
 * Events are the single source of truth for state and statistics (brief section 7).
 * Nothing here keeps a running counter and nothing stores a `struggling` flag —
 * every derived value below is computed from the log at read time.
 *
 * New event types may be added freely; every consumer must ignore types it
 * does not recognise, so Phase 3's review events need no changes here.
 */

export const EVENT_TYPES = {
  view: "view",
  create: "create",
  edit: "edit",
  delete: "delete",
  trickyOn: "tricky_on",
  trickyOff: "tricky_off",
  reviewPass: "review_pass",
  reviewFail: "review_fail",
  searchMiss: "search_miss",
};

export async function logEvent(type, itemKey = null, metadata = null) {
  const when = new Date();
  const event = {
    id: newEventId(),
    type,
    itemKey,
    at: nowIso(when),
    localDate: localDate(when),
    metadata,
  };
  await db.events.add(event);
  return event;
}

export async function eventsFor(itemKey) {
  return db.events.where("itemKey").equals(itemKey).sortBy("at");
}

export async function allEvents() {
  return db.events.orderBy("at").toArray();
}

/** Tricky state is derived: the most recent tricky_on/tricky_off wins. */
export function isTrickyFrom(events) {
  let tricky = false;
  let latest = "";
  for (const event of events) {
    if (event.type !== EVENT_TYPES.trickyOn && event.type !== EVENT_TYPES.trickyOff) continue;
    if (event.at >= latest) {
      latest = event.at;
      tricky = event.type === EVENT_TYPES.trickyOn;
    }
  }
  return tricky;
}

export async function isTricky(itemKey) {
  return isTrickyFrom(await eventsFor(itemKey));
}

/**
 * Derives per-item state for a whole set of items in one pass over the log,
 * so a list of 500 words costs one query rather than 500.
 * Events whose item no longer exists are ignored (brief section 7: keep the
 * history, exclude it from active queues and statistics).
 */
export function deriveItemState(events, knownKeys = null) {
  const state = new Map();
  const ensure = (key) => {
    if (!state.has(key)) state.set(key, { views: 0, lastViewedAt: null, tricky: false, trickyAt: "" });
    return state.get(key);
  };

  for (const event of events) {
    const key = event.itemKey;
    if (!key) continue;
    if (knownKeys && !knownKeys.has(key)) continue;
    const s = ensure(key);
    if (event.type === EVENT_TYPES.view) {
      s.views += 1;
      if (!s.lastViewedAt || event.at > s.lastViewedAt) s.lastViewedAt = event.at;
    } else if (event.type === EVENT_TYPES.trickyOn || event.type === EVENT_TYPES.trickyOff) {
      if (event.at >= s.trickyAt) {
        s.trickyAt = event.at;
        s.tricky = event.type === EVENT_TYPES.trickyOn;
      }
    }
  }
  return state;
}
