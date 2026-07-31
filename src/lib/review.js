import { localDate, addDaysToLocalDate } from "./dates.js";

/**
 * The Phase 3 review queue (brief section 12), derived — like everything else in
 * this app — from the event log rather than from stored state.
 *
 * LEITNER BOXES, once: a word sits in one of five numbered boxes. Passing a review
 * moves it up one box and each higher box waits longer before the word comes back;
 * failing sends it to box 1. That is the whole scheduler. Section 14 defers anything
 * cleverer, so nothing here tries to be.
 *
 * Why derived and not stored: section 7 makes the log the single source of truth —
 * "no running counters, and no stored state flags". A box number IS the review
 * history, replayed; storing it would create the first place in this app where a
 * stored value and the log could disagree. Section 7 already requires the full grade
 * history to be logged so a better scheduler can be fitted later, which only works if
 * the history is sufficient to recompute everything — so the stored box would be a
 * cache, not a source. Deriving it costs one pass over a log this app already loads
 * whole on every change.
 *
 * These functions are pure and take no database: `today` is passed in, so tests can
 * stand at any date and the caller never has two clocks disagreeing (the lesson from
 * logEvent in Phase 1d).
 */

/**
 * Days a word waits after a successful review, by box. Classic doubling: a word you
 * just missed comes back tomorrow, one you have passed five times waits over two weeks.
 */
export const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16];
export const MAX_BOX = LEITNER_INTERVALS_DAYS.length;

/** Section 7's locked 4-point scale. The UI shows pass/fail; the log records the grade. */
export const GRADES = { again: 0, hard: 1, good: 2, easy: 3 };
export const PASS_GRADE = GRADES.good;
export const FAIL_GRADE = GRADES.again;

/**
 * "Repeatedly looked up" means distinct DAYS, not raw views: coming back to a word on
 * three separate days is evidence it has not stuck, where three visits in one sitting
 * is one sitting. The session window (30 minutes) already thins those, but a day is
 * the honest unit — and section 7 makes localDate the unit daily queues group by.
 */
export const LOOKUP_ENROLL_DISTINCT_DAYS = 3;
export const LOOKUP_WINDOW_DAYS = 30;

/**
 * A dictionary entry the owner keeps opening is suggested for the cuaderno at this many
 * views. Views rather than days, because this is a nudge and not an enrollment: the
 * enrollment decision stays behind the owner's tap.
 */
export const DICT_SUGGEST_MIN_VIEWS = 3;
export const DICT_SUGGEST_LIMIT = 5;

const VIEW = "view";
const TRICKY_ON = "tricky_on";
const TRICKY_OFF = "tricky_off";
const REVIEW_PASS = "review_pass";
const REVIEW_FAIL = "review_fail";

const isDictKey = (key) => typeof key === "string" && key.startsWith("dict:");

/** The first day of the trailing window, inclusive of today. */
export function lookupWindowStart(today) {
  return addDaysToLocalDate(today, -(LOOKUP_WINDOW_DAYS - 1));
}

/**
 * Replays one item's review events into a box, a graduation flag, and the moment it
 * graduated. Passing while already in the top box retires the word rather than pinning
 * it there forever: the queue should be the words currently giving trouble, not a tax
 * that only grows. A retired word re-enters through the ordinary rules and resumes at
 * box 5, so one pass retires it again and one fail sends it down the whole ladder.
 */
function replayReviews(reviews) {
  let box = 1;
  let graduated = false;
  let graduatedAt = null;

  for (const event of reviews) {
    if (event.type === REVIEW_PASS) {
      if (box >= MAX_BOX) {
        graduated = true;
        graduatedAt = event.at;
      } else {
        box += 1;
        graduated = false;
        graduatedAt = null;
      }
    } else {
      box = 1;
      graduated = false;
      graduatedAt = null;
    }
  }

  const last = reviews[reviews.length - 1] || null;
  return { box, graduated, graduatedAt, reviews: reviews.length, lastReview: last };
}

export const emptyReviewState = {
  enrolled: false,
  reason: null,
  box: 1,
  dueDate: null,
  due: false,
  graduated: false,
  reviews: 0,
  lastReviewedAt: null,
  lookupDays: 0,
  tricky: false,
};

/**
 * Per-item review state for the whole notebook, in one pass over the log.
 *
 * Only lexical items are reviewable. Pages are excluded even when flagged tricky:
 * a page has no answer side to test yourself against, and section 12 says words. They
 * keep their place in Repaso's tricky list.
 *
 * Views logged under an item's attached dictKey count as lookups of that item. This is
 * the section 5 seam applied to events — the same move Phase 2e made in search, where a
 * dictionary result whose entry is attached becomes the owner's own item. It is what
 * lets a word the owner kept looking up in the dictionary arrive in the queue already
 * warm on the day they add it.
 *
 * Events whose item no longer exists are ignored (section 7: keep the history, exclude
 * it from active queues and statistics).
 */
