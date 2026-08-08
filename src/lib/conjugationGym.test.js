import { describe, expect, it } from "vitest";
import {
  ALL_GYM_TENSES,
  CORE_20,
  CORE_50,
  EVERYDAY_TENSES,
  GYM_SLOTS,
  buildAdaptiveGymDeck,
  buildBalancedGymDeck,
  canonicalLemma,
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
});

describe("adaptive decks", () => {
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
});
