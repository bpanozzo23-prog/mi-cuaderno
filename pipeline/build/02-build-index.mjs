/**
 * Step 2 — pass 1 over the kaikki extract. Builds the form → lemma indexes.
 *
 * The 1 GB source is mostly inflections, not words: ~690k of its ~807k records are
 * inflected-form stubs pointing back at a lemma. That is a gift — the form → lemma index
 * brief §8 rank 3 needs ("fui" → ir, ser) is already in the data, from two complementary
 * places that must BOTH be read: `forms[]` on lemma records, and the stubs' `form_of`.
 *
 * Two indexes come out, and they are not interchangeable (spike finding, DECISIONS.md):
 *   _forms-search.jsonl  normalized (accent-insensitive) — what the app searches
 *   _forms-exact.jsonl   accent-sensitive, plus citation-form hits — what frequency uses
 * Sharing one index let the frequent adverb "así" credit its corpus count to the rare
 * verb "asir", ranking junk into the top 10k.
 *
 * Written as JSONL rather than one JSON object: at ~1.2M rows, a single object would have
 * to be parsed in full before the next script could make one lookup.
 *
 * Run: node pipeline/build/02-build-index.mjs
 * Writes: raw/_forms-search.jsonl, raw/_forms-exact.jsonl (large, gitignored),
 *         out/02-index-stats.json
 */
import { eachRecord, raw, out, writeJson, openJsonl, mb, step, done } from "../lib/io.mjs";
import { normalize, canonicalId, lemmaKey } from "../lib/ids.mjs";
import { isUsablePos } from "../lib/pos.mjs";

const started = step("02 · build form → lemma index");

const searchIndex = new Map();   // normalized form -> Set("lemma|pos")   — SEARCH
const exactIndex = new Map();    // exact form      -> Set("lemma|pos")   — FREQUENCY
const citationForms = new Map(); // exact lemma spelling -> Set("lemma|pos")
const lemmaIds = new Map();      // canonicalId -> { word, pos, etym, recordCount, senseCount }
const posByLemma = new Map();
const posCounts = new Map();

let total = 0, lemmaRecords = 0, inflectionRecords = 0, skippedPos = 0;
let formsHarvested = 0, formOfHarvested = 0;
const merges = [];

/**
 * A handful of kaikki form_of targets hold prose instead of a lemma, e.g.
 * "deprecated in 1952 by the Royal Spanish Academy". The filter is deliberately narrow:
 * multiword targets are legitimate here (idioms like "dar atole con el dedo" are
 * first-class lexical items per brief §1), so only this pattern is rejected.
 */
const PROSE_TARGET = /^deprecated in \d{4}/i;

/**
 * kaikki's forms[] also carries conjugation-table metadata rather than word forms:
 * the template name ("es-conj", tagged inflection-template), the verb class
 * ("e-ie alternation", tagged class), and table headers. These would otherwise become
 * searchable "words". `error-unrecognized-form` marks cells wiktextract could not parse.
 * Reflexive and clitic-combined forms ("me voy", "dímelo") are NOT filtered — they are
 * real Spanish and searching them should work.
 */
const NON_FORM_TAGS = ["inflection-template", "class", "table-tags", "error-unrecognized-form"];

