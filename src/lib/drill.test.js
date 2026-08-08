import { describe, it, expect } from "vitest";
import {
  buildDrillDeck,
  drillCells,
  checkTypedAnswer,
  conjugationForms,
  diagnoseTypedAnswer,
  DRILL_TENSES,
  DECK_SIZE,
} from "./drill.js";

const sacar = {
  itemId: "user:sacar",
  term: "sacar",
  conjugation: {
    tenses: {
      "Indicative/Present": {
        yo: "saco", "tú": "sacas", "él/ella/usted": "saca",
        nosotros: "sacamos", "ustedes/ellos": "sacan", vosotros: "sacáis",
      },
      "Indicative/Preterite": { yo: "saqué", "ustedes/ellos": "sacaron" },
      // Present perfect is a real tense of this verb and deliberately not drilled.
      "Indicative/Present Perfect": { yo: "he sacado" },
    },
  },
};

const poner = {
  itemId: "user:poner",
  term: "poner",
  conjugation: { tenses: { "Indicative/Future": { yo: "pondré", nosotros: "pondremos" } } },
};

/** A sequence rng that walks a fixed list, so a shuffle is reproducible. */
const seeded = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("which cells a drill may ask", () => {
  it("asks only the six core tenses, never the perfects", () => {
    const tenses = new Set(drillCells(sacar).map((cell) => cell.tense));

    expect(tenses.has("Indicative/Present")).toBe(true);
    expect(tenses.has("Indicative/Preterite")).toBe(true);
    expect(tenses.has("Indicative/Present Perfect")).toBe(false);
    for (const tense of tenses) expect(DRILL_TENSES).toContain(tense);
  });

  it("never asks vosotros, which this notebook collapses everywhere else", () => {
    expect(drillCells(sacar).some((cell) => cell.slot === "vosotros")).toBe(false);
    // The form exists in the table; it is the drill that declines to ask it.
    expect(sacar.conjugation.tenses["Indicative/Present"].vosotros).toBe("sacáis");
  });

  it("skips cells the table does not fill", () => {
    // Preterite here has only two slots; the drill must not invent the rest.
    const preterite = drillCells(sacar).filter((cell) => cell.tense === "Indicative/Preterite");

    expect(preterite.map((cell) => cell.slot).sort()).toEqual(["ustedes/ellos", "yo"]);
    expect(preterite.every((cell) => cell.answer)).toBe(true);
  });

  it("carries the answer straight from the table", () => {
    const cell = drillCells(sacar).find(
      (candidate) => candidate.tense === "Indicative/Preterite" && candidate.slot === "yo"
    );

    expect(cell).toMatchObject({ term: "sacar", answer: "saqué", itemId: "user:sacar" });
  });

  it("returns nothing for a verb with no conjugation at all", () => {
    expect(drillCells({ itemId: "user:x", term: "x" })).toEqual([]);
    expect(drillCells({ itemId: "user:x", term: "x", conjugation: { tenses: {} } })).toEqual([]);
  });
});

describe("building the deck", () => {
  it("caps the deck at its size even when far more cells are available", () => {
    // sacar and poner together hold nine askable cells; tener adds five more, so the cap
    // is what limits this deck rather than the supply.
    const tener = {
      itemId: "user:tener",
      term: "tener",
      conjugation: {
        tenses: {
          "Indicative/Present": {
            yo: "tengo", "tú": "tienes", "él/ella/usted": "tiene",
            nosotros: "tenemos", "ustedes/ellos": "tienen",
          },
        },
      },
    };

    expect(buildDrillDeck([sacar, poner, tener], { rng: seeded([0.1, 0.7, 0.3]) })).toHaveLength(DECK_SIZE);
  });

  it("deals every available cell when there are fewer than a full deck", () => {
    expect(buildDrillDeck([sacar, poner], { rng: seeded([0.1, 0.7, 0.3]) })).toHaveLength(9);
  });

  it("never deals the same card twice", () => {
    const deck = buildDrillDeck([sacar, poner], { rng: seeded([0.2, 0.9, 0.5]) });
    const seen = deck.map((card) => `${card.itemId}|${card.tense}|${card.slot}`);

    expect(new Set(seen).size).toBe(deck.length);
  });

  it("avoids asking the same verb twice in a row while another is available", () => {
    const deck = buildDrillDeck([sacar, poner], { size: 4, rng: seeded([0.5]) });

    for (let i = 1; i < deck.length; i += 1) {
      expect(deck[i].itemId).not.toBe(deck[i - 1].itemId);
    }
  });

  it("still fills the deck when there is only one verb to draw from", () => {
    // Alternating is impossible here; running short would be the worse answer.
    const deck = buildDrillDeck([sacar], { size: 5, rng: seeded([0.5]) });

    expect(deck).toHaveLength(5);
    expect(new Set(deck.map((card) => card.itemId))).toEqual(new Set(["user:sacar"]));
  });

  it("returns a short deck rather than repeating when cells run out", () => {
    const deck = buildDrillDeck([poner], { size: 10, rng: seeded([0.5]) });

    expect(deck).toHaveLength(2);
  });

  it("returns nothing for no verbs", () => {
    expect(buildDrillDeck([], { rng: seeded([0.5]) })).toEqual([]);
    expect(buildDrillDeck(undefined, { rng: seeded([0.5]) })).toEqual([]);
  });
});

