import { describe, expect, it } from "vitest";
import { glossContentTokens, deriveSimilarMeaningSuggestions } from "./meaningSuggestions.js";

const meaning = (id, gloss, posOverride = "") => ({
  id: `meaning:${id}`,
  gloss,
  usageCue: "",
  regions: [],
  usageLabels: [],
  posOverride,
  verbBehavior: [],
  note: "",
  examples: [],
});

const lexical = ({
  id,
  term,
  glosses = [],
  pos = "",
  linkedKeys = [],
  linkAnnotations = [],
  type = "lexical",
} = {}) => ({
  id: id || `user:${term}`,
  type,
  form: "word",
  term,
  title: type === "page" ? term : undefined,
  pos,
  meanings: glosses.map((row, index) => typeof row === "string"
    ? meaning(`${term}:${index}`, row)
    : meaning(`${term}:${index}`, row.gloss, row.posOverride)),
  linkedKeys,
  linkAnnotations,
});

describe("English gloss content tokens", () => {
  it("removes definition boilerplate while retaining exact content and internal apostrophes", () => {
    expect(glossContentTokens("To be angry with a banker's behavior")).toEqual([
      "angry", "banker's", "behavior",
    ]);
  });

  it("keeps ñ distinct and drops tokens shorter than three letters", () => {
    expect(glossContentTokens("go to a piñata")).toEqual(["piñata"]);
    expect(glossContentTokens("go to a pinata")).toEqual(["pinata"]);
  });
});

describe("same-meaning proposals", () => {
  it("proposes exact and half-overlap meaning pairs but rejects the basic bank trap", () => {
    const angry = lexical({ term: "enojado", glosses: ["to be angry"] });
    const mad = lexical({ term: "molesto", glosses: ["angry"] });
    const furious = lexical({ term: "furioso", glosses: ["angry; furious"] });
    const river = lexical({ term: "orilla", glosses: ["river bank"] });
    const financial = lexical({ term: "banco", glosses: ["financial bank"] });
    const items = [angry, mad, furious, river, financial];

    expect(deriveSimilarMeaningSuggestions(angry, items).map((row) => row.item.term)).toEqual([
      "molesto", "furioso",
    ]);
    expect(deriveSimilarMeaningSuggestions(river, items)).toEqual([]);
  });

  it("compares meaning rows independently instead of pooling unrelated senses", () => {
    const focal = lexical({ term: "focal", glosses: ["river edge", "money institution"] });
    const candidate = lexical({ term: "candidate", glosses: ["river institution", "money edge"] });
    expect(deriveSimilarMeaningSuggestions(focal, [focal, candidate])).toEqual([]);
  });

  it("uses POS only as a known-conflict guard and lets sparse metadata pass", () => {
    const focal = lexical({ term: "naranja", glosses: [{ gloss: "orange", posOverride: "noun" }] });
    const mismatch = lexical({ term: "anaranjado", glosses: [{ gloss: "orange", posOverride: "adjective" }] });
    const sparse = lexical({ term: "color naranja", glosses: ["orange"] });
    expect(deriveSimilarMeaningSuggestions(focal, [focal, mismatch, sparse]).map((row) => row.item.id))
      .toEqual([sparse.id]);
  });

  it("guards on the function-word classes too, not only the four it once knew", () => {
    // An unrecognized value reads as "not recorded", which lets a mismatched pair THROUGH — so a
    // part of speech the owner can choose but this guard cannot name is a silently weaker guard.
    const focal = lexical({ term: "como", glosses: [{ gloss: "like", posOverride: "preposition" }] });
    const mismatch = lexical({ term: "gustar", glosses: [{ gloss: "like", posOverride: "verb" }] });
    const agreeing = lexical({ term: "según", glosses: [{ gloss: "like", posOverride: "preposition" }] });

    expect(deriveSimilarMeaningSuggestions(focal, [focal, mismatch, agreeing]).map((row) => row.item.term))
      .toEqual(["según"]);
  });

  it("excludes self, pages, blank meanings, duplicate headings, and every existing connection", () => {
    const focal = lexical({ term: "enojado", glosses: ["angry"], linkedKeys: ["user:outgoing"] });
    const outgoing = lexical({ id: "user:outgoing", term: "molesto", glosses: ["angry"] });
    const backlink = lexical({ term: "furioso", glosses: ["angry"], linkedKeys: [focal.id] });
    const duplicate = lexical({ term: "ENOJADO", glosses: ["angry"] });
    const blank = lexical({ term: "vacío", glosses: [] });
    const page = lexical({ term: "Anger page", glosses: ["angry"], type: "page" });

    expect(deriveSimilarMeaningSuggestions(focal, [
      focal, outgoing, backlink, duplicate, blank, page,
    ])).toEqual([]);
  });

  it("ranks exact token sets first, applies a deterministic limit, and exposes evidence", () => {
    const focal = lexical({ term: "contento", glosses: ["happy; pleased"] });
    const candidates = [
      lexical({ term: "d", glosses: ["happy; pleased; delighted"] }),
      lexical({ term: "c", glosses: ["happy; pleased"] }),
      lexical({ term: "b", glosses: ["pleased; happy"] }),
      lexical({ term: "a", glosses: ["happy"] }),
    ];
    const rows = deriveSimilarMeaningSuggestions(focal, [focal, ...candidates], { limit: 3 });

    expect(rows.map((row) => row.item.term)).toEqual(["b", "c", "d"]);
    expect(rows[0].evidence).toMatchObject({
      focalGloss: "happy; pleased",
      candidateGloss: "pleased; happy",
      sharedTokens: ["happy", "pleased"],
      exactContent: true,
      overlap: 1,
    });
  });

  it("uses heading order before incidental meaning-row position when scores tie", () => {
    const focal = lexical({ term: "contento", glosses: ["happy"] });
    const zeta = lexical({ term: "zeta", glosses: ["unrelated", "happy"] });
    const alpha = lexical({ term: "alpha", glosses: ["happy"] });

    expect(deriveSimilarMeaningSuggestions(focal, [focal, zeta, alpha]).map((row) => row.item.term))
      .toEqual(["alpha", "zeta"]);
  });

  it("does not collapse ñ or mutate its inputs", () => {
    const tilde = lexical({ term: "piñata", glosses: ["piñata"] });
    const plain = lexical({ term: "pinata", glosses: ["pinata"] });
    const before = JSON.stringify([tilde, plain]);
    expect(deriveSimilarMeaningSuggestions(tilde, [tilde, plain])).toEqual([]);
    expect(JSON.stringify([tilde, plain])).toBe(before);
  });
});
