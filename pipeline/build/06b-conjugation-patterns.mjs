/**
 * Step 6b — derive and measure learner-facing conjugation patterns.
 *
 * This is deliberately a gate before packaging. The catalog meets the real 1,771-table
 * corpus here, not halfway through the package writer or at lookup time on the owner's
 * phone. Only families with at least two distinct NFC/case-folded lemmas become discovery
 * rows; singletons may still teach a useful notice.
 *
 * Run: node pipeline/build/06b-conjugation-patterns.mjs
 * Writes: raw/_conjugation-pattern-families.json,
 *         out/06b-conjugation-pattern-report.json
 */
import path from "node:path";
import { raw, out, readJson, writeJson, step, done, PIPELINE_DIR } from "../lib/io.mjs";
import {
  analyzeConjugationPatterns,
  canonicalConjugationLemma,
  KNOWN_CONJUGATION_PATTERN_IDS,
} from "../../src/lib/conjugationPatterns.js";

const started = step("06b · conjugation teaching patterns");
const data = readJson(raw("_entries-final.json"));
const conjugations = readJson(raw("_conjugations.json"));
const { datasetVersion } = readJson(path.join(PIPELINE_DIR, "sources.json"));

const conjugable = data.entries.filter((entry) => entry.conjugationId && conjugations[entry.conjugationId]);
const byLemma = new Map();
for (const entry of conjugable) {
  const key = canonicalConjugationLemma(entry.lemma);
  if (!byLemma.has(key)) byLemma.set(key, []);
  byLemma.get(key).push(entry);
}

const tableSignature = (table) => JSON.stringify({
  gerund: table.gerund || "",
  pastParticiple: table.pastParticiple || "",
  tenses: table.tenses || {},
});

const conflicts = [];
for (const [lemma, entries] of byLemma) {
  const signatures = new Set(entries.map((entry) => tableSignature(conjugations[entry.conjugationId])));
  if (signatures.size > 1) conflicts.push({ lemma, entryIds: entries.map((entry) => entry.id) });
}
if (conflicts.length) {
  throw new Error(`conflicting conjugation tables for duplicate lemmas: ${conflicts.slice(0, 5).map((row) => row.lemma).join(", ")}`);
}

const spanish = new Intl.Collator("es", { sensitivity: "base", usage: "sort" });
const entryOrder = (a, b) =>
  (a.freqRank ?? Number.MAX_SAFE_INTEGER) - (b.freqRank ?? Number.MAX_SAFE_INTEGER) ||
  spanish.compare(a.lemma, b.lemma) || a.id.localeCompare(b.id);

const representatives = [...byLemma.values()]
  .map((entries) => [...entries].sort(entryOrder)[0])
  .sort(entryOrder);

const analyses = new Map();
const assignments = {};
for (const entry of conjugable) {
  const result = analyzeConjugationPatterns({
    lemma: entry.lemma,
    conjugation: conjugations[entry.conjugationId],
  });
  assignments[entry.id] = result.patternIds;
  if (!analyses.has(canonicalConjugationLemma(entry.lemma))) {
    analyses.set(canonicalConjugationLemma(entry.lemma), result);
  }
}

const membersByPattern = new Map(KNOWN_CONJUGATION_PATTERN_IDS.map((id) => [id, []]));
for (const entry of representatives) {
  const result = analyses.get(canonicalConjugationLemma(entry.lemma));
  for (const id of result.patternIds) membersByPattern.get(id)?.push(entry);
}

const families = [...membersByPattern]
  .filter(([, entries]) => entries.length >= 2)
  .map(([id, entries]) => ({ id, memberIds: [...entries].sort(entryOrder).map((entry) => entry.id) }));

