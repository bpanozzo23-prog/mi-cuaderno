// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TENSE_ENDINGS } from "../lib/recognitionContent.js";
import EndingsReveal, { endingsRevealData } from "./EndingsReveal.jsx";

const card = (id) => TENSE_ENDINGS.find((row) => row.id === id);
const five = (values) => Object.fromEntries([
  "yo", "tú", "él/ella/usted", "nosotros", "ustedes/ellos",
].map((slot, index) => [slot, values[index]]));

const library = {
  installed: true,
  saved: [],
  core: [{
    lemma: "hablar",
    conjugation: {
      tenses: {
        "Indicative/Present": five(["hablo", "hablas", "habla", "hablamos", "hablan"]),
        "Indicative/Present Perfect": five(["he hablado", "has hablado", "ha hablado", "hemos hablado", "han hablado"]),
      },
    },
  }],
};

describe("Endings reveal", () => {
  it("shows a real simple-tense paradigm from the resolved Gym library", () => {
    const result = endingsRevealData(card("endings:indicative-present-ar"), library);
    expect(result).toMatchObject({ kind: "dictionary", lemma: "hablar" });
    expect(result.forms.map((row) => row.form)).toEqual(["hablo", "hablas", "habla", "hablamos", "hablan"]);
  });

  it("shows a composed perfect paradigm from that same reference seam", () => {
    const result = endingsRevealData(card("endings:indicative-present-perfect"), library);
    expect(result).toMatchObject({ kind: "dictionary", lemma: "hablar" });
    expect(result.forms.at(-1).form).toBe("han hablado");
  });

  it("falls back to the complete plain-text pattern when the dictionary is unavailable", () => {
    render(<EndingsReveal card={card("endings:indicative-conditional-all")} library={{ installed: false, saved: [], core: [] }} />);
    expect(screen.getByText("Pattern")).toBeTruthy();
    expect(screen.getByText(/whole infinitive/)).toBeTruthy();
    expect(screen.getByText(/Install the offline dictionary/)).toBeTruthy();
  });
});
