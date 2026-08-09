import { describe, expect, it } from "vitest";
import {
  ALL_GYM_TENSES,
  CORE_20,
  CORE_50,
  EVERYDAY_TENSES,
  GYM_SLOTS,
  buildAdaptiveGymDeck,
  buildBalancedGymDeck,
  buildFocusedGymDeck,
  canonicalLemma,
  gymCellCount,
  gymCellKey,
  gymCells,
  verbKeyForLemma,
} from "./conjugationGym.js";

const forms = (prefix) => Object.fromEntries(GYM_SLOTS.map((slot, index) => [slot, `${prefix}-${index}`]));
const verb = (lemma, tenses = EVERYDAY_TENSES.slice(0, 2), source = "saved") => ({
  itemKey: source === "saved" ? `user:${lemma}` : null,
  dictKey: `dict:${lemma}`,
  source,
  lemma,
  conjugation: { tenses: Object.fromEntries(tenses.map((tense, index) => [tense, forms(`${lemma}-${index}`)])) },
});

const seeded = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe("Conjugation Gym curriculum", () => {
  it("ships stable, nested Core 20 and Core 50 pools", () => {
    expect(CORE_20).toHaveLength(20);
    expect(CORE_50).toHaveLength(50);
    expect(new Set(CORE_50).size).toBe(50);
    expect(CORE_50.slice(0, 20)).toEqual(CORE_20);
  });

  it("offers every stored and composed tense without duplicating keys", () => {
    expect(new Set(ALL_GYM_TENSES).size).toBe(19);
    expect(ALL_GYM_TENSES).toContain("Imperative Negative/Present");
    expect(ALL_GYM_TENSES).toContain("Subjunctive/Future Perfect");
  });
});

describe("lemma identity", () => {
  it("uses an NFC, case-insensitive lemma key while preserving accents and ñ", () => {
    expect(canonicalLemma("  OÍR  ")).toBe("oír");
    expect(verbKeyForLemma("oi\u0301r")).toBe("lemma:oír");
    expect(verbKeyForLemma("soñar")).toBe("lemma:soñar");
    expect(verbKeyForLemma("sonar")).not.toBe(verbKeyForLemma("soñar"));
  });
});

describe("Gym cells and balanced decks", () => {
  it("carries stable identity and exact slot strings without inventing imperative yo", () => {
    const command = verb("ser", ["Imperative Negative/Present"], "core");
    command.conjugation.tenses["Imperative Negative/Present"] = {
      "tú": "no seas",
      "él/ella/usted": "no sea",
      nosotros: "no seamos",
      "ustedes/ellos": "no sean",
    };

    const cells = gymCells(command, { tenses: ["Imperative Negative/Present"], slots: GYM_SLOTS });
    expect(cells).toHaveLength(4);
    expect(cells.some((cell) => cell.slot === "yo")).toBe(false);
    expect(cells[0]).toMatchObject({
      verbKey: "lemma:ser",
      lemma: "ser",
      source: "core",
      itemKey: null,
    });
  });

  it("balances tenses and persons, avoids duplicate cells, and switches verbs when possible", () => {
    const deck = buildBalancedGymDeck([verb("ser"), verb("estar")], {
      size: 10,
      rng: seeded([0.2, 0.8, 0.4]),
    });

    expect(deck).toHaveLength(10);
    expect(new Set(deck.map(gymCellKey)).size).toBe(10);
    expect(new Set(deck.map((card) => card.tense)).size).toBe(2);
    expect(new Set(deck.map((card) => card.slot)).size).toBeGreaterThan(3);
    for (let index = 1; index < deck.length; index += 1) {
      expect(deck[index].verbKey).not.toBe(deck[index - 1].verbKey);
    }
  });

  it("returns a short deck when the selected cells run out", () => {
    const oneCell = verb("ser", ["Indicative/Present"]);
    oneCell.conjugation.tenses["Indicative/Present"] = { yo: "soy" };
    expect(buildBalancedGymDeck([oneCell], { size: 20 })).toHaveLength(1);
  });

  it("counts the unique answerable cells for the current choices", () => {
    const oneCell = verb("ser", ["Indicative/Present"]);
    oneCell.conjugation.tenses["Indicative/Present"] = { yo: "soy" };
    expect(gymCellCount([oneCell], { tenses: ["Indicative/Present"], slots: GYM_SLOTS })).toBe(1);
  });
});

