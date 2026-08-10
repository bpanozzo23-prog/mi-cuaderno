import { describe, expect, it } from "vitest";
import { GYM_SLOTS } from "./conjugationGym.js";
import { RECOGNITION_EVERYDAY_TENSES, TENSE_ENDINGS } from "./recognitionContent.js";
import {
  buildEndingsProductionDeck,
  gradeEndingRow,
  rebuildMissedEndingsProductionDeck,
} from "./endingsProduction.js";

const valuesFor = (row, transform = (value) => value) => Object.fromEntries(
  GYM_SLOTS.map((slot, index) => [slot, transform(row.endings[index], slot, index)])
);

describe("typed Endings row grading", () => {
  it("passes an all-exact row and names every exact slot", () => {
    const row = TENSE_ENDINGS.find((candidate) => candidate.id === "endings:indicative-preterite-ar");
    expect(gradeEndingRow(valuesFor(row), row)).toEqual({
      passed: true,
      complete: true,
      verdict: "exact",
      slotVerdicts: Object.fromEntries(GYM_SLOTS.map((slot) => [slot, "exact"])),
    });
  });

  it("passes accent-only slips when they do not collide with another curated ending", () => {
    const row = TENSE_ENDINGS.find((candidate) => candidate.id === "endings:indicative-imperfect-er-ir");
    const graded = gradeEndingRow(valuesFor(row, (ending) => ending.normalize("NFD").replace(/\p{M}/gu, "")), row);

    expect(graded.passed).toBe(true);
    expect(graded.verdict).toBe("accents");
    expect(Object.values(graded.slotVerdicts).every((verdict) => verdict === "accents")).toBe(true);
  });

  it("fails an accent near-match that is literally another curated ending", () => {
    const row = TENSE_ENDINGS.find((candidate) => candidate.id === "endings:indicative-future-all");
    const values = valuesFor(row);
    values.tú = "as";
    const graded = gradeEndingRow(values, row);

    expect(graded).toMatchObject({ passed: false, complete: true, verdict: "wrong" });
    expect(graded.slotVerdicts.tú).toBe("accent_collision");
  });

  it("distinguishes wrong and required cells without accepting a partial row", () => {
    const row = TENSE_ENDINGS.find((candidate) => candidate.id === "endings:indicative-present-ar");
    const wrong = valuesFor(row);
    wrong.yo = "xyz";
    expect(gradeEndingRow(wrong, row)).toMatchObject({
      passed: false,
      complete: true,
      verdict: "wrong",
      slotVerdicts: { yo: "wrong" },
    });

    const partial = valuesFor(row);
    partial.nosotros = "";
    expect(gradeEndingRow(partial, row)).toMatchObject({
      passed: false,
      complete: false,
      verdict: "required",
      slotVerdicts: { nosotros: "required" },
    });
  });
});

describe("typed Endings decks", () => {
  it("balances unique rows and caps a requested 20 at the available supply", () => {
    const deck = buildEndingsProductionDeck(TENSE_ENDINGS, {
      size: 20,
      tenseScope: RECOGNITION_EVERYDAY_TENSES,
      rng: () => 0.4,
    });
    const available = TENSE_ENDINGS.filter((row) => RECOGNITION_EVERYDAY_TENSES.includes(row.answer));

    expect(deck).toHaveLength(available.length);
    expect(new Set(deck.map((row) => row.id)).size).toBe(deck.length);
    for (let index = 1; index < deck.length; index += 1) {
      expect(deck[index].answer).not.toBe(deck[index - 1].answer);
    }
  });

  it("keeps perfect haber rows and whole-infinitive cues explicit", () => {
    expect(TENSE_ENDINGS.filter((row) => row.attachment === "participle")).toHaveLength(6);
    expect(TENSE_ENDINGS.filter((row) => row.attachment === "participle").every((row) => row.verbClass === "haber + participle")).toBe(true);
    for (const tense of ["Indicative/Future", "Indicative/Conditional"]) {
      expect(TENSE_ENDINGS.find((row) => row.answer === tense)).toMatchObject({ attachment: "infinitive" });
    }
  });

  it("de-duplicates missed rows before their one later attempt", () => {
    const row = TENSE_ENDINGS[0];
    expect(rebuildMissedEndingsProductionDeck([row, row], { rng: () => 0.4 })).toEqual([row]);
  });
});
