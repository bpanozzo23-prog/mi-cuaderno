import { describe, expect, it } from "vitest";
import { gymDepthPerformance } from "./gymDepthStats.js";

let order = 0;
const depthAnswer = ({ passed, skill, mode, tense = "Indicative/Present", stage = "initial", verdict, promptId }) => ({
  id: `depth-${++order}`,
  type: passed ? "drill_pass" : "drill_fail",
  itemKey: null,
  metadata: {
    skill,
    mode,
    tense,
    stage,
    verdict: verdict || (passed ? "exact" : "wrong"),
    promptId: promptId || `prompt-${order}`,
  },
});

describe("Gym depth performance", () => {
  it("separates first attempts, immediate recovery, and missed-round recovery by mode", () => {
    const events = [
      depthAnswer({ passed: true, skill: "usage", mode: "recall", promptId: "u1", verdict: "self" }),
      depthAnswer({ passed: false, skill: "usage", mode: "recall", promptId: "u2", verdict: "self" }),
      depthAnswer({ passed: true, skill: "usage", mode: "recall", promptId: "u2", verdict: "self", stage: "missed" }),
      depthAnswer({ passed: true, skill: "endings", mode: "typed", promptId: "e1", verdict: "exact" }),
      depthAnswer({ passed: true, skill: "endings", mode: "typed", promptId: "e2", verdict: "accents" }),
      depthAnswer({ passed: false, skill: "endings", mode: "typed", promptId: "e3", verdict: "wrong" }),
      depthAnswer({ passed: true, skill: "endings", mode: "typed", promptId: "e3", verdict: "exact", stage: "retry" }),
      depthAnswer({ passed: true, skill: "endings", mode: "typed", promptId: "e3", verdict: "exact", stage: "missed" }),
      depthAnswer({ passed: false, skill: "usage", mode: "choice" }),
      depthAnswer({ passed: false, skill: "endings", mode: "choice" }),
      depthAnswer({ passed: false, skill: null, mode: "typed" }),
    ];

    expect(gymDepthPerformance(events)).toEqual({
      usageRecall: {
        firstAttempts: { answered: 2, passed: 1, accuracy: 0.5 },
        missed: { answered: 1, passed: 1, accuracy: 1 },
      },
      typedEndings: {
        firstAttempts: { answered: 3, passed: 2, accuracy: 2 / 3, exact: 1, accents: 1 },
        immediate: { attempted: 1, recovered: 1, accuracy: 1 },
        missed: { attempted: 1, recovered: 1, accuracy: 1 },
      },
    });
  });

  it("applies the shared tense-pack filter before deriving every depth figure", () => {
    const events = [
      depthAnswer({ passed: true, skill: "usage", mode: "recall", tense: "Indicative/Present" }),
      depthAnswer({ passed: false, skill: "endings", mode: "typed", tense: "Subjunctive/Present", promptId: "subj" }),
      depthAnswer({ passed: true, skill: "endings", mode: "typed", tense: "Subjunctive/Present", promptId: "subj", stage: "retry" }),
    ];
    const filtered = gymDepthPerformance(events, { tenses: ["Subjunctive/Present"] });

    expect(filtered.usageRecall.firstAttempts).toEqual({ answered: 0, passed: 0, accuracy: null });
    expect(filtered.typedEndings.firstAttempts).toMatchObject({ answered: 1, passed: 0 });
    expect(filtered.typedEndings.immediate).toEqual({ attempted: 1, recovered: 1, accuracy: 1 });
  });
});
