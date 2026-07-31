/**
 * Step 6 — conjugation tables for every verb in the dictionary.
 *
 * Every table is extracted from kaikki's tagged `forms[]` (see pipeline/lib/conjugation.mjs
 * for why that beats writing a rule-based generator).
 *
 * The extractor is not trusted, it is CHECKED: every verb present in both kaikki and Fred
 * Jehle's database is compared cell by cell, and this script exits non-zero if agreement
 * falls below the gate. That is a stronger correctness argument than any hand-written
 * conjugator could offer, because it is measured against an independently produced reference.
 *
 * Jehle is ONLY that reference. No Jehle content reaches the distributed dataset, which is
 * what keeps its CC BY-NC-SA noncommercial terms off the bundle — see the amendment note in
 * brief §4 and the reasoning in DECISIONS.md. If the CSV is absent the build still runs, and
 * says loudly that it shipped unvalidated.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/06-conjugate.mjs
 * Writes: raw/_entries-final.json, raw/_conjugations.json, out/06-conjugation-report.json
 */
import fs from "node:fs";
import { eachRecord, raw, out, writeJson, readJson, step, done } from "../lib/io.mjs";
import { conjugationId } from "../lib/ids.mjs";
import { HABER_CONJUGATION_ID } from "../../src/lib/conjugation.js";
import { parseCsvObjects } from "../lib/csv.mjs";
import {
  extractFromKaikki, extractFromJehle, compareTables, withPerfectTenses,
  SIMPLE_TENSES, PERFECT_TENSES, SLOTS, expectedSlots,
} from "../lib/conjugation.mjs";

const started = step("06 · conjugations");

/** Agreement below this and the extraction approach is not trustworthy — stop and look. */
const AGREEMENT_GATE = 99.5;

const data = readJson(raw("_entries-with-examples.json"));
const entries = data.entries;
const verbs = entries.filter((e) => e.pos === "verb");
const verbLemmas = new Set(verbs.map((e) => e.lemma));
console.log(`  ${verbs.length.toLocaleString()} verbs in the dictionary`);

// ---- Jehle: the validation reference, never a source -----------------------
// Optional on purpose. The dataset no longer contains any Jehle content, so a build
// without the CSV is still shippable — it is just unchecked, and says so.
const jehlePath = raw("jehle_verb_database.csv");
const jehleByVerb = new Map();
if (fs.existsSync(jehlePath)) {
  for (const r of parseCsvObjects(fs.readFileSync(jehlePath, "utf8"))) {
    const inf = r.infinitive?.trim();
    if (!inf) continue;
    if (!jehleByVerb.has(inf)) jehleByVerb.set(inf, []);
    jehleByVerb.get(inf).push(r);
  }
  console.log(`  ${jehleByVerb.size} verbs in Jehle's database (validation reference)`);
} else {
  console.log(`  ! jehle_verb_database.csv absent — conjugations will ship UNVALIDATED`);
}

// ---- extract every dictionary verb from kaikki ----------------------------
// haber is extracted too and is load-bearing: every perfect tense of every other verb is
// built from it, and Jehle does not include it.
console.log("  extracting conjugations from kaikki …");
const kaikkiTables = new Map();
await eachRecord(
  raw("kaikki-Spanish.jsonl.gz"),
  (rec) => {
    if (rec.pos !== "verb" || !rec.word) return;
    if (!verbLemmas.has(rec.word) && rec.word !== "haber") return;
    if (kaikkiTables.has(rec.word)) return;
    const table = extractFromKaikki(rec);
    if (table) kaikkiTables.set(rec.word, table);
  },
  { progressEvery: 200000, label: "kaikki " }
);
console.log(`    ${kaikkiTables.size.toLocaleString()} tables extracted`);

const haber = kaikkiTables.get("haber");
if (!haber) throw new Error("no conjugation for haber — every perfect tense depends on it");