const missingCoreCells = (entry) => {
  const table = conjugations[entry.conjugationId];
  const required = [
    ["Indicative/Present", "yo"],
    ["Indicative/Present", "nosotros"],
    ["Indicative/Present", "ustedes/ellos"],
    ["Indicative/Preterite", "yo"],
    ["Indicative/Preterite", "nosotros"],
    ["Indicative/Preterite", "ustedes/ellos"],
    ["Indicative/Future", "yo"],
  ];
  return required.filter(([tense, slot]) => !table?.tenses?.[tense]?.[slot]).map(([tense, slot]) => `${tense}/${slot}`);
};

const regularByClass = { ar: 0, er: 0, ir: 0 };
const unclassified = [];
const overlapCounts = {};
for (const entry of representatives) {
  const result = analyses.get(canonicalConjugationLemma(entry.lemma));
  if (result.regular) regularByClass[result.regular.class]++;
  if (!result.regular && !result.notices.length) {
    const missing = missingCoreCells(entry);
    unclassified.push({
      lemma: entry.lemma,
      entryId: entry.id,
      freqRank: entry.freqRank ?? null,
      reason: missing.length ? "missing_required_cells" : "no_supported_pattern",
      missing,
    });
  }
  const key = String(result.notices.length);
  overlapCounts[key] = (overlapCounts[key] || 0) + 1;
}

const top100 = representatives.slice(0, 100).map((entry) => {
  const result = analyses.get(canonicalConjugationLemma(entry.lemma));
  return {
    lemma: entry.lemma,
    entryId: entry.id,
    freqRank: entry.freqRank ?? null,
    output: result.regular ? `regular:${result.regular.class}` : result.patternIds.length ? "patterns" : "none",
    patternIds: result.patternIds,
  };
});
const top100WithoutTeaching = top100.filter((row) => row.output === "none");

const catalog = KNOWN_CONJUGATION_PATTERN_IDS.map((id) => {
  const entries = membersByPattern.get(id) || [];
  return {
    id,
    distinctLemmas: entries.length,
    status: entries.length >= 2 ? "discoverable" : entries.length === 1 ? "teaching-only" : "unused",
    examples: entries.slice(0, 12).map((entry) => entry.lemma),
  };
});

const output = {
  datasetVersion,
  assignments,
  families,
};
writeJson(raw("_conjugation-pattern-families.json"), output);

const report = {
  generatedAt: new Date().toISOString(),
  datasetVersion,
  corpus: {
    conjugableEntryRows: conjugable.length,
    distinctLemmas: representatives.length,
    duplicateEntryRows: conjugable.length - representatives.length,
    conflictingDuplicateLemmas: conflicts.length,
  },
  teaching: {
    regularByClass,
    regularTotal: Object.values(regularByClass).reduce((sum, count) => sum + count, 0),
    withNotices: representatives.filter((entry) => analyses.get(canonicalConjugationLemma(entry.lemma)).notices.length).length,
    unclassifiedCount: unclassified.length,
    unclassified,
    noticesPerLemma: overlapCounts,
  },
  catalog,
  top100: {
    gate: "Every top-100 unique conjugated lemma has a concrete notice or regular summary.",
    passes: top100WithoutTeaching.length === 0,
    withoutTeaching: top100WithoutTeaching,
    rows: top100,
  },
};
writeJson(out("06b-conjugation-pattern-report.json"), report);

console.log(`  ${conjugable.length.toLocaleString()} conjugable entry rows · ${representatives.length.toLocaleString()} distinct lemmas`);
console.log(`  ${report.teaching.regularTotal.toLocaleString()} regular · ${report.teaching.withNotices.toLocaleString()} with notices · ${unclassified.length} unclassified`);
for (const row of catalog.filter((item) => item.distinctLemmas)) {
  console.log(`    ${row.id.padEnd(34)} ${String(row.distinctLemmas).padStart(4)}  ${row.status}`);
}
console.log(`  top-100 teaching gate: ${report.top100.passes ? "PASS" : "FAIL"}`);

if (!report.top100.passes) {
  throw new Error(`top-100 verbs without teaching output: ${top100WithoutTeaching.map((row) => row.lemma).join(", ")}`);
}

done(started);
