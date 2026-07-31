/**
 * Step 5 — attach up to 3 Tatoeba es↔en example pairs to every entry.
 *
 * Brief §4 requires per-example attribution, not a general thank-you: every example
 * carries its Tatoeba sentence ID, contributor, license and URL — on BOTH sides of the
 * pair, because each side is a separate contribution by a separate person. A candidate
 * without a resolvable English translation is dropped rather than shipped unattributable.
 *
 * Selection is scored rather than "shortest wins" (the spike's rule): a good example
 * shows the word in its citation form, in a sentence long enough to carry context but
 * short enough to read on a phone.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/05-examples.mjs
 * Writes: raw/_entries-with-examples.json, out/05-example-coverage.json
 */
import { eachLine, raw, out, writeJson, readJson, mb, step, done } from "../lib/io.mjs";
import { normalize } from "../lib/ids.mjs";
import fs from "node:fs";

const started = step("05 · join Tatoeba examples");

const MAX_EXAMPLES = 3;
const CANDIDATES_PER_ENTRY = 20;
const MAX_SENTENCE_CHARS = 110;
const IDEAL_CHARS = 45;
const LICENSE = "CC BY 2.0 FR";
const url = (id) => `https://tatoeba.org/en/sentences/show/${id}`;

const sample = readJson(raw("_entries.json"));
const entries = sample.entries;

// form -> entry ids that would accept a sentence containing that form
const formToEntries = new Map();
const lemmaById = new Map();
for (const e of entries) {
  lemmaById.set(e.id, e.normalizedLemma);
  for (const f of e.searchForms) {
    let set = formToEntries.get(f);
    if (!set) formToEntries.set(f, (set = new Set()));
    set.add(e.id);
  }
}
console.log(`  ${entries.length.toLocaleString()} entries · ${formToEntries.size.toLocaleString()} distinct forms to match`);

// ---- pass 1: candidate Spanish sentences ----------------------------------
const candidates = new Map(); // entryId -> [{id, text, user, hasLemma}]
const spaWanted = new Set();
const tokenize = (text) => text.toLowerCase().split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);

console.log("  scanning Spanish sentences …");
let spaSeen = 0;
await eachLine(
  raw("spa_sentences_detailed.tsv.bz2"),
  (line) => {
    const [id, , text, username] = line.split("\t");
    if (!text) return;
    spaSeen++;
    if (text.length > MAX_SENTENCE_CHARS) return;

    const tokens = new Set(tokenize(text).map(normalize));
    const hits = new Set();
    for (const tok of tokens) {
      const ids = formToEntries.get(tok);
      if (ids) for (const eid of ids) hits.add(eid);
    }
    if (!hits.size) return;

    let used = false;
    const user = username && username !== "\\N" ? username : null;
    for (const eid of hits) {
      let list = candidates.get(eid);
      if (!list) candidates.set(eid, (list = []));
      if (list.length >= CANDIDATES_PER_ENTRY) continue;
      list.push({ id, text, user, hasLemma: tokens.has(lemmaById.get(eid)) });
      used = true;
    }
    if (used) spaWanted.add(id);
  },
  { progressEvery: 200000, label: "tatoeba-es " }
);
console.log(`    ${spaSeen.toLocaleString()} scanned, ${spaWanted.size.toLocaleString()} kept as candidates`);

// ---- pass 2: es → en links for candidates ---------------------------------
console.log("  loading es↔en links …");
const spaToEng = new Map();
const engWanted = new Set();
await eachLine(raw("spa-eng_links.tsv.bz2"), (line) => {
  const [s, e] = line.split("\t");
  if (!spaWanted.has(s)) return;
  let list = spaToEng.get(s);
  if (!list) spaToEng.set(s, (list = []));
  list.push(e);
  engWanted.add(e);
});
console.log(`    ${spaToEng.size.toLocaleString()} candidates have an English translation`);

