import { describe, expect, it } from "vitest";
import {
  PART_OF_SPEECH_ABBR,
  genderAbbreviation,
  grammarAbbreviations,
  partOfSpeechAbbreviation,
} from "./partOfSpeech.js";

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

  it("formats dictionary gender as a separate conventional abbreviation", () => {
    expect(genderAbbreviation("f")).toBe("f.");
    expect(genderAbbreviation("m-f")).toBe("m./f.");
    expect(grammarAbbreviations("noun", "m")).toBe("n. · m.");
  });
});
