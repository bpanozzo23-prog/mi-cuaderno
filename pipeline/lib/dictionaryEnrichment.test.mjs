import { describe, expect, it } from "vitest";
import {
  mostSpecificGloss,
  relatedWordsForRecord,
  relationWords,
  relationWordsExceptLemma,
  shapeSenseExamples,
  trimEtymology,
} from "./dictionaryEnrichment.mjs";

describe("dictionary r4 enrichment shaping", () => {
  it("keeps the most-specific nonblank gloss", () => {
    expect(mostSpecificGloss(["telephone", "mobile phone"])).toBe("mobile phone");
    expect(mostSpecificGloss(["parent", "  "])).toBe("parent");
  });

  it("deduplicates relation words in source order", () => {
    expect(relationWords([
      { word: "chambear" },
      { word: " currar " },
      { word: "Chambear" },
      { nope: true },
    ])).toEqual(["chambear", "currar"]);
    expect(relationWordsExceptLemma([
      { word: "bicicleta" },
      { word: "bici" },
    ], "Bicicleta")).toEqual(["bici"]);
  });

  it("trims ordinary and tree etymologies to their first prose sentence", () => {
    expect(trimEtymology("From Latin grātīs. Compare English grace.")).toBe("From Latin grātīs.");
    expect(trimEtymology([
      "Etymology tree",
      "Proto-Indo-European *weh₁y-?",
      "Latin vīnum",
      "Inherited from Old Spanish vino. Cognate with English wine.",
    ].join("\n"))).toBe("Inherited from Old Spanish vino.");
    expect(trimEtymology("Etymology tree\nLatin grātīs")).toBe("");
    expect(trimEtymology("Probably from a Frankish root (cf. English small). Compare French."))
      .toBe("Probably from a Frankish root (cf. English small).");
    expect(trimEtymology("Attested ca. 1200 in Old Spanish. Compare French."))
      .toBe("Attested ca. 1200 in Old Spanish.");
    expect(trimEtymology("From a phrase (i.e. a toast) in German. Compare English."))
      .toBe("From a phrase (i.e. a toast) in German.");
  });

  it("keeps at most two short sense examples, translated first", () => {
    const tooLong = "x".repeat(201);
    expect(shapeSenseExamples([
      { text: "Solo español." },
      { text: "gratis", english: "free" },
      { text: tooLong, english: "too long" },
      { text: "Con traducción.", english: "With a translation." },
      { text: "Otra traducida.", english: "Another translated one." },
    ], "gratis")).toEqual([
      ["Con traducción.", "With a translation."],
      ["Otra traducida.", "Another translated one."],
    ]);
  });

  it("combines entry relations before sense relations and removes the lemma itself", () => {
    expect(relatedWordsForRecord({
      word: "trabajar",
      derived: [{ word: "trabajador" }, { word: "trabajar" }],
      related: [{ word: "trabajo" }],
    }, [
      { derived: [{ word: "laboral" }], related: [{ word: "trabajo" }] },
    ])).toEqual(["trabajador", "trabajo", "laboral"]);
  });
});
