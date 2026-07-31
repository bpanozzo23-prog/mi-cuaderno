/**
 * Step 6 — conjugation tables for every verb in the dictionary.
 *
 * Jehle covers 554 of the 1,807 verbs. The other 1,253 get their tables extracted from
 * kaikki's tagged `forms[]` (see pipeline/lib/conjugation.mjs for why that beats writing
 * a rule-based generator).
 *
 * The extractor is not trusted, it is CHECKED: the 554 verbs present in both sources are
 * compared cell by cell, and this script exits non-zero if agreement falls below the gate.
 * That is a stronger correctness argument than any hand-written conjugator could offer,
 * because it is measured against an independently produced reference.
 *
 * Jehle stays the primary source for the verbs it covers — brief §4 locks it in — so its
 * noncommercial licence continues to apply to the dataset either way.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/06-conjugate.mjs
 * Writes: raw/_entries-final.json, raw/_conjugations.json, out/06-conjugation-report.json
 */
import fs from "node:fs";
import { eachRecord, raw, out, writeJson, readJson, step, done } from "../lib/io.mjs";
import { conjugationId } from "../lib/ids.mjs";
import { parseCsvObjects } from "../lib/csv.mjs";
import {
  extractFromKaikki, extractFromJehle, addPerfectTenses, compareTables,
  SIMPLE_TENSES, PERFECT_TENSES, SLOTS, getSlot, expectedSlots, setSlot,
} from "../lib/conjugation.mjs";

const started = step("06 · conjugations");

/** Agreement below this and the extraction approach is not trustworthy — stop and look. */
const AGREEMENT_GATE = 99.5;

const data = readJson(raw("_entries-with-examples.json"));
const entries = data.entries;
const verbs = entries.filter((e) => e.pos === "verb");
const verbLemmas = new Set(verbs.map((e) => e.lemma));
console.log(`  ${verbs.length.toLocaleString()} verbs in the dictionary`);

// ---- Jehle ----------------------------------------------------------------
const jehleRows = parseCsvObjects(fs.readFileSync(raw("jehle_verb_database.csv"), "utf8"));
const jehleByVerb = new Map();
for (const r of jehleRows) {
  const inf = r.infinitive?.trim();
  if (!inf) continue;
  if (!jehleByVerb.has(inf)) jehleByVerb.set(inf, []);
  jehleByVerb.get(inf).push(r);
}
console.log(`  ${jehleByVerb.size} verbs in Jehle's database`);

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
  const got = getSlot(haberPresent, slot);
  if (got !== expected) throw new Error(`haber present ${slot}: expected "${expected}", extracted "${got}"`);
}
console.log(`    haber verified: ${SLOTS.map((s) => getSlot(haberPresent, s)).join(" · ")}`);

// Perfect tenses are composed before validation, not after, so that the comparison also
// checks the participle extraction and the composition itself against Jehle's own
// "he hablado" rows — 8 more tenses of evidence for free.
for (const table of kaikkiTables.values()) addPerfectTenses(table, haber.tenses);

// ---- validate the extractor against Jehle ---------------------------------
console.log("  validating against Jehle, cell by cell …");
const ALL_TENSES = [...SIMPLE_TENSES, ...Object.keys(PERFECT_TENSES)];
let agree = 0, compared = 0;
const differences = [];
const byTense = {};
const byVerb = [];

