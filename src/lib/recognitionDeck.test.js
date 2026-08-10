import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERFECT_TENSES } from "./conjugation.js";
import {
  RECOGNITION_EVERYDAY_TENSES,
  TENSE_ENDINGS,
  TENSE_USAGE_CARDS,
  recognitionTenses,
} from "./recognitionContent.js";
import {
  buildRecognitionDeck,
  rebuildMissedRecognitionDeck,
  recognitionOptions,
} from "./recognitionDeck.js";

const rngFrom = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const optionSet = (options) => [...options].sort().join("|");

describe("recognition reference content", () => {
  it("keeps stable, unique ids and canonical persisted tense answers", () => {
    const cards = [...TENSE_ENDINGS, ...TENSE_USAGE_CARDS];
    expect(TENSE_ENDINGS).toHaveLength(19);
    expect(TENSE_USAGE_CARDS).toHaveLength(35);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.every((card) => card.answer.includes("/"))).toBe(true);
    expect(TENSE_USAGE_CARDS.find((card) => card.id === "usage:present-perfect-current-period")?.alsoAcceptable)
      .toContain("Indicative/Preterite");
  });

  it("makes the future and conditional infinitive cue part of the prompt", () => {
    for (const tense of ["Indicative/Future", "Indicative/Conditional"]) {
      const card = TENSE_ENDINGS.find((row) => row.answer === tense);
      expect(card.attachment).toBe("infinitive");
      expect(card.prompt).toMatch(/whole infinitive/i);
    }
  });
});

describe("recognition choices and balanced decks", () => {
  it("offers one canonical answer plus three distinct distractors and excludes acceptable alternatives", () => {
    const card = TENSE_USAGE_CARDS.find((row) => row.id === "usage:present-perfect-current-period");
    const options = recognitionOptions(card, {
      tenseScope: recognitionTenses("usage"),
      allTenses: recognitionTenses("usage"),
      rng: rngFrom([0.2, 0.8, 0.4]),
    });

    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(options.filter((tense) => tense === card.answer)).toHaveLength(1);
    expect(options).not.toContain("Indicative/Preterite");
  });

  it("balances a ten-card endings deck by tense without consecutive equal answers or option sets", () => {
    const deck = buildRecognitionDeck(TENSE_ENDINGS, {
      size: 10,
      tenseScope: RECOGNITION_EVERYDAY_TENSES,
      allTenses: recognitionTenses("endings"),
      rng: rngFrom([0.12, 0.84, 0.31, 0.67, 0.45]),
    });

    expect(deck).toHaveLength(10);
    expect(new Set(deck.map((card) => card.id)).size).toBe(10);
    expect(new Set(deck.map((card) => card.answer)).size).toBeGreaterThan(4);
    for (let index = 1; index < deck.length; index += 1) {
      expect(deck[index].answer).not.toBe(deck[index - 1].answer);
      expect(optionSet(deck[index].options)).not.toBe(optionSet(deck[index - 1].options));
    }
  });

  it("rebuilds a missed card with a different option order", () => {
    const [card] = buildRecognitionDeck(TENSE_USAGE_CARDS, {
      size: 1,
      tenseScope: recognitionTenses("usage"),
      allTenses: recognitionTenses("usage"),
      rng: () => 0.4,
    });
    const [again] = rebuildMissedRecognitionDeck([card], {
      tenseScope: recognitionTenses("usage"),
      allTenses: recognitionTenses("usage"),
      rng: () => 0.4,
    });

    expect(again.id).toBe(card.id);
    expect(again.options).not.toEqual(card.options);
    expect(optionSet(again.options)).toBe(optionSet(card.options));
  });
});

function shippedConjugations() {
  const manifest = JSON.parse(readFileSync(new URL("../../public/dict/manifest.json", import.meta.url), "utf8"));
  const tables = [];
  for (const chunk of manifest.chunks.filter((row) => row.rows?.conjugations)) {
    const body = JSON.parse(readFileSync(new URL(`../../public/dict/${manifest.path}/${chunk.file}`, import.meta.url), "utf8"));
    tables.push(...(body.stores.conjugations || []));
  }
  return new Map(tables.map((table) => [table.id, table]));
}

const FIVE_SLOTS = ["yo", "tú", "él/ella/usted", "nosotros", "ustedes/ellos"];

function strippedEndings(table, tense, prefix) {
  return FIVE_SLOTS.map((slot) => {
    const form = table.tenses[tense][slot];
    expect(form.startsWith(prefix)).toBe(true);
    return form.slice(prefix.length);
  });
}

describe("endings derivation against the shipped dictionary", () => {
  it("stem-strips hablar/comer/vivir and reads haber to reproduce every curated row", () => {
    const tables = shippedConjugations();
    const verbs = {
      hablar: tables.get("conj:wikt:hablar"),
      comer: tables.get("conj:wikt:comer"),
      vivir: tables.get("conj:wikt:vivir"),
    };
    const haber = tables.get("conj:wikt:haber");
    expect(Object.values(verbs).every(Boolean)).toBe(true);
    expect(haber).toBeTruthy();

    for (const row of TENSE_ENDINGS) {
      if (row.attachment === "participle") {
        expect(FIVE_SLOTS.map((slot) => haber.tenses[PERFECT_TENSES[row.answer]][slot])).toEqual(row.endings);
        continue;
      }

      const lemmas = row.attachment === "infinitive"
        ? ["hablar", "comer", "vivir"]
        : row.verbClass === "-er/-ir"
          ? ["comer", "vivir"]
          : [row.exampleLemma];
      for (const lemma of lemmas) {
        const prefix = row.attachment === "infinitive" ? lemma : lemma.slice(0, -2);
        expect(strippedEndings(verbs[lemma], row.answer, prefix), row.id).toEqual(row.endings);
      }
    }
  });
});
