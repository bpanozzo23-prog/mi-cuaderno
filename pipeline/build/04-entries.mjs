/**
 * Step 4 — pass 2 over the kaikki extract. Builds the real DictEntry records
 * (brief §7 shape) for the top ~10,000 lemmas, and joins Fred Jehle's conjugations.
 *
 * Applies the decisions the earlier steps settled:
 *   - records sharing word+pos+etymology MERGE into one entry (kaikki splits e.g. gallo
 *     across three records that are one dictionary entry)
 *   - Mexico-labeled senses sort first, then other Latin American, then the rest (§3)
 *   - conjugation display is ustedes-first with vosotros kept but marked collapsed (§3)
 *
 * Verbs Jehle does not cover are left with `conjugationId: null` here; step 06 fills them.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/04-entries.mjs
 * Writes: raw/_entries.json (large, gitignored), out/04-entry-stats.json
 */
import fs from "node:fs";
import path from "node:path";
import { eachRecord, eachJsonl, raw, out, writeJson, readJson, mb, step, done, PIPELINE_DIR } from "../lib/io.mjs";
import { normalize, canonicalId, lemmaKey, conjugationId } from "../lib/ids.mjs";
import { isUsablePos } from "../lib/pos.mjs";
import { parseCsvObjects } from "../lib/csv.mjs";
import {
  mostSpecificGloss,
  relatedWordsForRecord,
  relationWords,
  relationWordsExceptLemma,
  shapeSenseExamples,
  trimEtymology,
} from "../lib/dictionaryEnrichment.mjs";

const started = step("04 · build dictionary entries");

const TOP_N = 10000;
const MAX_FORMS_PER_LEMMA = 600;

const { datasetVersion } = readJson(path.join(PIPELINE_DIR, "sources.json"));

/**
 * Words the brief and the spike name explicitly, pulled in regardless of rank so the
 * acceptance checks in §12 always have something to check. Everything else earns its
 * place by frequency.
 */
const CURATED = [
  "sacar", "tener", "ir", "ser", "casa", "rápido", "año", "madrugar", "vino", "papa",
  "gallo", "bajo", "coger", "platicar", "chamba", "güey", "ahorita", "banco", "haber",
  "torta", "computadora", "cajeta", "padre", "fresa", "chido", "órale", "antojito",
];

console.log("  loading lemma ranks …");
const { ranked } = readJson(raw("_lemma-ranks.json"));
const rankOf = new Map();
for (const r of ranked) {
  const k = lemmaKey(r.lemma, r.pos);
  if (!rankOf.has(k)) rankOf.set(k, r.rank);
}

const wanted = new Set();
for (const r of ranked.slice(0, TOP_N)) wanted.add(lemmaKey(r.lemma, r.pos));
const curatedSet = new Set(CURATED);
console.log(`    top ${TOP_N.toLocaleString()} lemma keys + ${curatedSet.size} curated words`);

// ---- searchForms for the wanted lemmas ------------------------------------
// Streamed, so only the ~10k lemmas we keep ever occupy memory rather than all 114k.
console.log("  collecting searchable forms …");
const formsFor = new Map(); // "lemma|pos" -> Set(normalized form)
await eachJsonl(raw("_forms-search.jsonl"), ([form, hits]) => {
  for (const h of hits) {
    const lemma = h.slice(0, h.lastIndexOf("|"));
    if (!wanted.has(h) && !curatedSet.has(lemma)) continue;
    let set = formsFor.get(h);
    if (!set) formsFor.set(h, (set = new Set()));
    if (set.size < MAX_FORMS_PER_LEMMA) set.add(form);
  }
});
console.log(`    ${formsFor.size.toLocaleString()} lemmas have forms`);