describe("target-centred Focus decks", () => {
  it("starts at one exact cell, then expands by same tense and same person", () => {
    const verbs = [verb("ser"), verb("estar")];
    const deck = buildFocusedGymDeck(verbs, {
      size: 8,
      target: { verbKey: "lemma:ser", tense: "Indicative/Preterite", slot: "tú" },
      rng: seeded([0.2, 0.8, 0.4]),
    });

    expect(gymCellKey(deck[0])).toBe("lemma:ser|Indicative/Preterite|tú");
    expect(deck.slice(1, 5).every((card) =>
      card.verbKey === "lemma:ser" && card.tense === "Indicative/Preterite" && card.slot !== "tú"
    )).toBe(true);
    expect(deck[5]).toMatchObject({ verbKey: "lemma:ser", tense: "Indicative/Present", slot: "tú" });
    expect(new Set(deck.map(gymCellKey)).size).toBe(deck.length);
  });

  it("accepts a single tense, person, or item identity as the target dimension", () => {
    const verbs = [verb("ser"), verb("estar")];
    expect(buildFocusedGymDeck(verbs, {
      size: 4,
      target: { tense: "Indicative/Present" },
      rng: seeded([0.3, 0.7]),
    }).every((card) => card.tense === "Indicative/Present")).toBe(true);
    expect(buildFocusedGymDeck(verbs, {
      size: 4,
      target: { slot: "yo" },
      rng: seeded([0.3, 0.7]),
    }).every((card) => card.slot === "yo")).toBe(true);
    expect(buildFocusedGymDeck(verbs, {
      size: 3,
      target: { itemKey: "user:ser" },
      rng: seeded([0.3, 0.7]),
    }).every((card) => card.verbKey === "lemma:ser")).toBe(true);
  });
});

describe("adaptive decks", () => {
  it("ignores imported drill events whose metadata is null", () => {
    const verbs = [verb("ser"), verb("estar")];
    const events = [{
      type: "drill_fail",
      at: "2026-08-07T12:00:00.000Z",
      metadata: null,
    }];

    expect(() => buildAdaptiveGymDeck(verbs, events, { size: 10 })).not.toThrow();
    expect(buildAdaptiveGymDeck(verbs, events, { size: 10 })).toHaveLength(10);
  });

  it("puts a recent initial typed failure into the targeted share", () => {
    const verbs = [verb("ser"), verb("estar")];
    const events = [{
      type: "drill_fail",
      at: "2026-08-07T12:00:00.000Z",
      metadata: {
        mode: "typed",
        stage: "initial",
        promptId: "prompt-1",
        verbKey: "lemma:estar",
        tense: "Indicative/Preterite",
        slot: "tú",
      },
    }];

    const deck = buildAdaptiveGymDeck(verbs, events, { size: 10, rng: seeded([0.3, 0.7]) });
    expect(deck.map(gymCellKey)).toContain("lemma:estar|Indicative/Preterite|tú");
    expect(new Set(deck.map(gymCellKey)).size).toBe(deck.length);
  });

  it("falls back to a full balanced deck when there is no usable history", () => {
    const deck = buildAdaptiveGymDeck([verb("ser"), verb("estar")], [], { size: 10 });
    expect(deck).toHaveLength(10);
  });

  it("treats a reveal Missed grade as targeting evidence", () => {
    const verbs = [verb("ser"), verb("estar")];
    const events = [{
      type: "drill_fail",
      at: "2026-08-07T12:00:00.000Z",
      metadata: {
        mode: "reveal", stage: "initial", promptId: "reveal-1",
        verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo",
      },
    }];

    const deck = buildAdaptiveGymDeck(verbs, events, { size: 10, rng: seeded([0.4, 0.6]) });
    expect(deck.slice(0, 4).map(gymCellKey)).toContain("lemma:ser|Indicative/Present|yo");
  });

  it("counts reveal Got it as exposure without treating it as measured accuracy", () => {
    const twoCells = verb("ser", ["Indicative/Present"]);
    twoCells.conjugation.tenses["Indicative/Present"] = { yo: "soy", "tú": "eres" };
    const events = [{
      type: "drill_pass",
      at: "2026-08-07T12:00:00.000Z",
      metadata: {
        mode: "reveal", stage: "initial", promptId: "reveal-1",
        verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo",
      },
    }];

    const deck = buildAdaptiveGymDeck([twoCells], events, { size: 1, rng: seeded([0.5]) });
    expect(gymCellKey(deck[0])).toBe("lemma:ser|Indicative/Present|tú");
  });

  it("ranks an unresolved recent miss ahead of a recovered one", () => {
    const twoCells = verb("ser", ["Indicative/Present"]);
    twoCells.conjugation.tenses["Indicative/Present"] = { yo: "soy", "tú": "eres", nosotros: "somos" };
    const events = [
      {
        type: "drill_fail", at: "2026-08-07T12:02:00.000Z",
        metadata: { mode: "typed", stage: "initial", promptId: "recovered", verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo" },
      },
      {
        type: "drill_pass", at: "2026-08-07T12:03:00.000Z",
        metadata: { mode: "typed", stage: "retry", promptId: "recovered", verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo" },
      },
      {
        type: "drill_fail", at: "2026-08-07T12:01:00.000Z",
        metadata: { mode: "typed", stage: "initial", promptId: "unresolved", verbKey: "lemma:ser", tense: "Indicative/Present", slot: "tú" },
      },
    ];

    const deck = buildAdaptiveGymDeck([twoCells], events, { size: 2, rng: seeded([0.5]) });
    expect(gymCellKey(deck[0])).toBe("lemma:ser|Indicative/Present|tú");
  });
});
