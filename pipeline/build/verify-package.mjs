/**
 * Round-trips the packaged dictionary: reads the manifest, verifies every chunk's sha256,
 * reassembles the five stores exactly as the app's installer will, and then answers the
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
import {
  analyzeConjugationPatterns,
  canonicalConjugationLemma,
  isValidConjugationEvidence,
  KNOWN_CONJUGATION_PATTERN_IDS,
  regularConjugationModel,
} from "../../src/lib/conjugationPatterns.js";

step("verify · unpack the shipped chunks and search them");

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const manifest = readJson(repo("public", "dict", "manifest.json"));
const dir = repo("public", "dict", manifest.path);

// ---- integrity ------------------------------------------------------------
const stores = { entries: [], conjugations: [], formShards: [], englishShards: [], patternFamilies: [] };
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

// ---- Phase 21 teaching assignments and reverse family store --------------
const knownPatternIds = new Set(KNOWN_CONJUGATION_PATTERN_IDS);
const conjugableEntries = stores.entries.filter((entry) => entry.conjugationId && conjById.has(entry.conjugationId));
const analyses = new Map(conjugableEntries.map((entry) => [
  entry.id,
  analyzeConjugationPatterns({ lemma: entry.lemma, conjugation: conjById.get(entry.conjugationId) }),
]));

const unknownPatternIds = stores.entries.flatMap((entry) => entry.conjugationPatternIds || [])
  .filter((id) => !knownPatternIds.has(id));
check("every stored conjugation pattern id is known", unknownPatternIds.length === 0,
  unknownPatternIds.length ? [...new Set(unknownPatternIds)].join(", ") : `${knownPatternIds.size} catalog ids`);

const assignmentMismatches = conjugableEntries.filter((entry) => {
  const stored = entry.conjugationPatternIds || [];
  const recomputed = analyses.get(entry.id).patternIds;
  return JSON.stringify(stored) !== JSON.stringify(recomputed);
});
check("every entry's stored pattern ids exactly equal analyzer recomputation", assignmentMismatches.length === 0,
  assignmentMismatches.length
    ? assignmentMismatches.slice(0, 5).map((entry) => entry.lemma).join(", ")
    : `${conjugableEntries.length.toLocaleString()} conjugable entry rows`);

const invalidEvidence = [];
for (const entry of conjugableEntries) {
  for (const notice of analyses.get(entry.id).notices) {
    if (!isValidConjugationEvidence(notice) || notice.evidence.some((row) => row.slot === "vosotros")) {
      invalidEvidence.push(`${entry.lemma}:${notice.id}`);
    }
  }
}
check("every teaching notice has resolvable non-vosotros evidence and emphasis", invalidEvidence.length === 0,
  invalidEvidence.slice(0, 5).join(", "));

const structuralChanges = {
  "stem:e-ie_then_e-i": { from: "e", shown: ["ie", "e", "i"] },
  "stem:o-ue_then_o-u": { from: "o", shown: ["ue", "o", "u"] },
  "stem:e-i": { from: "e", shown: ["i", "e", "i"] },
  "stem:e-ie": { from: "e", shown: ["ie", "e", "ie"] },
  "stem:o-ue": { from: "o", shown: ["ue", "o", "ue"] },
  "stem:u-ue": { from: "u", shown: ["ue", "u", "ue"] },
  "stem:i-accent": { from: "i", shown: ["í", "i", "í"] },
  "stem:u-accent": { from: "u", shown: ["ú", "u", "ú"] },
  "gerund:e-i": { from: "e", shown: ["i", "e"] },
  "gerund:o-u": { from: "o", shown: ["u", "o"] },
};
const misplacedStructuralEvidence = [];
for (const entry of conjugableEntries) {
  const bare = canonicalConjugationLemma(entry.lemma).replace(/se$/, "");
  const stem = bare.slice(0, -2);
  for (const notice of analyses.get(entry.id).notices) {
    const change = structuralChanges[notice.id];
    if (!change) continue;
    const stemIndex = stem.lastIndexOf(change.from);
    for (const [index, row] of notice.evidence.entries()) {
      const prefixLength = /^(?:me|te|se|nos|os) /.exec(row.form)?.[0].length || 0;
      const expected = [[prefixLength + stemIndex, prefixLength + stemIndex + change.shown[index].length]];
      if (JSON.stringify(row.emphasis) !== JSON.stringify(expected)) {
        misplacedStructuralEvidence.push(`${entry.lemma}:${notice.id}:${row.form}`);
      }
    }
  }
}
check("every stem and gerund emphasis marks the analyzed replacement position",
  misplacedStructuralEvidence.length === 0, misplacedStructuralEvidence.slice(0, 5).join(", "));

const spanish = new Intl.Collator("es", { sensitivity: "base", usage: "sort" });
const entryOrder = (a, b) =>
  (a.freqRank ?? Number.MAX_SAFE_INTEGER) - (b.freqRank ?? Number.MAX_SAFE_INTEGER) ||
  spanish.compare(a.lemma, b.lemma) || a.id.localeCompare(b.id);
const entriesByLemma = new Map();
for (const entry of conjugableEntries) {
  const key = canonicalConjugationLemma(entry.lemma);
  if (!entriesByLemma.has(key)) entriesByLemma.set(key, []);
  entriesByLemma.get(key).push(entry);
}
const representatives = [...entriesByLemma.values()].map((rows) => [...rows].sort(entryOrder)[0]).sort(entryOrder);
const expectedMembers = new Map(KNOWN_CONJUGATION_PATTERN_IDS.map((id) => [id, []]));
for (const entry of representatives) {
  for (const id of analyses.get(entry.id).patternIds) expectedMembers.get(id).push(entry.id);
}
const expectedFamilies = new Map([...expectedMembers].filter(([, ids]) => ids.length >= 2));
const familyById = new Map(stores.patternFamilies.map((row) => [row.id, row]));

check("pattern family ids are unique and known",
  familyById.size === stores.patternFamilies.length && stores.patternFamilies.every((row) => knownPatternIds.has(row.id)),
  `${stores.patternFamilies.length} rows`);

const familyMismatches = [];
for (const [id, memberIds] of expectedFamilies) {
  if (JSON.stringify(familyById.get(id)?.memberIds || null) !== JSON.stringify(memberIds)) familyMismatches.push(id);
}
for (const id of familyById.keys()) if (!expectedFamilies.has(id)) familyMismatches.push(id);
check("family rows exactly equal the analyzer's discoverable reverse mapping", familyMismatches.length === 0,
  familyMismatches.length ? [...new Set(familyMismatches)].join(", ") : `${expectedFamilies.size} discoverable families`);

const badFamilyMembers = [];
for (const family of stores.patternFamilies) {
  for (const memberId of family.memberIds || []) {
    const entry = entryById.get(memberId);
    if (!entry?.conjugationId || !(entry.conjugationPatternIds || []).includes(family.id)) {
      badFamilyMembers.push(`${family.id}:${memberId}`);
    }
  }
}
check("every family member resolves to a conjugable entry carrying that pattern", badFamilyMembers.length === 0,
  badFamilyMembers.slice(0, 4).join(", "));

const top100WithoutTeaching = representatives.slice(0, 100).filter((entry) => {
  const result = analyses.get(entry.id);
  return !result.regular && result.notices.length === 0;
});
check("every top-100 conjugated lemma has a notice or regular summary", top100WithoutTeaching.length === 0,
  top100WithoutTeaching.map((entry) => entry.lemma).join(", "));

const regularAnchorMismatches = ["hablar", "comer", "vivir"].filter((lemma) => {
  const entry = representatives.find((candidate) => canonicalConjugationLemma(candidate.lemma) === lemma);
  const table = entry ? conjById.get(entry.conjugationId) : null;
  const model = regularConjugationModel(lemma);
  return !table || table.gerund !== model?.gerund || table.pastParticiple !== model?.pastParticiple ||
    Object.entries(model?.tenses || {}).some(([tense, row]) =>
      Object.entries(row).some(([slot, form]) => table.tenses?.[tense]?.[slot] !== form)
    );
});
check("shipped hablar/comer/vivir tables equal the regular teaching models", regularAnchorMismatches.length === 0,
  regularAnchorMismatches.join(", "));

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

// ---- Phase 24 enrichment -------------------------------------------------
const stableR3Ids = [
  "dict:wiktionary-es:sacar:verb",
  "dict:wiktionary-es:trabajar:verb",
  "dict:wiktionary-es:gratis:adj",
  "dict:wiktionary-es:gratis:adv",
  "dict:wiktionary-es:teléfono:noun",
];
check("r4 keeps the exact 10,278-entry identity surface",
  stores.entries.length === 10278 && stableR3Ids.every((id) => entryById.has(id)),
  `${stores.entries.length.toLocaleString()} entries`);
check("r4's additive manifest has an empty alias map",
  Object.keys(manifest.previousIds || {}).length === 0);
check("r4 stays below 4.3 MiB gzipped",
  manifest.bytes.gzipped < 4.3 * 1024 * 1024,
  mb(manifest.bytes.gzipped));

const trabajar = entryById.get("dict:wiktionary-es:trabajar:verb");
const gratis = [
  entryById.get("dict:wiktionary-es:gratis:adj"),
  entryById.get("dict:wiktionary-es:gratis:adv"),
].filter(Boolean);
check("packaged trabajar carries entry-level synonym chambear",
  trabajar?.synonyms?.includes("chambear"));
check("packaged gratis carries sense synonym gratuito",
  gratis.some((entry) => entry.senses.some((sense) => sense.synonyms?.includes("gratuito"))));
check("packaged gratis etymology is the exact trimmed sentence",
  gratis.length === 2 && gratis.every((entry) => entry.etymology === "From Latin grātīs."));
check("no packaged etymology contains an Etymology tree block",
  stores.entries.every((entry) => !entry.etymology?.includes("Etymology tree")),
  `${stores.entries.filter((entry) => entry.etymology).length.toLocaleString()} etymologies`);

const telefonoGlosses = entryById.get("dict:wiktionary-es:teléfono:noun")?.senses.map((sense) => sense.gloss) || [];
check("packaged teléfono subsenses are distinct",
  telefonoGlosses.some((gloss) => /rotary dial telephone/i.test(gloss)) &&
    telefonoGlosses.some((gloss) => /mobile phone/i.test(gloss)) &&
    new Set(telefonoGlosses).size === telefonoGlosses.length);

const invalidSenseExamples = [];
for (const entry of stores.entries) {
  const lemma = entry.lemma.trim().normalize("NFC").toLocaleLowerCase("es");
  for (const sense of entry.senses) {
    const examples = sense.examples || [];
    const firstUntranslated = examples.findIndex((example) => example.length === 1);
    if (examples.length > 2 || examples.some((example) =>
      !Array.isArray(example) || (example.length !== 1 && example.length !== 2) ||
      !example[0]?.trim() || example[0].length > 200 ||
      example[0].trim().normalize("NFC").toLocaleLowerCase("es") === lemma
    ) || (firstUntranslated !== -1 && examples.slice(firstUntranslated).some((example) => example.length === 2))) {
      invalidSenseExamples.push(entry.id);
    }
  }
}
check("packaged sense examples obey the compact filter",
  invalidSenseExamples.length === 0,
  invalidSenseExamples.slice(0, 5).join(", "));

const badRelatedWords = stores.entries.filter((entry) => entry.relatedWords && (
  !Array.isArray(entry.relatedWords) || !entry.relatedWords.length ||
  entry.relatedWords.some((word) => typeof word !== "string" || !word.trim() ||
    word.trim().normalize("NFC").toLocaleLowerCase("es") === entry.lemma.trim().normalize("NFC").toLocaleLowerCase("es"))
));
check("dormant related-word rows contain only non-self plain strings",
  badRelatedWords.length === 0,
  badRelatedWords.slice(0, 5).map((entry) => entry.lemma).join(", "));

const selfRelations = stores.entries.filter((entry) => {
  const lemma = entry.lemma.trim().normalize("NFC").toLocaleLowerCase("es");
  return [...(entry.synonyms || []), ...(entry.antonyms || []),
    ...entry.senses.flatMap((sense) => [...(sense.synonyms || []), ...(sense.antonyms || [])])]
    .some((word) => word.trim().normalize("NFC").toLocaleLowerCase("es") === lemma);
});
check("visible relation lists exclude their own headword",
  selfRelations.length === 0,
  selfRelations.slice(0, 5).map((entry) => entry.lemma).join(", "));

console.log(`\n  dataset ${manifest.datasetVersion} · ${mb(manifest.bytes.gzipped)} gzipped over ${manifest.chunks.length} chunks`);
console.log(`  ${stores.entries.length.toLocaleString()} entries · ${stores.conjugations.length.toLocaleString()} tables · ` +
  `${forms.size.toLocaleString()} forms · ${english.size.toLocaleString()} English words`);

const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`  FAILED: ${failed.map((f) => f.name).join("; ")}`);
  process.exit(1);
}