// ---- sense shaping --------------------------------------------------------
const MEXICO = /^Mexico$/i;
/** Broad labels that INCLUDE Mexico, so a Mexican speaker would use these senses. */
const INCLUDES_MEXICO = /^(Latin-America|Central-America|North-America|Hispanic-America|Spanish-America)$/i;
/** Other Spanish-speaking countries and regions — real, but not this owner's dialect. */
const OTHER_LATAM = /^(South-America|Caribbean|Argentina|Bolivia|Chile|Colombia|Costa-Rica|Cuba|Dominican-Republic|Ecuador|El-Salvador|Guatemala|Honduras|Nicaragua|Panama|Paraguay|Peru|Puerto-Rico|Rioplatense|Uruguay|Venezuela)$/i;
const SPAIN = /^(Spain|Canary-Islands|Southern-Spain|Andalusia|Philippines|Equatorial-Guinea)$/i;

/**
 * Register and grammar labels worth showing next to a gloss. A learner needs to know
 * that güey is vulgar slang and that a verb is reflexive; the rest of kaikki's tag
 * vocabulary is inflection bookkeeping and stays out of the shipped data.
 */
const KEPT_LABELS = new Set([
  "colloquial", "slang", "vulgar", "derogatory", "offensive", "humorous", "euphemistic",
  "figuratively", "literally", "obsolete", "archaic", "dated", "historical", "poetic",
  "literary", "formal", "informal", "childish", "rare", "neologism", "euphemism",
  "transitive", "intransitive", "reflexive", "pronominal", "impersonal", "uncountable",
  "countable", "abbreviation", "initialism", "acronym",
]);

/**
 * Sense order (brief §3, "prefer Mexico-labeled senses"). The ranking that matters is the
 * one between *unmarked* and *other country*: an unlabelled sense is general Spanish and
 * is more use to this owner than a sense marked El-Salvador. Ranking every Latin American
 * label above unmarked put an obscure Salvadoran sense of *sacar* above "to take out
 * (the trash)", which is not what §3 asks for.
 */
const regionRank = (labels) => {
  if (labels.some((l) => MEXICO.test(l))) return 0;
  if (labels.some((l) => INCLUDES_MEXICO.test(l))) return 1;
  if (labels.length === 0) return 2;
  if (labels.some((l) => OTHER_LATAM.test(l))) return 3;
  return 4; // Spain-only and further afield
};

const shapeSense = (s, lemma) => {
  const all = [...(s.tags || []), ...(s.raw_tags || [])];
  const regionLabels = all.filter(
    (t) => MEXICO.test(t) || INCLUDES_MEXICO.test(t) || OTHER_LATAM.test(t) || SPAIN.test(t)
  );
  const labels = all.filter((t) => KEPT_LABELS.has(t));
  const shaped = {
    gloss: mostSpecificGloss(s.glosses),
    regionLabels: [...new Set(regionLabels)],
    labels: [...new Set(labels)],
  };
  const synonyms = relationWordsExceptLemma(s.synonyms, lemma);
  const antonyms = relationWordsExceptLemma(s.antonyms, lemma);
  const topics = relationWords(s.topics);
  const examples = shapeSenseExamples(s.examples, lemma);
  if (synonyms.length) shaped.synonyms = synonyms;
  if (antonyms.length) shaped.antonyms = antonyms;
  if (topics.length) shaped.topics = topics;
  if (examples.length) shaped.examples = examples;
  return shaped;
};

