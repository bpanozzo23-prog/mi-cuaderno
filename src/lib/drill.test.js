import { describe, it, expect } from "vitest";
import {
  checkTypedAnswer,
  conjugationForms,
  diagnoseTypedAnswer,
} from "./drill.js";

describe("marking a typed answer", () => {
  it("accepts the form typed exactly", () => {
    expect(checkTypedAnswer("pusieron", "pusieron")).toBe("exact");
  });

  it("forgives case and surrounding space", () => {
    expect(checkTypedAnswer("  Pusieron ", "pusieron")).toBe("exact");
  });

  it("forgives an inner run of spaces in a pronominal form", () => {
    expect(checkTypedAnswer("me  arrepiento", "me arrepiento")).toBe("exact");
  });

  /**
   * The heart of it. Accents separate tenses in Spanish, so the first comparison cannot go
   * through normalize.js the way the rest of the app's matching does — `hablo` must never
   * simply *be* `habló`. It is passed as a near miss so a phone keyboard stays usable, and
   * named so it still teaches.
   */
  it("calls a missing accent a near miss, not a match and not a failure", () => {
    expect(checkTypedAnswer("hablo", "habló")).toBe("accents");
    expect(checkTypedAnswer("hable", "hablé")).toBe("accents");
    expect(checkTypedAnswer("comeriamos", "comeríamos")).toBe("accents");
  });

  it("does not confuse two tenses that differ only by an accent", () => {
    // Both directions: the exact answer to one is never the exact answer to the other.
    expect(checkTypedAnswer("habló", "habló")).toBe("exact");
    expect(checkTypedAnswer("habló", "hablo")).toBe("accents");
  });

  /**
   * ñ is a letter, not an accent (§8). normalize.js preserves it precisely so `año` never
   * matches `ano`, and that has to hold here too: typing the wrong one is a different word,
   * not a slip of the keyboard.
   */
  it("keeps ñ distinct, so a wrong letter stays wrong", () => {
    expect(checkTypedAnswer("ano", "año")).toBe("wrong");
    expect(checkTypedAnswer("enseno", "enseño")).toBe("wrong");
  });

  it("marks a different form wrong", () => {
    expect(checkTypedAnswer("pusimos", "pusieron")).toBe("wrong");
  });

  it("marks an empty or missing answer wrong rather than accidentally exact", () => {
    expect(checkTypedAnswer("", "pusieron")).toBe("wrong");
    expect(checkTypedAnswer("   ", "pusieron")).toBe("wrong");
    expect(checkTypedAnswer(undefined, "pusieron")).toBe("wrong");
    // Two blanks must not agree with each other.
    expect(checkTypedAnswer("", "")).toBe("wrong");
  });
});

describe("diagnosing a typed answer", () => {
  const forms = conjugationForms({
    tenses: {
      "Indicative/Present": { yo: "hablo", "tú": "hablas", nosotros: "hablamos" },
      "Indicative/Preterite": { yo: "hablé", "tú": "hablaste", nosotros: "hablamos" },
      "Subjunctive/Present": { yo: "hable", "tú": "hables", nosotros: "hablemos" },
    },
  });

  it("keeps the exact/accent checker as the first two outcomes", () => {
    const card = { answer: "hablé", tense: "Indicative/Preterite", slot: "yo" };
    expect(diagnoseTypedAnswer("hablé", card, forms)).toEqual({ passed: true, verdict: "exact", diagnosis: "exact" });
    expect(diagnoseTypedAnswer("hable", card, forms)).toEqual({ passed: true, verdict: "accents", diagnosis: "accents" });
  });

  it("recognizes a missing no in a negative command", () => {
    expect(diagnoseTypedAnswer("seas", {
      answer: "no seas", tense: "Imperative Negative/Present", slot: "tú",
    }, [])).toMatchObject({ passed: false, diagnosis: "missing_no" });
  });

  it("recognizes a missing reflexive pronoun, including after command no", () => {
    expect(diagnoseTypedAnswer("quejo", {
      answer: "me quejo", tense: "Indicative/Present", slot: "yo",
    }, [])).toMatchObject({ diagnosis: "missing_reflexive" });
    expect(diagnoseTypedAnswer("no quejes", {
      answer: "no te quejes", tense: "Imperative Negative/Present", slot: "tú",
    }, [])).toMatchObject({ diagnosis: "missing_reflexive" });
  });

  it("distinguishes wrong person, wrong tense, another form, and unknown input", () => {
    const card = { answer: "hablaste", tense: "Indicative/Preterite", slot: "tú" };
    expect(diagnoseTypedAnswer("hablé", card, forms).diagnosis).toBe("wrong_person");
    expect(diagnoseTypedAnswer("hablas", card, forms).diagnosis).toBe("wrong_tense");
    expect(diagnoseTypedAnswer("hablemos", card, forms).diagnosis).toBe("other_form");
    expect(diagnoseTypedAnswer("comiste", card, forms).diagnosis).toBe("wrong");
  });

  it("uses the fixed person-before-tense rule for an ambiguous recognizable form", () => {
    // hablamos is both present and preterite; on a tú-preterite prompt it matches a wrong
    // person in the same tense and another tense. The documented ladder is deterministic.
    const card = { answer: "hablaste", tense: "Indicative/Preterite", slot: "tú" };
    expect(diagnoseTypedAnswer("hablamos", card, forms).diagnosis).toBe("wrong_person");
  });
});
