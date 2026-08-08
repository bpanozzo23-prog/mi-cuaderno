import { describe, it, expect } from "vitest";
import {
  composePerfectTenses, isPronominal, allTenses, expectedSlots, qualifiedTenseLabel, SLOTS,
} from "./conjugation.js";

/** haber's present indicative — the auxiliary every perfect tense is built from. */
const haberTenses = {
  "Indicative/Present": {
    yo: "he", "tú": "has", "él/ella/usted": "ha",
    nosotros: "hemos", "ustedes/ellos": "han", vosotros: "habéis",
  },
  "Indicative/Imperfect": {
    yo: "había", "tú": "habías", "él/ella/usted": "había",
    nosotros: "habíamos", "ustedes/ellos": "habían", vosotros: "habíais",
  },
};

const hablar = {
  pastParticiple: "hablado",
  tenses: {
    "Indicative/Present": {
      yo: "hablo", "tú": "hablas", "él/ella/usted": "habla",
      nosotros: "hablamos", "ustedes/ellos": "hablan", vosotros: "habláis",
    },
  },
};

const arrepentirse = {
  pastParticiple: "arrepentido",
  tenses: {
    "Indicative/Present": {
      yo: "me arrepiento", "tú": "te arrepientes", "él/ella/usted": "se arrepiente",
      nosotros: "nos arrepentimos", "ustedes/ellos": "se arrepienten", vosotros: "os arrepentís",
    },
  },
};

describe("composePerfectTenses", () => {
  it("builds haber + participle across every slot", () => {
    const perfect = composePerfectTenses(hablar, haberTenses)["Indicative/Present Perfect"];
    expect(perfect.yo).toBe("he hablado");
    expect(perfect["tú"]).toBe("has hablado");
    expect(perfect["él/ella/usted"]).toBe("ha hablado");
    expect(perfect.nosotros).toBe("hemos hablado");
    expect(perfect["ustedes/ellos"]).toBe("han hablado");
    expect(perfect.vosotros).toBe("habéis hablado");
  });

  it("builds each perfect tense from the right tense of haber", () => {
    const built = composePerfectTenses(hablar, haberTenses);
    expect(built["Indicative/Past Perfect"].yo).toBe("había hablado");
    // haber has no preterite here, so that perfect tense simply is not built
    expect(built["Indicative/Preterite (Archaic)"]).toBeUndefined();
  });

  it("puts the reflexive pronoun before the auxiliary", () => {
    const perfect = composePerfectTenses(arrepentirse, haberTenses)["Indicative/Present Perfect"];
    expect(perfect.yo).toBe("me he arrepentido");
    expect(perfect["él/ella/usted"]).toBe("se ha arrepentido");
    expect(perfect.nosotros).toBe("nos hemos arrepentido");
    expect(perfect.vosotros).toBe("os habéis arrepentido");
  });

  it("composes nothing without a participle, rather than half a table", () => {
    expect(composePerfectTenses({ pastParticiple: "", tenses: {} }, haberTenses)).toEqual({});
    expect(composePerfectTenses(null, haberTenses)).toEqual({});
    expect(composePerfectTenses(hablar, null)).toEqual({});
  });
});

describe("isPronominal", () => {
  it("reads the verb's own forms, not the spelling of its lemma", () => {
    expect(isPronominal(arrepentirse)).toBe(true);
    expect(isPronominal(hablar)).toBe(false);
    // coser ends in -se and is not reflexive
    expect(isPronominal({ tenses: { "Indicative/Present": { yo: "coso" } } })).toBe(false);
  });
});

describe("allTenses", () => {
  it("returns the stored simple tenses alongside the composed perfect ones", () => {
    const all = allTenses(hablar, { tenses: haberTenses });
    expect(all["Indicative/Present"].yo).toBe("hablo");
    expect(all["Indicative/Present Perfect"].yo).toBe("he hablado");
  });

  it("returns just the simple tenses when haber is not loaded", () => {
    const all = allTenses(hablar, null);
    expect(Object.keys(all)).toEqual(["Indicative/Present"]);
  });
});

describe("expectedSlots", () => {
  it("drops yo for imperatives, because you cannot command yourself", () => {
    expect(expectedSlots("Imperative Affirmative/Present")).not.toContain("yo");
    expect(expectedSlots("Imperative Negative/Present")).toHaveLength(5);
    expect(expectedSlots("Indicative/Present")).toEqual(SLOTS);
  });
});

describe("qualifiedTenseLabel", () => {
  it("keeps same-named indicative and subjunctive rows distinct", () => {
    expect(qualifiedTenseLabel("Indicative/Present")).toBe("Indicative present");
    expect(qualifiedTenseLabel("Subjunctive/Present")).toBe("Subjunctive present");
    expect(qualifiedTenseLabel("Indicative/Present Perfect")).toBe("Indicative present perfect");
    expect(qualifiedTenseLabel("Subjunctive/Present Perfect")).toBe("Subjunctive present perfect");
  });

  it("names the two command tables by polarity", () => {
    expect(qualifiedTenseLabel("Imperative Affirmative/Present")).toBe("Affirmative command");
    expect(qualifiedTenseLabel("Imperative Negative/Present")).toBe("Negative command");
  });
});