const mergeOptionalWords = (target, field, incoming) => {
  const merged = relationWords([...(target[field] || []), ...incoming]);
  if (merged.length) target[field] = merged;
  else delete target[field];
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

const isInflectionSense = (s) => s.form_of || s.alt_of || (s.tags || []).includes("form-of");
const isInflectionOnly = (rec) => {
  const senses = rec.senses || [];
  return senses.length > 0 && senses.every(isInflectionSense);
};

// ---- pass over kaikki -----------------------------------------------------
console.log("  scanning kaikki for entries …");
const entries = new Map(); // canonicalId -> DictEntry

await eachRecord(
  raw("kaikki-Spanish.jsonl.gz"),
  (rec) => {
    const { word, pos } = rec;
    if (!word || !pos || !isUsablePos(pos) || isInflectionOnly(rec)) return;

    const key = lemmaKey(word, pos);
    if (!wanted.has(key) && !curatedSet.has(word)) return;

    const sourceSenses = (rec.senses || []).filter((s) => !isInflectionSense(s));
    const senses = sourceSenses.map((sense) => shapeSense(sense, word)).filter((sense) => sense.gloss);
    if (!senses.length) return;

    const etymology = trimEtymology(rec.etymology_text);
    const synonyms = relationWordsExceptLemma(rec.synonyms, word);
    const antonyms = relationWordsExceptLemma(rec.antonyms, word);
    const relatedWords = relatedWordsForRecord(rec, sourceSenses);

    const id = canonicalId(word, pos, rec.etymology_number ?? null);
    const existing = entries.get(id);
    if (existing) {
      existing.senses.push(...senses);
      existing.mergedFromRecords++;
      if (!existing.gender) existing.gender = genderOf(rec);
      if (!existing.etymology && etymology) existing.etymology = etymology;
      mergeOptionalWords(existing, "synonyms", synonyms);
      mergeOptionalWords(existing, "antonyms", antonyms);
      mergeOptionalWords(existing, "relatedWords", relatedWords);
      return;
    }

    entries.set(id, {
      id,
      sourceId: rec.senses?.find((s) => s.id)?.id ?? null,
      lemma: word,
      normalizedLemma: normalize(word),
      pos,
      senses,
      gender: genderOf(rec),
      conjugationId: null,
      freqRank: rankOf.get(key) ?? null,
      examples: [],
      datasetVersion,
      etymologyNumber: rec.etymology_number ?? null,
      mergedFromRecords: 1,
      searchForms: [...(formsFor.get(key) || new Set([normalize(word)]))].sort(),
      ...(etymology ? { etymology } : {}),
      ...(synonyms.length ? { synonyms } : {}),
      ...(antonyms.length ? { antonyms } : {}),
      ...(relatedWords.length ? { relatedWords } : {}),
    });
  },
  { progressEvery: 100000, label: "kaikki " }
);

// Mexico-first sense ordering (brief §3), stable within each region band.
for (const e of entries.values()) {
  e.senses = e.senses.map((s, i) => ({ ...s, _i: i }));
  e.senses.sort((a, b) => regionRank(a.regionLabels) - regionRank(b.regionLabels) || a._i - b._i);
  for (const s of e.senses) delete s._i;
}

// ---- Jehle conjugations ---------------------------------------------------
console.log("  joining Jehle conjugations …");
const jehleRows = parseCsvObjects(fs.readFileSync(raw("jehle_verb_database.csv"), "utf8"));
const byVerb = new Map();
for (const r of jehleRows) {
  const inf = r.infinitive?.trim();
  if (!inf) continue;
  if (!byVerb.has(inf)) byVerb.set(inf, []);
  byVerb.get(inf).push(r);
}

/** ustedes-first ordering; vosotros retained but flagged so the UI can collapse it. */
const buildJehleForms = (rows) => {
  const tenses = {};
  for (const r of rows) {
    const label = `${r.mood_english}/${r.tense_english}`;
    tenses[label] = {
      yo: r.form_1s,
      tú: r.form_2s,
      "él/ella/usted": r.form_3s,
      nosotros: r.form_1p,
      "ustedes/ellos": r.form_3p,
      vosotros: { form: r.form_2p, collapsed: true },
    };
  }
  const g = rows[0] || {};
  return { source: "jehle", gerund: g.gerund, pastParticiple: g.pastparticiple, tenses };
};

const conjugations = {};
let verbs = 0, verbsWithJehle = 0;
const verbsMissingJehle = [];

for (const e of entries.values()) {
  if (e.pos !== "verb") continue;
  verbs++;
  const rows = byVerb.get(e.lemma);
  if (rows) {
    verbsWithJehle++;
    e.conjugationId = conjugationId("jehle", e.lemma);
    conjugations[e.conjugationId] = buildJehleForms(rows);
  } else {
    verbsMissingJehle.push({ lemma: e.lemma, freqRank: e.freqRank });
  }
}
verbsMissingJehle.sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9));

