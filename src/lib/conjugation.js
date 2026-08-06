/**
 * The shape of a conjugation table, and the rules for reading one.
 *
 * Shared with the build pipeline (pipeline/lib/conjugation.mjs imports this file) for the
 * same reason src/lib/normalize.js is shared: the pipeline writes these tables and the app
 * renders them, so a second copy of the rules would eventually disagree with the first.
 *
 * Only the ten SIMPLE tenses are stored. The eight perfect tenses are "haber + past
 * participle" without exception, so they are composed on demand instead of shipped —
 * which is 322 KB less to download and about 5 MB less to keep on the phone. The
 * composition is validated against Fred Jehle's independently produced tables during the
 * build (99.8% of 57,580 cells) rather than assumed correct.
 */

/** Display slots, in order. ustedes-first, vosotros last — this is a Latin American notebook (brief §3). */
export const SLOTS = ["yo", "tú", "él/ella/usted", "nosotros", "ustedes/ellos", "vosotros"];

/** Vosotros is kept but shown collapsed (brief §3); which slots that means is a UI decision, not data. */
export const COLLAPSED_SLOTS = new Set(["vosotros"]);

export const SIMPLE_TENSES = [
  "Indicative/Present",
  "Indicative/Imperfect",
  "Indicative/Preterite",
  "Indicative/Future",
  "Indicative/Conditional",
  "Subjunctive/Present",
  "Subjunctive/Imperfect",
  "Subjunctive/Imperfect (-se)",
  "Subjunctive/Future",
  "Imperative Affirmative/Present",
  "Imperative Negative/Present",
];

/** Perfect tense → the tense of `haber` that builds it. */
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

/** The conjugation table of haber, which every perfect tense is built from. */
export const HABER_CONJUGATION_ID = "conj:wikt:haber";

/**
 * Which slots a tense can actually fill. Spanish has no first-person singular imperative
 * — you cannot command yourself — so a table missing that cell is complete, not broken.
 */
export const expectedSlots = (tense) =>
  tense.startsWith("Imperative") ? SLOTS.filter((s) => s !== "yo") : SLOTS;

/** The reflexive pronoun each slot takes. In a perfect tense it goes BEFORE the auxiliary. */
const REFLEXIVE_PRONOUN = {
  yo: "me", "tú": "te", "él/ella/usted": "se",
  nosotros: "nos", "ustedes/ellos": "se", vosotros: "os",
};

/**
 * Whether this is a pronominal verb, judged by its own conjugated forms rather than by the
 * lemma's spelling: *arrepentirse* is reflexive but nothing about *coser* is, and both end
 * in -se. The source writes the pronoun into the simple forms ("me arrepiento"), so its
 * presence there is the reliable signal.
 */
export function isPronominal(table) {
  const present = table?.tenses?.["Indicative/Present"];
  return Boolean(present && /^(me|te|se|nos|os)\s/.test(present.yo || ""));
}

/**
 * Returns the eight perfect tenses for a verb. `haberTenses` is the tenses object of the
 * haber table. Returns {} when the verb has no participle, rather than half a table.
 */
export function composePerfectTenses(table, haberTenses) {
  if (!table?.pastParticiple || !haberTenses) return {};
  const reflexive = isPronominal(table);
  const built = {};

  for (const [perfect, simple] of Object.entries(PERFECT_TENSES)) {
    const aux = haberTenses[simple];
    if (!aux) continue;
    const tense = {};
    let filled = 0;
    for (const slot of SLOTS) {
      if (!aux[slot]) continue;
      const prefix = reflexive ? `${REFLEXIVE_PRONOUN[slot]} ` : "";
      tense[slot] = `${prefix}${aux[slot]} ${table.pastParticiple}`;
      filled++;
    }
    if (filled) built[perfect] = tense;
  }
  return built;
}

/**
 * Tables are keyed "Mood/Tense", so the tense alone is the useful heading under a mood
 * grouping. The imperative is the exception: both its tables are "Present", and what
 * actually distinguishes them lives in the mood — affirmative versus negative.
 *
 * Shared by the dictionary's tables and the Phase 7c drill, so a tense is never named one
 * thing while being practised under another.
 */
export function tenseHeading(label) {
  const [mood, tense] = String(label || "").split("/");
  if (mood.startsWith("Imperative")) return mood.replace("Imperative", "").trim() || tense;
  return tense || label;
}

/** Every tense of a verb, simple ones as stored plus the composed perfects. */
export function allTenses(table, haberTable) {
  if (!table) return {};
  return { ...table.tenses, ...composePerfectTenses(table, haberTable?.tenses) };
}
