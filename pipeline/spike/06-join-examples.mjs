/**
 * Attaches up to 3 Tatoeba es-en example pairs to each sample entry, carrying the full
 * per-example attribution brief section 4 requires: sentence ID, contributor, license,
 * and source URL — on BOTH sides of the pair, since each side has its own contributor.
 *
 * Run: node pipeline/spike/06-join-examples.mjs
 * Writes: out/06-sample-entries-with-examples.json, out/06-example-coverage.json
 */
import { eachLine, raw, out, writeJson, readJson } from "./lib/io.mjs";
import { normalize } from "./lib/normalize.mjs";

const MAX_EXAMPLES = 3;
const CANDIDATES_PER_ENTRY = 12;
const LICENSE = "CC BY 2.0 FR";
const url = (id) => `https://tatoeba.org/en/sentences/show/${id}`;

const sample = readJson(out("05-sample-entries.json"));
const entries = sample.entries;

// form -> entry ids that would accept a sentence containing that form
const formToEntries = new Map();
for (const e of entries) {
  for (const f of e.searchForms) {
    if (!formToEntries.has(f)) formToEntries.set(f, new Set());
    formToEntries.get(f).add(e.id);
  }
}
console.log(`${entries.length} entries, ${formToEntries.size.toLocaleString()} distinct forms to match`);

// ---- pass 1: candidate Spanish sentences ----------------------------------
const candidates = new Map();   // entryId -> [{id, text, user}]
const spaWanted = new Map();    // spaSentenceId -> {text, user}
const tokenize = (text) => text.toLowerCase().split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);

console.log("Scanning Spanish sentences …");
let spaSeen = 0;
await eachLine(raw("spa_sentences_detailed.tsv.bz2"), (line) => {
  const [id, , text, username] = line.split("\t");
  if (!text) return;
  spaSeen++;
  if (text.length > 90) return;                 // short sentences make better examples
  const hits = new Set();
  for (const tok of tokenize(text)) {
    const ids = formToEntries.get(normalize(tok));
    if (ids) for (const eid of ids) hits.add(eid);
  }
  if (!hits.size) return;
  let used = false;
  for (const eid of hits) {
    const list = candidates.get(eid) || [];
    if (list.length >= CANDIDATES_PER_ENTRY) continue;
    list.push({ id, text, user: username && username !== "\\N" ? username : null });
    candidates.set(eid, list);
    used = true;
  }
  if (used) spaWanted.set(id, true);
});
console.log(`  ${spaSeen.toLocaleString()} Spanish sentences scanned, ${spaWanted.size.toLocaleString()} kept as candidates`);

// ---- pass 2: es -> en links for candidates --------------------------------
console.log("Loading es-en links …");
const spaToEng = new Map();
const engWanted = new Set();
await eachLine(raw("spa-eng_links.tsv.bz2"), (line) => {
  const [s, e] = line.split("\t");
  if (!spaWanted.has(s)) return;
  if (!spaToEng.has(s)) spaToEng.set(s, []);
  spaToEng.get(s).push(e);
  engWanted.add(e);
});
console.log(`  ${spaToEng.size.toLocaleString()} candidate sentences have an English translation`);

// ---- pass 3: English texts ------------------------------------------------
console.log("Scanning English sentences …");
const engById = new Map();
await eachLine(raw("eng_sentences_detailed.tsv.bz2"), (line) => {
  const [id, , text, username] = line.split("\t");
  if (!engWanted.has(id)) return;
  engById.set(id, { text, user: username && username !== "\\N" ? username : null });
});
console.log(`  ${engById.size.toLocaleString()} English translations resolved`);

// ---- attach ---------------------------------------------------------------
let withExamples = 0, totalExamples = 0;
for (const e of entries) {
  const list = (candidates.get(e.id) || []).sort((a, b) => a.text.length - b.text.length);
  const picked = [];
  for (const c of list) {
    if (picked.length >= MAX_EXAMPLES) break;
    const engIds = spaToEng.get(c.id) || [];
    const engId = engIds.find((i) => engById.has(i));
    if (!engId) continue;                        // section 4: only pairs we can attribute
    const en = engById.get(engId);
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

writeJson(out("06-sample-entries-with-examples.json"), { datasetVersion: sample.datasetVersion, count: entries.length, entries });

const coverage = {
  generatedAt: new Date().toISOString(),
  entries: entries.length,
  entriesWithAtLeastOneExample: withExamples,
  coveragePct: +((withExamples / entries.length) * 100).toFixed(1),
  totalExamplesAttached: totalExamples,
  entriesWithoutExamples: entries.filter((e) => !e.examples.length).map((e) => `${e.lemma} (${e.pos})`),
  examplesMissingContributor: entries.flatMap((e) => e.examples).filter((x) => !x.contributor).length,
};
writeJson(out("06-example-coverage.json"), coverage);

console.log(`\nEXAMPLES`);
console.log(`  entries with >=1 example  ${withExamples}/${entries.length} (${coverage.coveragePct}%)`);
console.log(`  total examples attached   ${totalExamples}`);
console.log(`  examples with no named contributor ${coverage.examplesMissingContributor}`);
if (coverage.entriesWithoutExamples.length) {
  console.log(`  entries with none: ${coverage.entriesWithoutExamples.slice(0, 12).join(", ")}${coverage.entriesWithoutExamples.length > 12 ? " …" : ""}`);
}
