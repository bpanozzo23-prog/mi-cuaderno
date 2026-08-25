import { describe, expect, it } from "vitest";
import { recognitionPerformance } from "./recognitionStats.js";

let order = 0;
const answer = ({ passed, skill, tense, chosen = null, stage = "initial", mode = "choice" }) => ({
  id: `recognition-${++order}`,
  type: passed ? "drill_pass" : "drill_fail",
  itemKey: null,
  at: `2026-08-09T12:${String(order).padStart(2, "0")}:00.000Z`,
  localDate: "2026-08-09",
  metadata: {
    skill,
    cardId: `${skill}:card-${order}`,
    tense,
    mode,
    ...(chosen ? { chosen } : {}),
    stage,
  },
});

describe("recognition performance", () => {
  it("derives lane and tense accuracy from first attempts only", () => {
    const stats = recognitionPerformance([
      answer({ passed: true, skill: "usage", tense: "Indicative/Preterite" }),
      answer({ passed: false, skill: "usage", tense: "Indicative/Preterite", chosen: "Indicative/Imperfect" }),
      answer({ passed: true, skill: "endings", tense: "Indicative/Preterite" }),
      answer({ passed: true, skill: "usage", tense: "Indicative/Preterite", stage: "missed" }),
    ]);

    expect(stats.lifetime).toEqual({ answered: 3, passed: 2, accuracy: 2 / 3 });
    expect(stats.lanes).toEqual([
      { skill: "usage", answered: 2, passed: 1, accuracy: 0.5 },
      { skill: "endings", answered: 1, passed: 1, accuracy: 1 },
    ]);
    expect(stats.tenses[0]).toMatchObject({ tense: "Indicative/Preterite", answered: 3, passed: 2 });
    expect(stats.missed).toEqual({ answered: 1, passed: 1, accuracy: 1 });
  });

  it("counts directional confusions and sorts the most frequent first", () => {
    const stats = recognitionPerformance([
      answer({ passed: false, skill: "usage", tense: "Indicative/Preterite", chosen: "Indicative/Imperfect" }),
      answer({ passed: false, skill: "usage", tense: "Indicative/Preterite", chosen: "Indicative/Imperfect" }),
      answer({ passed: false, skill: "endings", tense: "Indicative/Future", chosen: "Indicative/Conditional" }),
      answer({ passed: false, skill: "usage", tense: "Indicative/Preterite", chosen: "Indicative/Imperfect", stage: "missed" }),
    ]);

    expect(stats.confusions).toEqual([
      { tense: "Indicative/Preterite", chosen: "Indicative/Imperfect", count: 2 },
      { tense: "Indicative/Future", chosen: "Indicative/Conditional", count: 1 },
    ]);
  });

  it("applies the existing tense-pack scope and ignores form-drill events", () => {
    const formEvent = {
      ...answer({ passed: false, skill: "usage", tense: "Indicative/Present" }),
      metadata: { mode: "typed", tense: "Indicative/Present", slot: "yo", verbKey: "lemma:ser" },
    };
    const stats = recognitionPerformance([
      formEvent,
      answer({ passed: true, skill: "usage", tense: "Indicative/Present" }),
      answer({ passed: false, skill: "usage", tense: "Subjunctive/Present", chosen: "Indicative/Present" }),
    ], { tenses: ["Subjunctive/Present"] });

    expect(stats.lifetime).toEqual({ answered: 1, passed: 0, accuracy: 0 });
    expect(stats.tenses.map((row) => row.tense)).toEqual(["Subjunctive/Present"]);
  });

  it("aggregates Contrasts answers per pair, outside every tense row and tense-pack scope", () => {
    const contrast = ({ passed, pair, answerKey, chosen = null, stage = "initial" }) => {
      const event = answer({ passed, skill: "contrast", tense: null, chosen, stage });
      delete event.metadata.tense;
      event.metadata.pair = pair;
      event.metadata.answer = answerKey;
      return event;
    };
    const events = [
      answer({ passed: true, skill: "usage", tense: "Indicative/Preterite" }),
      contrast({ passed: false, pair: "ser-estar", answerKey: "es", chosen: "está" }),
      contrast({ passed: false, pair: "ser-estar", answerKey: "es", chosen: "está" }),
      contrast({ passed: true, pair: "ser-estar", answerKey: "están" }),
      contrast({ passed: false, pair: "por-para", answerKey: "por", chosen: "para" }),
      contrast({ passed: true, pair: "por-para", answerKey: "para", stage: "missed" }),
    ];

    const stats = recognitionPerformance(events);
    expect(stats.lifetime).toEqual({ answered: 5, passed: 2, accuracy: 0.4 });
    expect(stats.lanes).toEqual([
      { skill: "contrast", answered: 4, passed: 1, accuracy: 0.25 },
      { skill: "usage", answered: 1, passed: 1, accuracy: 1 },
    ]);
    expect(stats.tenses.map((row) => row.tense)).toEqual(["Indicative/Preterite"]);
    expect(stats.pairs).toEqual([
      { pair: "por-para", answered: 1, passed: 0, accuracy: 0, confusions: [{ answer: "por", chosen: "para", count: 1 }] },
      { pair: "ser-estar", answered: 3, passed: 1, accuracy: 1 / 3, confusions: [{ answer: "es", chosen: "está", count: 2 }] },
    ]);
    expect(stats.confusions).toEqual([]);
    expect(stats.missed).toEqual({ answered: 1, passed: 1, accuracy: 1 });

    // A tense-pack scope narrows tense lanes only; contrast rows carry no tense to scope by.
    const scoped = recognitionPerformance(events, { tenses: ["Subjunctive/Present"] });
    expect(scoped.tenses).toEqual([]);
    expect(scoped.pairs).toEqual(stats.pairs);
    expect(scoped.lifetime).toEqual({ answered: 4, passed: 1, accuracy: 0.25 });
  });

  it("keeps recall and typed events byte-for-byte outside Phase 17 choice figures", () => {
    const choiceEvents = [
      answer({ passed: true, skill: "usage", tense: "Indicative/Present" }),
      answer({ passed: false, skill: "endings", tense: "Indicative/Preterite", chosen: "Indicative/Imperfect" }),
      answer({ passed: true, skill: "usage", tense: "Indicative/Present", stage: "missed" }),
    ];
    const baseline = recognitionPerformance(choiceEvents);

    expect(recognitionPerformance([
      ...choiceEvents,
      answer({ passed: false, skill: "usage", tense: "Indicative/Present", mode: "recall" }),
      answer({ passed: true, skill: "usage", tense: "Indicative/Present", mode: "recall", stage: "missed" }),
      answer({ passed: true, skill: "endings", tense: "Indicative/Preterite", mode: "typed" }),
      answer({ passed: false, skill: "endings", tense: "Indicative/Preterite", mode: "typed", stage: "retry" }),
    ])).toEqual(baseline);
  });
});
