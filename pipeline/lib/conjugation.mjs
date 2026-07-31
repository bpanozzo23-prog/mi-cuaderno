/**
 * Extracting conjugation tables from the two sources.
 *
 * Fred Jehle's database covers 637 verbs; the dictionary needs ~1,800. The brief's plan
 * was to generate the rest from rules, and DECISIONS.md warned that "regular" is a trap —
 * madrugar is regular but its preterite is *madrugué*, not *madrugé*.
 *
 * kaikki makes that unnecessary. Every Spanish verb record carries a fully tagged
 * conjugation table in `forms[]`, written by Wiktionary editors who already handled the
 * stem changes (e→ie), the -gar/-car/-zar spelling rules, and every irregular. Extracting
 * a table inherits all of that; a hand-written generator would have to re-earn it. And
 * because 554 verbs appear in BOTH sources, the extractor is checked cell by cell against
 * Jehle rather than trusted (see 06-conjugate.mjs).
 *
 * The table SHAPE and the perfect-tense composition live in src/lib/conjugation.js,
 * shared with the app so the writer and the reader cannot drift apart.
 */
export {
  SLOTS, SIMPLE_TENSES, PERFECT_TENSES, expectedSlots, isPronominal,
  composePerfectTenses, allTenses,
} from "../../src/lib/conjugation.js";

import { SLOTS, expectedSlots, composePerfectTenses } from "../../src/lib/conjugation.js";

/** Tags that mean "this row is not a conjugated form of the verb at all". */
const NOT_A_FORM = new Set(["inflection-template", "class", "table-tags", "error-unrecognized-form"]);

/** Tags that make a form a worse choice for a cell than an untagged competitor. */
const DEPRIORITIZED = new Set(["alternative", "obsolete", "archaic", "rare", "uncommon", "dated"]);

const has = (tags, t) => tags.includes(t);

/**
 * Which tense a tagged form belongs to, or null if it is not a finite conjugated form.
 * kaikki tags are an unordered set, so everything here matches on membership.
 */
export function tenseOf(tags) {
  if (has(tags, "imperative")) {
    return has(tags, "negative") ? "Imperative Negative/Present" : "Imperative Affirmative/Present";
  }
  // Conditional is tagged as its own thing; Jehle files it under Indicative and so do we.
  if (has(tags, "conditional")) return "Indicative/Conditional";

  const mood = has(tags, "subjunctive") ? "Subjunctive" : has(tags, "indicative") ? "Indicative" : null;
  if (!mood) return null; // principal parts (infinitive, gerund, participle) and header rows

  if (has(tags, "present")) return `${mood}/Present`;
  if (has(tags, "imperfect")) {
    // Spanish has two imperfect subjunctives (hablara / hablase). Jehle ships only the
    // -ra set; kaikki has both, and the -se set is kept as its own tense.
    if (mood === "Subjunctive" && has(tags, "imperfect-se")) return "Subjunctive/Imperfect (-se)";
    return `${mood}/Imperfect`;
  }
  if (has(tags, "preterite")) return `${mood}/Preterite`;
  if (has(tags, "future")) return `${mood}/Future`;
  return null;
}

/**
 * Which display slot a tagged form fills, or null.
 *
 * The formal second person is usted/ustedes, which share their forms with the third
 * person — that is why the imperative's "hable" lands in the él/ella/usted slot, exactly
 * where Jehle puts it. Voseo forms are skipped: this is a Mexico-leaning notebook (§3)
 * and vos would silently overwrite the tú cell with a form the owner will not hear.
 */
export function slotOf(tags) {
  if (has(tags, "vos-form") || has(tags, "with-vos")) return null;

  const plural = has(tags, "plural");
  const singular = has(tags, "singular");
  if (!plural && !singular) return null;

  if (has(tags, "first-person")) return plural ? "nosotros" : "yo";
  if (has(tags, "third-person")) return plural ? "ustedes/ellos" : "él/ella/usted";
  if (has(tags, "second-person")) {
    if (has(tags, "formal")) return plural ? "ustedes/ellos" : "él/ella/usted";
    return plural ? "vosotros" : "tú";
  }
  return null;
}

/**
 * Builds a conjugation table from one kaikki verb record's `forms[]`.
 * Returns null when the record carries no usable conjugation at all.
 */
