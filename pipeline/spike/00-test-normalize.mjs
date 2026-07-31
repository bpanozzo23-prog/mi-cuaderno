/**
 * Self-check for the section 8 normalization rule. Run: node pipeline/spike/00-test-normalize.mjs
 * The ñ case is the one the prototype gets wrong, so it is asserted explicitly.
 */
import { normalize, canonicalId } from "./lib/normalize.mjs";

const cases = [
  ["año", "año"],
  ["ANO", "ano"],
  ["sacó", "saco"],
  ["saco", "saco"],
  ["rápidas", "rapidas"],
  ["pingüino", "pinguino"],
  ["Ñoño", "ñoño"],
  ["señor", "señor"],
  ["él", "el"],
  ["tener ganas de", "tener ganas de"],
];

let failures = 0;
for (const [input, want] of cases) {
  const got = normalize(input);
  const pass = got === want;
  if (!pass) failures++;
  console.log(`${pass ? "ok  " : "FAIL"} normalize(${JSON.stringify(input)}) = ${JSON.stringify(got)}${pass ? "" : ` — want ${JSON.stringify(want)}`}`);
}

const anoClash = normalize("año") === normalize("ano");
console.log(`${anoClash ? "FAIL" : "ok  "} "año" and "ano" normalize differently`);
if (anoClash) failures++;

const sacoMatch = normalize("sacó") === normalize("saco");
console.log(`${sacoMatch ? "ok  " : "FAIL"} "sacó" and "saco" normalize the same`);
if (!sacoMatch) failures++;

console.log("\nCanonical IDs (section 6):");
console.log(" ", canonicalId("ir", "verb", "etymology-1"));
console.log(" ", canonicalId("sacar", "verb"));
console.log(" ", canonicalId("tener ganas de", "phrase"));

console.log(failures === 0 ? "\nAll normalization checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
