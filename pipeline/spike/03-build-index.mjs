/**
 * Pass 1 over the kaikki extract. Produces three things:
 *
 *  1. The form -> lemma index (brief section 8, rank 3), built from BOTH sources kaikki offers:
 *     the `forms[]` array on lemma records, and the standalone inflection records whose
 *     senses carry `form_of`. Either alone is incomplete.
 *  2. The lemma inventory: which (word, pos, etymology_number) records are real lemmas
 *     rather than pure inflection stubs.
 *  3. A canonical-ID uniqueness check (brief section 6) across the whole dataset.
 *
 * Run: node pipeline/spike/03-build-index.mjs
 * Writes: raw/_form-index.json (large, gitignored), out/03-index-stats.json
 */
import { eachRecord, raw, out, writeJson, mb } from "./lib/io.mjs";
import { normalize, canonicalId } from "./lib/normalize.mjs";
import fs from "node:fs";

const formIndex = new Map();   // normalized form -> Set("lemma|pos")   — for SEARCH (accent-insensitive)
const exactIndex = new Map();  // exact surface form -> Set("lemma|pos") — for FREQUENCY (accent-sensitive)
const citationForms = new Map(); // exact lemma spelling -> Set("lemma|pos")
const lemmaKeys = new Map();   // canonicalId -> { word, pos, etym, senseCount }
const collisions = [];
const posByLemma = new Map();  // word -> Set(pos)

let total = 0, lemmaRecords = 0, inflectionRecords = 0, formsHarvested = 0, formOfHarvested = 0;

/**
 * A handful of kaikki form_of targets hold prose instead of a lemma, e.g.
 * "deprecated in 1952 by the Royal Spanish Academy". The filter is deliberately narrow:
 * multiword targets are legitimate here (idioms like "dar atole con el dedo" are
 * first-class lexical items per brief section 1), so only this pattern is rejected.
 */
const PROSE_TARGET = /^deprecated in \d{4}/i;

/**
 * kaikki's forms[] also carries conjugation-table metadata rather than word forms:
 * the template name ("es-conj", tagged inflection-template), the verb class
 * ("e-ie alternation", tagged class), and table headers. These would otherwise become
 * searchable "words". Reflexive forms like "me voy" are NOT filtered — they are real.
 */
const NON_FORM_TAGS = ["inflection-template", "class", "table-tags"];

const addForm = (form, lemma, pos) => {
  if (PROSE_TARGET.test(lemma)) return false;
  const n = normalize(form);
  if (!n || n.length > 60) return false;
  const key = `${lemma}|${pos}`;

  if (!formIndex.has(n)) formIndex.set(n, new Set());
  formIndex.get(n).add(key);

  // Accent-sensitive index. Frequency aggregation must NOT use the normalized index:
  // "así" (adverb, very frequent) and "así" (a form of asir) both normalize to "asi",
  // which credits the rare verb with the adverb's corpus count.
  const exact = String(form).normalize("NFC");
  if (!exactIndex.has(exact)) exactIndex.set(exact, new Set());
  exactIndex.get(exact).add(key);
  return true;
};

/** A record is an inflection stub if every sense is a form-of / alt-of pointer. */
const isInflectionOnly = (rec) => {
  const senses = rec.senses || [];
  if (!senses.length) return false;
  return senses.every((s) => s.form_of || s.alt_of || (s.tags || []).includes("form-of"));
};

