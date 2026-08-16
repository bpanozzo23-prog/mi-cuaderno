import { describe, expect, it } from "vitest";
import {
  PART_OF_SPEECH_ABBR,
  genderAbbreviation,
  grammarAbbreviations,
  partOfSpeechAbbreviation,
  personalPosForEntryPos,
} from "./partOfSpeech.js";
import { LEXICAL_POS_OPTIONS } from "./meanings.js";

describe("English part-of-speech abbreviations", () => {
  it("uses English labels for personal and imported dictionary categories", () => {
    expect(PART_OF_SPEECH_ABBR.noun).toBe("n.");
    expect(PART_OF_SPEECH_ABBR.verb).toBe("v.");
    expect(PART_OF_SPEECH_ABBR.phrase).toBe("phr.");
    expect(PART_OF_SPEECH_ABBR.prep_phrase).toBe("prep. phr.");
    expect(PART_OF_SPEECH_ABBR.name).toBe("prop. n.");
  });

  it("keeps an unfamiliar dictionary category readable", () => {
    expect(partOfSpeechAbbreviation("classifier")).toBe("classifier");
    expect(partOfSpeechAbbreviation()).toBe("");
  });

  it("abbreviates every part of speech the owner can choose", () => {
    // The fallback spells an unlisted value out in full, so a gap here is not an error anywhere —
    // it is one card reading "preposition" beside another reading "adv." Assert the whole row.
    for (const pos of LEXICAL_POS_OPTIONS.filter(Boolean)) {
      expect(PART_OF_SPEECH_ABBR).toHaveProperty(pos);
      if (pos !== "other") expect(partOfSpeechAbbreviation(pos).endsWith(".")).toBe(true);
    }
  });

  it("abbreviates a dictionary tag and its spelled-out twin identically", () => {
    for (const [short, long] of [
      ["adj", "adjective"],
      ["adv", "adverb"],
      ["pron", "pronoun"],
      ["prep", "preposition"],
      ["conj", "conjunction"],
    ]) {
      expect(partOfSpeechAbbreviation(short)).toBe(partOfSpeechAbbreviation(long));
    }
  });

  describe("translating a dictionary tag into the owner's vocabulary", () => {
    it("only ever answers with something the owner can see in the select", () => {
      const offered = new Set(LEXICAL_POS_OPTIONS);
      for (const pos of ["noun", "verb", "adj", "adv", "pron", "prep", "conj", "intj",
        "det", "article", "num", "contraction", "particle", "phrase", "classifier", undefined]) {
        expect(offered.has(personalPosForEntryPos(pos))).toBe(true);
      }
    });

    it("keeps the four function-word classes rather than folding them away", () => {
      expect(personalPosForEntryPos("prep")).toBe("preposition");
      expect(personalPosForEntryPos("conj")).toBe("conjunction");
      expect(personalPosForEntryPos("pron")).toBe("pronoun");
      expect(personalPosForEntryPos("intj")).toBe("interjection");
    });
  });

  it("formats dictionary gender as a separate conventional abbreviation", () => {
    expect(genderAbbreviation("f")).toBe("f.");
    expect(genderAbbreviation("m-f")).toBe("m./f.");
    expect(grammarAbbreviations("noun", "m")).toBe("n. · m.");
  });
});
