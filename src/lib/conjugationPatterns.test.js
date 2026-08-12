import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeConjugationPatterns,
  canonicalConjugationLemma,
  isValidConjugationEvidence,
  regularConjugationModel,
} from "./conjugationPatterns.js";

function shippedData() {
  const manifest = JSON.parse(readFileSync(new URL("../../public/dict/manifest.json", import.meta.url), "utf8"));
  const entries = [];
  const conjugations = [];
  for (const chunk of manifest.chunks) {
    const body = JSON.parse(readFileSync(
      new URL(`../../public/dict/${manifest.path}/${chunk.file}`, import.meta.url),
      "utf8"
    ));
    entries.push(...(body.stores.entries || []));
    conjugations.push(...(body.stores.conjugations || []));
  }
  return { entries, tables: new Map(conjugations.map((table) => [table.id, table])) };
}

const SHIPPED = shippedData();

function verb(lemma) {
  const entries = SHIPPED.entries.filter((entry) =>
    entry.pos === "verb" && entry.conjugationId && canonicalConjugationLemma(entry.lemma) === canonicalConjugationLemma(lemma)
  );
  expect(entries.length, `one or more shipped entries for ${lemma}`).toBeGreaterThan(0);
  const entry = entries.sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9) || a.id.localeCompare(b.id))[0];
  return { entry, table: SHIPPED.tables.get(entry.conjugationId) };
}

const analyze = (lemma) => {
  const { table } = verb(lemma);
  return analyzeConjugationPatterns({ lemma, conjugation: table });
};

describe("regular conjugation teaching", () => {
  it("Regular paradigms use the three quiet anchors", () => {
    for (const [lemma, anchor] of [["hablar", "hablar"], ["comer", "comer"], ["vivir", "vivir"]]) {
      const { table } = verb(lemma);
      expect(regularConjugationModel(lemma), lemma).toEqual({
        gerund: table.gerund,
        pastParticiple: table.pastParticiple,
        tenses: table.tenses,
      });
      expect(analyze(lemma)).toEqual({
        regular: { class: lemma.slice(-2), anchor },
        notices: [],
        patternIds: [],
      });
    }

    expect(analyze("trabajar").regular?.anchor).toBe("hablar");
    expect(analyze("deber").regular?.anchor).toBe("comer");
    expect(analyze("recibir").regular?.anchor).toBe("vivir");
  });
});

describe("conjugation observation merging", () => {
  it("Pedir coalesces its e→i observations into one lesson", () => {
    const result = analyze("pedir");
    expect(result.patternIds).toEqual(["stem:e-i"]);
    expect(result.notices).toHaveLength(1);
    expect(result.notices[0].evidence.map((row) => row.form)).toEqual(["pido", "pedimos", "pidieron"]);
    expect(result.notices[0].evidence.map((row) => row.role)).toEqual(["changed", "contrast", "changed"]);
    expect(result.notices[0].evidence.map((row) => row.emphasis)).toEqual([[[1, 2]], [[1, 2]], [[1, 2]]]);
  });

  it("keeps stem and gerund emphasis on the structural change", () => {
    const volver = analyze("volver").notices.find((notice) => notice.id === "stem:o-ue");
    const contar = analyze("contar").notices.find((notice) => notice.id === "stem:o-ue");
    const decir = analyze("decir").notices.find((notice) => notice.id === "gerund:e-i");

    expect(volver.evidence.find((row) => row.form === "volvemos")?.emphasis).toEqual([[1, 2]]);
    expect(contar.evidence.find((row) => row.form === "contamos")?.emphasis).toEqual([[1, 2]]);
    expect(decir.evidence.find((row) => row.form === "diciendo")?.emphasis).toEqual([[1, 2]]);
  });

  it("keeps useful overlaps while suppressing a spelling-derived yo-go duplicate", () => {
    const seguir = analyze("seguir");
    expect(seguir.patternIds).toContain("stem:e-i");
    expect(seguir.patternIds).toContain("spelling:gu-g");
    expect(seguir.patternIds).not.toContain("present:yo-go");

    expect(analyze("tener").patternIds).toEqual(expect.arrayContaining([
      "present:yo-go", "preterite:uv-stem", "future:dr-stem",
    ]));
    expect(analyze("decir").patternIds).toEqual(expect.arrayContaining([
      "present:yo-go", "preterite:j-stem", "future:dir-stem", "participle:cho",
    ]));
  });

  it("recognizes shared whole-form behavior and rejects deceptive spelling", () => {
    expect(analyze("ser").patternIds).toContain("preterite:ser-ir");
    expect(analyze("ir").patternIds).toContain("preterite:ser-ir");
    expect(analyze("suceder").regular?.anchor).toBe("comer");
    expect(analyze("suceder").patternIds).toEqual([]);
  });
});

