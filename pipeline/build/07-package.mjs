/**
 * Step 7 — package the built dictionary into the chunk files the app downloads (§11).
 *
 * Output lands in public/dict/<datasetVersion>/ and is deployed with the app. The app
 * never reads these files directly at search time: it downloads them once, verifies each
 * chunk's sha256, unpacks them into IndexedDB, and searches there. That is what makes the
 * dictionary work offline and what makes a version swap atomic.
 *
 * Four shipped stores:
 *   entries        one row per dictionary entry
 *   conjugations   one row per verb table
 *   formShards     form → entry ids, sharded by first two letters (brief §8 tier 3)
 *   englishShards  english gloss word → entry ids (brief §8 tier 4, "take out" → sacar)
 *
 * The indexes are SHARDED rather than stored one row per form because IndexedDB writes
 * dominate install time: ~700 shard rows land in seconds where 223,000 individual rows
 * take minutes, and a lookup still reads exactly one small row.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/07-package.mjs
 * Writes: public/dict/<version>/chunk-NNN.json, public/dict/manifest.json,
 *         out/07-package-report.json
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { raw, out, repo, readJson, writeJson, gzipSize, mb, kb, step, done, PIPELINE_DIR } from "../lib/io.mjs";
import { normalize } from "../lib/ids.mjs";
import { CORE_50 } from "../../src/lib/conjugationGym.js";

const started = step("07 · package for delivery");

/** Chunk budget in RAW bytes. Gzip over the wire takes each to roughly a fifth of this. */
const CHUNK_RAW_BYTES = 1_800_000;
const SHARD_PREFIX = 2;
const MAX_POSTINGS_PER_ENGLISH_TOKEN = 400;
const EXAMPLE_LICENSE = "CC BY 2.0 FR";

const { sources, datasetVersion } = readJson(path.join(PIPELINE_DIR, "sources.json"));
const data = readJson(raw("_entries-final.json"));
const conjugations = readJson(raw("_conjugations.json"));
const entries = data.entries;

const outDir = repo("public", "dict", datasetVersion);
fs.mkdirSync(outDir, { recursive: true });

// ---- shipped entry shape --------------------------------------------------
/**
 * Full field names rather than one-letter keys: gzip collapses repeated key names almost
 * to nothing, and the app code reads far better for it. Absent fields are omitted so the
 * common case (a two-sense noun with no gender) stays small.
 *
 * Two size decisions, both measured rather than guessed:
 *
 *  - `normalizedLemma` is NOT stored (208 KB). The form index already maps every
 *    normalized form — including each entry's own lemma — to its entry ids, and the app
 *    can call normalize() on the handful of results it is about to render.
 *  - Examples are arrays, and each carries its Tatoeba id and contributor for both sides
 *    but not the license string or the full URL (301 KB). Those are constants: the licence
 *    is recorded once in the manifest's attribution block and the URL is
 *    tatoeba.org/en/sentences/show/<id>. The app renders all four on every example, so
 *    what §4 requires the reader to see is unchanged — it is stored once, not 56,420 times.
 */
const shipExample = (x) => [x.es, x.en, x.sourceId, x.contributor, x.englishSourceId, x.englishContributor];

const shipEntry = (e) => {
  const row = { id: e.id, lemma: e.lemma, pos: e.pos };
  if (e.gender) row.gender = e.gender;
  if (e.conjugationId) row.conjugationId = e.conjugationId;
  if (e.freqRank) row.freqRank = e.freqRank;
  if (e.sourceId) row.sourceId = e.sourceId;
  row.senses = e.senses.map((s) => {
    const sense = { gloss: s.gloss };
    if (s.regionLabels.length) sense.regionLabels = s.regionLabels;
    if (s.labels.length) sense.labels = s.labels;
    return sense;
  });
  if (e.examples.length) row.examples = e.examples.map(shipExample);
  return row;
};

const shippedEntries = entries.map(shipEntry);

// Phase 14's curated curriculum resolves by lemma, so packaging proves every promised
// verb has one and only one conjugable verb entry. A source refresh may change ids; it may
// not silently hollow out the Gym.
for (const lemma of CORE_50) {
  const matches = shippedEntries.filter(
    (entry) => entry.pos === "verb" && entry.conjugationId && entry.lemma.normalize("NFC").toLowerCase() === lemma
  );
  if (matches.length !== 1) {
    throw new Error(`Conjugation Gym core lemma ${lemma} resolved to ${matches.length} conjugable verb entries`);
  }
  if (!conjugations[matches[0].conjugationId]) {
    throw new Error(`Conjugation Gym core lemma ${lemma} has no packaged conjugation table`);
  }
}
const entryIdsByLemmaKey = new Map();
for (const e of entries) {
  const key = `${e.lemma}|${e.pos}`;
  if (!entryIdsByLemmaKey.has(key)) entryIdsByLemmaKey.set(key, []);
  entryIdsByLemmaKey.get(key).push(e.id);
}

