import { describe, it, expect } from "vitest";
import {
  tenseOf, slotOf, extractFromKaikki, extractFromJehle, addPerfectTenses,
  compareTables, getSlot, isPronominal, SLOTS,
} from "./conjugation.mjs";

/** A kaikki forms[] row. Tags are an unordered set in the real data, and so are these. */
const f = (form, ...tags) => ({ form, tags });

describe("tenseOf", () => {
  it("reads tense from unordered tags", () => {
    expect(tenseOf(["indicative", "present", "singular", "first-person"])).toBe("Indicative/Present");
    expect(tenseOf(["singular", "first-person", "present", "indicative"])).toBe("Indicative/Present");
    expect(tenseOf(["imperfect", "indicative", "plural", "third-person"])).toBe("Indicative/Imperfect");
    expect(tenseOf(["subjunctive", "present", "singular", "second-person"])).toBe("Subjunctive/Present");
    expect(tenseOf(["preterite", "indicative", "singular", "first-person"])).toBe("Indicative/Preterite");
  });

  it("files conditional under Indicative, as Jehle does", () => {
    expect(tenseOf(["conditional", "singular", "first-person"])).toBe("Indicative/Conditional");
  });

  it("separates the two imperfect subjunctives", () => {
    expect(tenseOf(["subjunctive", "imperfect", "singular", "first-person"])).toBe("Subjunctive/Imperfect");
    expect(tenseOf(["subjunctive", "imperfect", "imperfect-se", "singular", "first-person"]))
      .toBe("Subjunctive/Imperfect (-se)");
  });

  it("splits the imperative on the negative tag", () => {
    expect(tenseOf(["imperative", "second-person", "singular"])).toBe("Imperative Affirmative/Present");
    expect(tenseOf(["imperative", "negative", "second-person", "singular"])).toBe("Imperative Negative/Present");
  });

  it("ignores rows that are not finite forms", () => {
    expect(tenseOf(["infinitive"])).toBeNull();
    expect(tenseOf(["gerund"])).toBeNull();
    expect(tenseOf(["participle", "past"])).toBeNull();
    // the header rows kaikki emits: a bare "first-person present singular" with no mood
    expect(tenseOf(["first-person", "present", "singular"])).toBeNull();
  });
});

describe("slotOf", () => {
  it("maps person and number to display slots", () => {
    expect(slotOf(["first-person", "singular"])).toBe("yo");
    expect(slotOf(["second-person", "singular"])).toBe("tú");
    expect(slotOf(["third-person", "singular"])).toBe("él/ella/usted");
    expect(slotOf(["first-person", "plural"])).toBe("nosotros");
    expect(slotOf(["second-person", "plural"])).toBe("vosotros");
    expect(slotOf(["third-person", "plural"])).toBe("ustedes/ellos");
  });

  it("puts the formal second person where usted belongs", () => {
    expect(slotOf(["second-person", "singular", "formal"])).toBe("él/ella/usted");
    expect(slotOf(["second-person", "plural", "formal"])).toBe("ustedes/ellos");
  });

  it("skips voseo rather than letting it overwrite the tú cell", () => {
    expect(slotOf(["second-person", "singular", "vos-form"])).toBeNull();
    expect(slotOf(["second-person", "singular", "with-vos"])).toBeNull();
  });
});

describe("extractFromKaikki", () => {
  /** madrugar is the case DECISIONS.md flagged: regular, but the preterite is madrugué. */
  const madrugar = {
    word: "madrugar",
    forms: [
      f("madrugar", "infinitive"),
      f("madrugando", "gerund"),
      f("madrugado", "participle", "past"),
      f("madrugada", "participle", "past", "feminine", "singular"),
      f("madrugo", "first-person", "present", "singular"),           // header row, no mood
      f("madrugo", "indicative", "present", "singular", "first-person"),
      f("madrugas", "indicative", "present", "singular", "second-person", "informal"),
      f("madrugás", "indicative", "present", "singular", "second-person", "informal", "vos-form"),
      f("madruga", "indicative", "present", "singular", "third-person"),
      f("madrugamos", "indicative", "present", "plural", "first-person"),
      f("madrugáis", "indicative", "present", "plural", "second-person"),
      f("madrugan", "indicative", "present", "plural", "third-person"),
      f("madrugué", "indicative", "preterite", "singular", "first-person"),
      f("madrúguemelo", "combined-form", "imperative", "second-person", "singular"),
      f("es-conj", "inflection-template"),
      f("g-gu alternation", "class"),
    ],
  };

  it("keeps the orthographic preterite madrugué", () => {
    const t = extractFromKaikki(madrugar);
    expect(t.tenses["Indicative/Preterite"].yo).toBe("madrugué");
  });

  it("fills a whole tense, ustedes-first with vosotros collapsed", () => {
    const present = extractFromKaikki(madrugar).tenses["Indicative/Present"];
    expect(present.yo).toBe("madrugo");
    expect(present["tú"]).toBe("madrugas");
    expect(present["él/ella/usted"]).toBe("madruga");
    expect(present.nosotros).toBe("madrugamos");
    expect(present["ustedes/ellos"]).toBe("madrugan");
    expect(present.vosotros).toEqual({ form: "madrugáis", collapsed: true });
  });

  it("does not let voseo overwrite tú", () => {
    expect(extractFromKaikki(madrugar).tenses["Indicative/Present"]["tú"]).toBe("madrugas");
  });

  it("keeps clitic pile-ups and template metadata out of the table", () => {
    const t = extractFromKaikki(madrugar);
    const cells = Object.values(t.tenses).flatMap((tense) => SLOTS.map((s) => getSlot(tense, s)));
    expect(cells).not.toContain("madrúguemelo");
    expect(cells).not.toContain("es-conj");
    expect(cells).not.toContain("g-gu alternation");
  });

  it("takes the masculine singular past participle and the gerund", () => {
    const t = extractFromKaikki(madrugar);
    expect(t.pastParticiple).toBe("madrugado");
    expect(t.gerund).toBe("madrugando");
  });

  it("prefers an unmarked form over an archaic one for the same cell", () => {
    const t = extractFromKaikki({
      forms: [
        f("quiso", "indicative", "preterite", "singular", "third-person", "archaic"),
        f("quiere", "indicative", "preterite", "singular", "third-person"),
      ],
    });
    expect(t.tenses["Indicative/Preterite"]["él/ella/usted"]).toBe("quiere");
  });

  it("writes negative imperatives the way they are spoken, with the no", () => {
    const t = extractFromKaikki({
      forms: [
        f("abandones", "imperative", "negative", "second-person", "singular"),
        f("no abandone", "imperative", "negative", "second-person", "singular", "formal"),
      ],
    });
    const neg = t.tenses["Imperative Negative/Present"];
    expect(neg["tú"]).toBe("no abandones");
    // already prefixed upstream — must not become "no no abandone"
    expect(neg["él/ella/usted"]).toBe("no abandone");
  });

  it("leaves affirmative imperatives alone", () => {
    const t = extractFromKaikki({ forms: [f("abandona", "imperative", "second-person", "singular")] });
    expect(t.tenses["Imperative Affirmative/Present"]["tú"]).toBe("abandona");
  });

  it("returns null when there is no conjugation at all", () => {
    expect(extractFromKaikki({ forms: [f("casas", "plural")] })).toBeNull();
    expect(extractFromKaikki({})).toBeNull();
  });
});