const addForm = (form, lemma, pos) => {
  if (PROSE_TARGET.test(lemma)) return false;
  const n = normalize(form);
  if (!n || n.length > 60) return false;
  const key = lemmaKey(lemma, pos);

  if (!searchIndex.has(n)) searchIndex.set(n, new Set());
  searchIndex.get(n).add(key);

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

await eachRecord(
  raw("kaikki-Spanish.jsonl.gz"),
  (rec) => {
    total++;
    const { word, pos } = rec;
    if (!word || !pos) return;
    if (!isUsablePos(pos)) {
      skippedPos++;
      return;
    }
    posCounts.set(pos, (posCounts.get(pos) || 0) + 1);

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
    const existing = lemmaIds.get(id);
    if (existing) {
      // Same word + pos + etymology: kaikki split one dictionary entry across several
      // records (separate sense clusters, e.g. gallo = rooster / a fish / guy). These
      // MERGE into one entry in step 04 rather than becoming distinct IDs.
      existing.recordCount++;
      existing.senseCount += (rec.senses || []).length;
      if (merges.length < 25) merges.push({ id, word, pos });
    } else {
      lemmaIds.set(id, {
        word,
        pos,
        etym: rec.etymology_number ?? null,
        recordCount: 1,
        senseCount: (rec.senses || []).length,
      });
    }

    if (!posByLemma.has(word)) posByLemma.set(word, new Set());
    posByLemma.get(word).add(pos);

    // the lemma is a searchable form of itself, and is its own citation form
    addForm(word, word, pos);
    const citation = String(word).normalize("NFC");
    if (!citationForms.has(citation)) citationForms.set(citation, new Set());
    citationForms.get(citation).add(lemmaKey(word, pos));

    for (const f of rec.forms || []) {
      if (!f.form || f.form === "-") continue;
      if (NON_FORM_TAGS.some((t) => (f.tags || []).includes(t))) continue;
      if (addForm(f.form, word, pos)) formsHarvested++;
    }
  },
  { progressEvery: 100000, label: "kaikki " }
);

// ---- write the indexes ----------------------------------------------------
/**
 * The lemma inventory: every "lemma|pos" that has a real lemma record behind it.
 * Inflection stubs sometimes name a target that has no record of its own — "your"
 * arrives that way — and such a key can never become an entry, so step 03 must not
 * spend one of the top 10,000 slots ranking it.
 */
const realLemmaKeys = new Set();
for (const e of lemmaIds.values()) realLemmaKeys.add(lemmaKey(e.word, e.pos));
writeJson(raw("_lemma-keys.json"), [...realLemmaKeys].sort());

const searchOut = openJsonl(raw("_forms-search.jsonl"));
for (const [form, hits] of searchIndex) searchOut.write([form, [...hits]]);
const searchFile = await searchOut.close();

const exactOut = openJsonl(raw("_forms-exact.jsonl"));
for (const [form, hits] of exactIndex) {
  const cites = citationForms.get(form);
  exactOut.write([form, [...hits], cites ? [...cites] : []]);
}
const exactFile = await exactOut.close();

const stats = {
  generatedAt: new Date().toISOString(),
  totalRecords: total,
  recordsSkippedForPos: skippedPos,
  lemmaRecords,
  inflectionRecords,
  distinctNormalizedForms: searchIndex.size,
  distinctExactForms: exactIndex.size,
  distinctCitationForms: citationForms.size,
  formsHarvestedFromFormsArray: formsHarvested,
  formsHarvestedFromFormOfRecords: formOfHarvested,
  canonicalIds: lemmaIds.size,
  realLemmaKeys: realLemmaKeys.size,
  recordsThatMergeIntoAnExistingId: [...lemmaIds.values()].reduce((n, e) => n + e.recordCount - 1, 0),
  entriesBuiltFromMultipleRecords: [...lemmaIds.values()].filter((e) => e.recordCount > 1).length,
  mergeExamples: merges,
  multiPosLemmas: [...posByLemma.values()].filter((s) => s.size > 1).length,
  posCounts: Object.fromEntries([...posCounts.entries()].sort((a, b) => b[1] - a[1])),
  files: { search: searchFile, exact: exactFile },
};
writeJson(out("02-index-stats.json"), stats);

console.log(`  records scanned        ${total.toLocaleString()}`);
console.log(`    lemma records        ${lemmaRecords.toLocaleString()}`);
console.log(`    inflection stubs     ${inflectionRecords.toLocaleString()}`);
console.log(`    skipped (pos)        ${skippedPos.toLocaleString()}`);
console.log(`  distinct forms         ${searchIndex.size.toLocaleString()} normalized · ${exactIndex.size.toLocaleString()} exact`);
console.log(`    from forms[]         ${formsHarvested.toLocaleString()}`);
console.log(`    from form_of stubs   ${formOfHarvested.toLocaleString()}`);
console.log(`  canonical ids          ${lemmaIds.size.toLocaleString()}  (${stats.entriesBuiltFromMultipleRecords} built from >1 record)`);
console.log(`  index files            ${mb(searchFile.bytes)} + ${mb(exactFile.bytes)}`);
done(started);
