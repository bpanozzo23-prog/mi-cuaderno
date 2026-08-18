import { describe, it, expect } from "vitest";
import { allTagsIn, caseVariantGroups, planGlobalTagChange, suggestTags } from "./tags.js";

const item = (tags) => ({ tags });

describe("allTagsIn gathers the vocabulary already in use", () => {
  it("deduplicates across items and sorts", () => {
    const items = [item(["verbs", "mexico"]), item(["mexico", "expression"]), item([])];

    expect(allTagsIn(items)).toEqual(["expression", "mexico", "verbs"]);
  });

  it("survives items with no tags array at all", () => {
    expect(allTagsIn([{}, item(["verbs"])])).toEqual(["verbs"]);
  });
});

describe("suggestTags offers tags the owner already uses", () => {
  const TAGS = ["expression", "mexico", "verbs", "complexity"];

  it("matches what has been typed so far", () => {
    expect(suggestTags(TAGS, "expr")).toEqual(["expression"]);
  });

  it("ranks prefix matches above substring ones", () => {
    // "ex" starts `expression`, but also hides inside `complexity` and `mexico`. The one the
    // owner is most likely typing goes first; the others are still worth offering.
    expect(suggestTags(TAGS, "ex")).toEqual(["expression", "complexity", "mexico"]);
  });

  it("is case-insensitive, which is the point — Expression and expression are two tags today", () => {
    expect(suggestTags(["expression"], "Ex")).toEqual(["expression"]);
    expect(suggestTags(["Expression"], "ex")).toEqual(["Expression"]);
  });

  it("is accent-insensitive, so expresion finds expresión", () => {
    expect(suggestTags(["expresión"], "expresion")).toEqual(["expresión"]);
    expect(suggestTags(["expresion"], "expresión")).toEqual(["expresion"]);
  });

  it("keeps ñ distinct, like everything else that matches in this app", () => {
    expect(suggestTags(["año", "ano"], "ano")).toEqual(["ano"]);
    expect(suggestTags(["año", "ano"], "año")).toEqual(["año"]);
  });

  it("leaves out tags already on this item, which would suggest doing nothing", () => {
    expect(suggestTags(TAGS, "", { exclude: ["verbs"] })).not.toContain("verbs");
    // Excluding is accent- and case-insensitive too, or the duplicate would be offered back.
    expect(suggestTags(["expresión"], "", { exclude: ["EXPRESION"] })).toEqual([]);
  });

  it("offers the whole vocabulary before anything is typed", () => {
    expect(suggestTags(TAGS, "")).toEqual(["complexity", "expression", "mexico", "verbs"]);
  });

  it("honours the limit", () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${String(i).padStart(2, "0")}`);

    expect(suggestTags(many, "tag")).toHaveLength(6);
    expect(suggestTags(many, "tag", { limit: 2 })).toEqual(["tag00", "tag01"]);
  });

  it("offers nothing when nothing matches", () => {
    expect(suggestTags(TAGS, "zzz")).toEqual([]);
  });
});

describe("caseVariantGroups finds only capitalization variants", () => {
  it("groups two- and three-spelling variants while omitting singletons", () => {
    expect(caseVariantGroups(["grammar", "verbs", "Verbs", "VERBS", "study", "Study"]))
      .toEqual([
        ["Study", "study"],
        ["VERBS", "Verbs", "verbs"],
      ]);
  });

  it("is deterministic regardless of input order and deduplicates exact spellings", () => {
    const tags = ["verbs", "Verbs", "VERBS", "verbs", "Study", "study"];

    expect(caseVariantGroups([...tags].reverse())).toEqual(caseVariantGroups(tags));
  });

  it("preserves accents, diaeresis and ñ instead of treating them as case differences", () => {
    expect(caseVariantGroups([
      "tu",
      "tú",
      "TU",
      "TÚ",
      "ano",
      "año",
      "ANO",
      "AÑO",
      "pinguino",
      "pingüino",
      "PINGUINO",
      "PINGÜINO",
    ])).toEqual([
      ["ANO", "ano"],
      ["AÑO", "año"],
      ["PINGUINO", "pinguino"],
      ["PINGÜINO", "pingüino"],
      ["TU", "tu"],
      ["TÚ", "tú"],
    ]);
  });

  it("returns no suggestion group when every spelling is unique by case", () => {
    expect(caseVariantGroups(["tu", "tú", "ano", "año", "pinguino", "pingüino"]))
      .toEqual([]);
  });
});

describe("planGlobalTagChange previews the exact global mutation", () => {
  const tagged = (id, tags) => ({ id, tags });

  it("renames only the exact source and preserves its position", () => {
    const plan = planGlobalTagChange([
      tagged("word", ["study", "verbs", "mexico"]),
      tagged("phrase", ["Verbs", "verbs"]),
      tagged("page", ["vérbs"]),
      tagged("enye", ["año"]),
    ], { source: "verbs", destination: "grammar" });

    expect(plan).toMatchObject({
      kind: "rename",
      source: "verbs",
      destination: "grammar",
      sourceCount: 2,
      destinationCount: 0,
      overlapCount: 0,
      finalCount: 2,
      changedCount: 2,
    });
    expect(plan.updates).toEqual([
      { id: "word", tags: ["study", "grammar", "mexico"] },
      { id: "phrase", tags: ["Verbs", "grammar"] },
    ]);
  });

  it("merges into an exact existing destination and keeps its original position on overlap", () => {
    const plan = planGlobalTagChange([
      tagged("source-only", ["verbs", "study"]),
      tagged("overlap-first", ["grammar", "verbs", "mexico"]),
      tagged("overlap-later", ["verbs", "study", "grammar"]),
      tagged("destination-only", ["grammar"]),
    ], { source: "verbs", destination: "grammar" });

    expect(plan).toMatchObject({
      kind: "merge",
      sourceCount: 3,
      destinationCount: 3,
      overlapCount: 2,
      finalCount: 4,
      changedCount: 3,
    });
    expect(plan.updates).toEqual([
      { id: "source-only", tags: ["grammar", "study"] },
      { id: "overlap-first", tags: ["grammar", "mexico"] },
      { id: "overlap-later", tags: ["study", "grammar"] },
    ]);
  });

  it("removes the exact source without touching the entries or loose lookalikes", () => {
    const plan = planGlobalTagChange([
      tagged("word", ["verbs", "Verbs", "vérbs"]),
      tagged("page", ["verbs"]),
      tagged("other", ["año", "ano"]),
    ], { source: "verbs", destination: null });

    expect(plan).toMatchObject({ kind: "remove", sourceCount: 2, changedCount: 2 });
    expect(plan.updates).toEqual([
      { id: "word", tags: ["Verbs", "vérbs"] },
      { id: "page", tags: [] },
    ]);
  });

  it("deduplicates only the selected source and destination on malformed imported rows", () => {
    const plan = planGlobalTagChange([
      tagged("rename", ["verbs", "other", "verbs", "other"]),
      tagged("merge", ["grammar", "verbs", "grammar", "other", "other"]),
      tagged("unrelated", ["other", "other"]),
    ], { source: "verbs", destination: "grammar" });

    expect(plan.updates).toEqual([
      { id: "rename", tags: ["grammar", "other", "other"] },
      { id: "merge", tags: ["grammar", "other", "other"] },
    ]);
  });

  it("trims a new destination but preserves the selected source exactly", () => {
    const plan = planGlobalTagChange([
      tagged("spaced", [" verbs ", "verbs"]),
    ], { source: " verbs ", destination: "  grammar  " });

    expect(plan.destination).toBe("grammar");
    expect(plan.updates).toEqual([{ id: "spaced", tags: ["grammar", "verbs"] }]);
  });

  it("returns no work for a blank destination, unchanged name or missing source", () => {
    const items = [tagged("word", ["verbs"])];

    expect(planGlobalTagChange(items, { source: "verbs", destination: "  " }).kind).toBe("noop");
    expect(planGlobalTagChange(items, { source: "verbs", destination: "verbs" }).kind).toBe("noop");
    expect(planGlobalTagChange(items, { source: "missing", destination: "grammar" }).kind).toBe("noop");
  });
});