// ---- form index: form → entry ids -----------------------------------------
console.log("  building the form index …");
const formToIds = new Map();
for (const e of entries) {
  for (const form of e.searchForms) {
    let ids = formToIds.get(form);
    if (!ids) formToIds.set(form, (ids = new Set()));
    ids.add(e.id);
  }
}
// An entry is always findable by its own lemma, even if the source listed no forms.
for (const e of entries) {
  let ids = formToIds.get(e.normalizedLemma);
  if (!ids) formToIds.set(e.normalizedLemma, (ids = new Set()));
  ids.add(e.id);
}

const shardKey = (term) => term.slice(0, SHARD_PREFIX) || "_";
const shardMap = (map) => {
  const shards = new Map();
  for (const [term, ids] of map) {
    const key = shardKey(term);
    let shard = shards.get(key);
    if (!shard) shards.set(key, (shard = {}));
    shard[term] = [...ids];
  }
  return [...shards.entries()].map(([id, terms]) => ({ id, terms }));
};

const formShards = shardMap(formToIds);
console.log(`    ${formToIds.size.toLocaleString()} forms in ${formShards.length} shards`);

// ---- english index: gloss word → entry ids --------------------------------
/**
 * Brief §8 makes English→Spanish a first-class path. Without an index, "take out" means
 * scanning 10,000 entries and 21,000 glosses on every keystroke; with one, it is a single
 * indexed read per word, and the app intersects the words' postings.
 */
console.log("  building the english index …");
const STOPWORDS = new Set([
  "a", "an", "the", "of", "or", "and", "is", "are", "be", "was", "were", "as", "at",
  "by", "for", "from", "in", "into", "on", "onto", "that", "this", "these", "those",
  "with", "which", "who", "whom", "whose", "it", "its", "his", "her", "their", "one",
  "esp", "especially", "used", "usually", "something", "someone", "etc",
]);

