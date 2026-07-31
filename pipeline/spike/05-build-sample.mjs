/**
 * Pass 2 over the kaikki extract. Builds real DictEntry records (brief section 7 shape)
 * for a sample of ~180 lemmas, then joins Fred Jehle's conjugations onto the verbs.
 *
 * Applies the decisions the earlier scripts surfaced:
 *   - records sharing word+pos+etymology are MERGED into one entry (script 03 finding)
 *   - Mexico-labeled senses sort first, then other Latin American, then the rest (section 3)
 *   - conjugation display is ustedes-first with vosotros kept but marked collapsed (section 3)
 *
 * Run: node pipeline/spike/05-build-sample.mjs
 * Writes: out/05-sample-entries.json, out/05-conjugation-coverage.json
 */
import fs from "node:fs";
import { eachRecord, raw, out, writeJson, readJson } from "./lib/io.mjs";
import { normalize, canonicalId } from "./lib/normalize.mjs";
import { parseCsvObjects } from "./lib/csv.mjs";

const DATASET_VERSION = "kaikki-es-2026-07-25";  // kaikki extraction date; enwiktionary dump 2026-07-06
const TOP_N = 150;
const MEXICO_QUOTA = 12;

// Words the brief names explicitly, plus prototype seed words, so the review set is comparable.
const CURATED = ["sacar", "tener", "ir", "ser", "casa", "rápido", "año", "madrugar", "vino", "papa", "gallo", "bajo", "coger", "platicar", "chamba", "güey", "ahorita", "banco"];

console.log("Loading lemma ranks and form index …");
const { ranked } = readJson(raw("_lemma-ranks.json"));
const formIndex = readJson(raw("_form-index.json"));

const rankOf = new Map();
for (const r of ranked) {
  const k = `${r.lemma}|${r.pos}`;
  if (!rankOf.has(k)) rankOf.set(k, r.rank);
}

// wanted: top-N ranked lemmas plus the curated list
const wanted = new Map();  // "lemma|pos" -> freqRank
for (const r of ranked.slice(0, TOP_N)) wanted.set(`${r.lemma}|${r.pos}`, r.rank);
const curatedSet = new Set(CURATED);

// reverse the form index for the lemmas we care about -> searchForms[]
const searchFormsFor = new Map();
for (const [form, hits] of Object.entries(formIndex)) {
  for (const h of hits) {
    const lemma = h.slice(0, h.lastIndexOf("|"));
    if (!wanted.has(h) && !curatedSet.has(lemma)) continue;
    if (!searchFormsFor.has(h)) searchFormsFor.set(h, new Set());
    const s = searchFormsFor.get(h);
    if (s.size < 400) s.add(form);
  }
}

const MEXICO = /^Mexico$/i;
const LATAM = /^(Latin-America|Central-America|South-America|Caribbean|Argentina|Chile|Colombia|Peru|Cuba|Rioplatense)$/i;

const regionRank = (labels) => {
  if (labels.some((l) => MEXICO.test(l))) return 0;
  if (labels.some((l) => LATAM.test(l))) return 1;
  return 2;
};

const entries = new Map();   // canonicalId -> DictEntry
let mexicoExtras = 0;

const senseOf = (s) => {
  const labels = [...(s.tags || []), ...(s.raw_tags || [])].filter((t) =>
    MEXICO.test(t) || LATAM.test(t) || /^Spain$/i.test(t) || /^(Canary-Islands|Southern-Spain)$/i.test(t)
  );
  return { gloss: (s.glosses || [])[0] || "", regionLabels: labels };
};

const genderOf = (rec) => {
  const arg = rec.head_templates?.[0]?.args?.["1"];
  if (arg === "f" || arg === "m" || arg === "mf" || arg === "m-f") return arg;
  for (const s of rec.senses || []) {
    if ((s.tags || []).includes("feminine")) return "f";
    if ((s.tags || []).includes("masculine")) return "m";
  }
  return undefined;
};

const isInflectionOnly = (rec) => {
  const senses = rec.senses || [];
  return senses.length > 0 && senses.every((s) => s.form_of || s.alt_of || (s.tags || []).includes("form-of"));
};