describe("marking a typed answer", () => {
  it("accepts the form typed exactly", () => {
    expect(checkTypedAnswer("pusieron", "pusieron")).toBe("exact");
  });

  it("forgives case and surrounding space", () => {
    expect(checkTypedAnswer("  Pusieron ", "pusieron")).toBe("exact");
  });

  it("forgives an inner run of spaces in a pronominal form", () => {
    expect(checkTypedAnswer("me  arrepiento", "me arrepiento")).toBe("exact");
  });

  /**
   * The heart of it. Accents separate tenses in Spanish, so the first comparison cannot go
   * through normalize.js the way the rest of the app's matching does — `hablo` must never
   * simply *be* `habló`. It is passed as a near miss so a phone keyboard stays usable, and
   * named so it still teaches.
   */
  it("calls a missing accent a near miss, not a match and not a failure", () => {
    expect(checkTypedAnswer("hablo", "habló")).toBe("accents");
    expect(checkTypedAnswer("hable", "hablé")).toBe("accents");
    expect(checkTypedAnswer("comeriamos", "comeríamos")).toBe("accents");
  });

  it("does not confuse two tenses that differ only by an accent", () => {
    // Both directions: the exact answer to one is never the exact answer to the other.
    expect(checkTypedAnswer("habló", "habló")).toBe("exact");
    expect(checkTypedAnswer("habló", "hablo")).toBe("accents");
  });

  /**
   * ñ is a letter, not an accent (§8). normalize.js preserves it precisely so `año` never
   * matches `ano`, and that has to hold here too: typing the wrong one is a different word,
   * not a slip of the keyboard.
   */
  it("keeps ñ distinct, so a wrong letter stays wrong", () => {
    expect(checkTypedAnswer("ano", "año")).toBe("wrong");
    expect(checkTypedAnswer("enseno", "enseño")).toBe("wrong");
  });

  it("marks a different form wrong", () => {
    expect(checkTypedAnswer("pusimos", "pusieron")).toBe("wrong");
  });

  it("marks an empty or missing answer wrong rather than accidentally exact", () => {
    expect(checkTypedAnswer("", "pusieron")).toBe("wrong");
    expect(checkTypedAnswer("   ", "pusieron")).toBe("wrong");
    expect(checkTypedAnswer(undefined, "pusieron")).toBe("wrong");
    // Two blanks must not agree with each other.
    expect(checkTypedAnswer("", "")).toBe("wrong");
  });
});

describe("diagnosing a typed answer", () => {
  const forms = conjugationForms({
    tenses: {
      "Indicative/Present": { yo: "hablo", "tú": "hablas", nosotros: "hablamos" },
      "Indicative/Preterite": { yo: "hablé", "tú": "hablaste", nosotros: "hablamos" },
      "Subjunctive/Present": { yo: "hable", "tú": "hables", nosotros: "hablemos" },
    },
  });

  it("keeps the exact/accent checker as the first two outcomes", () => {
    const card = { answer: "hablé", tense: "Indicative/Preterite", slot: "yo" };
    expect(diagnoseTypedAnswer("hablé", card, forms)).toEqual({ passed: true, verdict: "exact", diagnosis: "exact" });
    expect(diagnoseTypedAnswer("hable", card, forms)).toEqual({ passed: true, verdict: "accents", diagnosis: "accents" });
  });

  it("recognizes a missing no in a negative command", () => {
    expect(diagnoseTypedAnswer("seas", {
      answer: "no seas", tense: "Imperative Negative/Present", slot: "tú",
    }, [])).toMatchObject({ passed: false, diagnosis: "missing_no" });
  });

  it("recognizes a missing reflexive pronoun, including after command no", () => {
    expect(diagnoseTypedAnswer("quejo", {
      answer: "me quejo", tense: "Indicative/Present", slot: "yo",
    }, [])).toMatchObject({ diagnosis: "missing_reflexive" });
    expect(diagnoseTypedAnswer("no quejes", {
      answer: "no te quejes", tense: "Imperative Negative/Present", slot: "tú",
    }, [])).toMatchObject({ diagnosis: "missing_reflexive" });
  });

  it("distinguishes wrong person, wrong tense, another form, and unknown input", () => {
    const card = { answer: "hablaste", tense: "Indicative/Preterite", slot: "tú" };
    expect(diagnoseTypedAnswer("hablé", card, forms).diagnosis).toBe("wrong_person");
    expect(diagnoseTypedAnswer("hablas", card, forms).diagnosis).toBe("wrong_tense");
    expect(diagnoseTypedAnswer("hablemos", card, forms).diagnosis).toBe("other_form");
    expect(diagnoseTypedAnswer("comiste", card, forms).diagnosis).toBe("wrong");
  });

  it("uses the fixed person-before-tense rule for an ambiguous recognizable form", () => {
    // hablamos is both present and preterite; on a tú-preterite prompt it matches a wrong
    // person in the same tense and another tense. The documented ladder is deterministic.
    const card = { answer: "hablaste", tense: "Indicative/Preterite", slot: "tú" };
    expect(diagnoseTypedAnswer("hablamos", card, forms).diagnosis).toBe("wrong_person");
  });
});
