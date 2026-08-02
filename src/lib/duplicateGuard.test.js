import { describe, expect, it } from "vitest";
import { findPersonalHeadingDuplicates } from "./duplicateGuard.js";

const lexical = (id, term, form = "word", over = {}) => ({
  id,
  type: "lexical",
  form,
  term,
  translation: "",
  tags: [],
  ...over,
});

const page = (id, title, over = {}) => ({
  id,
  type: "page",
  title,
  body: "",
  tags: [],
  ...over,
});

const ids = (items, type, heading) =>
  findPersonalHeadingDuplicates(items, type, heading).map((item) => item.id);

describe("strong personal-heading duplicate guard", () => {
  it("matches case-insensitively after cleaning every whitespace run", () => {
    const items = [lexical("phrase", "de repente", "phrase")];

    expect(ids(items, "lexical", "  DE\t  REPENTE\n")).toEqual(["phrase"]);
  });

  it("treats composed and decomposed spellings of the same accent as equal", () => {
    const items = [lexical("yes", "sí")];

    expect(ids(items, "lexical", "SI\u0301")).toEqual(["yes"]);
  });

  it.each([
    ["si", "sí"],
    ["el", "él"],
    ["tu", "tú"],
    ["ano", "año"],
    ["verguenza", "vergüenza"],
  ])("keeps %s and %s distinct", (plain, marked) => {
    expect(ids([lexical("marked", marked)], "lexical", plain)).toEqual([]);
    expect(ids([lexical("plain", plain)], "lexical", marked)).toEqual([]);
  });

  it("compares words and phrases because both are lexical content", () => {
    const items = [
      lexical("word", "buenos días", "word"),
      lexical("phrase", "BUENOS   DÍAS", "phrase"),
    ];

    expect(ids(items, "lexical", "buenos días")).toEqual(["word", "phrase"]);
  });

  it("keeps lexical headings and page headings in separate content types", () => {
    const items = [lexical("word", "Roma"), page("page", "Roma")];

    expect(ids(items, "lexical", "roma")).toEqual(["word"]);
    expect(ids(items, "page", "roma")).toEqual(["page"]);
  });

  it("checks headings only, ignoring translations, tags, bodies and dictionary rows", () => {
    const items = [
      lexical("translation", "correr", "word", { translation: "casa", tags: ["casa"] }),
      page("body", "Grammar", { body: "casa", tags: ["casa"] }),
      { id: "dict:casa", lemma: "casa", senses: [{ gloss: "house" }] },
    ];

    expect(ids(items, "lexical", "casa")).toEqual([]);
    expect(ids(items, "page", "casa")).toEqual([]);
  });

  it("returns no warning for a blank heading or unknown content type", () => {
    const items = [lexical("word", "sacar")];

    expect(ids(items, "lexical", " \t\n ")).toEqual([]);
    expect(ids(items, "entry", "sacar")).toEqual([]);
  });
});
