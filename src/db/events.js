import { db } from "./db.js";
import { newEventId } from "../lib/ids.js";
import { nowIso, localDate } from "../lib/dates.js";
import { PASS_GRADE, FAIL_GRADE } from "../lib/review.js";

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
  drillPass: "drill_pass",
  drillFail: "drill_fail",
};

/**
 * A detail screen opened again within this window does not count as a second
 * lookup (brief section 7). Rerenders, edit toggles and hopping back from a
 * linked item must not inflate the count — only genuinely returning to a word
 * later should.
 */
export const SESSION_WINDOW_MINUTES = 30;

export async function logEvent(type, itemKey = null, metadata = null, when = new Date()) {
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

/**
 * Records a lookup, unless one was already recorded for this item inside the
 * session window. Returns the event when it logged one, otherwise null.
 *
 * The check and the write share one transaction on purpose. Two calls arriving
 * together — React re-invoking an effect, or a fast double-tap — would otherwise
 * both read "no view yet" and both write one, which is exactly the inflated count
 * the session window exists to prevent. Transactions with the same scope run in
 * sequence, so the second call sees the first one's event.
 */
export async function logView(itemKey, now = new Date()) {
  return db.transaction("rw", db.events, async () => {
    const previous = await db.events.where("itemKey").equals(itemKey).toArray();
    const lastView = previous
      .filter((e) => e.type === EVENT_TYPES.view)
      .reduce((latest, e) => (!latest || e.at > latest.at ? e : latest), null);

    if (lastView) {
      const elapsedMinutes = (now.getTime() - new Date(lastView.at).getTime()) / 60000;
      if (elapsedMinutes < SESSION_WINDOW_MINUTES) return null;
    }
    return logEvent(EVENT_TYPES.view, itemKey, null, now);
  });
}

/**
 * Records one review. The UI offers pass and fail, but the log stores a grade on
 * section 7's 4-point scale (0 again / 1 hard / 2 good / 3 easy) so a richer scheduler
 * fitted later has the full history to work from rather than two coarse buckets.
 *
 * `details` records how the card was asked (Phase 10a): direction (forward | reverse)
 * and face (plain | cloze). Same reasoning as the grade — a per-direction scheduler
 * fitted later needs to know which way each historical card faced, and that cannot be
 * reconstructed afterwards. Additive metadata on the existing event types; consumers
 * that predate it simply do not read it. The grade is spread last so no detail can
 * ever overwrite it.
 */
export async function logReview(itemKey, passed, details = null, when = new Date()) {
  // A Date landing in the details slot is the pre-Phase-10 three-argument call. Spreading
  // one yields no keys, so without this the timestamp would be silently replaced by "now"
  // and the metadata would look perfectly correct — the worst kind of wrong.
  if (details instanceof Date) return logReview(itemKey, passed, null, details);

  return logEvent(
    passed ? EVENT_TYPES.reviewPass : EVENT_TYPES.reviewFail,
    itemKey,
    { ...(details || {}), grade: passed ? PASS_GRADE : FAIL_GRADE },
    when
  );
}

/**
 * Records one conjugation drill answer (Phase 13).
 *
 * Separate types from `review_pass`/`review_fail` on purpose. A Leitner box answers "do I
 * know what this word means"; getting *pusieron* wrong is a different fact about the same
 * word, and sharing the types would make one box number mean two things. Phase 10c's
 * decision that the drill records nothing at all is deliberately reversed here at the
 * owner's request; §14's deferral names *Collection* practice, which this is not.
 *
 * `itemKey` is a personal item id when the answer came from Saved, or when exactly one
 * surviving personal item attaches to a Core verb. Otherwise it is null — never a `dict:`
 * key. Stable verb history lives in metadata.verbKey (`lemma:<canonical lemma>`), while a
 * replaceable reference id remains context rather than ownership.
 *
 * Phase 14 details also identify the session/prompt, lemma, source/curriculum and attempt
 * stage. The raw typed answer is intentionally absent. Mode matters most: a self-reported
 * "got it" and an exact string match are different measurements, and retries must never be
 * mistaken for first-attempt accuracy.
 */
export async function logDrill(itemKey, passed, details = null, when = new Date()) {
  // Same guard as logReview: a Date in the details slot would spread to no keys and
  // silently become "now", leaving metadata that looks perfectly correct.
  if (details instanceof Date) return logDrill(itemKey, passed, null, details);

  return logEvent(
    passed ? EVENT_TYPES.drillPass : EVENT_TYPES.drillFail,
    itemKey,
    { ...(details || {}) },
    when
  );
}

export async function toggleTricky(itemKey, currentlyTricky, when = new Date()) {
  return db.transaction("rw", db.events, async () => {
    const previous = await db.events.where("itemKey").equals(itemKey).toArray();
    const latestTrickyMs = previous
      .filter((event) => event.type === EVENT_TYPES.trickyOn || event.type === EVENT_TYPES.trickyOff)
      .reduce((latest, event) => Math.max(latest, Date.parse(event.at)), Number.NEGATIVE_INFINITY);
    const requestedMs = when.getTime();
    // ISO timestamps have millisecond precision. Keep consecutive toggles strictly ordered so
    // an immediate on→off sequence cannot be reconstructed in primary-key order by accident.
    const effectiveWhen = new Date(requestedMs <= latestTrickyMs ? latestTrickyMs + 1 : requestedMs);
    return logEvent(currentlyTricky ? EVENT_TYPES.trickyOff : EVENT_TYPES.trickyOn, itemKey, null, effectiveWhen);
  });
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
