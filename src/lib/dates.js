/**
 * Timestamps are ISO-8601 strings: readable inside a backup file and correct to sort.
 * localDate is the owner's local calendar day — brief section 7 requires daily queues
 * and streaks to group by it, not by UTC.
 */

export function nowIso(date = new Date()) {
  return date.toISOString();
}

export function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calendar arithmetic on a localDate string, for the review schedule.
 * Done with date components rather than milliseconds so a day is a day even
 * across a daylight-saving change; noon keeps zones that shift at midnight
 * from landing on the wrong side of it.
 */
export function addDaysToLocalDate(dateStr, days) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

/**
 * The Monday that starts this localDate's week — the unit the activity calendar and the
 * growth chart bucket by. Monday rather than Sunday is the Spanish convention, and it is
 * what the heatmap's weekday column reads top to bottom (L M X J V S D).
 *
 * Same component arithmetic and noon anchor as addDaysToLocalDate, for the same reason.
 */
export function mondayWeekStart(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d, 12);
  // getDay() is Sunday-first; shifting by 6 makes Monday 0 and Sunday 6, so a Sunday
  // walks back to the Monday that began its week rather than forward into the next one.
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDate(date);
}

/**
 * The "YYYY-MM" month a localDate falls in — the unit the activity calendar pages by.
 */
export function monthOfDate(dateStr) {
  const [y, m] = String(dateStr).split("-");
  if (!Number(y) || !Number(m)) return dateStr;
  return `${y}-${m}`;
}

/**
 * Calendar arithmetic on a "YYYY-MM" month string, for the calendar's prev/next paging.
 *
 * Months are counted rather than dated: a month has no day to anchor, so adding one to
 * January the 31st way round would have to invent a 31st of February. Working in whole
 * months from a zero-based count keeps December → January exact in both directions.
 */
export function addMonths(yearMonth, n) {
  const [y, m] = String(yearMonth).split("-").map(Number);
  if (!y || !m) return yearMonth;
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const month = String((total % 12) + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * How many days a "YYYY-MM" month holds, leap years included.
 *
 * Day 0 of the following month is the last day of this one — the standard trick, with the
 * same noon anchor the rest of this file uses so a zone that shifts at midnight cannot
 * roll the answer back a day.
 */
export function daysInMonth(yearMonth) {
  const [y, m] = String(yearMonth).split("-").map(Number);
  if (!y || !m) return 0;
  return new Date(y, m, 0, 12).getDate();
}

export function timeAgo(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function daysSince(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.floor((now - then) / 86400000);
}
