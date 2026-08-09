import { describe, expect, it } from "vitest";
import {
  ALL_GYM_TENSES,
  CORE_20,
  CORE_50,
  CURATED_GYM_LEMMAS,
  EVERYDAY_TENSES,
  GYM_SLOTS,
  IRREGULAR_PRETERITES,
  STEM_CHANGERS,
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

  it("ships the approved pattern packs inside one de-duplicated curated lookup", () => {
    expect(STEM_CHANGERS).toEqual([
      "pensar", "querer", "entender", "perder", "empezar", "sentir", "preferir", "poder", "volver",
      "encontrar", "dormir", "morir", "pedir", "seguir", "servir", "repetir", "jugar",
    ]);
    expect(IRREGULAR_PRETERITES).toEqual([
      "ser", "ir", "dar", "ver", "hacer", "decir", "querer", "venir", "poner", "poder", "saber",
      "tener", "estar", "traer", "andar", "conducir",
    ]);
    expect(new Set(CURATED_GYM_LEMMAS).size).toBe(CURATED_GYM_LEMMAS.length);
    expect(CURATED_GYM_LEMMAS).toHaveLength(56);
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
  it("lets a later typed initial pass resolve older failures on the same cell", () => {
    const twoCells = verb("ser", ["Indicative/Present"]);
    twoCells.conjugation.tenses["Indicative/Present"] = { yo: "soy", "tú": "eres" };
    const events = [
      {
        type: "drill_fail", at: "2026-08-01T12:00:00.000Z",
        metadata: { mode: "typed", stage: "initial", promptId: "tú-miss", verbKey: "lemma:ser", tense: "Indicative/Present", slot: "tú" },
      },
      {
        type: "drill_fail", at: "2026-08-02T12:00:00.000Z",
        metadata: { mode: "typed", stage: "initial", promptId: "yo-miss", verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo" },
      },
      {
        type: "drill_pass", at: "2026-08-03T12:00:00.000Z",
        metadata: { mode: "typed", stage: "initial", promptId: "yo-clean", verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo" },
      },
    ];

    const deck = buildAdaptiveGymDeck([twoCells], events, {
      size: 2,
      now: "2026-08-09T12:00:00.000Z",
      rng: seeded([0.5]),
    });
    expect(gymCellKey(deck[0])).toBe("lemma:ser|Indicative/Present|tú");
  });

  it("expires unresolved misses after 90 days", () => {
    const twoCells = verb("ser", ["Indicative/Present"]);
    twoCells.conjugation.tenses["Indicative/Present"] = { yo: "soy", "tú": "eres" };
    const events = [{
      type: "drill_fail",
      at: "2026-04-01T12:00:00.000Z",
      metadata: {
        mode: "reveal", stage: "initial", promptId: "old-miss",
        verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo",
      },
    }];

    const deck = buildAdaptiveGymDeck([twoCells], events, {
      size: 2,
      now: "2026-08-09T12:00:00.000Z",
      rng: seeded([0.5]),
    });
    expect(gymCellKey(deck[0])).toBe("lemma:ser|Indicative/Present|tú");
  });

  it("uses only the last ten typed initial attempts when deciding weakness", () => {
    const manyCells = verb("ser", [
      "Indicative/Present", "Indicative/Preterite", "Indicative/Imperfect", "Indicative/Future",
    ]);
    manyCells.conjugation.tenses = {
      "Indicative/Present": { yo: "soy" },
      "Indicative/Preterite": { "tú": "fuiste", "él/ella/usted": "fue", nosotros: "fuimos", "ustedes/ellos": "fueron" },
      "Indicative/Imperfect": { "tú": "eras", "él/ella/usted": "era", nosotros: "éramos", "ustedes/ellos": "eran" },
      "Indicative/Future": { "tú": "serás", "él/ella/usted": "será", nosotros: "seremos", "ustedes/ellos": "serán" },
    };
    const cell = { verbKey: "lemma:ser", tense: "Indicative/Present", slot: "yo" };
    const events = [];
    for (let index = 0; index < 3; index += 1) {
      const promptId = `old-${index}`;
      events.push({
        type: "drill_fail",
        at: new Date(Date.UTC(2026, 4, 1, 12, index)).toISOString(),
        metadata: { ...cell, mode: "typed", stage: "initial", promptId },
      });
      events.push({
        type: "drill_pass",
        at: new Date(Date.UTC(2026, 4, 1, 13, index)).toISOString(),
        metadata: { ...cell, mode: "typed", stage: "retry", promptId },
      });
    }
    for (let index = 0; index < 10; index += 1) {
      events.push({
        type: "drill_pass",
        at: new Date(Date.UTC(2026, 6, 1 + index, 12)).toISOString(),
        metadata: { ...cell, mode: "typed", stage: "initial", promptId: `clean-${index}` },
      });
    }
    const unresolved = [
      ["Indicative/Preterite", "tú"],
      ["Indicative/Imperfect", "él/ella/usted"],
      ["Indicative/Future", "nosotros"],
      ["Indicative/Preterite", "ustedes/ellos"],
    ];
    unresolved.forEach(([tense, slot], index) => events.push({
      type: "drill_fail",
      at: new Date(Date.UTC(2026, 7, 1 + index, 12)).toISOString(),
      metadata: { mode: "typed", stage: "initial", promptId: `recent-${index}`, verbKey: "lemma:ser", tense, slot },
    }));

    const deck = buildAdaptiveGymDeck([manyCells], events, {
      size: 10,
      now: "2026-08-09T12:00:00.000Z",
      rng: seeded([0.2, 0.8, 0.4]),
    });
    expect(deck.slice(0, 7).map(gymCellKey)).not.toContain("lemma:ser|Indicative/Present|yo");
  });

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

    const deck = buildAdaptiveGymDeck(verbs, events, { size: 10, now: "2026-08-09T12:00:00.000Z", rng: seeded([0.3, 0.7]) });
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

    const deck = buildAdaptiveGymDeck(verbs, events, { size: 10, now: "2026-08-09T12:00:00.000Z", rng: seeded([0.4, 0.6]) });
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

    const deck = buildAdaptiveGymDeck([twoCells], events, { size: 1, now: "2026-08-09T12:00:00.000Z", rng: seeded([0.5]) });
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

    const deck = buildAdaptiveGymDeck([twoCells], events, { size: 2, now: "2026-08-09T12:00:00.000Z", rng: seeded([0.5]) });
    expect(gymCellKey(deck[0])).toBe("lemma:ser|Indicative/Present|tú");
  });
});