export function deriveReviewState(items, events, today = localDate()) {
  const lexical = items.filter((item) => item.type === "lexical");
  const byId = new Map(lexical.map((item) => [item.id, item]));

  // One dictionary entry may be attached from more than one personal item; a lookup of
  // that entry is a lookup of each of them.
  const byDictKey = new Map();
  for (const item of lexical) {
    if (!item.dictKey) continue;
    if (!byDictKey.has(item.dictKey)) byDictKey.set(item.dictKey, []);
    byDictKey.get(item.dictKey).push(item.id);
  }

  const windowStart = lookupWindowStart(today);
  const acc = new Map();
  const ensure = (id) => {
    if (!acc.has(id)) acc.set(id, { views: [], reviews: [], tricky: false, trickyAt: "" });
    return acc.get(id);
  };

  for (const event of events) {
    const key = event.itemKey;
    if (!key) continue;

    if (event.type === VIEW) {
      if (event.localDate < windowStart) continue;
      const owners = byId.has(key) ? [key] : byDictKey.get(key) || [];
      for (const id of owners) ensure(id).views.push(event);
      continue;
    }

    // Everything else is personal-layer only: the dictionary has no tricky flag and
    // reviews are always logged against the owner's own item.
    if (!byId.has(key)) continue;

    if (event.type === REVIEW_PASS || event.type === REVIEW_FAIL) {
      ensure(key).reviews.push(event);
    } else if (event.type === TRICKY_ON || event.type === TRICKY_OFF) {
      const s = ensure(key);
      if (event.at >= s.trickyAt) {
        s.trickyAt = event.at;
        s.tricky = event.type === TRICKY_ON;
      }
    }
  }

  const states = new Map();
  const reviewedTodayIds = new Set();

  for (const item of lexical) {
    const raw = acc.get(item.id);
    if (!raw) {
      states.set(item.id, { ...emptyReviewState });
      continue;
    }

    const reviews = [...raw.reviews].sort((a, b) => a.at.localeCompare(b.at));
    const replayed = replayReviews(reviews);

    for (const event of reviews) {
      if (event.localDate === today) reviewedTodayIds.add(item.id);
    }

    // A graduated word starts counting lookups afresh: the three days that bring it
    // back have to be three days since it was retired, not three from before.
    const lookupDays = new Set(
      raw.views
        .filter((event) => !replayed.graduatedAt || event.at > replayed.graduatedAt)
        .map((event) => event.localDate)
    );

    const inLadder = replayed.reviews > 0 && !replayed.graduated;
    const lookedUpOften = lookupDays.size >= LOOKUP_ENROLL_DISTINCT_DAYS;
    const enrolled = raw.tricky || lookedUpOften || inLadder;

    // The reason answers "why is this word in front of me". The owner's own highlighter
    // is the most direct answer, so it wins where more than one applies.
    const reason = !enrolled ? null : raw.tricky ? "tricky" : lookedUpOften ? "lookups" : "reviewing";

    const dueDate = replayed.lastReview
      ? addDaysToLocalDate(replayed.lastReview.localDate, LEITNER_INTERVALS_DAYS[replayed.box - 1])
      : today;

    states.set(item.id, {
      enrolled,
      reason,
      box: replayed.box,
      dueDate,
      due: enrolled && dueDate <= today,
      graduated: replayed.graduated,
      reviews: replayed.reviews,
      lastReviewedAt: replayed.lastReview?.at || null,
      lookupDays: lookupDays.size,
      tricky: raw.tricky,
    });
  }

  /**
   * Most overdue first, then the shakiest box, then alphabetical so the order is stable
   * from one render to the next. A word reviewed today has moved past today by
   * arithmetic alone — there is no "already done" list to keep in step with the log.
   */
  const due = lexical
    .filter((item) => states.get(item.id).due)
    .sort((a, b) => {
      const sa = states.get(a.id);
      const sb = states.get(b.id);
      if (sa.dueDate !== sb.dueDate) return sa.dueDate.localeCompare(sb.dueDate);
      if (sa.box !== sb.box) return sa.box - sb.box;
      return a.term.localeCompare(b.term);
    });

  const enrolled = lexical.filter((item) => states.get(item.id).enrolled);

  return { states, due, enrolled, reviewedToday: reviewedTodayIds.size, today };
}

/**
 * Dictionary entries the owner keeps opening but has not added to the cuaderno.
 *
 * They are suggestions, not queue members. Review history is personal learning data and
 * a dict: key can go stale in a dataset rebuild (section 5), so hanging a box off one
 * would let a dictionary upgrade quietly delete progress. Adding the word first gives
 * that history a home that survives — and gives the card an answer side the owner wrote.
 */
export function deriveDictSuggestions(items, events, today = localDate()) {
  const claimed = new Set();
  for (const item of items) {
    if (item.dictKey) claimed.add(item.dictKey);
    for (const key of item.linkedKeys || []) if (isDictKey(key)) claimed.add(key);
  }

  const windowStart = lookupWindowStart(today);
  const counts = new Map();

  for (const event of events) {
    if (event.type !== VIEW) continue;
    const key = event.itemKey;
    if (!isDictKey(key) || claimed.has(key)) continue;
    if (event.localDate < windowStart) continue;
    const row = counts.get(key) || { dictKey: key, views: 0, lastViewedAt: "" };
    row.views += 1;
    if (event.at > row.lastViewedAt) row.lastViewedAt = event.at;
    counts.set(key, row);
  }

  return [...counts.values()]
    .filter((row) => row.views >= DICT_SUGGEST_MIN_VIEWS)
    .sort((a, b) => b.views - a.views || b.lastViewedAt.localeCompare(a.lastViewedAt))
    .slice(0, DICT_SUGGEST_LIMIT);
}
