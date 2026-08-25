import { describe, expect, it } from "vitest";
import { conjugationPerformance } from "./conjugationStats.js";

const at = (minute) => `2026-08-07T12:${String(minute).padStart(2, "0")}:00.000Z`;
const answer = ({ passed, minute, stage = "initial", promptId = `p-${minute}`, ...metadata }) => ({
  id: `event-${minute}-${stage}`,
  type: passed ? "drill_pass" : "drill_fail",
  itemKey: metadata.itemKey ?? "user:ser",
  at: at(minute),
  localDate: "2026-08-07",
  metadata: {
    sessionId: "session-1",
    promptId,
    sessionKind: "focus",
    source: "saved",
    curriculum: null,
    verbKey: "lemma:ser",
    lemma: "ser",
    dictKey: "dict:ser",
    tense: "Indicative/Present",
    slot: "yo",
    mode: "typed",
    verdict: passed ? "exact" : "wrong",
    diagnosis: passed ? "exact" : "wrong_tense",
    stage,
    cardIndex: 1,
    deckSize: 10,
    ...metadata,
  },
});

const table = (answerValue) => ({
  tenses: { "Indicative/Present": { yo: answerValue } },
});
const active = (lemma, source, overrides = {}) => ({
  lemma,
  term: lemma,
  verbKey: `lemma:${lemma}`,
  source,
  itemKey: source === "saved" ? `user:${lemma}` : null,
  openKey: source === "saved" ? `user:${lemma}` : `dict:${lemma}`,
  dictKey: `dict:${lemma}`,
  conjugation: table(lemma === "ser" ? "soy" : "estoy"),
  ...overrides,
});