describe("addPerfectTenses", () => {
  const haberTenses = extractFromJehle([
    {
      mood_english: "Indicative", tense_english: "Present",
      form_1s: "he", form_2s: "has", form_3s: "ha",
      form_1p: "hemos", form_2p: "habéis", form_3p: "han",
    },
  ]).tenses;

  it("composes haber + participle across every slot", () => {
    const table = addPerfectTenses(
      { source: "wiktionary", pastParticiple: "hablado", tenses: {} },
      haberTenses
    );
    const perfect = table.tenses["Indicative/Present Perfect"];
    expect(perfect.yo).toBe("he hablado");
    expect(perfect["ustedes/ellos"]).toBe("han hablado");
    expect(perfect.vosotros).toEqual({ form: "habéis hablado", collapsed: true });
  });

  it("puts the reflexive pronoun before the auxiliary", () => {
    const table = addPerfectTenses(
      {
        source: "wiktionary",
        pastParticiple: "arrepentido",
        tenses: {
          "Indicative/Present": {
            yo: "me arrepiento", "tú": "te arrepientes", "él/ella/usted": "se arrepiente",
            nosotros: "nos arrepentimos", "ustedes/ellos": "se arrepienten",
            vosotros: { form: "os arrepentís", collapsed: true },
          },
        },
      },
      haberTenses
    );
    const perfect = table.tenses["Indicative/Present Perfect"];
    expect(perfect.yo).toBe("me he arrepentido");
    expect(perfect["él/ella/usted"]).toBe("se ha arrepentido");
    expect(perfect.nosotros).toBe("nos hemos arrepentido");
    expect(perfect.vosotros).toEqual({ form: "os habéis arrepentido", collapsed: true });
  });

  it("does not treat a verb as reflexive just because it ends in -se", () => {
    const coser = {
      source: "wiktionary",
      pastParticiple: "cosido",
      tenses: {
        "Indicative/Present": {
          yo: "coso", "tú": "coses", "él/ella/usted": "cose",
          nosotros: "cosemos", "ustedes/ellos": "cosen",
          vosotros: { form: "coséis", collapsed: true },
        },
      },
    };
    expect(isPronominal(coser)).toBe(false);
    expect(addPerfectTenses(coser, haberTenses).tenses["Indicative/Present Perfect"].yo).toBe("he cosido");
  });

  it("composes nothing without a participle, rather than emitting half a table", () => {
    const table = addPerfectTenses({ source: "wiktionary", pastParticiple: "", tenses: {} }, haberTenses);
    expect(table.tenses).toEqual({});
  });
});

describe("compareTables", () => {
  const table = (yo, tu) => ({
    tenses: {
      "Indicative/Present": {
        yo, "tú": tu, "él/ella/usted": "", nosotros: "", "ustedes/ellos": "",
        vosotros: { form: "", collapsed: true },
      },
    },
  });

  it("counts agreeing cells and reports the differing ones", () => {
    const r = compareTables(table("hablo", "hablas"), table("hablo", "hablás"), {
      tenses: ["Indicative/Present"],
    });
    expect(r.agree).toBe(1);
    expect(r.differ).toEqual([{ tense: "Indicative/Present", slot: "tú", a: "hablas", b: "hablás" }]);
  });

  it("treats a cell only one side has as missing, not as disagreement", () => {
    const r = compareTables(table("hablo", "hablas"), table("hablo", ""), {
      tenses: ["Indicative/Present"],
    });
    expect(r.differ).toEqual([]);
    expect(r.missing).toHaveLength(1);
  });
});
