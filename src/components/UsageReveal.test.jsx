// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TENSE_USAGE_CARDS } from "../lib/recognitionContent.js";
import UsageReveal from "./UsageReveal.jsx";

describe("Usage reveal", () => {
  it("explains the Mexican-Spanish alternative on both present-perfect cards", () => {
    const cards = TENSE_USAGE_CARDS.filter((card) => card.answer === "Indicative/Present Perfect");
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      const { unmount } = render(<UsageReveal card={card} />);
      expect(screen.getByText("Mexican Spanish note")).toBeTruthy();
      expect(screen.getByText(/Indicative preterite can also be natural here/)).toBeTruthy();
      unmount();
    }
  });

  it("stays absent when a card has no acceptable alternative", () => {
    const card = TENSE_USAGE_CARDS.find((row) => row.id === "usage:preterite-completed");
    const { container } = render(<UsageReveal card={card} />);
    expect(container.innerHTML).toBe("");
  });

  it("ships como-si, both perfect subjunctives, and stable imperative identities", () => {
    expect(TENSE_USAGE_CARDS.find((card) => card.id === "usage:subj-imperfect-como-si")?.prompt).toMatch(/como si/);
    expect(TENSE_USAGE_CARDS.some((card) => card.answer === "Subjunctive/Present Perfect")).toBe(true);
    expect(TENSE_USAGE_CARDS.some((card) => card.answer === "Subjunctive/Past Perfect")).toBe(true);
    expect(TENSE_USAGE_CARDS.map((card) => card.answer)).toEqual(expect.arrayContaining([
      "Imperative Affirmative/Present",
      "Imperative Negative/Present",
    ]));
  });
});
