import { describe, expect, it } from "vitest";
import { conjugationForms } from "./drill.js";
import { formCellFor, formChoiceOptions, formChoicePool } from "./formChoices.js";

const rngFrom = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const SER = {
  tenses: {
    "Indicative/Present": { yo: "soy", "tú": "eres", "él/ella/usted": "es", nosotros: "somos", vosotros: "sois", "ustedes/ellos": "son" },
    "Indicative/Preterite": { yo: "fui", "tú": "fuiste", "él/ella/usted": "fue", nosotros: "fuimos", vosotros: "fuisteis", "ustedes/ellos": "fueron" },
    "Indicative/Imperfect": { yo: "era", "tú": "eras", "él/ella/usted": "era", nosotros: "éramos", vosotros: "erais", "ustedes/ellos": "eran" },
    "Indicative/Present Perfect": { yo: "he sido", "tú": "has sido", "él/ella/usted": "ha sido", nosotros: "hemos sido", "ustedes/ellos": "han sido" },
    "Subjunctive/Present": { yo: "sea", "tú": "seas", "él/ella/usted": "sea", nosotros: "seamos", "ustedes/ellos": "sean" },
  },
};
const FORMS = conjugationForms(SER);
const cell = (tense, slot) => ({ lemma: "ser", term: "ser", tense, slot, answer: SER.tenses[tense][slot] });

describe("Forms Choose distractors", () => {
  it("offers the answer once plus three distinct forms of the same verb", () => {
    for (const seed of [[0.1, 0.9, 0.3, 0.6], [0.7, 0.2, 0.5, 0.8], [0.5, 0.5, 0.5, 0.5]]) {
      const options = formChoiceOptions(cell("Indicative/Preterite", "él/ella/usted"), FORMS, { rng: rngFrom(seed) });
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      expect(options.filter((option) => option === "fue")).toHaveLength(1);
      expect(options.every((option) => FORMS.some((entry) => entry.form === option))).toBe(true);
    }
  });

  it("mixes a same-tense other person with the same person in the curated confusable tense", () => {
    const card = cell("Indicative/Preterite", "él/ella/usted");
    const options = formChoiceOptions(card, FORMS, { rng: rngFrom([0.1, 0.9, 0.3, 0.6]) });
    const cells = options.filter((option) => option !== "fue").map((option) => formCellFor(option, card, FORMS));
    expect(cells.some((entry) => entry.tense === "Indicative/Preterite" && entry.slot !== "él/ella/usted")).toBe(true);
    // Preterite's first curated confusable is the imperfect, so «era» always beats «ha sido» / «sea».
    expect(options).toContain("era");
  });

  it("falls back to the Gym's tense order when the confusable map has nothing the table holds", () => {
    const card = cell("Subjunctive/Present", "tú");
    const options = formChoiceOptions(card, FORMS, { rng: rngFrom([0.2, 0.4, 0.6, 0.8]), confusables: {} });
    expect(options).toHaveLength(4);
    // The first other tense in Gym order the table has for tú is the indicative present.
    expect(options).toContain("eres");
  });

  it("never offers a form string identical to the answer, and skips vosotros", () => {
    const pool = formChoicePool(cell("Indicative/Imperfect", "yo"), FORMS);
    expect(pool.some((entry) => entry.form === "era")).toBe(false);
    expect(pool.some((entry) => entry.slot === "vosotros")).toBe(false);
    for (const seed of [[0.05, 0.95, 0.5, 0.25], [0.6, 0.1, 0.9, 0.4]]) {
      const options = formChoiceOptions(cell("Indicative/Imperfect", "yo"), FORMS, { rng: rngFrom(seed) });
      expect(options.filter((option) => option === "era")).toHaveLength(1);
      expect(options).not.toContain("sois");
      expect(options).not.toContain("erais");
    }
  });

  it("is deterministic under an injected rng and returns nothing for a verb with too few forms", () => {
    const card = cell("Indicative/Present", "nosotros");
    const first = formChoiceOptions(card, FORMS, { rng: rngFrom([0.3, 0.7, 0.1, 0.9]) });
    const again = formChoiceOptions(card, FORMS, { rng: rngFrom([0.3, 0.7, 0.1, 0.9]) });
    expect(again).toEqual(first);

    const tiny = conjugationForms({ tenses: { "Indicative/Present": { yo: "soy", "tú": "eres", "él/ella/usted": "es" } } });
    expect(formChoiceOptions({ tense: "Indicative/Present", slot: "yo", answer: "soy" }, tiny)).toEqual([]);
    expect(formChoiceOptions({ tense: "Indicative/Present", slot: "yo", answer: "soy" }, [])).toEqual([]);
  });

  it("names the cell a tapped form belongs to, preferring the prompt's tense when a form repeats", () => {
    const card = cell("Indicative/Imperfect", "él/ella/usted");
    expect(formCellFor("eras", card, FORMS)).toMatchObject({ tense: "Indicative/Imperfect", slot: "tú" });
    expect(formCellFor("sea", cell("Subjunctive/Present", "él/ella/usted"), FORMS)).toMatchObject({ slot: "yo" });
    expect(formCellFor("nope", card, FORMS)).toBeNull();
  });
});
