/**
 * Acceptance checks for the built dataset — the brief §12 "done when" list, asserted
 * against the real full-scale output rather than eyeballed.
 *
 * Runs against the pipeline intermediates, so it can be run after step 05 (before the
 * data is packaged) and again after step 07. Exits non-zero if anything fails, so it
 * can gate a rebuild.
 *
 * Run: node pipeline/build/check.mjs
 */
import { raw, readJson, eachJsonl, step } from "../lib/io.mjs";
import { normalize } from "../lib/ids.mjs";

step("check · brief §12 acceptance");

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const data = readJson(raw("_entries-with-examples.json"));
const entries = data.entries;
const byLemma = new Map();
for (const e of entries) {
  if (!byLemma.has(e.lemma)) byLemma.set(e.lemma, []);
  byLemma.get(e.lemma).push(e);
}

// ---- size and shape -------------------------------------------------------
check(
  "dictionary is ~10,000 entries",
  entries.length >= 9500 && entries.length <= 11500,
  `${entries.length.toLocaleString()} entries`
);
check("every entry has an id, lemma, pos and ≥1 sense",
  entries.every((e) => e.id && e.lemma && e.pos && e.senses.length > 0));
check("every entry carries the dataset version",
  entries.every((e) => e.datasetVersion === data.datasetVersion), data.datasetVersion);
check("ids are unique", new Set(entries.map((e) => e.id)).size === entries.length);
check("ids are namespaced dict:wiktionary-es: (brief §6)",
  entries.every((e) => e.id.startsWith("dict:wiktionary-es:")));

// ---- §8 normalization -----------------------------------------------------
check("ñ survives normalization — año never matches ano (§8)",
  normalize("año") === "año" && normalize("año") !== normalize("ano"));
check("accents are stripped — sacó normalizes to saco (§8)", normalize("sacó") === "saco");

// ---- §12 inflected lookups ------------------------------------------------
const REQUIRED = {
  fui: ["ir", "ser"],
  tuvimos: ["tener"],
  casas: ["casa"],
  rápidas: ["rápido"],
};
const shipped = new Set(entries.map((e) => `${e.lemma}|${e.pos}`));
const found = new Map(Object.keys(REQUIRED).map((f) => [normalize(f), new Set()]));
await eachJsonl(raw("_forms-search.jsonl"), ([form, hits]) => {
  const set = found.get(form);
  if (!set) return;
  for (const h of hits) if (shipped.has(h)) set.add(h.slice(0, h.lastIndexOf("|")));
});
for (const [form, expected] of Object.entries(REQUIRED)) {
  const got = found.get(normalize(form));
  const missing = expected.filter((l) => !got.has(l));
  check(`"${form}" resolves to ${expected.join(" + ")} (§12)`, missing.length === 0,
    `→ ${[...got].join(", ") || "nothing"}`);
}

// ---- §12 English → Spanish ------------------------------------------------
const sacar = byLemma.get("sacar") || [];
const sacarGlosses = sacar.flatMap((e) => e.senses.map((s) => s.gloss.toLowerCase()));
check(`"take out" finds sacar as an English-meaning match (§12)`,
  sacarGlosses.some((g) => g.includes("take out")),
  sacarGlosses.find((g) => g.includes("take out")) || `sacar has ${sacarGlosses.length} senses`);

// ---- §3 Mexico-first sense order ------------------------------------------
const mexicoEntries = entries.filter((e) => e.senses.some((s) => s.regionLabels.includes("Mexico")));
const misordered = mexicoEntries.filter((e) => {
  const firstMexico = e.senses.findIndex((s) => s.regionLabels.includes("Mexico"));
  const firstOther = e.senses.findIndex((s) => !s.regionLabels.includes("Mexico") && s.regionLabels.length > 0);
  return firstOther !== -1 && firstOther < firstMexico;
});
check("Mexico-labeled senses sort before other regional senses (§3)",
  misordered.length === 0,
  `${mexicoEntries.length} entries carry a Mexico sense`);

// ---- §4 attribution -------------------------------------------------------
const allExamples = entries.flatMap((e) => e.examples);
check("every example carries a Tatoeba id, license and URL on both sides (§4)",
  allExamples.every((x) => x.sourceId && x.license && x.sourceUrl && x.englishSourceId && x.englishSourceUrl),
  `${allExamples.length.toLocaleString()} examples`);
check("examples cover most of the dictionary",
  entries.filter((e) => e.examples.length).length / entries.length > 0.9,
  `${((entries.filter((e) => e.examples.length).length / entries.length) * 100).toFixed(1)}% of entries`);

// ---- words the brief and spike name explicitly ----------------------------
for (const word of ["madrugar", "haber", "sacar", "año", "güey", "chamba"]) {
  check(`"${word}" is in the dictionary`, byLemma.has(word),
    (byLemma.get(word) || []).map((e) => e.pos).join(", "));
}

// ---- conjugations (filled by step 06) -------------------------------------
const verbs = entries.filter((e) => e.pos === "verb");
const withConj = verbs.filter((e) => e.conjugationId);
console.log(`\n  verbs ${verbs.length.toLocaleString()} · with a conjugation table ${withConj.length.toLocaleString()} (${((withConj.length / verbs.length) * 100).toFixed(1)}%)`);

const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`  FAILED: ${failed.map((f) => f.name).join("; ")}`);
  process.exit(1);
}