describe("corpus teaching gates", () => {
  const uniqueConjugated = () => {
    const seen = new Set();
    return SHIPPED.entries
      .filter((entry) => entry.pos === "verb" && entry.conjugationId && SHIPPED.tables.has(entry.conjugationId))
      .sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9) || a.id.localeCompare(b.id))
      .filter((entry) => {
        const key = canonicalConjugationLemma(entry.lemma);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  it("Teaching evidence never selects a collapsed slot", () => {
    for (const entry of uniqueConjugated()) {
      const result = analyzeConjugationPatterns({ lemma: entry.lemma, conjugation: SHIPPED.tables.get(entry.conjugationId) });
      for (const notice of result.notices) {
        expect(isValidConjugationEvidence(notice), `${entry.lemma} ${notice.id}`).toBe(true);
        expect(notice.evidence.some((row) => row.slot === "vosotros"), `${entry.lemma} ${notice.id}`).toBe(false);
      }
    }
  });

  it("Stem and gerund evidence emphasizes the analyzed replacement position", () => {
    const changes = {
      "stem:e-ie_then_e-i": { from: "e", shown: ["ie", "e", "i"] },
      "stem:o-ue_then_o-u": { from: "o", shown: ["ue", "o", "u"] },
      "stem:e-i": { from: "e", shown: ["i", "e", "i"] },
      "stem:e-ie": { from: "e", shown: ["ie", "e", "ie"] },
      "stem:o-ue": { from: "o", shown: ["ue", "o", "ue"] },
      "stem:u-ue": { from: "u", shown: ["ue", "u", "ue"] },
      "stem:i-accent": { from: "i", shown: ["í", "i", "í"] },
      "stem:u-accent": { from: "u", shown: ["ú", "u", "ú"] },
      "gerund:e-i": { from: "e", shown: ["i", "e"] },
      "gerund:o-u": { from: "o", shown: ["u", "o"] },
    };

    for (const entry of uniqueConjugated()) {
      const result = analyzeConjugationPatterns({ lemma: entry.lemma, conjugation: SHIPPED.tables.get(entry.conjugationId) });
      const bare = canonicalConjugationLemma(entry.lemma).replace(/se$/, "");
      const stem = bare.slice(0, -2);
      for (const notice of result.notices) {
        const change = changes[notice.id];
        if (!change) continue;
        const stemIndex = stem.lastIndexOf(change.from);
        for (const [index, row] of notice.evidence.entries()) {
          const prefixLength = /^(?:me|te|se|nos|os) /.exec(row.form)?.[0].length || 0;
          expect(row.emphasis, `${entry.lemma} ${notice.id} ${row.form}`).toEqual([
            [prefixLength + stemIndex, prefixLength + stemIndex + change.shown[index].length],
          ]);
        }
      }
    }
  });

  it("Top-100 verbs always receive teaching output", () => {
    const missing = uniqueConjugated().slice(0, 100).filter((entry) => {
      const result = analyzeConjugationPatterns({ lemma: entry.lemma, conjugation: SHIPPED.tables.get(entry.conjugationId) });
      return !result.regular && result.notices.length === 0;
    });
    expect(missing.map((entry) => entry.lemma)).toEqual([]);
  });

  it("Singleton patterns do not advertise siblings", () => {
    const members = uniqueConjugated().filter((entry) => {
      const result = analyzeConjugationPatterns({ lemma: entry.lemma, conjugation: SHIPPED.tables.get(entry.conjugationId) });
      return result.patternIds.includes("stem:u-ue");
    });
    expect(members.map((entry) => entry.lemma)).toEqual(["jugar"]);
    expect(analyze("jugar").notices[0].evidence.map((row) => row.form)).toEqual(["juego", "jugamos", "juegan"]);
    expect(analyze("jugar").notices[0].explanation).toBe("The change appears in stressed forms but not in nosotros.");
  });
});

describe("pronominal conjugation teaching", () => {
  it("recognizes regular pronominal paradigms", () => {
    for (const lemma of ["personarse", "quejarse", "entrometerse"]) {
      expect(analyze(lemma), lemma).toEqual({
        regular: { class: lemma.slice(-4, -2), anchor: lemma.endsWith("arse") ? "hablar" : "comer" },
        notices: [],
        patternIds: [],
      });
    }
  });

  it("recognizes arrepentirse while preserving visible pronouns and exact emphasis", () => {
    const result = analyze("arrepentirse");
    expect(result.patternIds).toEqual(["stem:e-ie_then_e-i"]);
    expect(result.notices[0].evidence.map((row) => row.form)).toEqual([
      "me arrepiento", "nos arrepentimos", "se arrepintieron",
    ]);
    expect(result.notices[0].evidence.map((row) => row.emphasis)).toEqual([[[8, 10]], [[9, 10]], [[8, 9]]]);
  });
});
