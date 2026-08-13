import { describe, expect, it } from "vitest";
import {
  cleanMeanings,
  firstMeaningGloss,
  meaningsFromSenses,
  meaningsFromTranslation,
  newMeaning,
  upgradeLexicalItemV1,
} from "./meanings.js";

describe("personal meaning model", () => {
  it("migrates one trimmed nonblank line while preserving markers and punctuation", () => {
    const ids = ["meaning:first", "meaning:second"];
    const meanings = meaningsFromTranslation("  1. take out\r\n\r\n withdraw; draw out  ", () => ids.shift());

    expect(meanings.map(({ id, gloss }) => ({ id, gloss }))).toEqual([
      { id: "meaning:first", gloss: "1. take out" },
      { id: "meaning:second", gloss: "withdraw; draw out" },
    ]);
  });

  it("keeps a personal id stable while cleaning editable fields", () => {
    const meaning = newMeaning({
      id: "meaning:stable",
      gloss: " withdraw ",
      usageCue: " sacar dinero ",
      regions: ["Mexico", "mexico", " "],
      usageLabels: ["figurative", "not-a-label"],
      examples: [{ es: " Saco dinero. ", en: " I withdraw money. " }],
    });

    const [cleaned] = cleanMeanings([meaning]);
    expect(cleaned).toMatchObject({
      id: "meaning:stable",
      gloss: "withdraw",
      usageCue: "sacar dinero",
      regions: ["Mexico"],
      usageLabels: ["figurative"],
      examples: [{ es: "Saco dinero.", en: "I withdraw money." }],
    });
  });

  it("drops a completely blank draft but refuses to discard context without a gloss", () => {
    expect(cleanMeanings([newMeaning()])).toEqual([]);
    expect(() => cleanMeanings([newMeaning({ note: "Important" })])).toThrow(/needs an English gloss/);
  });

  it("removes only the legacy translation field from a lexical item", () => {
    const upgraded = upgradeLexicalItemV1({
      id: "user:entry",
      type: "lexical",
      term: "sacar",
      translation: "take out",
      notes: "Keep me",
      updatedAt: "unchanged",
    }, () => "meaning:generated");

    expect(upgraded).not.toHaveProperty("translation");
    expect(upgraded.meanings[0]).toMatchObject({ id: "meaning:generated", gloss: "take out" });
    expect(upgraded.notes).toBe("Keep me");
    expect(upgraded.updatedAt).toBe("unchanged");
  });

  describe("the one gloss a browsing card shows", () => {
    it("takes the first, in the order the owner put them", () => {
      const item = {
        meanings: [newMeaning({ gloss: "to take out" }), newMeaning({ gloss: "to withdraw" })],
      };

      expect(firstMeaningGloss(item)).toBe("to take out");
    });

    it("skips a blank gloss rather than showing an empty line", () => {
      const item = { meanings: [newMeaning(), newMeaning({ gloss: "to withdraw" })] };

      expect(firstMeaningGloss(item)).toBe("to withdraw");
    });

    it("is empty for an entry with no meanings yet", () => {
      expect(firstMeaningGloss({ meanings: [] })).toBe("");
      expect(firstMeaningGloss(null)).toBe("");
    });
  });

  describe("copying dictionary senses into personal meanings", () => {
    const ids = () => {
      let n = 0;
      return () => `meaning:imported-${++n}`;
    };

    it("carries the gloss, regions and the labels the personal list has a word for", () => {
      const [row] = meaningsFromSenses(
        [{ gloss: "to take out", regionLabels: ["Mexico", "Mexico"], labels: ["colloquial", "transitive", "figuratively"] }],
        [],
        ids()
      );

      expect(row.meaning).toMatchObject({
        id: "meaning:imported-1",
        gloss: "to take out",
        regions: ["Mexico"],
        usageLabels: ["colloquial", "figurative"],
        verbBehavior: ["transitive"],
      });
      expect(row.droppedLabels).toEqual([]);
    });

    it("leaves the owner's own fields empty rather than inventing them", () => {
      const [row] = meaningsFromSenses([{
        gloss: "year",
        topics: ["time"],
        synonyms: ["calendar year"],
        antonyms: ["instant"],
        examples: [["Este año.", "This year."]],
      }], [], ids());

      expect(row.meaning).toMatchObject({ usageCue: "", posOverride: "", note: "", examples: [] });
      expect(JSON.stringify(row.meaning)).not.toContain("Este año");
    });

    it("reports a label with no personal equivalent instead of approximating it", () => {
      const [row] = meaningsFromSenses(
        [{ gloss: "the boss", labels: ["obsolete", "derogatory", "slang"] }],
        [],
        ids()
      );

      expect(row.meaning.usageLabels).toEqual(["slang"]);
      expect(row.droppedLabels).toEqual(["obsolete", "derogatory"]);
    });

    it("carries no sense identity or ordering into the personal record", () => {
      const [row] = meaningsFromSenses(
        [{ gloss: "home", senseId: "wikt:12345", index: 3 }],
        [],
        ids()
      );

      expect(Object.keys(row.meaning).sort()).toEqual([
        "examples", "gloss", "id", "note", "posOverride", "regions", "usageCue", "usageLabels", "verbBehavior",
      ]);
      expect(JSON.stringify(row.meaning)).not.toContain("wikt:12345");
    });

    it("marks a sense the owner already has, ignoring case and surrounding space", () => {
      const rows = meaningsFromSenses(
        [{ gloss: "house" }, { gloss: "home" }],
        [newMeaning({ gloss: "  House " })],
        ids()
      );

      expect(rows.map((row) => row.duplicate)).toEqual([true, false]);
    });

    it("skips a sense with no gloss, since a saved meaning must have one", () => {
      const rows = meaningsFromSenses([{ gloss: "" }, { gloss: "  " }, { gloss: "house" }], [], ids());

      expect(rows.map((row) => row.meaning.gloss)).toEqual(["house"]);
    });

    it("gives every imported row its own fresh id", () => {
      const rows = meaningsFromSenses([{ gloss: "house" }, { gloss: "home" }], [], ids());

      expect(rows.map((row) => row.meaning.id)).toEqual(["meaning:imported-1", "meaning:imported-2"]);
    });

    it("survives an entry with no senses at all", () => {
      expect(meaningsFromSenses(undefined, [])).toEqual([]);
      expect(meaningsFromSenses([], undefined)).toEqual([]);
    });
  });
});