// haber is checked by hand because nothing else can check it: it is irregular everywhere
// and absent from Jehle, so a silent error here would corrupt all 18 perfect tenses.
const haberPresent = haber.tenses["Indicative/Present"];
const haberExpected = { yo: "he", "tú": "has", "él/ella/usted": "ha", nosotros: "hemos", "ustedes/ellos": "han" };
for (const [slot, expected] of Object.entries(haberExpected)) {
  if (haberPresent[slot] !== expected) {
    throw new Error(`haber present ${slot}: expected "${expected}", extracted "${haberPresent[slot]}"`);
  }
}
console.log(`    haber verified: ${SLOTS.map((s) => haberPresent[s]).join(" · ")}`);

// ---- validate the extractor against Jehle ---------------------------------
// The comparison covers the composed perfect tenses too, which checks the participle
// extraction and the composition itself against Jehle's own "he hablado" rows — eight
// more tenses of evidence for free, and how the reflexive-pronoun bug was found.
console.log("  validating against Jehle, cell by cell …");
const ALL_TENSES = [...SIMPLE_TENSES, ...Object.keys(PERFECT_TENSES)];
let agree = 0, compared = 0, verbsCompared = 0;
const differences = [];
const byTense = {};
const byVerb = [];

for (const [lemma, rows] of jehleByVerb) {
  const mine = kaikkiTables.get(lemma);
  if (!mine) continue;
  verbsCompared++;
  const theirs = extractFromJehle(rows, { keepPerfect: true });
  const r = compareTables(withPerfectTenses(mine, haber.tenses), theirs, { tenses: ALL_TENSES });
  agree += r.agree;
  compared += r.compared;
  if (r.differ.length) {
    byVerb.push({ lemma, differ: r.differ.length, of: r.compared });
    for (const d of r.differ) {
      byTense[d.tense] = (byTense[d.tense] || 0) + 1;
      if (differences.length < 300) differences.push({ lemma, ...d });
    }
  }
}

const agreementPct = compared ? +((agree / compared) * 100).toFixed(3) : 0;
console.log(`    ${agree.toLocaleString()}/${compared.toLocaleString()} cells agree — ${agreementPct}%`);

// ---- assign tables to entries ---------------------------------------------
/**
 * Every shipped table comes from kaikki. Jehle is a reference the extraction is measured
 * against, above, and nothing more — no Jehle content reaches the distributed dataset,
 * which is what keeps its CC BY-NC-SA noncommercial terms off the bundle.
 *
 * Measured before this was changed: of the 554 verbs Jehle covered, kaikki produces a
 * table for all 554 and loses not one cell. Where the two disagree, kaikki is the correct
 * one — `criáis`/`frió` are the 2010 RAE spelling reform that Jehle predates, `gradúéis`
 * carries two accents that Spanish orthography does not permit, and `arrepentáis` misses
 * a stem change. Shipping Jehle was costing accuracy, not buying it.
 */
const conjugations = {};
let fromKaikki = 0, noTable = 0;
const verbsWithoutTable = [];

for (const e of verbs) {
  const table = kaikkiTables.get(e.lemma);
  if (table) {
    e.conjugationId = conjugationId("wikt", e.lemma);
    conjugations[e.conjugationId] = table;
    fromKaikki++;
    continue;
  }
  e.conjugationId = null;
  noTable++;
  verbsWithoutTable.push({ lemma: e.lemma, freqRank: e.freqRank });
}

// haber's own table under its well-known id. The app loads it once and composes every
// perfect tense of every other verb from it, so it must ship even if haber somehow left
// the dictionary. It is also rank 19 and absent from Jehle, so the owner needs it anyway.
conjugations[HABER_CONJUGATION_ID] = haber;

writeJson(raw("_entries-final.json"), { datasetVersion: data.datasetVersion, count: entries.length, entries });
writeJson(raw("_conjugations.json"), conjugations);

// ---- completeness of what we ship -----------------------------------------
// The -se imperfect subjunctive is a kaikki-only extra, so it is not part of "complete".
const CORE_TENSES = SIMPLE_TENSES.filter((t) => t !== "Subjunctive/Imperfect (-se)");
const tableStats = Object.values(conjugations).map((t) => {
  let filled = 0, total = 0;
  for (const tense of CORE_TENSES) {
    for (const slot of expectedSlots(tense)) {
      total++;
      if (t.tenses[tense]?.[slot]) filled++;
    }
  }
  return { filled, total, source: t.source };
});
const complete = tableStats.filter((s) => s.filled === s.total).length;
const avgFilled = +(tableStats.reduce((n, s) => n + s.filled / s.total, 0) / tableStats.length * 100).toFixed(1);

