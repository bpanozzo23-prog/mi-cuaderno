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
  });
});

