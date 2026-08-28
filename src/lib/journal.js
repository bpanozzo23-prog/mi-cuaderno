import { isJournalPage } from "./pageKinds.js";
import { normalize } from "./normalize.js";
import { plainTextFromMarkdown } from "./noteMarkdown.js";

/**
 * Journal is a presentation of the existing page record, never a stored profile or third item
 * type. Any enabled structured capability or named Notes outline keeps a dated page in Pages.
 */
export function isJournalEntry(item) {
  return isJournalPage(item);
}

export function journalEntries(items) {
  return (items || []).filter(isJournalEntry);
}

export function withoutJournalEntries(items) {
  return (items || []).filter((item) => !isJournalEntry(item));
}

const timeValue = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Newest calendar day first; newest moment first within one day. */
export function sortJournalEntries(items) {
  return [...journalEntries(items)].sort(
    (a, b) =>
      String(b.pageDate).localeCompare(String(a.pageDate)) ||
      timeValue(b.createdAt) - timeValue(a.createdAt) ||
      String(a.id).localeCompare(String(b.id))
  );
}

/**
 * Diario deliberately searches only the fields that belong to a journal moment — title, body,
 * tags, and the entry's Apuntes (schema v9): notes the owner chose to keep beside the entry are
 * worth finding from the same box they were filed from.
 */
export function searchJournalEntries(items, query) {
  const needle = normalize(query);
  const entries = sortJournalEntries(items);
  if (!needle) return entries;
  return entries.filter((entry) =>
    normalize(
      [
        entry.title,
        plainTextFromMarkdown(entry.body),
        entry.apuntes ? plainTextFromMarkdown(entry.apuntes) : "",
        ...(entry.tags || []),
      ].filter(Boolean).join("\n")
    ).includes(needle)
  );
}

/**
 * Shape check for the persisted Apuntes field (schema v9). `null` is the valid "no notes" state —
 * the field is always present on a v9 page. The owner types this markdown themselves, so unlike
 * the AI review there is no structure to enforce beyond it being text. The `where`-prefixed
 * array-of-errors signature matches `validateStoredFeedback` so backup validation composes it the
 * same way.
 */
export function validateApuntes(value, where = "apuntes") {
  if (value === null || typeof value === "string") return [];
  return [`${where} must be null or a string.`];
}

/** The first-created same-day entry is the stable Today anchor. */
export function todayJournalEntry(items, today) {
  return journalEntries(items)
    .filter((entry) => entry.pageDate === today)
    .sort(
      (a, b) =>
        timeValue(a.createdAt) - timeValue(b.createdAt) ||
        String(a.id).localeCompare(String(b.id))
    )[0] || null;
}

/** Same-day continuations never duplicate the stable Today anchor. */
export function sameDayJournalContinuations(items, todayAnchor = null) {
  if (!todayAnchor) return [];
  return journalEntries(items)
    .filter(
      (entry) =>
        entry.id !== todayAnchor.id &&
        entry.pageDate === todayAnchor.pageDate
    )
    .sort(
      (a, b) =>
        timeValue(b.updatedAt) - timeValue(a.updatedAt) ||
        timeValue(b.createdAt) - timeValue(a.createdAt) ||
        String(a.id).localeCompare(String(b.id))
    );
}

export function currentJournalEntries(items, today) {
  const year = String(today).slice(0, 4);
  return sortJournalEntries(items).filter((entry) => String(entry.pageDate).startsWith(`${year}-`));
}

/** Current-year history before Today, grouped newest date first for the Diario timeline. */
export function currentJournalDays(items, today) {
  const groups = new Map();
  for (const entry of currentJournalEntries(items, today)) {
    if (entry.pageDate === today) continue;
    if (!groups.has(entry.pageDate)) groups.set(entry.pageDate, []);
    groups.get(entry.pageDate).push(entry);
  }
  return [...groups.entries()].map(([date, entries]) => ({ date, entries }));
}

export function archivedJournalYears(items, today) {
  const currentYear = String(today).slice(0, 4);
  const groups = new Map();
  for (const entry of sortJournalEntries(items)) {
    const year = String(entry.pageDate).slice(0, 4);
    if (!year || year === currentYear) continue;
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(entry);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, entries]) => ({ year, entries }));
}

function monthDayOrdinal(dateString) {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(dateString));
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(2000, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor((date.getTime() - Date.UTC(2000, 0, 1)) / 86400000);
}

function monthDayDistance(a, b) {
  const left = monthDayOrdinal(a);
  const right = monthDayOrdinal(b);
  if (left == null || right == null) return Number.POSITIVE_INFINITY;
  const direct = Math.abs(left - right);
  return Math.min(direct, 366 - direct);
}

/** Closest ±7-day memory from the most recent prior year containing a candidate. */
export function priorYearMemory(items, today) {
  const currentYear = Number(String(today).slice(0, 4));
  if (!Number.isInteger(currentYear)) return null;
  const prior = journalEntries(items).filter((entry) => Number(String(entry.pageDate).slice(0, 4)) < currentYear);
  const years = [...new Set(prior.map((entry) => Number(String(entry.pageDate).slice(0, 4))))]
    .filter(Number.isInteger)
    .sort((a, b) => b - a);

  for (const year of years) {
    const candidates = prior
      .filter((entry) => Number(String(entry.pageDate).slice(0, 4)) === year)
      .map((entry) => ({ entry, distance: monthDayDistance(entry.pageDate, today) }))
      .filter((candidate) => candidate.distance <= 7)
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          String(b.entry.pageDate).localeCompare(String(a.entry.pageDate)) ||
          timeValue(a.entry.createdAt) - timeValue(b.entry.createdAt)
      );
    if (candidates.length > 0) return candidates[0].entry;
  }
  return null;
}
