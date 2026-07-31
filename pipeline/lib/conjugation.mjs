/**
 * Conjugation tables: one shape, two sources.
 *
 * Fred Jehle's database covers 637 verbs; the dictionary needs ~1,800. The brief's plan
 * was to generate the rest from rules, and DECISIONS.md warned that "regular" is a trap —
 * madrugar is regular but its preterite is *madrugué*, not *madrugé*.
 *
 * kaikki makes that unnecessary. Every Spanish verb record carries a fully tagged
 * conjugation table in `forms[]`, written by Wiktionary editors who already handled the
 * stem changes (e→ie), the -gar/-car/-zar spelling rules, and every irregular. Extracting
 * a table inherits all of that; a hand-written generator would have to re-earn it. And
 * because 554 verbs appear in BOTH sources, the extractor can be checked cell by cell
 * against Jehle rather than trusted (see 06-conjugate.mjs).
 *
 * Both sources produce the same shape, so the app renders one table and never branches:
 *
 *   { source, gerund, pastParticiple, tenses: { "Indicative/Present": { yo, tú, … } } }
 *
 * Slots are ustedes-first per brief §3: "ustedes/ellos" is a first-class row and vosotros
 * is kept but marked collapsed, because this is a Latin American notebook.
 */

/** The six display slots of a tense, in the order the app shows them. */
export const SLOTS = ["yo", "tú", "él/ella/usted", "nosotros", "ustedes/ellos", "vosotros"];

/**
 * The ten simple tenses. The other eight Jehle tenses are perfect (compound) tenses,
 * which are mechanically "haber + past participle" and are composed rather than stored.
 */
export const SIMPLE_TENSES = [
  "Indicative/Present",
  "Indicative/Imperfect",
  "Indicative/Preterite",
  "Indicative/Future",
  "Indicative/Conditional",
  "Subjunctive/Present",
  "Subjunctive/Imperfect",
  "Subjunctive/Future",
  "Imperative Affirmative/Present",
  "Imperative Negative/Present",
];

/** Perfect tense → the simple tense of `haber` that builds it (brief §3 display order). */
export const PERFECT_TENSES = {
  "Indicative/Present Perfect": "Indicative/Present",
  "Indicative/Past Perfect": "Indicative/Imperfect",
  "Indicative/Preterite (Archaic)": "Indicative/Preterite",
  "Indicative/Future Perfect": "Indicative/Future",
  "Indicative/Conditional Perfect": "Indicative/Conditional",
  "Subjunctive/Present Perfect": "Subjunctive/Present",
  "Subjunctive/Past Perfect": "Subjunctive/Imperfect",
  "Subjunctive/Future Perfect": "Subjunctive/Future",
};

/**
 * Which slots a tense can actually fill. Spanish has no first-person singular imperative
 * — you cannot command yourself — so a table missing that cell is complete, not broken.
 */
export const expectedSlots = (tense) =>
  tense.startsWith("Imperative") ? SLOTS.filter((s) => s !== "yo") : SLOTS;

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

const emptyTense = () => ({
  yo: "", "tú": "", "él/ella/usted": "", nosotros: "", "ustedes/ellos": "",
  vosotros: { form: "", collapsed: true },
});

const setSlot = (tense, slot, form) => {
  if (slot === "vosotros") tense.vosotros = { form, collapsed: true };
  else tense[slot] = form;
};

const getSlot = (tense, slot) => (slot === "vosotros" ? tense.vosotros.form : tense[slot]);

/**
 * Builds a conjugation table from one kaikki verb record's `forms[]`.
 * Returns null when the record carries no usable conjugation at all.
 */
