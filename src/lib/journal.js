import { effectivePageKind, PAGE_KINDS } from "./pageProfiles.js";

/**
 * Journal is a presentation of the existing page record, never a stored profile or third item
 * type. Collection wins over its optional date, exactly as it does everywhere else.
 */
export function isJournalEntry(item) {
  return item?.type === "page" && effectivePageKind(item) === PAGE_KINDS.journal;
}

export function journalEntries(items) {
  return (items || []).filter(isJournalEntry);
}

export function withoutJournalEntries(items) {
  return (items || []).filter((item) => !isJournalEntry(item));
}