await eachRecord(raw("kaikki-Spanish.jsonl.gz"), (rec) => {
  total++;
  const { word, pos } = rec;
  if (!word || !pos) return;

  if (isInflectionOnly(rec)) {
    inflectionRecords++;
    for (const s of rec.senses || []) {
      for (const fo of [...(s.form_of || []), ...(s.alt_of || [])]) {
        if (fo?.word && addForm(word, fo.word, pos)) formOfHarvested++;
      }
    }
    return;
  }

  lemmaRecords++;
  const id = canonicalId(word, pos, rec.etymology_number ?? null);
  if (lemmaKeys.has(id)) {
    // Same word + pos + etymology: kaikki split one dictionary entry across several
    // records (separate sense clusters). These MERGE into one DictEntry rather than
    // becoming distinct IDs — see out/03-index-stats.json and the spike report.
    const e = lemmaKeys.get(id);
    e.recordCount++;
    e.senseCount += (rec.senses || []).length;
    collisions.push({ id, word, pos, etymology_number: rec.etymology_number ?? null });
  } else {
    lemmaKeys.set(id, { word, pos, etym: rec.etymology_number ?? null, recordCount: 1, senseCount: (rec.senses || []).length });
  }

  if (!posByLemma.has(word)) posByLemma.set(word, new Set());
  posByLemma.get(word).add(pos);

  // the lemma is a searchable form of itself, and its own citation form
  addForm(word, word, pos);
  const citation = String(word).normalize("NFC");
  if (!citationForms.has(citation)) citationForms.set(citation, new Set());
  citationForms.get(citation).add(`${word}|${pos}`);
  for (const f of rec.forms || []) {
    if (f.form && f.form !== "-" && !NON_FORM_TAGS.some((t) => (f.tags || []).includes(t))) {
      if (addForm(f.form, word, pos)) formsHarvested++;
    }
  }
});

// serialize: Map<string, Set> -> plain object of arrays
const toObj = (m) => { const o = {}; for (const [k, v] of m) o[k] = [...v]; return o; };
const indexPath = raw("_form-index.json");
writeJson(indexPath, toObj(formIndex));
writeJson(raw("_form-index-exact.json"), toObj(exactIndex));
writeJson(raw("_citation-forms.json"), toObj(citationForms));

const stats = {
  generatedAt: new Date().toISOString(),
  totalRecords: total,
  lemmaRecords,
  inflectionRecords,
  distinctNormalizedForms: formIndex.size,
  distinctExactForms: exactIndex.size,
  distinctCitationForms: citationForms.size,
  formsHarvestedFromFormsArray: formsHarvested,
  formsHarvestedFromFormOfRecords: formOfHarvested,
  canonicalIds: lemmaKeys.size,
  recordsThatMergeIntoAnExistingId: collisions.length,
  entriesBuiltFromMultipleRecords: [...lemmaKeys.values()].filter((e) => e.recordCount > 1).length,
  mergeExamples: collisions.slice(0, 25),
  multiPosLemmas: [...posByLemma.values()].filter((s) => s.size > 1).length,
  indexFileBytes: fs.statSync(indexPath).size,
};

writeJson(out("03-index-stats.json"), stats);

console.log(`Records scanned          ${total.toLocaleString()}`);
console.log(`  lemma records          ${lemmaRecords.toLocaleString()}`);
console.log(`  inflection-only stubs  ${inflectionRecords.toLocaleString()}`);
console.log(`\nForm index`);
console.log(`  distinct forms         ${formIndex.size.toLocaleString()}`);
console.log(`  from forms[]           ${formsHarvested.toLocaleString()}`);
console.log(`  from form_of records   ${formOfHarvested.toLocaleString()}`);
console.log(`  file size              ${mb(stats.indexFileBytes)}`);
console.log(`\nCanonical IDs (section 6)`);
console.log(`  unique ids             ${lemmaKeys.size.toLocaleString()}`);
console.log(`  records that merge     ${collisions.length.toLocaleString()}  (same word+pos+etymology, split by kaikki)`);
console.log(`  entries from >1 record ${stats.entriesBuiltFromMultipleRecords.toLocaleString()}`);
if (collisions.length) {
  console.log(`  merge examples:`);
  for (const c of collisions.slice(0, 8)) console.log(`    ${c.id}`);
}
console.log(`  lemmas with >1 pos     ${stats.multiPosLemmas.toLocaleString()}`);