const report = {
  generatedAt: new Date().toISOString(),
  approach:
    "Every conjugation table is extracted from kaikki's tagged forms[]. Jehle is a " +
    "validation reference only — no Jehle content is distributed, so its CC BY-NC-SA " +
    "noncommercial terms do not apply to the bundle. Perfect tenses composed as haber + participle.",
  validation: {
    gate: AGREEMENT_GATE,
    // The count of verbs actually compared — both sources must have a table. An earlier
    // version of this line reported jehleByVerb.size, which is just the size of Jehle's
    // database and told you nothing about how much was checked.
    verbsComparedAgainstJehle: verbsCompared,
    jehleVerbsInDatabase: jehleByVerb.size,
    jehleVerbsNotInDictionary: jehleByVerb.size - verbsCompared,
    cellsCompared: compared,
    cellsAgreeing: agree,
    agreementPct,
    passesGate: agreementPct >= AGREEMENT_GATE,
    disagreementsByTense: byTense,
    verbsWithAnyDisagreement: byVerb.length,
    worstVerbs: byVerb.sort((a, b) => b.differ - a.differ).slice(0, 20),
    sampleDisagreements: differences.slice(0, 60),
  },
  coverage: {
    verbsInDictionary: verbs.length,
    fromKaikkiExtraction: fromKaikki,
    fromJehle: 0,
    withoutAnyTable: noTable,
    verbsWithoutTable: verbsWithoutTable.slice(0, 40),
    tablesShipped: Object.keys(conjugations).length,
    completeSimpleTables: complete,
    averageSimpleCellsFilledPct: avgFilled,
  },
  storedTenses: {
    note:
      "Only the simple tenses are stored. The eight perfect tenses are composed by the " +
      "app from haber + past participle (src/lib/conjugation.js), which is 322 KB less " +
      "to download; the composition is validated against Jehle above.",
    simple: SIMPLE_TENSES,
    composed: Object.keys(PERFECT_TENSES),
  },
  haberPresentIndicative: haberPresent,
};
writeJson(out("06-conjugation-report.json"), report);

console.log(`\n  VALIDATION`);
console.log(`    agreement            ${agreementPct}%  (gate ${AGREEMENT_GATE}%)`);
console.log(`    verbs compared       ${verbsCompared} of ${jehleByVerb.size} in Jehle's database`);
console.log(`    verbs with any diff  ${byVerb.length}`);
if (Object.keys(byTense).length) {
  console.log(`    disagreements by tense:`);
  for (const [t, n] of Object.entries(byTense).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${t.padEnd(34)} ${n}`);
  }
  console.log(`    examples:`);
  for (const d of differences.slice(0, 12)) {
    console.log(`      ${d.lemma.padEnd(14)} ${d.tense.padEnd(30)} ${d.slot.padEnd(14)} kaikki="${d.a}"  jehle="${d.b}"`);
  }
}
console.log(`\n  COVERAGE`);
console.log(`    from kaikki          ${fromKaikki.toLocaleString()}  (every shipped table; Jehle is a check, not a source)`);
console.log(`    still without one    ${noTable.toLocaleString()}`);
console.log(`    tables shipped       ${Object.keys(conjugations).length.toLocaleString()}`);
console.log(`    complete simple tables ${complete.toLocaleString()} · avg cells filled ${avgFilled}%`);

// The gate only means something when there was something to compare against. A build with
// no reference is not a passing build — it is an unchecked one, and must not read as a pass.
if (!compared) {
  console.log(`\n  ! No validation was possible. These tables are UNCHECKED.`);
} else if (agreementPct < AGREEMENT_GATE) {
  console.log(`\n  Agreement is below the ${AGREEMENT_GATE}% gate. Read out/06-conjugation-report.json before shipping.`);
  process.exit(1);
}
done(started);