export function extractFromKaikki(record) {
  const tenses = {};
  const preferredCell = {}; // "tense|slot" -> filled by a non-deprioritized form
  let gerund = "", pastParticiple = "";

  for (const f of record.forms || []) {
    const form = (f.form || "").trim();
    const tags = f.tags || [];
    if (!form || form === "-" || tags.some((t) => NOT_A_FORM.has(t))) continue;

    // Combined forms are clitic pile-ups (dímelo, dárselo). They are real Spanish and
    // stay in the search index, but they are not cells of a conjugation table.
    if (has(tags, "combined-form")) continue;

    if (!gerund && has(tags, "gerund")) gerund = form;
    if (!pastParticiple && has(tags, "participle") && has(tags, "past") && !has(tags, "feminine") && !has(tags, "plural")) {
      pastParticiple = form;
    }

    const tense = tenseOf(tags);
    const slot = tense && slotOf(tags);
    if (!tense || !slot) continue;

    // kaikki stores the bare subjunctive for negative imperatives ("abandones"); Jehle
    // stores what you actually say ("no abandones"). Normalizing to Jehle's convention is
    // what makes the two sources comparable — and it is also the more useful form to show,
    // since the negative imperative does not exist without its "no".
    const cell = tense === "Imperative Negative/Present" && !/^no\s/i.test(form) ? `no ${form}` : form;

    if (!tenses[tense]) tenses[tense] = {};
    const preferred = !tags.some((t) => DEPRIORITIZED.has(t));
    const key = `${tense}|${slot}`;

    // First writer wins, except that a preferred form may replace a deprioritized one.
    if (!tenses[tense][slot] || (preferred && !preferredCell[key])) {
      tenses[tense][slot] = cell;
      preferredCell[key] = preferred;
    }
  }

  if (!Object.keys(tenses).length) return null;
  return { source: "wiktionary", gerund, pastParticiple, tenses };
}

/**
 * Builds the same shape from Jehle's CSV rows for one verb.
 * Jehle's stored perfect tenses are dropped: they are recomposed from haber (see
 * 06-conjugate.mjs) because some of them are corrupt — cepillar's past perfect reads
 * "cepillía cepillado" where it should read "había cepillado".
 */
export function extractFromJehle(rows, { keepPerfect = false } = {}) {
  const tenses = {};
  for (const r of rows) {
    const label = `${r.mood_english}/${r.tense_english}`;
    const tense = {};
    const cells = {
      yo: r.form_1s, "tú": r.form_2s, "él/ella/usted": r.form_3s,
      nosotros: r.form_1p, "ustedes/ellos": r.form_3p, vosotros: r.form_2p,
    };
    for (const [slot, value] of Object.entries(cells)) if (value) tense[slot] = value;
    if (Object.keys(tense).length) tenses[label] = tense;
  }
  if (!keepPerfect) {
    for (const label of Object.keys(tenses)) {
      if (/Perfect|Preterite \(Archaic\)/.test(label)) delete tenses[label];
    }
  }
  const first = rows[0] || {};
  return {
    source: "jehle",
    gerund: first.gerund || "",
    pastParticiple: first.pastparticiple || "",
    tenses,
  };
}

/** Cell-by-cell comparison of two tables, used to validate the extractor against Jehle. */
export function compareTables(a, b, { tenses }) {
  const differ = [], missing = [];
  let agree = 0;
  for (const tense of tenses) {
    const ta = a.tenses[tense] || {}, tb = b.tenses[tense] || {};
    for (const slot of expectedSlots(tense)) {
      const va = ta[slot] || "", vb = tb[slot] || "";
      if (!va || !vb) {
        if (va || vb) missing.push({ tense, slot, a: va, b: vb });
        continue;
      }
      if (va.normalize("NFC") === vb.normalize("NFC")) agree++;
      else differ.push({ tense, slot, a: va, b: vb });
    }
  }
  return { agree, differ, missing, compared: agree + differ.length };
}

/** A table with its perfect tenses materialized — used only for validation and inspection. */
export const withPerfectTenses = (table, haberTenses) => ({
  ...table,
  tenses: { ...table.tenses, ...composePerfectTenses(table, haberTenses) },
});

export { SLOTS as DISPLAY_SLOTS };