const englishToIds = new Map();
const rankOfEntry = new Map(entries.map((e) => [e.id, e.freqRank ?? 1e9]));
for (const e of entries) {
  const seen = new Set();
  for (const sense of e.senses) {
    for (const token of sense.gloss.toLowerCase().split(/[^a-z0-9']+/i)) {
      if (token.length < 2 || STOPWORDS.has(token) || seen.has(token)) continue;
      seen.add(token);
      let ids = englishToIds.get(token);
      if (!ids) englishToIds.set(token, (ids = new Set()));
      ids.add(e.id);
    }
  }
}

// A token matching thousands of entries helps nobody; keep the most frequent words,
// which are the ones a learner is most likely to have meant.
let cappedTokens = 0;
for (const [token, ids] of englishToIds) {
  if (ids.size <= MAX_POSTINGS_PER_ENGLISH_TOKEN) continue;
  cappedTokens++;
  const best = [...ids].sort((a, b) => rankOfEntry.get(a) - rankOfEntry.get(b)).slice(0, MAX_POSTINGS_PER_ENGLISH_TOKEN);
  englishToIds.set(token, new Set(best));
}
const englishShards = shardMap(englishToIds);
console.log(`    ${englishToIds.size.toLocaleString()} words in ${englishShards.length} shards (${cappedTokens} capped)`);

// ---- chunking -------------------------------------------------------------
console.log("  writing chunks …");
const conjugationRows = Object.entries(conjugations).map(([id, table]) => ({ id, ...table }));

/** Rows are emitted store by store; a chunk holds whichever slice fits its budget. */
const plan = [
  ["entries", shippedEntries],
  ["conjugations", conjugationRows],
  ["formShards", formShards],
  ["englishShards", englishShards],
];

const chunks = [];
let current = { stores: {} };
let currentBytes = 0;

const flush = () => {
  if (!currentBytes) return;
  const index = chunks.length;
  const file = `chunk-${String(index).padStart(3, "0")}.json`;
  const body = JSON.stringify({ datasetVersion, chunk: index, ...current });
  const buffer = Buffer.from(body, "utf8");
  fs.writeFileSync(path.join(outDir, file), buffer);
  chunks.push({
    file,
    bytes: buffer.length,
    gzipBytes: gzipSize(buffer),
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    rows: Object.fromEntries(Object.entries(current.stores).map(([k, v]) => [k, v.length])),
  });
  current = { stores: {} };
  currentBytes = 0;
};

for (const [store, rows] of plan) {
  for (const row of rows) {
    const size = JSON.stringify(row).length + 1;
    if (currentBytes + size > CHUNK_RAW_BYTES) flush();
    if (!current.stores[store]) current.stores[store] = [];
    current.stores[store].push(row);
    currentBytes += size;
  }
}
flush();

// ---- manifest -------------------------------------------------------------
/**
 * The alias map from brief §6. Empty on a first release; a later rebuild fills it by
 * diffing entry ids against the previous manifest, so personal items attached to an entry
 * that changed id can be migrated instead of orphaned.
 */
const manifestPath = repo("public", "dict", "manifest.json");
const previous = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
const previousIds = {};
if (previous && previous.datasetVersion !== datasetVersion) {
  console.log(`  previous dataset ${previous.datasetVersion} found — alias map left empty (id diffing lands with the first real refresh)`);
}

const totalBytes = chunks.reduce((n, c) => n + c.bytes, 0);
const totalGzip = chunks.reduce((n, c) => n + c.gzipBytes, 0);
const exampleCount = entries.reduce((n, e) => n + e.examples.length, 0);

const manifest = {
  format: "mi-cuaderno-dictionary",
  formatVersion: 1,
  datasetVersion,
  generatedAt: new Date().toISOString(),
  path: datasetVersion,
  counts: {
    entries: shippedEntries.length,
    senses: entries.reduce((n, e) => n + e.senses.length, 0),
    examples: exampleCount,
    conjugations: conjugationRows.length,
    forms: formToIds.size,
    englishWords: englishToIds.size,
    formShards: formShards.length,
    englishShards: englishShards.length,
  },
  bytes: { total: totalBytes, gzipped: totalGzip },
  chunks,
  previousIds,
  attribution: {
    note:
      "Dictionary data is licensed separately from the app's code. Everything here is " +
      "CC BY-SA or CC BY — share-alike and attribution, no noncommercial restriction.",
    // Only distributed sources are listed. Fred Jehle's database is used at build time to
    // validate the conjugation extractor and none of its content ships, so naming it here
    // would tell the reader they are looking at data they are not.
    sources: sources
      .filter((s) => s.distributed !== false)
      .map((s) => ({
        name: s.name,
        license: s.license,
        attribution: s.attribution,
        url: s.landingPage,
        provides: s.provides || [],
      })),
    fullRecord: "DATA_SOURCES.md in the mi-cuaderno repository",
    // Constant for every example, stored once here instead of on all 56,420 sentence
    // sides. The app renders licence and link on each example from these (brief §4).
    examples: {
      license: EXAMPLE_LICENSE,
      urlTemplate: "https://tatoeba.org/en/sentences/show/{id}",
      idPrefix: "tatoeba:",
      fields: ["es", "en", "sourceId", "contributor", "englishSourceId", "englishContributor"],
    },
  },
};
writeJson(manifestPath, manifest);

const report = {
  generatedAt: new Date().toISOString(),
  datasetVersion,
  outputDir: `public/dict/${datasetVersion}`,
  chunkBudgetRawBytes: CHUNK_RAW_BYTES,
  chunks: chunks.length,
  counts: manifest.counts,
  bytes: {
    rawTotal: totalBytes,
    gzipTotal: totalGzip,
    gzipHuman: mb(totalGzip),
    perEntryGzip: Math.round(totalGzip / shippedEntries.length),
    largestChunkGzip: Math.max(...chunks.map((c) => c.gzipBytes)),
  },
  budgetNote: "Phase 2 plan budgeted ≤ ~3.5 MB gzipped; the spike measured 2.8 MB before the English index.",
  englishIndexCappedTokens: cappedTokens,
};
writeJson(out("07-package-report.json"), report);

console.log(`\n  chunks               ${chunks.length} × up to ${kb(CHUNK_RAW_BYTES)} raw`);
for (const c of chunks) {
  console.log(`    ${c.file}  ${kb(c.bytes).padStart(10)} raw  ${kb(c.gzipBytes).padStart(9)} gz   ${Object.entries(c.rows).map(([k, v]) => `${k}:${v}`).join(" ")}`);
}
console.log(`\n  entries              ${manifest.counts.entries.toLocaleString()}`);
console.log(`  senses               ${manifest.counts.senses.toLocaleString()}`);
console.log(`  examples             ${manifest.counts.examples.toLocaleString()}`);
console.log(`  conjugation tables   ${manifest.counts.conjugations.toLocaleString()}`);
console.log(`  searchable forms     ${manifest.counts.forms.toLocaleString()} in ${manifest.counts.formShards} shards`);
console.log(`  english words        ${manifest.counts.englishWords.toLocaleString()} in ${manifest.counts.englishShards} shards`);
console.log(`\n  TOTAL DOWNLOAD       ${mb(totalGzip)} gzipped  (${mb(totalBytes)} raw)`);
console.log(`  per entry            ${report.bytes.perEntryGzip} B gzipped`);
done(started);
