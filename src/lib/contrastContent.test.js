import { describe, expect, it } from "vitest";
import {
  CONTRAST_CARDS,
  CONTRAST_GUIDE_TERMS,
  CONTRAST_PAIRS,
  CONTRAST_PAIR_IDS,
  contrastCards,
  contrastOptions,
} from "./contrastContent.js";
import { RECOGNITION_CARDS, RECOGNITION_LANES, recognitionTenses } from "./recognitionContent.js";
import { buildRecognitionDeck, rebuildMissedRecognitionDeck, recognitionOptions } from "./recognitionDeck.js";

const rngFrom = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const optionSet = (options) => [...options].sort().join("|");

describe("Contrasts reference content", () => {
  it("ships three sets of stable, unique, well-formed cards", () => {
    expect(CONTRAST_PAIR_IDS).toEqual(["ser-estar", "por-para", "connectors"]);
    expect(CONTRAST_CARDS.filter((card) => card.pair === "ser-estar")).toHaveLength(32);
    expect(CONTRAST_CARDS.filter((card) => card.pair === "por-para")).toHaveLength(32);
    expect(CONTRAST_CARDS.filter((card) => card.pair === "connectors")).toHaveLength(26);
    expect(new Set(CONTRAST_CARDS.map((card) => card.id)).size).toBe(CONTRAST_CARDS.length);
    for (const card of CONTRAST_CARDS) {
      expect(card.id).toBe(`contrast:${card.pair}:${card.id.split(":")[2]}`);
      expect(card.skill).toBe("contrast");
      expect(card.prompt.split("___")).toHaveLength(2);
      expect(card.gloss).toMatch(/\S/);
      expect(card.contrast).toMatch(/\S/);
      // Answers are never tense keys, so no tense-keyed consumer can ever read them as one.
      expect(card.answer).not.toContain("/");
    }
  });

  it("keeps every answer, alternative and distractor inside its pair's vocabulary", () => {
    for (const card of CONTRAST_CARDS) {
      const vocabulary = CONTRAST_PAIRS[card.pair].vocabulary;
      expect(vocabulary).toContain(card.answer);
      expect(card.vocabulary).toBe(vocabulary);
      expect(card.confusables).toHaveLength(3);
      expect(new Set([card.answer, ...card.alsoAcceptable, ...card.confusables]).size).toBe(4 + card.alsoAcceptable.length);
      for (const value of [...card.alsoAcceptable, ...card.confusables]) expect(vocabulary).toContain(value);
      // The pedagogical target is always on the card: distractor #1 is the other member.
      if (card.pair === "por-para") expect(card.confusables[0]).toBe(card.answer === "por" ? "para" : "por");
    }
  });

  it("puts the same-person form of the other verb first on every ser/estar card", () => {
    const partner = {
      soy: "estoy", eres: "estás", es: "está", somos: "estamos", son: "están",
      estoy: "soy", estás: "eres", está: "es", estamos: "somos", están: "son",
      era: "estaba", estaba: "era", fue: "estuvo", estuvo: "fue",
    };
    for (const card of contrastCards("ser-estar")) {
      expect(card.confusables[0]).toBe(partner[card.answer]);
    }
  });

  it("puts the opposite-direction connector first unless that one is itself acceptable", () => {
    const opposite = {
      porque: "por eso", "por eso": "porque", "así que": "porque",
      pero: "aunque", aunque: "pero", "sin embargo": "pero",
      "en cambio": "sin embargo", además: "pero", mientras: "entonces", entonces: "mientras",
    };
    for (const card of contrastCards("connectors")) {
      const expected = opposite[card.answer];
      expect(expected, card.id).toBeTruthy();
      if (!card.alsoAcceptable.includes(expected)) expect(card.confusables[0], card.id).toBe(expected);
    }
  });

  it("registers as a recognition lane without a tense scope", () => {
    expect(RECOGNITION_CARDS.contrast).toBe(CONTRAST_CARDS);
    expect(RECOGNITION_LANES.contrast).toEqual({ label: "Contrasts", eyebrow: "Which one fits?" });
    expect(recognitionTenses("contrast")).toEqual([]);
    expect(recognitionTenses("usage").every((tense) => tense.includes("/"))).toBe(true);
  });

  it("scopes options and cards by set, with 'all' (or the older 'both') as the union", () => {
    expect(contrastOptions("por-para")).toEqual(["por", "para", "a", "de", "en", "con"]);
    expect(contrastOptions("all")).toHaveLength(30);
    expect(contrastOptions("both")).toEqual(contrastOptions("all"));
    expect(contrastCards("por-para").every((card) => card.pair === "por-para")).toBe(true);
    expect(contrastCards("all")).toHaveLength(90);
    expect(contrastCards("both")).toHaveLength(90);
    expect(contrastCards(["ser-estar"])).toHaveLength(32);
  });

  it("uses only multi-word or long guide terms so function words cannot match unrelated titles", () => {
    for (const [pair, terms] of Object.entries(CONTRAST_GUIDE_TERMS)) {
      expect(CONTRAST_PAIRS[pair]).toBeTruthy();
      expect(terms.length).toBeGreaterThan(0);
      for (const term of terms) {
        const words = term.trim().split(/\s+|\//).length;
        expect(words > 1 || term.length >= 8, term).toBe(true);
      }
    }
  });
});

describe("Contrasts decks through the shared recognition engine", () => {
  it("offers exactly one correct option and never an acceptable alternative", () => {
    const scope = contrastOptions("por-para");
    for (const card of contrastCards("por-para")) {
      for (const seed of [[0.1, 0.9, 0.3], [0.7, 0.2, 0.5], [0.5, 0.5, 0.5]]) {
        const options = recognitionOptions(card, { tenseScope: scope, allTenses: scope, rng: rngFrom(seed) });
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options.filter((option) => option === card.answer)).toHaveLength(1);
        for (const alternative of card.alsoAcceptable) expect(options).not.toContain(alternative);
        expect(options).toEqual(expect.arrayContaining(card.confusables));
      }
    }
  });

  it("never crosses sets in an all-sets deck, even when the anti-repeat swap runs", () => {
    const scope = contrastOptions("all");
    const deck = buildRecognitionDeck(contrastCards("all"), {
      size: 20,
      tenseScope: scope,
      allTenses: scope,
      rng: rngFrom([0.12, 0.84, 0.31, 0.67, 0.45, 0.02, 0.98]),
    });
    expect(deck).toHaveLength(20);
    expect(new Set(deck.map((card) => card.pair)).size).toBe(3);
    for (const card of deck) {
      const vocabulary = new Set(CONTRAST_PAIRS[card.pair].vocabulary);
      for (const option of card.options) expect(vocabulary.has(option)).toBe(true);
    }
    // Force the swap path on por/para and connector cards: the union scope lists ser/estar forms
    // first, so without the per-card vocabulary the replacement would be "soy".
    for (const card of [...contrastCards("por-para"), ...contrastCards("connectors")]) {
      const same = recognitionOptions(card, { tenseScope: scope, allTenses: scope, rng: () => 0.4 });
      const swapped = recognitionOptions(card, {
        tenseScope: scope, allTenses: scope, rng: () => 0.4, previousOptions: same,
      });
      expect(swapped).toHaveLength(4);
      expect(optionSet(swapped)).not.toBe(optionSet(same));
      const vocabulary = new Set(CONTRAST_PAIRS[card.pair].vocabulary);
      for (const option of swapped) expect(vocabulary.has(option)).toBe(true);
    }
  });

  it("balances a ten-card ser/estar deck without consecutive equal answers or option sets", () => {
    const scope = contrastOptions("ser-estar");
    const deck = buildRecognitionDeck(contrastCards("ser-estar"), {
      size: 10,
      tenseScope: scope,
      allTenses: scope,
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

  it("rebuilds a missed contrast card with the same four options in a new order", () => {
    const scope = contrastOptions("por-para");
    const [card] = buildRecognitionDeck(contrastCards("por-para"), {
      size: 1, tenseScope: scope, allTenses: scope, rng: () => 0.4,
    });
    const [again] = rebuildMissedRecognitionDeck([card], { tenseScope: scope, allTenses: scope, rng: () => 0.4 });
    expect(again.id).toBe(card.id);
    expect(again.options).not.toEqual(card.options);
    expect(optionSet(again.options)).toBe(optionSet(card.options));
  });

  it("leaves usage and endings option building unchanged (no vocabulary field)", () => {
    for (const skill of ["usage", "endings"]) {
      expect(RECOGNITION_CARDS[skill].every((card) => card.vocabulary === undefined)).toBe(true);
    }
  });
});
