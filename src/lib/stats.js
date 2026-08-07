import { localDate, addDaysToLocalDate, mondayWeekStart } from "./dates.js";

/**
 * The Phase 11 statistics (brief section 12), derived — like the review schedule beside
 * them — from the event log and the items table rather than from anything stored.
 *
 * Nothing here records: every number is a replay of history the app already keeps. That is
 * section 7's rule, and it is what lets these views be added, changed or deleted without a
 * migration, a backup change or a counter that could disagree with the log.
 *
 * Event-type strings are re-declared here rather than imported from `db/events.js`, the same
 * way `review.js` does it: `db/events.js` already imports from `lib/`, and `lib/` staying free
 * of database imports is what keeps these functions pure and testable without a database.
 *
 * Every function takes `today` as an argument with a default, so a test can stand at any date
 * and a caller never has two clocks disagreeing.
 */

const KNOWN_TYPES = new Set([
  "view",
  "create",
  "edit",
  "delete",
  "tricky_on",
  "tricky_off",
  "review_pass",
  "review_fail",
  "search_miss",
  // Phase 13: a day spent only drilling was still a day spent studying, so it holds the
  // streak and colours the calendar. This is the owner-centric reading the calendar already
  // takes below, applied to the newest way of doing the work.
  "drill_pass",
  "drill_fail",
]);

const DRILL_TYPES = new Set(["drill_pass", "drill_fail"]);

/** Trailing weeks the activity calendar shows. 16 fits 375px at a legible cell size. */
export const HEATMAP_WEEKS = 16;

/**
 * Event counts at which a day moves up an intensity level, giving five levels (0–4).
 * Fixed rather than relative to the busiest day on purpose: with a relative scale, one
 * unusually heavy session would repaint every other day paler, so a steady week would look
 * like a decline in a way the owner never actually experienced.
 */
export const HEAT_THRESHOLDS = [1, 3, 6, 10];

/**
 * How much happened on each calendar day, as localDate → count.
 *
 * Events of deleted items are counted (owner's decision, Phase 11). Section 7 excludes them
 * from statistics to protect item-centric results — a deleted word must not sit in a queue or
 * a most-opened list — but this is owner-centric: studying a word later deleted was still
 * studying that day, and thinning past days on delete would make the calendar lie about a day
 * the owner actually lived.
 *
 * Unknown future types are ignored, as section 7 requires of every event consumer. That also
 * keeps a later bookkeeping event from silently inventing activity on a day off.
 */
export function activityByDay(events) {
  const days = new Map();
  for (const event of events) {
    if (!KNOWN_TYPES.has(event?.type)) continue;
    const day = event.localDate;
    if (!day) continue;
    days.set(day, (days.get(day) || 0) + 1);
  }
  return days;
}

/**
 * Consecutive days of activity ending today — or ending yesterday, if today is still quiet.
 *
 * The grace day is deliberate: a streak that reads 0 at breakfast, before the owner has opened
 * anything, would be reporting a broken habit that is not broken. It only counts as broken once
 * a whole day has passed with nothing in it.
 */
export function streakFrom(activityDays, today = localDate()) {
  const yesterday = addDaysToLocalDate(today, -1);
  let day = activityDays.has(today) ? today : activityDays.has(yesterday) ? yesterday : null;
  if (!day) return 0;

  let streak = 0;
  while (activityDays.has(day)) {
    streak += 1;
    day = addDaysToLocalDate(day, -1);
  }
  return streak;
}

/** Which of the five intensity levels a day's event count falls in. */
export function heatLevel(count) {
  if (!count) return 0;
  let level = 0;
  for (const threshold of HEAT_THRESHOLDS) {
    if (count >= threshold) level += 1;
  }
  return level;
}

/**
 * The activity calendar as columns of weeks, oldest first, each column running Monday to
 * Sunday. The last column is the week containing today, so the grid always ends where the
 * owner is standing rather than on a tidy week boundary.
 *
 * Days after today are marked `future` rather than omitted: the grid stays rectangular, and
 * the renderer can leave them blank instead of showing them as days with nothing in them.
 */
export function heatmapWeeks(activityDays, today = localDate(), weeks = HEATMAP_WEEKS) {
  const lastMonday = mondayWeekStart(today);
  const firstMonday = addDaysToLocalDate(lastMonday, -7 * (weeks - 1));

  const columns = [];
  for (let w = 0; w < weeks; w += 1) {
    const weekStart = addDaysToLocalDate(firstMonday, w * 7);
    const days = [];
    for (let d = 0; d < 7; d += 1) {
      const date = addDaysToLocalDate(weekStart, d);
      const count = activityDays.get(date) || 0;
      days.push({ date, count, level: heatLevel(count), future: date > today });
    }
    columns.push({ weekStart, days });
  }
  return columns;
}

