import { describe, expect, it } from "vitest";
import { grammarGuidesForTense, grammarGuidesForTerms, guideTermsForTense } from "./recognitionGuides.js";
import { CONTRAST_GUIDE_TERMS } from "./contrastContent.js";

const page = (id, title, overrides = {}) => ({
  id,
  type: "page",
  title,
  pageFocus: "grammar",
  grammar: { enabled: true, sections: [] },
  ...overrides,
});

describe("derived usage-card Grammar guides", () => {
  it("matches English and naturally titled Spanish guides through shared normalization", () => {
    const items = [
      page("user:es", "Pretérito: acciones terminadas"),
      page("user:en", "Indicative Preterite guide"),
    ];
    expect(grammarGuidesForTense(items, "Indicative/Preterite").map((item) => item.id))
      .toEqual(["user:es", "user:en"]);
    expect(guideTermsForTense("Indicative/Preterite")).toContain("preterito");
  });

  it("requires Grammar focus, stays silent without a match, and caps links at two", () => {
    const items = [
      page("user:notes", "Pretérito notes", { pageFocus: "notes" }),
      page("user:disabled", "Pretérito disabled", { grammar: { enabled: false, sections: [] } }),
      page("user:one", "Pretérito one"),
      page("user:two", "Pretérito two"),
      page("user:three", "Pretérito three"),
    ];
    expect(grammarGuidesForTense(items, "Indicative/Preterite").map((item) => item.id))
      .toEqual(["user:one", "user:two"]);
    expect(grammarGuidesForTense(items, "Indicative/Future")).toEqual([]);
  });

  it("matches Contrasts guides on multi-word terms and never on a bare short word", () => {
    const items = [
      page("user:ser", "SER y ESTAR — mis reglas"),
      page("user:por", "Por/para"),
      page("user:comp", "Comparativos"),
      page("user:obs", "Observaciones"),
      page("user:para", "Usos de para"),
    ];
    expect(grammarGuidesForTerms(items, CONTRAST_GUIDE_TERMS["ser-estar"]).map((item) => item.id)).toEqual(["user:ser"]);
    expect(grammarGuidesForTerms(items, CONTRAST_GUIDE_TERMS["por-para"]).map((item) => item.id)).toEqual(["user:por"]);
    expect(grammarGuidesForTerms(items, [])).toEqual([]);
  });
});
