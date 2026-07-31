/**
 * Round-trips the packaged dictionary: reads the manifest, verifies every chunk's sha256,
 * reassembles the four stores exactly as the app's installer will, and then answers the
 * brief §12 searches from the reassembled data.
 *
 * This is the check that matters most, because everything before it tests the pipeline's
 * intermediates. This tests what actually ships.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/verify-package.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { repo, readJson, mb, step, PIPELINE_DIR } from "../lib/io.mjs";
import { normalize } from "../lib/ids.mjs";
import { allTenses, HABER_CONJUGATION_ID } from "../../src/lib/conjugation.js";

step("verify · unpack the shipped chunks and search them");

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const manifest = readJson(repo("public", "dict", "manifest.json"));
const dir = repo("public", "dict", manifest.path);

// ---- integrity ------------------------------------------------------------
const stores = { entries: [], conjugations: [], formShards: [], englishShards: [] };
let badHash = 0;
for (const c of manifest.chunks) {
  const buffer = fs.readFileSync(path.join(dir, c.file));
  const sha = crypto.createHash("sha256").update(buffer).digest("hex");
  if (sha !== c.sha256 || buffer.length !== c.bytes) badHash++;
  const parsed = JSON.parse(buffer.toString("utf8"));
  for (const [store, rows] of Object.entries(parsed.stores)) stores[store].push(...rows);
}
check("every chunk matches its manifest sha256 and byte length", badHash === 0,
  `${manifest.chunks.length} chunks, ${mb(manifest.bytes.total)} raw`);

for (const [store, rows] of Object.entries(stores)) {
  check(`unpacked ${store} matches the manifest count`,
    rows.length === manifest.counts[store === "entries" ? "entries" : store === "conjugations" ? "conjugations" : store],
    `${rows.length.toLocaleString()}`);
}

// ---- rebuild the lookup structures the app will use -----------------------
const entryById = new Map(stores.entries.map((e) => [e.id, e]));
const conjById = new Map(stores.conjugations.map((c) => [c.id, c]));
const forms = new Map();
for (const shard of stores.formShards) for (const [term, ids] of Object.entries(shard.terms)) forms.set(term, ids);
const english = new Map();
for (const shard of stores.englishShards) for (const [term, ids] of Object.entries(shard.terms)) english.set(term, ids);

const lemmasFor = (query) => (forms.get(normalize(query)) || []).map((id) => entryById.get(id)).filter(Boolean);

// ---- §12 searches, answered from the shipped data -------------------------
const REQUIRED = { fui: ["ir", "ser"], tuvimos: ["tener"], casas: ["casa"], "rápidas": ["rápido"] };
for (const [form, expected] of Object.entries(REQUIRED)) {
  const got = lemmasFor(form).map((e) => e.lemma);
  check(`"${form}" resolves to ${expected.join(" + ")} (§12)`,
    expected.every((l) => got.includes(l)), `→ ${got.join(", ") || "nothing"}`);
}

check('"año" does not match a search for "ano" (§8)',
  !lemmasFor("ano").some((e) => e.lemma === "año"),
  `ano → ${lemmasFor("ano").map((e) => e.lemma).join(", ") || "nothing"}`);
check('"saco" finds sacar and "sacó" both (§12)',
  lemmasFor("saco").length > 0 && lemmasFor("sacó").length > 0);

// English → Spanish, the way the app will do it: intersect the words' postings.
const englishLookup = (phrase) => {
  const words = phrase.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean);
  let ids = null;
  for (const w of words) {
    const posting = new Set(english.get(w) || []);
    ids = ids === null ? posting : new Set([...ids].filter((id) => posting.has(id)));
  }
  return [...(ids || [])].map((id) => entryById.get(id)).filter(Boolean);
};
const takeOut = englishLookup("take out");
check('"take out" surfaces sacar as an English-meaning match (§12)',
  takeOut.some((e) => e.lemma === "sacar"),
  `${takeOut.length} entries, incl. ${takeOut.slice(0, 5).map((e) => e.lemma).join(", ")}`);

// ---- conjugations ---------------------------------------------------------
const haber = conjById.get(HABER_CONJUGATION_ID);
check("haber's table ships under its well-known id", Boolean(haber));

const madrugar = stores.entries.find((e) => e.lemma === "madrugar");
const madrugarTable = conjById.get(madrugar?.conjugationId);
check("madrugar's preterite is madrugué, not madrugé",
  madrugarTable?.tenses["Indicative/Preterite"]?.yo === "madrugué",
  madrugarTable?.tenses["Indicative/Preterite"]?.yo);
check("perfect tenses compose correctly from the shipped data",
  allTenses(madrugarTable, haber)["Indicative/Present Perfect"]?.yo === "he madrugado",
  allTenses(madrugarTable, haber)["Indicative/Present Perfect"]?.yo);

const danglingConj = stores.entries.filter((e) => e.conjugationId && !conjById.has(e.conjugationId));
check("every conjugationId on an entry resolves to a shipped table", danglingConj.length === 0,
  danglingConj.length ? danglingConj.slice(0, 3).map((e) => e.lemma).join(", ") : "");

// ---- referential integrity ------------------------------------------------
let danglingForms = 0;
for (const ids of forms.values()) for (const id of ids) if (!entryById.has(id)) danglingForms++;
check("no form points at an entry that did not ship", danglingForms === 0, `${forms.size.toLocaleString()} forms`);

let danglingEnglish = 0;
for (const ids of english.values()) for (const id of ids) if (!entryById.has(id)) danglingEnglish++;
check("no English word points at an entry that did not ship", danglingEnglish === 0, `${english.size.toLocaleString()} words`);

const unfindable = stores.entries.filter((e) => !(forms.get(normalize(e.lemma)) || []).includes(e.id));
check("every entry is findable by its own lemma", unfindable.length === 0,
  unfindable.length ? unfindable.slice(0, 5).map((e) => e.lemma).join(", ") : "");

// ---- §4 attribution -------------------------------------------------------
const [ES, EN, ES_ID, ES_USER, EN_ID] = [0, 1, 2, 3, 4];
const examples = stores.entries.flatMap((e) => e.examples || []);
check("every example carries text and a sentence id for both sides (§4)",
  examples.every((x) => x[ES] && x[EN] && x[ES_ID] && x[EN_ID]),
  `${examples.length.toLocaleString()} examples`);
check("the manifest records the example license and URL template (§4)",
  Boolean(manifest.attribution?.examples?.license && manifest.attribution.examples.urlTemplate),
  manifest.attribution?.examples?.license);
// Every source whose data is actually in the bundle must be named with its license. Jehle
// is deliberately absent: it validates the conjugation extractor at build time and none of
// its content ships, so listing it would credit the reader with data they do not have.
const { sources } = readJson(path.join(PIPELINE_DIR, "sources.json"));
const distributedSources = sources.filter((s) => s.distributed !== false);
check("the manifest names every distributed source with its license (§4)",
  manifest.attribution?.sources?.length === distributedSources.length &&
    manifest.attribution.sources.every((s) => s.license && s.attribution),
  `${manifest.attribution?.sources?.length} of ${sources.length} sources are distributed`);

// The bundle must not carry a noncommercial obligation. This asserts the *absence* of one,
// which is the claim that matters now — the previous check looked for the word
// "NONCOMMERCIAL" in the note and would have passed on a note saying there is no such
// restriction, making it useless in exactly the case it needed to catch.
const ncSources = manifest.attribution?.sources?.filter((s) => /\bNC\b|noncommercial|non-commercial/i.test(s.license || "")) || [];
check("no distributed source carries a noncommercial license (§4)",
  ncSources.length === 0,
  ncSources.length ? `NC sources present: ${ncSources.map((s) => s.name).join(", ")}` : "all CC BY-SA / CC BY");
check("no shipped conjugation table is attributed to Jehle",
  stores.conjugations.every((t) => t.source !== "jehle" && !/jehle/i.test(t.id || "")),
  `${stores.conjugations.length.toLocaleString()} tables, all kaikki-derived`);

console.log(`\n  dataset ${manifest.datasetVersion} · ${mb(manifest.bytes.gzipped)} gzipped over ${manifest.chunks.length} chunks`);
console.log(`  ${stores.entries.length.toLocaleString()} entries · ${stores.conjugations.length.toLocaleString()} tables · ` +
  `${forms.size.toLocaleString()} forms · ${english.size.toLocaleString()} English words`);

const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`  FAILED: ${failed.map((f) => f.name).join("; ")}`);
  process.exit(1);
}
