/**
 * Acceptance checks for the built dataset — the brief §12 "done when" list, asserted
 * against the real full-scale output rather than eyeballed.
 *
 * Runs against the pipeline intermediates, so it can be run after step 05 (before the
 * data is packaged) and again after step 07. Exits non-zero if anything fails, so it
 * can gate a rebuild.
 *
 * Run: node pipeline/build/check.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { raw, repo, readJson, eachJsonl, step, PIPELINE_DIR } from "../lib/io.mjs";
import { normalize } from "../lib/ids.mjs";
import { SIMPLE_TENSES, HABER_CONJUGATION_ID, allTenses } from "../../src/lib/conjugation.js";

step("check · brief §12 acceptance");

// Runs against the furthest stage for the CURRENT dataset. Old intermediates deliberately stay
// in raw/ between steps, so existence alone is not proof that a file belongs to this rebuild.
const { datasetVersion: expectedDatasetVersion } = readJson(path.join(PIPELINE_DIR, "sources.json"));
const source = ["_entries-final.json", "_entries-with-examples.json", "_entries.json"]
  .find((name) => fs.existsSync(raw(name)) && readJson(raw(name)).datasetVersion === expectedDatasetVersion);
if (!source) throw new Error(`No entry intermediate belongs to ${expectedDatasetVersion}; run step 04 first`);
console.log(`  reading ${source}\n`);

const results = [];
const check = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const data = readJson(raw(source));
const entries = data.entries;
const conjugations = fs.existsSync(raw("_conjugations.json")) ? readJson(raw("_conjugations.json")) : {};
const byLemma = new Map();
for (const e of entries) {
  if (!byLemma.has(e.lemma)) byLemma.set(e.lemma, []);
  byLemma.get(e.lemma).push(e);
}

// ---- size and shape -------------------------------------------------------
check(
  "dictionary retains the r3 entry count",
  entries.length === 10278,
  `${entries.length.toLocaleString()} entries`
);
check("every entry has an id, lemma, pos and ≥1 sense",
  entries.every((e) => e.id && e.lemma && e.pos && e.senses.length > 0));
check("every entry carries the dataset version",
  entries.every((e) => e.datasetVersion === data.datasetVersion), data.datasetVersion);
check("ids are unique", new Set(entries.map((e) => e.id)).size === entries.length);
check("ids are namespaced dict:wiktionary-es: (brief §6)",
  entries.every((e) => e.id.startsWith("dict:wiktionary-es:")));

const STABLE_R3_IDS = [
  "dict:wiktionary-es:sacar:verb",
  "dict:wiktionary-es:trabajar:verb",
  "dict:wiktionary-es:gratis:adj",
  "dict:wiktionary-es:gratis:adv",
  "dict:wiktionary-es:teléfono:noun",
];
const entryIds = new Set(entries.map((entry) => entry.id));
check("known canonical ids remain stable from r3",
  STABLE_R3_IDS.every((id) => entryIds.has(id)),
  STABLE_R3_IDS.filter((id) => !entryIds.has(id)).join(", "));

// Before step 07 overwrites the selected manifest, compare the complete new id set with the
// actual manifest-selected r3 package. This is stronger than the required spot checks and proves
// that an additive rebuild cannot orphan any personal attachment.
const manifestPath = repo("public", "dict", "manifest.json");
const selectedManifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
if (selectedManifest && selectedManifest.datasetVersion !== data.datasetVersion) {
  const previousIds = [];
  for (const chunk of selectedManifest.chunks || []) {
    const parsed = readJson(repo("public", "dict", selectedManifest.path, chunk.file));
    previousIds.push(...(parsed.stores?.entries || []).map((entry) => entry.id));
  }
  const prior = [...new Set(previousIds)].sort();
  const next = [...entryIds].sort();
  check(`all ids exactly match ${selectedManifest.datasetVersion}`,
    JSON.stringify(prior) === JSON.stringify(next),
    `${prior.length.toLocaleString()} prior · ${next.length.toLocaleString()} rebuilt`);
}

// ---- r4 enrichment -------------------------------------------------------
const validWords = (words) => words === undefined || (
  Array.isArray(words) && words.length > 0 && words.every((word) => typeof word === "string" && word.trim())
);
const enrichmentShapeValid = entries.every((entry) =>
  validWords(entry.synonyms) && validWords(entry.antonyms) && validWords(entry.relatedWords) &&
  (entry.etymology === undefined || (typeof entry.etymology === "string" && entry.etymology.trim())) &&
  entry.senses.every((sense) =>
    validWords(sense.synonyms) && validWords(sense.antonyms) && validWords(sense.topics) &&
    (sense.examples === undefined || (
      Array.isArray(sense.examples) && sense.examples.length > 0 && sense.examples.length <= 2 &&
      sense.examples.every((example) =>
        Array.isArray(example) && (example.length === 1 || example.length === 2) &&
        example.every((text) => typeof text === "string" && text.trim())
      )
    ))
  )
);
check("r4 enrichment fields use the compact optional shape", enrichmentShapeValid);

const trabajar = (byLemma.get("trabajar") || []).find((entry) => entry.pos === "verb");
check("trabajar carries entry-level synonym chambear",
  trabajar?.synonyms?.includes("chambear"),
  trabajar?.synonyms?.join(", "));

const gratis = byLemma.get("gratis") || [];
check("gratis carries sense-level synonym gratuito",
  gratis.some((entry) => entry.senses.some((sense) => sense.synonyms?.includes("gratuito"))));
check("gratis carries its exact first-sentence etymology",
  gratis.length > 0 && gratis.every((entry) => entry.etymology === "From Latin grātīs."),
  gratis.map((entry) => `${entry.pos}:${entry.etymology || "missing"}`).join(" · "));
check("no shipped etymology contains an Etymology tree block",
  entries.every((entry) => !entry.etymology?.includes("Etymology tree")),
  `${entries.filter((entry) => entry.etymology).length.toLocaleString()} etymologies`);

const telefono = (byLemma.get("teléfono") || []).find((entry) => entry.pos === "noun");
const telefonoGlosses = telefono?.senses.map((sense) => sense.gloss) || [];
check("teléfono's nested subsenses keep distinct specific glosses",
  telefonoGlosses.some((gloss) => /rotary dial telephone/i.test(gloss)) &&
    telefonoGlosses.some((gloss) => /mobile phone/i.test(gloss)) &&
    new Set(telefonoGlosses).size === telefonoGlosses.length,
  telefonoGlosses.slice(0, 4).join(" · "));

const invalidSenseExamples = [];
for (const entry of entries) {
  const lemma = entry.lemma.trim().normalize("NFC").toLocaleLowerCase("es");
  for (const sense of entry.senses) {
    const examples = sense.examples || [];
    const firstUntranslated = examples.findIndex((example) => example.length === 1);
    if (examples.length > 2 || examples.some((example) =>
      !example[0]?.trim() || example[0].length > 200 ||
      example[0].trim().normalize("NFC").toLocaleLowerCase("es") === lemma
    ) || (firstUntranslated !== -1 && examples.slice(firstUntranslated).some((example) => example.length === 2))) {
      invalidSenseExamples.push(entry.id);
    }
  }
}
check("every sense example obeys count, length, bare-lemma and translated-first rules",
  invalidSenseExamples.length === 0,
  invalidSenseExamples.slice(0, 5).join(", "));

const selfRelated = entries.filter((entry) => entry.relatedWords?.some((word) =>
  word.trim().normalize("NFC").toLocaleLowerCase("es") === entry.lemma.trim().normalize("NFC").toLocaleLowerCase("es")
));
check("dormant related-word lists exclude their own lemma", selfRelated.length === 0,
  selfRelated.slice(0, 5).map((entry) => entry.lemma).join(", "));
const selfRelations = entries.filter((entry) => {
  const lemma = entry.lemma.trim().normalize("NFC").toLocaleLowerCase("es");
  return [...(entry.synonyms || []), ...(entry.antonyms || []),
    ...entry.senses.flatMap((sense) => [...(sense.synonyms || []), ...(sense.antonyms || [])])]
    .some((word) => word.trim().normalize("NFC").toLocaleLowerCase("es") === lemma);
});
check("visible relation lists exclude their own headword", selfRelations.length === 0,
  selfRelations.slice(0, 5).map((entry) => entry.lemma).join(", "));

// ---- §8 normalization -----------------------------------------------------
check("ñ survives normalization — año never matches ano (§8)",
  normalize("año") === "año" && normalize("año") !== normalize("ano"));
check("accents are stripped — sacó normalizes to saco (§8)", normalize("sacó") === "saco");

// ---- §12 inflected lookups ------------------------------------------------
const REQUIRED = {
  fui: ["ir", "ser"],
  tuvimos: ["tener"],
  casas: ["casa"],
  rápidas: ["rápido"],
};
const shipped = new Set(entries.map((e) => `${e.lemma}|${e.pos}`));
const found = new Map(Object.keys(REQUIRED).map((f) => [normalize(f), new Set()]));
await eachJsonl(raw("_forms-search.jsonl"), ([form, hits]) => {
  const set = found.get(form);
  if (!set) return;
  for (const h of hits) if (shipped.has(h)) set.add(h.slice(0, h.lastIndexOf("|")));
});
for (const [form, expected] of Object.entries(REQUIRED)) {
  const got = found.get(normalize(form));
  const missing = expected.filter((l) => !got.has(l));
  check(`"${form}" resolves to ${expected.join(" + ")} (§12)`, missing.length === 0,
    `→ ${[...got].join(", ") || "nothing"}`);
}

// ---- §12 English → Spanish ------------------------------------------------
const sacar = byLemma.get("sacar") || [];
const sacarGlosses = sacar.flatMap((e) => e.senses.map((s) => s.gloss.toLowerCase()));
check(`"take out" finds sacar as an English-meaning match (§12)`,
  sacarGlosses.some((g) => g.includes("take out")),
  sacarGlosses.find((g) => g.includes("take out")) || `sacar has ${sacarGlosses.length} senses`);

// ---- §3 Mexico-first sense order ------------------------------------------
const mexicoEntries = entries.filter((e) => e.senses.some((s) => s.regionLabels.includes("Mexico")));
const misordered = mexicoEntries.filter((e) => {
  const firstMexico = e.senses.findIndex((s) => s.regionLabels.includes("Mexico"));
  const firstOther = e.senses.findIndex((s) => !s.regionLabels.includes("Mexico") && s.regionLabels.length > 0);
  return firstOther !== -1 && firstOther < firstMexico;
});
check("Mexico-labeled senses sort before other regional senses (§3)",
  misordered.length === 0,
  `${mexicoEntries.length} entries carry a Mexico sense`);

// An unmarked sense is general Spanish and outranks a sense marked for another country.
const OTHER_COUNTRY = /^(El-Salvador|Chile|Argentina|Colombia|Peru|Cuba|Uruguay|Venezuela|Rioplatense|Spain)$/i;
const buriedGeneral = entries.filter((e) => {
  const firstUnmarked = e.senses.findIndex((s) => s.regionLabels.length === 0);
  const firstOtherCountry = e.senses.findIndex(
    (s) => s.regionLabels.length > 0 && s.regionLabels.every((l) => OTHER_COUNTRY.test(l))
  );
  return firstUnmarked !== -1 && firstOtherCountry !== -1 && firstOtherCountry < firstUnmarked;
});
check("general senses sort above senses marked for another country (§3)",
  buriedGeneral.length === 0,
  buriedGeneral.length ? `${buriedGeneral.length} entries, e.g. ${buriedGeneral.slice(0, 3).map((e) => e.lemma).join(", ")}` : "");

// ---- §4 attribution -------------------------------------------------------
const allExamples = entries.flatMap((e) => e.examples);
check("every example carries a Tatoeba id, license and URL on both sides (§4)",
  allExamples.every((x) => x.sourceId && x.license && x.sourceUrl && x.englishSourceId && x.englishSourceUrl),
  `${allExamples.length.toLocaleString()} examples`);
check("examples cover most of the dictionary",
  entries.filter((e) => e.examples.length).length / entries.length > 0.9,
  `${((entries.filter((e) => e.examples.length).length / entries.length) * 100).toFixed(1)}% of entries`);

if (selectedManifest?.datasetVersion === data.datasetVersion) {
  check("the packaged r4 bundle stays below 4.3 MiB gzipped",
    selectedManifest.bytes?.gzipped < 4.3 * 1024 * 1024,
    `${((selectedManifest.bytes?.gzipped || 0) / 1024 / 1024).toFixed(2)} MiB`);
  check("the additive r4 manifest has no aliases",
    Object.keys(selectedManifest.previousIds || {}).length === 0);
}

// ---- words the brief and spike name explicitly ----------------------------
for (const word of ["madrugar", "haber", "sacar", "año", "güey", "chamba"]) {
  check(`"${word}" is in the dictionary`, byLemma.has(word),
    (byLemma.get(word) || []).map((e) => e.pos).join(", "));
}

// ---- conjugations (filled by step 06) -------------------------------------
const verbs = entries.filter((e) => e.pos === "verb");
const withConj = verbs.filter((e) => e.conjugationId);
if (Object.keys(conjugations).length) {
  check("almost every verb has a conjugation table (§12)",
    withConj.length / verbs.length > 0.99,
    `${withConj.length.toLocaleString()}/${verbs.length.toLocaleString()} verbs`);
  check("every conjugationId resolves to a table",
    withConj.every((e) => conjugations[e.conjugationId]));

  // The orthographic case DECISIONS.md flagged as the reason rules were risky.
  const madrugar = conjugations[(byLemma.get("madrugar") || [])[0]?.conjugationId];
  check("madrugar's preterite is madrugué, not madrugé",
    madrugar?.tenses["Indicative/Preterite"]?.yo === "madrugué",
    madrugar?.tenses["Indicative/Preterite"]?.yo);

  const haber = conjugations[(byLemma.get("haber") || []).find((e) => e.pos === "verb")?.conjugationId];
  check("haber conjugates correctly (every perfect tense depends on it)",
    haber?.tenses["Indicative/Present"]?.yo === "he" && haber?.tenses["Indicative/Present"]?.nosotros === "hemos",
    haber ? `${haber.tenses["Indicative/Present"].yo} … ${haber.tenses["Indicative/Present"].nosotros}` : "no table");

  check("stored tables hold only simple tenses; perfects are composed by the app",
    Object.values(conjugations).every((t) => Object.keys(t.tenses).every((label) => SIMPLE_TENSES.includes(label))));

  const composed = allTenses(madrugar, conjugations[HABER_CONJUGATION_ID]);
  check("the app can compose a perfect tense from what ships (§3)",
    composed["Indicative/Present Perfect"]?.yo === "he madrugado",
    composed["Indicative/Present Perfect"]?.yo);
}
console.log(`\n  verbs ${verbs.length.toLocaleString()} · with a conjugation table ${withConj.length.toLocaleString()} (${((withConj.length / verbs.length) * 100).toFixed(1)}%)`);

const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`  FAILED: ${failed.map((f) => f.name).join("; ")}`);
  process.exit(1);
}
