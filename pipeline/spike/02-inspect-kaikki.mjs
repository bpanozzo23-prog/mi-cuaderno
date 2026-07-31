/**
 * Field-reality survey of the kaikki extract. Answers, from the data rather than from
 * assumption: which top-level fields exist and how often; where glosses, noun gender,
 * regional labels and inflected forms actually live; and how homographs / multi-POS
 * words are distinguished (which decides the section 6 canonical ID).
 *
 * Run: node pipeline/spike/02-inspect-kaikki.mjs [--limit N]
 * Writes: out/02-kaikki-structure.json, out/02-sample-records.json
 */
import { eachRecord, raw, out, writeJson } from "./lib/io.mjs";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const topFields = new Map();
const posCounts = new Map();
const senseFields = new Map();
const formTagCounts = new Map();
const regionTagCounts = new Map();
const REGION_HINTS = /mexic|latin|america|spain|argentin|colomb|chile|peru|cuba|caribbean|andes|rioplatense|canary/i;

let total = 0;
let withForms = 0, withSounds = 0, withEtymNumber = 0, withEtymText = 0, withCategories = 0;
let withHeadTemplates = 0, withSenseTags = 0, withRawGlosses = 0;

// identity probes: how are homographs and multi-POS words distinguished?
const identityProbe = new Map();
const PROBE_WORDS = new Set(["ir", "ser", "vino", "casa", "bajo", "sacar", "tener", "rápido", "año", "banco", "sobre", "papa"]);
const captured = [];
const CAPTURE_WORDS = new Set(["sacar", "casa", "vino", "rápido", "año"]);

await eachRecord(raw("kaikki-Spanish.jsonl.gz"), (rec, i) => {
  if (i > LIMIT) return false;
  total++;

  for (const k of Object.keys(rec)) topFields.set(k, (topFields.get(k) || 0) + 1);
  posCounts.set(rec.pos, (posCounts.get(rec.pos) || 0) + 1);

  if (Array.isArray(rec.forms) && rec.forms.length) {
    withForms++;
    for (const f of rec.forms) for (const t of f.tags || []) formTagCounts.set(t, (formTagCounts.get(t) || 0) + 1);
  }
  if (rec.sounds) withSounds++;
  if (rec.etymology_number !== undefined) withEtymNumber++;
  if (rec.etymology_text) withEtymText++;
  if (rec.categories) withCategories++;
  if (rec.head_templates) withHeadTemplates++;

  for (const s of rec.senses || []) {
    for (const k of Object.keys(s)) senseFields.set(k, (senseFields.get(k) || 0) + 1);
    if (s.tags) withSenseTags++;
    if (s.raw_glosses) withRawGlosses++;
    for (const t of [...(s.tags || []), ...(s.raw_tags || [])]) {
      if (REGION_HINTS.test(t)) regionTagCounts.set(t, (regionTagCounts.get(t) || 0) + 1);
    }
  }

  if (PROBE_WORDS.has(rec.word)) {
    if (!identityProbe.has(rec.word)) identityProbe.set(rec.word, []);
    identityProbe.get(rec.word).push({
      pos: rec.pos,
      etymology_number: rec.etymology_number ?? null,
      etymology_text_head: rec.etymology_text ? rec.etymology_text.slice(0, 70) : null,
      senseCount: (rec.senses || []).length,
      firstGloss: rec.senses?.[0]?.glosses?.[0] ?? null,
      formCount: (rec.forms || []).length,
    });
  }
  if (CAPTURE_WORDS.has(rec.word) && captured.length < 8) captured.push(rec);
});

const sortDesc = (m, n = 40) => Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n));

const summary = {
  generatedAt: new Date().toISOString(),
  totalRecords: total,
  coverage: {
    withForms, withSounds, withEtymologyNumber: withEtymNumber, withEtymologyText: withEtymText,
    withCategories, withHeadTemplates, sensesWithTags: withSenseTags, sensesWithRawGlosses: withRawGlosses,
  },
  topLevelFields: sortDesc(topFields, 60),
  posCounts: sortDesc(posCounts, 40),
  senseFields: sortDesc(senseFields, 40),
  regionalTagsSeen: sortDesc(regionTagCounts, 40),
  formTagsTop: sortDesc(formTagCounts, 50),
  identityProbe: Object.fromEntries(identityProbe),
};

writeJson(out("02-kaikki-structure.json"), summary);
writeJson(out("02-sample-records.json"), captured);

console.log(`Scanned ${total.toLocaleString()} records.`);
console.log(`\nTop-level fields (count of records containing them):`);
for (const [k, v] of Object.entries(summary.topLevelFields)) console.log(`  ${k.padEnd(22)} ${v.toLocaleString()}`);
console.log(`\nParts of speech (top 15):`);
for (const [k, v] of Object.entries(summary.posCounts).slice(0, 15)) console.log(`  ${String(k).padEnd(22)} ${v.toLocaleString()}`);
console.log(`\nSense-level fields:`);
for (const [k, v] of Object.entries(summary.senseFields)) console.log(`  ${k.padEnd(22)} ${v.toLocaleString()}`);
console.log(`\nRegional labels seen in sense tags:`);
for (const [k, v] of Object.entries(summary.regionalTagsSeen)) console.log(`  ${k.padEnd(22)} ${v.toLocaleString()}`);
console.log(`\nIdentity probe — how homographs / multi-POS entries are split:`);
for (const [w, rows] of identityProbe) {
  console.log(`  ${w}: ${rows.length} record(s)`);
  for (const r of rows) console.log(`     pos=${String(r.pos).padEnd(12)} etym#=${String(r.etymology_number).padEnd(5)} senses=${String(r.senseCount).padEnd(3)} forms=${String(r.formCount).padEnd(4)} "${(r.firstGloss || "").slice(0, 58)}"`);
}
console.log(`\nWrote out/02-kaikki-structure.json and out/02-sample-records.json`);