describe("Conjugation Gym performance contracts", () => {
  it("ignores recognition answers entirely even though they reuse drill event types", () => {
    const formEvent = answer({ passed: true, minute: 1 });
    const recognitionEvent = {
      id: "recognition-1",
      type: "drill_fail",
      itemKey: null,
      at: at(2),
      localDate: "2026-08-07",
      metadata: {
        skill: "usage",
        cardId: "usage:preterite-completed",
        tense: "Indicative/Preterite",
        chosen: "Indicative/Imperfect",
        // Deliberately collide with a form mode: skill remains the hard boundary even if
        // an imported or future event carries malformed additive metadata.
        mode: "typed",
        stage: "initial",
      },
    };

    const recallEvent = {
      ...recognitionEvent,
      id: "recall-1",
      metadata: {
        skill: "usage",
        cardId: "usage:recall:Indicative/Preterite",
        tense: "Indicative/Preterite",
        mode: "recall",
        verdict: "self",
        stage: "initial",
      },
    };
    const typedEndingsEvent = {
      ...recognitionEvent,
      id: "typed-endings-1",
      metadata: {
        skill: "endings",
        cardId: "endings:indicative-preterite-ar",
        tense: "Indicative/Preterite",
        mode: "typed",
        verdict: "wrong",
        slotVerdicts: { yo: "wrong" },
        stage: "initial",
      },
    };

    expect(conjugationPerformance([formEvent, recognitionEvent, recallEvent, typedEndingsEvent]))
      .toEqual(conjugationPerformance([formEvent]));
  });

  it("excludes a Contrasts choice answer structurally, not by a named skill list", () => {
    const formEvent = answer({ passed: true, minute: 1 });
    const contrastEvent = {
      id: "contrast-1",
      type: "drill_fail",
      itemKey: null,
      at: at(2),
      localDate: "2026-08-07",
      metadata: {
        skill: "contrast",
        cardId: "contrast:ser-estar:profession",
        pair: "ser-estar",
        answer: "es",
        chosen: "está",
        // Same adversarial collision as the Usage case above: the mode filter alone must not
        // be what keeps a recognition answer out of Forms figures.
        mode: "typed",
        sessionKind: "recognition",
        stage: "initial",
        // No tense: a contrast answer must never be readable as a tense key.
      },
    };

    const transformEvent = {
      id: "transform-1",
      type: "drill_fail",
      itemKey: null,
      at: at(3),
      localDate: "2026-08-07",
      metadata: {
        skill: "transform",
        cardId: "transform:doubt:venir-viene",
        tense: "Subjunctive/Present",
        mode: "typed",
        verdict: "wrong",
        diagnosis: "wrong_tense",
        sessionKind: "recognition",
        stage: "initial",
      },
    };

    expect(conjugationPerformance([formEvent, contrastEvent, transformEvent]))
      .toEqual(conjugationPerformance([formEvent]));
  });

  it("reports Choose answers separately with their diagnoses and leaves every typed figure identical", () => {
    const typedEvents = [
      answer({ passed: true, minute: 1 }),
      answer({ passed: false, minute: 2, diagnosis: "wrong_tense" }),
      answer({ passed: true, minute: 3, stage: "retry", promptId: "p-2" }),
    ];
    const choiceEvents = [
      answer({ passed: false, minute: 4, mode: "choice", verdict: "wrong", diagnosis: "wrong_person", chosen: "sois" }),
      answer({ passed: false, minute: 5, mode: "choice", verdict: "wrong", diagnosis: "wrong_person", chosen: "eres" }),
      answer({ passed: true, minute: 6, mode: "choice", verdict: "exact", diagnosis: null }),
      answer({ passed: true, minute: 7, mode: "choice", verdict: "exact", diagnosis: null, stage: "missed" }),
    ];
    const options = { activeVerbs: [active("ser", "saved")], dictionaryAvailable: true };

    const withChoice = conjugationPerformance([...typedEvents, ...choiceEvents], options);
    const typedOnly = conjugationPerformance(typedEvents, options);
    expect(withChoice.choice).toMatchObject({ answered: 3, passed: 1, accuracy: 1 / 3 });
    expect(withChoice.choice.diagnoses).toHaveLength(1);
    expect(withChoice.choice.diagnoses[0]).toMatchObject({ diagnosis: "wrong_person", answered: 2, passed: 0 });
    expect({ ...withChoice, choice: null }).toEqual({ ...typedOnly, choice: null });
    expect(withChoice.lifetime).toEqual(typedOnly.lifetime);
    expect(withChoice.reveal).toEqual(typedOnly.reveal);
  });

  it("does not let retry or missed-round passes inflate first-attempt accuracy", () => {
    const events = [
      answer({ passed: false, minute: 1, promptId: "p-1" }),
      answer({ passed: true, minute: 2, promptId: "p-1", stage: "retry" }),
      answer({ passed: true, minute: 3, promptId: "p-1", stage: "missed" }),
    ];

    const stats = conjugationPerformance(events, {
      activeVerbs: [active("ser", "saved")],
      dictionaryAvailable: true,
    });

    expect(stats.recent).toMatchObject({ answered: 1, passed: 0, exact: 0, accents: 0 });
    expect(stats.lifetime).toMatchObject({ answered: 1, passed: 0 });
    expect(stats.recovery).toMatchObject({ initialMisses: 1, immediateRecovered: 1, missedAttempted: 1, missedRecovered: 1 });
  });

  it("keeps deleted and legacy-deleted attempts in aggregates but out of actionable verb rows", () => {
    const deletedNew = answer({
      passed: false,
      minute: 1,
      itemKey: null,
      verbKey: "lemma:desaparecer",
      lemma: "desaparecer",
      dictKey: "dict:desaparecer",
      tense: "Indicative/Preterite",
    });
    deletedNew.itemKey = null;
    const deletedLegacy = {
      ...answer({ passed: true, minute: 2, itemKey: "user:gone", tense: "Indicative/Future" }),
      itemKey: "user:gone",
      metadata: { tense: "Indicative/Future", slot: "yo", mode: "typed", verdict: "exact" },
    };
    const activeEvent = answer({ passed: true, minute: 3 });

    const stats = conjugationPerformance([deletedNew, deletedLegacy, activeEvent], {
      items: [],
      activeVerbs: [active("ser", "saved")],
      dictionaryAvailable: true,
    });

    expect(stats.lifetime).toMatchObject({ answered: 3, passed: 2 });
    expect(stats.tenses.map((row) => row.tense)).toEqual(expect.arrayContaining([
      "Indicative/Preterite", "Indicative/Future", "Indicative/Present",
    ]));
    expect(stats.verbs.map((row) => row.verbKey)).toEqual(["lemma:ser"]);
  });

  it("deduplicates Saved/Core overlap by verbKey in All coverage", () => {
    const stats = conjugationPerformance([answer({ passed: true, minute: 1 })], {
      activeVerbs: [
        active("ser", "saved"),
        active("ser", "core", { curriculum: "core20" }),
        active("estar", "core", { curriculum: "core20" }),
      ],
      dictionaryAvailable: true,
      source: "all",
      tenses: ["Indicative/Present"],
    });

    expect(stats.coverage).toMatchObject({ available: true, verbs: 2, practised: 1, total: 2 });
    expect(stats.activeTargets.find((target) => target.verbKey === "lemma:ser").source).toBe("saved");
  });

  it("keeps pattern-only reference verbs actionable in their containing curriculum", () => {
    const stats = conjugationPerformance([], {
      activeVerbs: [
        active("preferir", "core", { curriculum: null }),
        active("conducir", "core", { curriculum: null }),
        active("beber", "core", { curriculum: null }),
        active("practicar", "core", { curriculum: null }),
      ],
      dictionaryAvailable: true,
    });

    expect(stats.activeTargets.find((target) => target.lemma === "preferir").curriculum).toBe("stemChangers");
    expect(stats.activeTargets.find((target) => target.lemma === "conducir").curriculum).toBe("irregularPreterites");
    expect(stats.activeTargets.find((target) => target.lemma === "beber").curriculum).toBe("regulars");
    expect(stats.activeTargets.find((target) => target.lemma === "practicar").curriculum).toBe("spellingChanges");
  });

  it("compares the last 50 with the previous window only when both have enough evidence", () => {
    const events = Array.from({ length: 60 }, (_, index) => {
      const event = answer({ passed: index >= 10, minute: index, promptId: `p-${index}` });
      event.at = new Date(Date.UTC(2026, 7, 7, 12, index)).toISOString();
      return event;
    });
    const stats = conjugationPerformance(events);

    expect(stats.recent).toMatchObject({ answered: 50, passed: 50 });
    expect(stats.recent.comparison).toMatchObject({ answered: 10, points: 100 });
    expect(conjugationPerformance(events.slice(0, 19)).recent.comparison).toBeNull();
  });

  it("applies source and tense-pack filters before deriving dimensions", () => {
    const events = [
      answer({ passed: true, minute: 1, source: "saved", tense: "Indicative/Present" }),
      answer({ passed: false, minute: 2, source: "core", verbKey: "lemma:estar", lemma: "estar", tense: "Subjunctive/Present" }),
    ];
    const stats = conjugationPerformance(events, {
      source: "core",
      tenses: ["Subjunctive/Present"],
    });

    expect(stats.lifetime).toMatchObject({ answered: 1, passed: 0 });
    expect(stats.tenses.map((row) => row.tense)).toEqual(["Subjunctive/Present"]);
  });

  it("uses a surviving item's lemma for legacy verb rows and enforces the weak threshold", () => {
    const legacy = [0, 1, 2].map((minute) => ({
      ...answer({ passed: minute === 2, minute }),
      metadata: { tense: "Indicative/Present", slot: "yo", mode: "typed", verdict: minute === 2 ? "exact" : "wrong" },
    }));
    const target = active("ser", "saved");
    const stats = conjugationPerformance(legacy, {
      items: [{ id: "user:ser", type: "lexical", term: "SER" }],
      itemLemmas: new Map([["user:ser", "ser"]]),
      activeVerbs: [target],
      dictionaryAvailable: true,
    });

    expect(stats.verbs).toHaveLength(1);
    expect(stats.verbs[0]).toMatchObject({ verbKey: "lemma:ser", answered: 3, weak: true });
    expect(conjugationPerformance(legacy.slice(0, 2), {
      items: [{ id: "user:ser", type: "lexical", term: "ser" }], activeVerbs: [target], dictionaryAvailable: true,
    }).verbs[0].weak).toBe(false);
  });
});
