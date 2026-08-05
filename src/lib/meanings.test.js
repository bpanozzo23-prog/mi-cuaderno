import { describe, expect, it } from "vitest";
import {
  cleanMeanings,
  firstMeaningGloss,
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
});