/**
 * How the vocabulary has grown, as one cumulative total per week.
 *
 * Lexical items only — a page is a note, not a word learned. Deleted items are simply absent
 * from the items table, so section 7's "exclude deleted from statistics" holds here without a
 * filter, and the line reads as "words currently in the cuaderno, by when they were added".
 *
 * Weeks with no additions are filled in rather than skipped, so a flat stretch reads as a
 * plateau rather than being compressed away.
 *
 * Items carry no stored localDate the way events do, so the calendar day comes from `createdAt`
 * in whatever zone the device is in now. At week granularity that drift cannot move a point.
 */
export function cumulativeWordsByWeek(items, today = localDate()) {
  const addedPerWeek = new Map();
  for (const item of items) {
    if (item?.type !== "lexical" || !item.createdAt) continue;
    const created = new Date(item.createdAt);
    if (!Number.isFinite(created.getTime())) continue;
    const week = mondayWeekStart(localDate(created));
    addedPerWeek.set(week, (addedPerWeek.get(week) || 0) + 1);
  }
  if (addedPerWeek.size === 0) return [];

  const populatedWeeks = [...addedPerWeek.keys()].sort();
  const firstWeek = populatedWeeks[0];
  const newestWordWeek = populatedWeeks[populatedWeeks.length - 1];
  const lastWeek = mondayWeekStart(today);

  const series = [];
  let total = 0;
  // A word added later than today (a clock change, an imported backup) still belongs on the
  // line, so the walk runs to whichever is later rather than stopping at this week.
  const endWeek = lastWeek > newestWordWeek ? lastWeek : newestWordWeek;
  for (let week = firstWeek; week <= endWeek; week = addDaysToLocalDate(week, 7)) {
    total += addedPerWeek.get(week) || 0;
    series.push({ weekStart: week, total });
  }
  return series;
}

/**
 * How the words in review are spread across the Leitner ladder, plus the ones that finished it.
 *
 * Two exclusions, for opposite reasons:
 *
 * Untouched words are skipped. An unenrolled word sits at `emptyReviewState`, whose box is 1 —
 * counting those would pile every word in the notebook into box 1 and bury the handful actually
 * in review.
 *
 * Retired words are counted anyway, even though they are *not* enrolled: `deriveReviewState`
 * drops enrollment once a word graduates, because retiring it is exactly what takes it out of
 * the queue. Reading `enrolled` alone would therefore make the Retired rung permanently empty
 * and quietly lose the ladder's finish line.
 */
/**
 * How the conjugation drill has gone, overall and by tense (Phase 13c).
 *
 * By tense because that is the answer worth having: "preterite is the shaky one" is
 * actionable in a way that one overall percentage is not.
 *
 * Modes are counted together but accent slips are reported separately, because they are the
 * one outcome that is neither a clean pass nor a failure — and because a typed session and a
 * self-graded one are different measurements, `mode` is on every event so a later view can
 * separate them without needing history it never recorded.
 *
 * Events of deleted items count, as they do in the calendar: the practice happened. Unknown
 * types are ignored, and an event with no recognisable tense is counted in the totals but
 * given no row, so a future drill over something other than tenses cannot invent one.
 */
export function drillPerformance(events) {
  const overall = { answered: 0, passed: 0, accentSlips: 0 };
  const byTense = new Map();

  for (const event of events) {
    if (!DRILL_TYPES.has(event?.type)) continue;
    const passed = event.type === "drill_pass";
    const accent = event.metadata?.verdict === "accents";

    overall.answered += 1;
    if (passed) overall.passed += 1;
    if (accent) overall.accentSlips += 1;

    const tense = event.metadata?.tense;
    if (typeof tense !== "string" || !tense) continue;
    if (!byTense.has(tense)) byTense.set(tense, { tense, answered: 0, passed: 0, accentSlips: 0 });
    const row = byTense.get(tense);
    row.answered += 1;
    if (passed) row.passed += 1;
    if (accent) row.accentSlips += 1;
  }

  // Weakest first: the point of the breakdown is to find what to work on. Ties fall back to
  // the busier tense, then to the name, so the order is stable between renders.
  const tenses = [...byTense.values()].sort(
    (a, b) =>
      a.passed / a.answered - b.passed / b.answered ||
      b.answered - a.answered ||
      a.tense.localeCompare(b.tense)
  );

  return { ...overall, tenses };
}

export function boxDistribution(states) {
  const boxes = [1, 2, 3, 4, 5].map((box) => ({ box, count: 0 }));
  let graduated = 0;
  let tracked = 0;

  for (const state of states.values()) {
    if (!state) continue;
    if (state.graduated) {
      graduated += 1;
      tracked += 1;
      continue;
    }
    if (!state.enrolled) continue;
    tracked += 1;
    const slot = boxes[state.box - 1];
    if (slot) slot.count += 1;
  }

  return { boxes, graduated, tracked };
}