console.log("Scanning kaikki for sample entries …");
await eachRecord(raw("kaikki-Spanish.jsonl.gz"), (rec) => {
  const { word, pos } = rec;
  if (!word || !pos || isInflectionOnly(rec)) return;

  const key = `${word}|${pos}`;
  const isWanted = wanted.has(key) || curatedSet.has(word);

  // also pull a handful of Mexico-flagged everyday words so the review set includes them
  let mexicoPick = false;
  if (!isWanted && mexicoExtras < MEXICO_QUOTA) {
    const hasMexico = (rec.senses || []).some((s) => [...(s.tags || []), ...(s.raw_tags || [])].some((t) => MEXICO.test(t)));
    const rank = rankOf.get(key);
    if (hasMexico && rank && rank < 6000) { mexicoPick = true; mexicoExtras++; }
  }
  if (!isWanted && !mexicoPick) return;

  const id = canonicalId(word, pos, rec.etymology_number ?? null);
  const senses = (rec.senses || []).map(senseOf).filter((s) => s.gloss);

  if (entries.has(id)) {
    entries.get(id).senses.push(...senses);          // merge (script 03 finding)
    entries.get(id).mergedFromRecords++;
    return;
  }

  entries.set(id, {
    id,
    sourceId: rec.senses?.[0]?.id ?? null,
    lemma: word,
    normalizedLemma: normalize(word),
    searchForms: [...(searchFormsFor.get(key) || new Set([normalize(word)]))].sort(),
    pos,
    senses,
    gender: genderOf(rec),
    conjugationId: undefined,
    freqRank: rankOf.get(key) ?? null,
    examples: [],
    datasetVersion: DATASET_VERSION,
    mergedFromRecords: 1,
    etymologyNumber: rec.etymology_number ?? null,
  });
});

// Mexico-first sense ordering
for (const e of entries.values()) {
  e.senses.sort((a, b) => regionRank(a.regionLabels) - regionRank(b.regionLabels));
}

// ---- conjugation join -----------------------------------------------------
console.log("Joining Jehle conjugations …");
const jehleRows = parseCsvObjects(fs.readFileSync(raw("jehle_verb_database.csv"), "utf8"));
const byVerb = new Map();
for (const r of jehleRows) {
  const inf = r.infinitive?.trim();
  if (!inf) continue;
  if (!byVerb.has(inf)) byVerb.set(inf, []);
  byVerb.get(inf).push(r);
}

/** ustedes-first ordering; vosotros retained but flagged so the UI can collapse it. */
const buildForms = (rows) => {
  const tenses = {};
  for (const r of rows) {
    const label = `${r.mood_english}/${r.tense_english}`;
    tenses[label] = {
      yo: r.form_1s, tú: r.form_2s, "él/ella/usted": r.form_3s,
      nosotros: r.form_1p,
      "ustedes/ellos": r.form_3p,
      vosotros: { form: r.form_2p, collapsed: true },
    };
  }
  const g = rows[0] || {};
  return { gerund: g.gerund, pastParticiple: g.pastparticiple, tenses };
};

const conjugations = {};
let verbsInSample = 0, verbsWithJehle = 0;
const verbsMissingJehle = [];

for (const e of entries.values()) {
  if (e.pos !== "verb") continue;
  verbsInSample++;
  const rows = byVerb.get(e.lemma);
  if (rows) {
    verbsWithJehle++;
    e.conjugationId = `conj:jehle:${e.lemma}`;
    conjugations[e.conjugationId] = buildForms(rows);
  } else {
    verbsMissingJehle.push({ lemma: e.lemma, freqRank: e.freqRank, regular: /(ar|er|ir)$/.test(e.lemma) });
  }
}

const list = [...entries.values()].sort((a, b) => (a.freqRank ?? 99999) - (b.freqRank ?? 99999));
writeJson(out("05-sample-entries.json"), { datasetVersion: DATASET_VERSION, count: list.length, entries: list });
writeJson(out("05-conjugations.json"), conjugations);

const coverage = {
  generatedAt: new Date().toISOString(),
  jehleVerbsInDatabase: byVerb.size,
  sampleEntries: list.length,
  verbsInSample,
  verbsWithJehleConjugation: verbsWithJehle,
  verbsMissingJehleConjugation: verbsMissingJehle.length,
  verbsMissingJehle,
  mexicoFlaggedEntriesIncluded: [...entries.values()].filter((e) => e.senses.some((s) => s.regionLabels.some((l) => MEXICO.test(l)))).map((e) => e.lemma),
};
writeJson(out("05-conjugation-coverage.json"), coverage);

console.log(`\nSample entries built        ${list.length}`);
console.log(`  merged from >1 record    ${list.filter((e) => e.mergedFromRecords > 1).length}`);
console.log(`  with a gender            ${list.filter((e) => e.gender).length}`);
console.log(`  Mexico-flagged senses    ${coverage.mexicoFlaggedEntriesIncluded.length}`);
console.log(`\nConjugations`);
console.log(`  Jehle database verbs     ${byVerb.size}`);
console.log(`  verbs in sample          ${verbsInSample}`);
console.log(`  matched to Jehle         ${verbsWithJehle}`);
console.log(`  NOT in Jehle             ${verbsMissingJehle.length}`);
for (const v of verbsMissingJehle.slice(0, 12)) console.log(`    ${v.lemma.padEnd(16)} rank=${v.freqRank ?? "—"}  regular-ending=${v.regular}`);
