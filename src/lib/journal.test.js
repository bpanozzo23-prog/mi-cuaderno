import { describe, expect, it } from "vitest";
import { isJournalEntry, journalEntries, withoutJournalEntries } from "./journal.js";

const page = (overrides = {}) => ({
  id: "user:page",
  type: "page",
  pageProfile: "general",
  pageDate: null,
  ...overrides,
});

describe("journal derivation", () => {
  it("includes only dated General pages and never a dated Collection", () => {
    const general = page({ id: "user:general" });
    const journal = page({ id: "user:journal", pageDate: "2026-08-03" });
    const collection = page({
      id: "user:collection",
      pageDate: "2026-08-03",
      pageProfile: "collection",
    });
    const lexical = { id: "user:word", type: "lexical" };

    expect(isJournalEntry(journal)).toBe(true);
    expect(isJournalEntry(general)).toBe(false);
    expect(isJournalEntry(collection)).toBe(false);
    expect(isJournalEntry(lexical)).toBe(false);
    expect(journalEntries([general, journal, collection, lexical])).toEqual([journal]);
    expect(withoutJournalEntries([general, journal, collection, lexical])).toEqual([
      general,
      collection,
      lexical,
    ]);
  });
});
