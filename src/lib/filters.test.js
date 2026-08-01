import { describe, it, expect } from "vitest";
import { matchesTypeFilter, wantsDictionary, TYPE_FILTERS, FILTERS } from "./filters.js";

const word = (over = {}) => ({ type: "lexical", form: "word", ...over });
const phrase = (over = {}) => ({ type: "lexical", form: "phrase", ...over });
const page = (over = {}) => ({ type: "page", ...over });

describe("the type filter tells words and phrases apart", () => {
  it("keeps phrases out of palabras and words out of frases", () => {
    expect(matchesTypeFilter(word(), FILTERS.word)).toBe(true);
    expect(matchesTypeFilter(phrase(), FILTERS.word)).toBe(false);

    expect(matchesTypeFilter(phrase(), FILTERS.phrase)).toBe(true);
    expect(matchesTypeFilter(word(), FILTERS.phrase)).toBe(false);
  });

  it("keeps pages separate from both", () => {
    expect(matchesTypeFilter(page(), FILTERS.page)).toBe(true);
    expect(matchesTypeFilter(page(), FILTERS.word)).toBe(false);
    expect(matchesTypeFilter(page(), FILTERS.phrase)).toBe(false);
    expect(matchesTypeFilter(word(), FILTERS.page)).toBe(false);
  });

  it("shows everything under todo", () => {
    for (const item of [word(), phrase(), page()]) {
      expect(matchesTypeFilter(item, FILTERS.all)).toBe(true);
    }
  });

  it("treats a lexical item with no form as a word, so nothing can vanish from every tab", () => {
    expect(matchesTypeFilter({ type: "lexical" }, FILTERS.word)).toBe(true);
    expect(matchesTypeFilter({ type: "lexical" }, FILTERS.phrase)).toBe(false);
  });

  it("offers exactly the four tabs, todo first", () => {
    expect(TYPE_FILTERS.map((f) => f.label)).toEqual(["todo", "palabras", "frases", "páginas"]);
  });
});

describe("when the dictionary belongs in the results", () => {
  it("joins todo and palabras", () => {
    expect(wantsDictionary(FILTERS.all, null)).toBe(true);
    expect(wantsDictionary(FILTERS.word, null)).toBe(true);
  });

  it("stays out of frases and páginas", () => {
    // The bundled dictionary is lemma-focused (§1): under a phrase filter it would be a wall
    // of single words. Under páginas it was already suppressed (Phase 2e).
    expect(wantsDictionary(FILTERS.phrase, null)).toBe(false);
    expect(wantsDictionary(FILTERS.page, null)).toBe(false);
  });

  it("stays out whenever a tag filter is on, since entries have no tags", () => {
    expect(wantsDictionary(FILTERS.all, "verbs")).toBe(false);
    expect(wantsDictionary(FILTERS.word, "verbs")).toBe(false);
  });
});