const list = [...entries.values()].sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9));
writeJson(raw("_entries.json"), { datasetVersion, count: list.length, entries: list });
writeJson(raw("_conjugations.json"), conjugations);

const posCounts = {};
for (const e of list) posCounts[e.pos] = (posCounts[e.pos] || 0) + 1;
const senseTotal = list.reduce((n, e) => n + e.senses.length, 0);

const stats = {
  generatedAt: new Date().toISOString(),
  datasetVersion,
  topN: TOP_N,
  curatedWords: CURATED,
  entries: list.length,
  entriesMergedFromMultipleRecords: list.filter((e) => e.mergedFromRecords > 1).length,
  entriesWithGender: list.filter((e) => e.gender).length,
  entriesOutsideTopN: list.filter((e) => (e.freqRank ?? 1e9) > TOP_N).length,
  senses: senseTotal,
  sensesPerEntry: +(senseTotal / list.length).toFixed(2),
  maxSensesOnOneEntry: Math.max(...list.map((e) => e.senses.length)),
  entriesWithMexicoSense: list.filter((e) => e.senses.some((s) => s.regionLabels.some((l) => MEXICO.test(l)))).length,
  entriesWithEtymology: list.filter((e) => e.etymology).length,
  entriesWithEntryRelations: list.filter((e) => e.synonyms?.length || e.antonyms?.length).length,
  entriesWithRelatedWords: list.filter((e) => e.relatedWords?.length).length,
  sensesWithRelations: list.reduce((n, e) => n + e.senses.filter((s) => s.synonyms?.length || s.antonyms?.length).length, 0),
  sensesWithTopics: list.reduce((n, e) => n + e.senses.filter((s) => s.topics?.length).length, 0),
  senseExamples: list.reduce((n, e) => n + e.senses.reduce((total, s) => total + (s.examples?.length || 0), 0), 0),
  posCounts,
  verbs,
  verbsWithJehleConjugation: verbsWithJehle,
  verbsMissingJehleConjugation: verbsMissingJehle.length,
  mostFrequentVerbsMissingJehle: verbsMissingJehle.slice(0, 40),
  entriesFileBytes: fs.statSync(raw("_entries.json")).size,
};
writeJson(out("04-entry-stats.json"), stats);

console.log(`\n  entries built          ${list.length.toLocaleString()}  (${stats.entriesMergedFromMultipleRecords} merged from >1 record)`);
console.log(`    senses               ${senseTotal.toLocaleString()}  (${stats.sensesPerEntry} per entry, max ${stats.maxSensesOnOneEntry})`);
console.log(`    with gender          ${stats.entriesWithGender.toLocaleString()}`);
console.log(`    with a Mexico sense  ${stats.entriesWithMexicoSense.toLocaleString()}`);
console.log(`    with etymology       ${stats.entriesWithEtymology.toLocaleString()}`);
console.log(`    with sense relations ${stats.sensesWithRelations.toLocaleString()}`);
console.log(`    with topics          ${stats.sensesWithTopics.toLocaleString()}`);
console.log(`    sense examples       ${stats.senseExamples.toLocaleString()}`);
console.log(`    with related words   ${stats.entriesWithRelatedWords.toLocaleString()}`);
console.log(`  conjugations`);
console.log(`    verbs in dictionary  ${verbs.toLocaleString()}`);
console.log(`    matched to Jehle     ${verbsWithJehle.toLocaleString()}`);
console.log(`    NOT in Jehle         ${verbsMissingJehle.length.toLocaleString()}   ← step 06 fills these`);
console.log(`      most frequent: ${verbsMissingJehle.slice(0, 10).map((v) => `${v.lemma}(${v.freqRank})`).join(", ")}`);
console.log(`  intermediate size      ${mb(stats.entriesFileBytes)}`);
done(started);
