import { describe, expect, it } from "vitest";
import { makeLexical, makePage } from "../test/factories.js";
import { CUIDAR_KINDS, CUIDAR_SAMPLE_SIZE, cuidarSuggestions } from "./cuidar.js";
import { caseVariantGroups } from "./tags.js";

const NOW = new Date("2026-08-18T12:00:00Z");
const daysAgo = (days) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

/** An old, linked, complete word with an example: invisible to every category. */
function settledWord(over = {}) {
  return makeLexical({
    createdAt: daysAgo(30),
    myExamples: ["Ya lo saqué."],
    ...over,
  });
}

function byKind(suggestions, kind) {
  return suggestions.find((category) => category.kind === kind) || null;
}

describe("cuidar categories", () => {
  it("returns nothing for an empty notebook", () => {
    expect(cuidarSuggestions([], { now: NOW })).toEqual([]);
  });

  it("invites old unlinked items but leaves entries inside the grace window alone", () => {
    const old = settledWord({ id: "user:old", term: "viejo", createdAt: daysAgo(7) });
    const fresh = settledWord({ id: "user:fresh", term: "nuevo", createdAt: daysAgo(6) });
    const linked = settledWord({ id: "user:linked", term: "unido", linkedKeys: ["user:old"] });

    const connect = byKind(cuidarSuggestions([old, fresh, linked], { now: NOW }), CUIDAR_KINDS.connect);
    // `old` gained a backlink from `linked`, so only `fresh` is unlinked — and it is too new.
    expect(connect).toBeNull();

    const alone = settledWord({ id: "user:alone", term: "solo", createdAt: daysAgo(7) });
    const suggestions = cuidarSuggestions([alone, fresh], { now: NOW });
    expect(byKind(suggestions, CUIDAR_KINDS.connect)).toMatchObject({
      count: 1,
      sample: [{ id: "user:alone" }],
    });
  });

  it("derives links over the complete notebook before excluding Journal entries", () => {
    const journal = makePage({
      id: "user:journal",
      title: "Hoy",
      pageDate: "2026-08-01",
      createdAt: daysAgo(20),
      linkedKeys: ["user:word"],
    });
    const word = settledWord({ id: "user:word", term: "casa", createdAt: daysAgo(20) });

    const connect = byKind(cuidarSuggestions([journal, word], { now: NOW }), CUIDAR_KINDS.connect);
    // The word is linked (from the journal), and the journal entry itself is never suggested.
    expect(connect).toBeNull();
  });

  it("treats a missing meaning as a defect with no grace period", () => {
    const brandNew = settledWord({
      id: "user:hollow",
      term: "hueco",
      createdAt: daysAgo(0),
      meanings: [],
      linkedKeys: ["user:other"],
    });
    const other = settledWord({ id: "user:other", term: "otro" });

    const suggestions = cuidarSuggestions([brandNew, other], { now: NOW });
    expect(byKind(suggestions, CUIDAR_KINDS.complete)).toMatchObject({
      count: 1,
      sample: [{ id: "user:hollow" }],
    });
    // The meaning-less entry is not also nagged about examples.
    expect(byKind(suggestions, CUIDAR_KINDS.examples)).toBeNull();
  });

  it("invites old entries without examples, once they have a meaning", () => {
    const bare = makeLexical({
      id: "user:bare",
      term: "rasgo",
      createdAt: daysAgo(10),
      linkedKeys: ["user:full"],
    });
    const full = settledWord({ id: "user:full", term: "lleno" });

    expect(byKind(cuidarSuggestions([bare, full], { now: NOW }), CUIDAR_KINDS.examples)).toMatchObject({
      count: 1,
      sample: [{ id: "user:bare" }],
    });
  });

  it("groups tag twins exactly as Ajustes does, including Journal tags", () => {
    const tagged = settledWord({ id: "user:tagged", term: "modismo", tags: ["idiom", "tú"] });
    const journal = makePage({
      id: "user:diary",
      pageDate: "2026-08-02",
      createdAt: daysAgo(3),
      tags: ["Idiom", "tu"],
      linkedKeys: ["user:tagged"],
    });

    const twins = byKind(cuidarSuggestions([tagged, journal], { now: NOW }), CUIDAR_KINDS.tagTwins);
    // Case twins group; the accent pair tu/tú is content, not capitalization.
    expect(twins).toMatchObject({ count: 1, sample: [["Idiom", "idiom"]] });
    expect(twins.sample).toEqual(caseVariantGroups(["idiom", "tú", "Idiom", "tu"]));
  });
});

describe("cuidar sampling", () => {
  it("draws without replacement under injected randomness and caps the sample", () => {
    const pool = ["uno", "dos", "tres", "cuatro", "cinco"].map((term, index) =>
      settledWord({ id: `user:${term}`, term, meanings: [], createdAt: daysAgo(20 + index) })
    );

    const first = byKind(cuidarSuggestions(pool, { now: NOW, random: () => 0 }), CUIDAR_KINDS.complete);
    expect(first.count).toBe(5);
    expect(first.sample.map((item) => item.id)).toEqual(["user:uno", "user:dos", "user:tres"]);
    expect(first.sample).toHaveLength(CUIDAR_SAMPLE_SIZE);

    const last = byKind(cuidarSuggestions(pool, { now: NOW, random: () => 0.999 }), CUIDAR_KINDS.complete);
    expect(last.sample.map((item) => item.id)).toEqual(["user:cinco", "user:cuatro", "user:tres"]);

    const wild = byKind(cuidarSuggestions(pool, { now: NOW, random: () => Number.NaN }), CUIDAR_KINDS.complete);
    expect(wild.sample.map((item) => item.id)).toEqual(["user:uno", "user:dos", "user:tres"]);
  });

  it("keeps a fixed category order and omits empty categories", () => {
    const alone = settledWord({ id: "user:alone", term: "solo", createdAt: daysAgo(9), meanings: [] });
    const suggestions = cuidarSuggestions([alone], { now: NOW });
    expect(suggestions.map((category) => category.kind)).toEqual([
      CUIDAR_KINDS.connect,
      CUIDAR_KINDS.complete,
    ]);
  });
});
