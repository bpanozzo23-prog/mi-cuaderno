import { isJournalPage } from "./pageKinds.js";
import { normalize } from "./normalize.js";

/**
 * Journal is a presentation of the existing page record, never a stored profile or third item
 * type. Any enabled structured capability keeps a dated page in Pages rather than Diario.
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

/** Diario deliberately searches only the fields that belong to a journal moment. */
export function searchJournalEntries(items, query) {
  const needle = normalize(query);
  const entries = sortJournalEntries(items);
  if (!needle) return entries;
  return entries.filter((entry) =>
    normalize([entry.title, entry.body, ...(entry.tags || [])].filter(Boolean).join("\n")).includes(needle)
  );
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

/** Continue never duplicates the Today card; it is the latest other writing touch. */
export function continueJournalEntry(items, todayAnchor = null) {
  return journalEntries(items)
    .filter((entry) => entry.id !== todayAnchor?.id)
    .sort(
      (a, b) =>
        timeValue(b.updatedAt) - timeValue(a.updatedAt) ||
        timeValue(b.createdAt) - timeValue(a.createdAt) ||
        String(a.id).localeCompare(String(b.id))
    )[0] || null;
}

export function currentJournalEntries(items, today) {
  const year = String(today).slice(0, 4);
  return sortJournalEntries(items).filter((entry) => String(entry.pageDate).startsWith(`${year}-`));
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