export function extractFromKaikki(record) {
  const tenses = {};
  const quality = {}; // "tense|slot" -> true when filled by a non-deprioritized form
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
    // stores what you actually say ("no abandones"). Normalizing to Jehle's convention
    // is what makes the two sources comparable — and it is also the more useful form to
    // show, since the negative imperative does not exist without its "no".
    const cell = tense === "Imperative Negative/Present" && !/^no\s/i.test(form) ? `no ${form}` : form;

    if (!tenses[tense]) tenses[tense] = emptyTense();
    const preferred = !tags.some((t) => DEPRIORITIZED.has(t));
    const key = `${tense}|${slot}`;
    const existing = getSlot(tenses[tense], slot);

    // First writer wins, except that a preferred form may replace a deprioritized one.
    if (!existing || (preferred && !quality[key])) {
      setSlot(tenses[tense], slot, cell);
      quality[key] = preferred;
    }
  }

  if (!Object.keys(tenses).length) return null;
  return { source: "wiktionary", gerund, pastParticiple, tenses };
}

/**
 * The reflexive pronoun each slot takes. In a perfect tense it goes BEFORE the auxiliary
 * — "me he arrepentido", never "he me arrepentido".
 */
const REFLEXIVE_PRONOUN = {
  yo: "me", "tú": "te", "él/ella/usted": "se",
  nosotros: "nos", "ustedes/ellos": "se", vosotros: "os",
};

/**
 * Whether this is a pronominal verb, judged by its own conjugated forms rather than by the
 * lemma's spelling: "arrepentirse" is reflexive but so is nothing about "coser", which also
 * ends in -se. kaikki writes the pronoun into the simple forms ("me arrepiento"), so its
 * presence there is the reliable signal.
 */
export function isPronominal(table) {
  const present = table.tenses?.["Indicative/Present"];
  return Boolean(present && /^(me|te|se|nos|os)\s/.test(getSlot(present, "yo") || ""));
}

/**
 * Composes the eight perfect tenses from haber's simple tenses plus this verb's participle.
 * Deterministic — every Spanish perfect tense is haber + past participle — so it is done
 * once here rather than in the app, which keeps both sources rendering identically.
 */
export function addPerfectTenses(table, haberTenses) {
  if (!table.pastParticiple) return table;
  const reflexive = isPronominal(table);

  for (const [perfect, simple] of Object.entries(PERFECT_TENSES)) {
    const aux = haberTenses[simple];
    if (!aux) continue;
    const built = emptyTense();
    let filled = 0;
    for (const slot of SLOTS) {
      const auxForm = getSlot(aux, slot);
      if (!auxForm) continue;
      const prefix = reflexive ? `${REFLEXIVE_PRONOUN[slot]} ` : "";
      setSlot(built, slot, `${prefix}${auxForm} ${table.pastParticiple}`);
      filled++;
    }
    if (filled) table.tenses[perfect] = built;
  }
  return table;
}

/** Builds the same shape from Jehle's CSV rows for one verb. */
export function extractFromJehle(rows) {
  const tenses = {};
  for (const r of rows) {
    const label = `${r.mood_english}/${r.tense_english}`;
    tenses[label] = {
      yo: r.form_1s || "",
      "tú": r.form_2s || "",
      "él/ella/usted": r.form_3s || "",
      nosotros: r.form_1p || "",
      "ustedes/ellos": r.form_3p || "",
      vosotros: { form: r.form_2p || "", collapsed: true },
    };
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
export function compareTables(a, b, { tenses = SIMPLE_TENSES } = {}) {
  const agree = [], differ = [], missing = [];
  for (const tense of tenses) {
    const ta = a.tenses[tense], tb = b.tenses[tense];
    for (const slot of expectedSlots(tense)) {
      const va = ta ? getSlot(ta, slot) : "";
      const vb = tb ? getSlot(tb, slot) : "";
      if (!va || !vb) {
        if (va || vb) missing.push({ tense, slot, a: va, b: vb });
        continue;
      }
      if (va.normalize("NFC") === vb.normalize("NFC")) agree.push({ tense, slot });
      else differ.push({ tense, slot, a: va, b: vb });
    }
  }
  return { agree: agree.length, differ, missing, compared: agree.length + differ.length };
}

export { getSlot, setSlot };