// ---- pass 3: English texts ------------------------------------------------
console.log("  scanning English sentences …");
const engById = new Map();
await eachLine(
  raw("eng_sentences_detailed.tsv.bz2"),
  (line) => {
    const [id, , text, username] = line.split("\t");
    if (!engWanted.has(id)) return;
    engById.set(id, { text, user: username && username !== "\\N" ? username : null });
  },
  { progressEvery: 500000, label: "tatoeba-en " }
);
console.log(`    ${engById.size.toLocaleString()} translations resolved`);

// ---- attach ---------------------------------------------------------------
/**
 * A sentence showing the word in its dictionary form teaches more than one showing an
 * obscure inflection, and a sentence near IDEAL_CHARS reads better on a phone than either
 * a two-word fragment or a wall of text.
 */
const scoreOf = (c) => (c.hasLemma ? 1000 : 0) - Math.abs(c.text.length - IDEAL_CHARS);

let withExamples = 0, totalExamples = 0, withLemmaForm = 0;
for (const e of entries) {
  const list = (candidates.get(e.id) || []).slice().sort((a, b) => scoreOf(b) - scoreOf(a));
  const picked = [];
  for (const c of list) {
    if (picked.length >= MAX_EXAMPLES) break;
    const engId = (spaToEng.get(c.id) || []).find((i) => engById.has(i));
    if (!engId) continue; // §4: only pairs we can attribute on both sides
    const en = engById.get(engId);
    if (c.hasLemma) withLemmaForm++;
    picked.push({
      es: c.text,
      en: en.text,
      sourceId: `tatoeba:${c.id}`,
      contributor: c.user,
      license: LICENSE,
      sourceUrl: url(c.id),
      englishSourceId: `tatoeba:${engId}`,
      englishContributor: en.user,
      englishSourceUrl: url(engId),
    });
  }
  e.examples = picked;
  if (picked.length) withExamples++;
  totalExamples += picked.length;
}

writeJson(raw("_entries-with-examples.json"), { datasetVersion: sample.datasetVersion, count: entries.length, entries });

const missing = entries.filter((e) => !e.examples.length);
const coverage = {
  generatedAt: new Date().toISOString(),
  entries: entries.length,
  entriesWithAtLeastOneExample: withExamples,
  coveragePct: +((withExamples / entries.length) * 100).toFixed(1),
  totalExamplesAttached: totalExamples,
  examplesShowingTheCitationForm: withLemmaForm,
  examplesMissingContributor: entries.flatMap((e) => e.examples).filter((x) => !x.contributor).length,
  examplesMissingSourceId: entries.flatMap((e) => e.examples).filter((x) => !x.sourceId || !x.englishSourceId).length,
  entriesWithoutExamplesCount: missing.length,
  entriesWithoutExamplesSample: missing.slice(0, 40).map((e) => `${e.lemma} (${e.pos}) rank=${e.freqRank ?? "—"}`),
  mostFrequentEntryWithoutExample: missing.length
    ? missing.reduce((a, b) => ((a.freqRank ?? 1e9) <= (b.freqRank ?? 1e9) ? a : b)).lemma
    : null,
};
writeJson(out("05-example-coverage.json"), coverage);

console.log(`\n  entries with ≥1 example  ${withExamples.toLocaleString()}/${entries.length.toLocaleString()} (${coverage.coveragePct}%)`);
console.log(`  examples attached        ${totalExamples.toLocaleString()}`);
console.log(`    showing citation form  ${withLemmaForm.toLocaleString()}`);
console.log(`    missing contributor    ${coverage.examplesMissingContributor.toLocaleString()} (name absent upstream; ID + license still recorded)`);
console.log(`    missing a source id    ${coverage.examplesMissingSourceId} ← must be 0`);
console.log(`  intermediate size        ${mb(fs.statSync(raw("_entries-with-examples.json")).size)}`);
done(started);
