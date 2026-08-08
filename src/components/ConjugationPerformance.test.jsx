// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConjugationPerformance from "./ConjugationPerformance.jsx";

const active = (lemma, source = "saved") => ({
  lemma,
  term: lemma,
  verbKey: `lemma:${lemma}`,
  source,
  curriculum: source === "core" ? "core20" : null,
  itemKey: source === "saved" ? `user:${lemma}` : null,
  openKey: source === "saved" ? `user:${lemma}` : `dict:${lemma}`,
  dictKey: `dict:${lemma}`,
  conjugation: {
    tenses: {
      "Indicative/Present": { yo: lemma === "ser" ? "soy" : "estoy", "tú": lemma === "ser" ? "eres" : "estás" },
      "Subjunctive/Present": { yo: lemma === "ser" ? "sea" : "esté" },
    },
  },
});

let eventNumber = 0;
const answer = ({
  passed,
  source = "saved",
  stage = "initial",
  mode = "typed",
  verb = "ser",
  tense = "Indicative/Present",
  slot = "yo",
  promptId,
  diagnosis,
}) => {
  eventNumber += 1;
  return {
    id: `event-${eventNumber}`,
    type: passed ? "drill_pass" : "drill_fail",
    itemKey: source === "saved" ? `user:${verb}` : null,
    at: `2026-08-07T12:${String(eventNumber).padStart(2, "0")}:00.000Z`,
    localDate: "2026-08-07",
    metadata: {
      sessionId: "s1",
      promptId: promptId || `p${eventNumber}`,
      sessionKind: "focus",
      source,
      curriculum: source === "core" ? "core20" : null,
      verbKey: `lemma:${verb}`,
      lemma: verb,
      dictKey: `dict:${verb}`,
      tense,
      slot,
      mode,
      verdict: mode === "reveal" ? "self" : passed ? "exact" : "wrong",
      diagnosis: diagnosis ?? (passed ? "exact" : "wrong_tense"),
      stage,
      cardIndex: 1,
      deckSize: 10,
    },
  };
};

const library = (overrides = {}) => ({
  loading: false,
  installed: true,
  saved: [active("ser")],
  core: [active("ser", "core"), active("estar", "core")],
  unavailableCore: [],
  ...overrides,
});

afterEach(() => {
  cleanup();
  eventNumber = 0;
});

describe("dedicated Conjugation Gym performance", () => {
  it("keeps retry and reveal evidence separate from typed first-attempt accuracy", () => {
    const events = [
      answer({ passed: false, promptId: "miss" }),
      answer({ passed: true, promptId: "miss", stage: "retry" }),
      answer({ passed: true, mode: "reveal" }),
    ];
    render(<ConjugationPerformance items={[]} events={events} library={library()} onBack={vi.fn()} />);

    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByText("0 correct of 1")).toBeTruthy();
    expect(screen.getByText(/1 marked “Got it” of 1 reveals/)).toBeTruthy();
    expect(screen.getByText(/1 of 1 initial misses recovered/)).toBeTruthy();
  });

  it("filters Saved and Core histories without blending them", async () => {
    const user = userEvent.setup();
    const events = [
      answer({ passed: true, source: "saved" }),
      answer({ passed: false, source: "core", verb: "estar" }),
    ];
    render(<ConjugationPerformance items={[]} events={events} library={library()} onBack={vi.fn()} />);

    expect(screen.getByText("50%")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    expect(screen.getByText("100%")).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "Core" }));
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("uses mood-qualified tense rows and expands them into persisted person strings", async () => {
    const user = userEvent.setup();
    const events = [
      answer({ passed: true, tense: "Indicative/Present", slot: "yo" }),
      answer({ passed: false, tense: "Subjunctive/Present", slot: "tú" }),
    ];
    render(<ConjugationPerformance items={[]} events={events} library={library()} onBack={vi.fn()} />);

    expect(screen.getByText("Indicative present")).toBeTruthy();
    expect(screen.getByText("Subjunctive present")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Subjunctive present/ }));
    expect(screen.getAllByText("tú").length).toBeGreaterThan(0);
  });

  it("makes a weak active verb actionable after the three-attempt threshold", async () => {
    const user = userEvent.setup();
    const onPractice = vi.fn();
    const onOpen = vi.fn();
    const events = [answer({ passed: false }), answer({ passed: false }), answer({ passed: true })];
    render(<ConjugationPerformance items={[]} events={events} library={library()} onBack={vi.fn()} onPractice={onPractice} onOpen={onOpen} />);

    await user.click(screen.getByRole("button", { name: "Practise ser" }));
    expect(onPractice).toHaveBeenCalledWith(expect.objectContaining({
      kind: "verb",
      source: "all",
      target: expect.objectContaining({ verbKey: "lemma:ser", source: "saved" }),
    }));
    await user.click(screen.getByRole("button", { name: "ser" }));
    expect(onOpen).toHaveBeenCalledWith("user:ser");
  });

  it("renders history without turning missing dictionary coverage into zero", () => {
    render(<ConjugationPerformance
      items={[]}
      events={[answer({ passed: true })]}
      library={library({ installed: false, saved: [], core: [] })}
      onBack={vi.fn()}
    />);

    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText(/Dictionary not installed.*Coverage and practice actions are unavailable/)).toBeTruthy();
    expect(screen.queryByText("0/0 forms")).toBeNull();
  });
});
