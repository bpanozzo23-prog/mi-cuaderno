import { describe, expect, it } from "vitest";
import {
  archivedJournalYears,
  currentJournalEntries,
  isJournalEntry,
  journalEntries,
  priorYearMemory,
  sameDayJournalContinuations,
  searchJournalEntries,
  sortJournalEntries,
  todayJournalEntry,
  validateApuntes,
  withoutJournalEntries,
} from "./journal.js";

const page = (overrides = {}) => ({
  id: "user:page",
  type: "page",
  pageFocus: "notes",
  noteSections: [],
  collection: { enabled: false, groups: [] },
  source: { enabled: false, format: "", creator: "", scope: "", url: "", context: "", captures: [] },
  grammar: { enabled: false, keyIdea: "", sections: [] },
  pageDate: null,
  title: "",
  body: "",
  tags: [],
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z",
  ...overrides,
});

describe("journal derivation", () => {
  it("includes only dated unstructured pages and excludes enabled or outlined Pages", () => {
    const general = page({ id: "user:general" });
    const journal = page({ id: "user:journal", pageDate: "2026-08-03" });
    const collection = page({
      id: "user:collection",
      pageDate: "2026-08-03",
      pageFocus: "vocabulary",
      collection: { enabled: true, groups: [] },
    });
    const outlined = page({
      id: "user:outlined",
      pageDate: "2026-08-03",
      body: "Body length does not decide the boundary.",
      noteSections: [{ id: "note-section:outline", parentId: null, name: "Context", body: "" }],
    });
    const lexical = { id: "user:word", type: "lexical" };

    expect(isJournalEntry(journal)).toBe(true);
    expect(isJournalEntry(general)).toBe(false);
    expect(isJournalEntry(collection)).toBe(false);
    expect(isJournalEntry(outlined)).toBe(false);
    expect(isJournalEntry(lexical)).toBe(false);
    expect(journalEntries([general, journal, collection, outlined, lexical])).toEqual([journal]);
    expect(withoutJournalEntries([general, journal, collection, outlined, lexical])).toEqual([
      general,
      collection,
      outlined,
      lexical,
    ]);
  });

  it("orders the timeline and searches only title, body, tags and Apuntes with Spanish normalization", () => {
    const olderMoment = page({
      id: "user:older",
      pageDate: "2026-08-02",
      title: "El año",
      body: "Caminé por el parque.",
      tags: ["gratitud"],
    });
    const early = page({ id: "user:early", pageDate: "2026-08-03", createdAt: "2026-08-03T08:00:00.000Z" });
    const late = page({ id: "user:late", pageDate: "2026-08-03", createdAt: "2026-08-03T20:00:00.000Z" });

    expect(sortJournalEntries([olderMoment, early, late])).toEqual([late, early, olderMoment]);
    expect(searchJournalEntries([olderMoment, early], "parque")).toEqual([olderMoment]);
    expect(searchJournalEntries([olderMoment, early], "gratitud")).toEqual([olderMoment]);
    expect(searchJournalEntries([olderMoment, early], "ano")).toEqual([]);

    const formatted = page({
      id: "user:formatted",
      pageDate: "2026-08-04",
      body: "Fue un día **muy importante** para mí.",
    });
    expect(searchJournalEntries([formatted], "muy importante")).toEqual([formatted]);
  });

  it("finds Apuntes text through Diario search, with markdown flattened", () => {
    const annotated = page({
      id: "user:annotated",
      pageDate: "2026-08-14",
      body: "Hoy encontré un buen método.",
      apuntes: "## Gemini\n\n- Use **recopilar** instead of juntar.",
    });
    const plain = page({ id: "user:plain", pageDate: "2026-08-13", body: "Sin apuntes." });

    expect(searchJournalEntries([annotated, plain], "recopilar")).toEqual([annotated]);
    // A null field neither matches nor breaks the haystack.
    expect(searchJournalEntries([annotated, plain], "sin apuntes")).toEqual([plain]);
  });

  it("validates Apuntes as null or text", () => {
    expect(validateApuntes(null)).toEqual([]);
    expect(validateApuntes("")).toEqual([]);
    expect(validateApuntes("## Notas")).toEqual([]);
    expect(validateApuntes(42)).toEqual(["apuntes must be null or a string."]);
    expect(validateApuntes(undefined, "userItems[0].apuntes")).toEqual([
      "userItems[0].apuntes must be null or a string.",
    ]);
  });

  it("keeps the earliest-created same-day moment as Today and lists only its same-day continuations", () => {
    const first = page({
      id: "user:first",
      pageDate: "2026-08-03",
      createdAt: "2026-08-03T08:00:00.000Z",
      updatedAt: "2026-08-03T09:00:00.000Z",
    });
    const second = page({
      id: "user:second",
      pageDate: "2026-08-03",
      createdAt: "2026-08-03T10:00:00.000Z",
      updatedAt: "2026-08-03T12:00:00.000Z",
    });
    const third = page({
      id: "user:third",
      pageDate: "2026-08-03",
      createdAt: "2026-08-03T11:00:00.000Z",
      updatedAt: "2026-08-03T13:00:00.000Z",
    });
    const yesterday = page({
      id: "user:yesterday",
      pageDate: "2026-08-02",
      updatedAt: "2026-08-03T14:00:00.000Z",
    });

    expect(todayJournalEntry([third, second, first], "2026-08-03")).toBe(first);
    expect(sameDayJournalContinuations([yesterday, first, second, third], first)).toEqual([
      third,
      second,
    ]);
    expect(sameDayJournalContinuations([yesterday], null)).toEqual([]);
  });

  it("separates the current year from a newest-year-first archive", () => {
    const current = page({ id: "user:current", pageDate: "2026-02-01" });
    const lastYear = page({ id: "user:last", pageDate: "2025-11-01" });
    const older = page({ id: "user:older", pageDate: "2024-12-01" });

    expect(currentJournalEntries([older, current, lastYear], "2026-08-03")).toEqual([current]);
    expect(archivedJournalYears([older, current, lastYear], "2026-08-03")).toEqual([
      { year: "2025", entries: [lastYear] },
      { year: "2024", entries: [older] },
    ]);
  });

  it("chooses the closest ±7-day memory from the most recent prior year with a candidate", () => {
    const tooFarRecent = page({ id: "user:far", pageDate: "2025-07-01" });
    const closestOlder = page({ id: "user:closest", pageDate: "2024-08-05" });
    const fartherOlder = page({ id: "user:farther", pageDate: "2024-07-30" });
    const wrapped = page({ id: "user:wrapped", pageDate: "2025-12-29" });

    expect(priorYearMemory([fartherOlder, closestOlder, tooFarRecent], "2026-08-03")).toBe(closestOlder);
    expect(priorYearMemory([wrapped], "2026-01-02")).toBe(wrapped);
  });
});