for (const [lemma, rows] of jehleByVerb) {
  const mine = kaikkiTables.get(lemma);
  if (!mine) continue;
  const theirs = extractFromJehle(rows);
  const r = compareTables(mine, theirs, { tenses: ALL_TENSES });
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
 * A few Jehle cells are malformed rather than empty: `doler`'s negative imperatives are
 * the literal string "no " with no verb after it. An empty cell in a tense that should
 * have one is filled from the kaikki table where possible. This repairs defects; it does
 * not substitute sources, so Jehle remains primary for the verbs it covers (brief §4).
 */
const isBlankCell = (v) => !v || !v.trim() || /^no\s*$/i.test(v.trim());

function repairJehleTable(table, fallback) {
  if (!fallback) return 0;
  let repaired = 0;
  for (const tense of SIMPLE_TENSES) {
    const mine = table.tenses[tense];
    const theirs = fallback.tenses[tense];
    if (!mine || !theirs) continue;
    for (const slot of expectedSlots(tense)) {
      if (!isBlankCell(getSlot(mine, slot))) continue;
      const replacement = getSlot(theirs, slot);
      if (!replacement) continue;
      setSlot(mine, slot, replacement);
      repaired++;
    }
  }
  if (!table.pastParticiple && fallback.pastParticiple) table.pastParticiple = fallback.pastParticiple;
  if (!table.gerund && fallback.gerund) table.gerund = fallback.gerund;
  return repaired;
}

const conjugations = {};
let fromJehle = 0, fromKaikki = 0, noTable = 0, repairedCells = 0;
const repairedVerbs = [];
const verbsWithoutTable = [];

for (const e of verbs) {
  const rows = jehleByVerb.get(e.lemma);
  if (rows) {
    e.conjugationId = conjugationId("jehle", e.lemma);
    const table = extractFromJehle(rows);
    const n = repairJehleTable(table, kaikkiTables.get(e.lemma));
    if (n) {
      repairedCells += n;
      repairedVerbs.push({ lemma: e.lemma, cells: n });
    }
    // Perfect tenses are recomposed rather than taken from Jehle's stored rows. They are
    // mechanically derivable, this composition agrees with Jehle on 99.8% of 57,580 cells,
    // and some of Jehle's stored rows are corrupt — cepillar's past perfect reads
    // "cepillía cepillado" where it should read "había cepillado". Composing uniformly
    // means both sources render one shape and neither can ship a mangled auxiliary.
    for (const perfect of Object.keys(PERFECT_TENSES)) delete table.tenses[perfect];
    addPerfectTenses(table, haber.tenses);
    conjugations[e.conjugationId] = table;
    fromJehle++;
    continue;
  }
  const table = kaikkiTables.get(e.lemma);
  if (table) {
    e.conjugationId = conjugationId("wikt", e.lemma);
    conjugations[e.conjugationId] = table; // perfect tenses already composed above
    fromKaikki++;
    continue;
  }
  e.conjugationId = null;
  noTable++;
  verbsWithoutTable.push({ lemma: e.lemma, freqRank: e.freqRank });
}

// haber's own table, needed by the app to render any perfect tense it composes later,
// and by the owner looking haber up — it is rank 19 and absent from Jehle.
if (!conjugations[conjugationId("wikt", "haber")] && !conjugations[conjugationId("jehle", "haber")]) {
  conjugations[conjugationId("wikt", "haber")] = haber;
}

writeJson(raw("_entries-final.json"), { datasetVersion: data.datasetVersion, count: entries.length, entries });
writeJson(raw("_conjugations.json"), conjugations);

// ---- completeness of what we ship -----------------------------------------
const tableStats = Object.values(conjugations).map((t) => {
  let filled = 0, total = 0;
  for (const tense of SIMPLE_TENSES) {
    for (const slot of expectedSlots(tense)) {
      total++;
      if (t.tenses[tense] && getSlot(t.tenses[tense], slot)) filled++;
    }
  }
  return { filled, total, source: t.source };
});
const complete = tableStats.filter((s) => s.filled === s.total).length;
const avgFilled = +(tableStats.reduce((n, s) => n + s.filled / s.total, 0) / tableStats.length * 100).toFixed(1);

const report = {
  generatedAt: new Date().toISOString(),
  approach:
    "Conjugations extracted from kaikki's tagged forms[] for verbs Jehle lacks; Jehle " +
    "remains primary for the 554 verbs it covers. Perfect tenses composed as haber + participle.",
  validation: {
    gate: AGREEMENT_GATE,
    verbsComparedAgainstJehle: byVerb.length + (jehleByVerb.size - byVerb.length),
    cellsCompared: compared,
    cellsAgreeing: agree,
    agreementPct,
    passesGate: agreementPct >= AGREEMENT_GATE,
    disagreementsByTense: byTense,
    verbsWithAnyDisagreement: byVerb.length,
    worstVerbs: byVerb.sort((a, b) => b.differ - a.differ).slice(0, 20),
    sampleDisagreements: differences.slice(0, 60),
  },
  jehleRepairs: {
    note:
      "Jehle cells that were empty or malformed (doler's negative imperatives are the " +
      "literal string 'no ') filled from the kaikki table. Repairs a defect; does not " +
      "change which source is primary.",
    cells: repairedCells,
    verbs: repairedVerbs.sort((a, b) => b.cells - a.cells).slice(0, 30),
  },
  coverage: {
    verbsInDictionary: verbs.length,
    fromJehle,
    fromKaikkiExtraction: fromKaikki,
    withoutAnyTable: noTable,
    verbsWithoutTable: verbsWithoutTable.slice(0, 40),
    tablesShipped: Object.keys(conjugations).length,
    completeSimpleTables: complete,
    averageSimpleCellsFilledPct: avgFilled,
  },
  haberPresentIndicative: Object.fromEntries(SLOTS.map((s) => [s, getSlot(haberPresent, s)])),
};
writeJson(out("06-conjugation-report.json"), report);

console.log(`\n  VALIDATION`);
console.log(`    agreement            ${agreementPct}%  (gate ${AGREEMENT_GATE}%)`);
console.log(`    verbs with any diff  ${byVerb.length} of ${jehleByVerb.size} compared`);
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
console.log(`    from Jehle           ${fromJehle.toLocaleString()}  (${repairedCells} blank/malformed cells repaired from kaikki)`);
console.log(`    from kaikki          ${fromKaikki.toLocaleString()}`);
console.log(`    still without one    ${noTable.toLocaleString()}`);
console.log(`    tables shipped       ${Object.keys(conjugations).length.toLocaleString()}`);
console.log(`    complete simple tables ${complete.toLocaleString()} · avg cells filled ${avgFilled}%`);

if (agreementPct < AGREEMENT_GATE) {
  console.log(`\n  Agreement is below the ${AGREEMENT_GATE}% gate. Read out/06-conjugation-report.json before shipping.`);
  process.exit(1);
}
done(started);
