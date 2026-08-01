import { describe, it, expect } from "vitest";
import { searchItems, TIER } from "./search.js";
import { newLexical, newPage } from "../db/items.js";

const lexical = (fields) => newLexical(fields);
const page = (fields) => newPage(fields);

const notebook = [
  lexical({ term: "saco", translation: "sack, bag", pos: "noun" }),
  lexical({ term: "sacó", translation: "he/she took out" }),
  lexical({ term: "sacar", translation: "to take out; to get", tags: ["verbs"] }),
  lexical({ term: "año", translation: "year" }),
  lexical({ term: "ano", translation: "anus" }),
  lexical({
    term: "madrugar",
    translation: "to get up very early",
    notes: "A quien madruga, Dios le ayuda.",
    myExamples: [{ es: "Odio madrugar.", en: "I hate getting up early." }],
  }),
  page({ title: "Preterite vs imperfect", body: "Completed actions versus the ongoing background." }),
  page({ title: "Roma (2018)", body: "Cuarón film. Lots of Mexican usage.", pageDate: "2026-07-20", tags: ["films"] }),
];

const terms = (query) =>
  searchItems(notebook, query).map((r) => (r.item.type === "page" ? r.item.title : r.item.term));

describe("the brief's acceptance cases", () => {
  it("finds 'sacó' when searching 'saco', with the exact 'saco' ranked first", () => {
    const results = searchItems(notebook, "saco");
    expect(results[0].item.term).toBe("saco");
    expect(results[0].tier).toBe(TIER.exactTerm);
    expect(results.map((r) => r.item.term)).toContain("sacó");
    expect(results.find((r) => r.item.term === "sacó").tier).toBe(TIER.normalizedTerm);
  });

  it("never matches 'año' when searching 'ano'", () => {
    expect(terms("ano")).not.toContain("año");
    expect(terms("ano")).toContain("ano");
  });

  it("never matches 'ano' when searching 'año'", () => {
    expect(terms("año")).not.toContain("ano");
    expect(terms("año")).toContain("año");
  });

  it("finds a page by its title and by its body text", () => {
    expect(terms("preterite")).toContain("Preterite vs imperfect");
    expect(terms("ongoing background")).toContain("Preterite vs imperfect");
  });
});

describe("ranking", () => {
  it("puts an exactly typed accent above an accent-blind match", () => {
    const results = searchItems(notebook, "sacó");
    expect(results[0].item.term).toBe("sacó");
    expect(results[0].tier).toBe(TIER.exactTerm);
  });

  it("orders term matches above translation, tag and free-text matches", () => {
    const tiers = searchItems(notebook, "sacar").map((r) => r.tier);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    expect(tiers[0]).toBe(TIER.exactTerm);
  });

  it("treats English to Spanish lookup as first-class", () => {
    const results = searchItems(notebook, "take out");
    expect(results.map((r) => r.item.term)).toContain("sacar");
    expect(results.find((r) => r.item.term === "sacar").tier).toBe(TIER.translation);
  });

  it("holds tier 3 open for the Phase 2 inflected-form index", () => {
    expect(TIER.inflectedForm).toBe(3);
    expect(TIER.translation).toBeGreaterThan(TIER.inflectedForm);
  });
});

describe("match reasons", () => {
  it.each([
    ["saco", "saco", "exact match"],
    ["saco", "sacó", "ignoring accents"],
    ["take out", "sacar", "English meaning"],
    ["verbs", "sacar", 'tag "verbs"'],
    ["Dios le ayuda", "madrugar", "in your notes"],
    ["hate getting up", "madrugar", "in your examples"],
  ])("explains %s matching %s as %s", (query, term, reason) => {
    const hit = searchItems(notebook, query).find((r) => r.item.term === term);
    expect(hit?.reason).toBe(reason);
  });

  it("explains a page body match", () => {
    const hit = searchItems(notebook, "Cuarón").find((r) => r.item.title === "Roma (2018)");
    expect(hit.reason).toBe("in the page");
  });
});

describe("meanings written on several lines", () => {
  // A phrase's readings are stored as newlines inside `translation`. A query is typed on one
  // line, so matching has to read across the break — otherwise "suddenly all" would fail
  // against a meaning whose two readings happen to sit on consecutive lines.
  const multi = [lexical({ term: "de repente", translation: "suddenly\nall at once" })];

  it("finds a reading on any line", () => {
    expect(searchItems(multi, "suddenly")).toHaveLength(1);
    expect(searchItems(multi, "all at once")).toHaveLength(1);
  });

  it("matches across the line break, treating it as a space", () => {
    expect(searchItems(multi, "suddenly all")).toHaveLength(1);
  });

  it("still refuses a phrase that is not there", () => {
    expect(searchItems(multi, "suddenly never")).toEqual([]);
  });
});

describe("empty queries", () => {
  it.each(["", "   ", null, undefined])("returns nothing for %s", (query) => {
    expect(searchItems(notebook, query)).toEqual([]);
  });
});
