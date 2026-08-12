import { COLLAPSED_SLOTS, SIMPLE_TENSES, SLOTS } from "./conjugation.js";

/**
 * Teaching-oriented conjugation-pattern analysis.
 *
 * The pipeline and the browser both import this module. It deliberately depends only on
 * plain strings and the shared conjugation constants: package assignments, package
 * verification, and what the owner sees must never be three subtly different classifiers.
 *
 * A pattern is assigned only when the shipped table contains every evidence cell the
 * lesson needs. Lemma spelling narrows a spelling-preservation rule, but never establishes
 * one on its own.
 */

const PRESENT = "Indicative/Present";
const PRETERITE = "Indicative/Preterite";
const FUTURE = "Indicative/Future";
const CONDITIONAL = "Indicative/Conditional";
const SUBJUNCTIVE_PRESENT = "Subjunctive/Present";
const AFFIRMATIVE_COMMAND = "Imperative Affirmative/Present";

const VISIBLE_EVIDENCE_SLOTS = new Set(SLOTS.filter((slot) => !COLLAPSED_SLOTS.has(slot)));

export const PATTERN_DEFINITIONS = Object.freeze({
  "stem:e-ie_then_e-i": {
    title: "The stem changes e → ie, then e → i",
    explanation: "Stressed forms use ie; the preterite and gerund use i.",
    priority: 10,
  },
  "stem:o-ue_then_o-u": {
    title: "The stem changes o → ue, then o → u",
    explanation: "Stressed forms use ue; the preterite and gerund use u.",
    priority: 11,
  },
  "stem:e-i": {
    title: "The stem changes e → i",
    explanation: "The same vowel shift connects the present, preterite, and gerund.",
    priority: 12,
  },
  "stem:e-ie": {
    title: "The stem changes e → ie when stressed",
    explanation: "The change appears in stressed forms but not in nosotros.",
    priority: 13,
  },
  "stem:o-ue": {
    title: "The stem changes o → ue when stressed",
    explanation: "The change appears in stressed forms but not in nosotros.",
    priority: 14,
  },
  "stem:u-ue": {
    title: "The stem changes u → ue when stressed",
    explanation: "Jugar has this useful change, but the current dictionary has no sibling family for it.",
    priority: 15,
  },
  "stem:i-accent": {
    title: "The stem keeps a stressed í",
    explanation: "The written accent appears in stressed forms but not in nosotros.",
    priority: 16,
  },
  "stem:u-accent": {
    title: "The stem keeps a stressed ú",
    explanation: "The written accent appears in stressed forms but not in nosotros.",
    priority: 17,
  },
  "present:haber": {
    title: "Haber has a compact present-tense set",
    explanation: "These short forms also build every perfect tense.",
    priority: 20,
  },
  "present:yo-go": {
    title: "The yo form ends in -go",
    explanation: "That special yo stem also carries into the present subjunctive.",
    priority: 21,
  },
  "present:yo-zco": {
    title: "The yo form ends in -zco",
    explanation: "The zc spelling also carries into the present subjunctive.",
    priority: 22,
  },
  "present:yo-y": {
    title: "The yo form ends in -y",
    explanation: "A small group of very common verbs shares this unusual present ending.",
    priority: 23,
  },
  "spelling:c-qu": {
    title: "c becomes qu before e",
    explanation: "The spelling changes to keep the hard c sound.",
    priority: 30,
  },
  "spelling:g-gu": {
    title: "g becomes gu before e",
    explanation: "The spelling changes to keep the hard g sound.",
    priority: 31,
  },
  "spelling:z-c": {
    title: "z becomes c before e",
    explanation: "The spelling follows Spanish spelling rules while the sound stays connected.",
    priority: 32,
  },
  "spelling:g-j": {
    title: "g becomes j before o or a",
    explanation: "The spelling changes so the stem keeps its sound.",
    priority: 33,
  },
  "spelling:gu-g": {
    title: "Silent u drops before o or a",
    explanation: "The gu spelling becomes g where the following vowel no longer needs the silent u.",
    priority: 34,
  },
  "spelling:gu-diaeresis": {
    title: "gu becomes gü before e",
    explanation: "The diaeresis shows that the u is pronounced.",
    priority: 35,
  },
  "spelling:i-y": {
    title: "i becomes y between vowels",
    explanation: "The change appears in the preterite and gerund.",
    priority: 36,
  },
  "preterite:ser-ir": {
    title: "Ser and ir share these preterite forms",
    explanation: "Context tells the two verbs apart because the whole preterite set is shared.",
    priority: 40,
  },
  "preterite:short-unaccented": {
    title: "The preterite is short and unaccented",
    explanation: "Dar and ver use compact forms without the usual written accents.",
    priority: 41,
  },
  "preterite:uv-stem": {
    title: "The preterite uses a strong uv stem",
    explanation: "The special stem takes the unaccented strong-preterite endings.",
    priority: 42,
  },
  "preterite:u-stem": {
    title: "The preterite uses a strong u stem",
    explanation: "The special stem takes the unaccented strong-preterite endings.",
    priority: 43,
  },
  "preterite:i-stem": {
    title: "The preterite uses a strong i stem",
    explanation: "The special stem takes the unaccented strong-preterite endings.",
    priority: 44,
  },
  "preterite:j-stem": {
    title: "The preterite uses a strong j stem",
    explanation: "The j stem uses -eron rather than -ieron in the third-person plural.",
    priority: 45,
  },
  "preterite:strong-other": {
    title: "The preterite uses a special strong stem",
    explanation: "The special stem takes the unaccented strong-preterite endings.",
    priority: 46,
  },
  "future:dr-stem": {
    title: "The future and conditional use a -dr- stem",
    explanation: "The endings stay familiar, but they attach to a shortened stem.",
    priority: 50,
  },
  "future:shortened-stem": {
    title: "The future and conditional shorten the stem",
    explanation: "The usual endings attach to a shorter form of the infinitive.",
    priority: 51,
  },
  "future:har-stem": {
    title: "The future and conditional use har-",
    explanation: "Hacer replaces its infinitive stem before the usual endings.",
    priority: 52,
  },
  "future:dir-stem": {
    title: "The future and conditional use dir-",
    explanation: "Decir replaces its infinitive stem before the usual endings.",
    priority: 53,
  },
  "gerund:e-i": {
    title: "The gerund changes e → i",
    explanation: "The vowel shift appears before -iendo.",
    priority: 60,
  },
  "gerund:o-u": {
    title: "The gerund changes o → u",
    explanation: "The vowel shift appears before -iendo.",
    priority: 61,
  },
  "gerund:yendo": {
    title: "The gerund uses -yendo",
    explanation: "A y keeps adjacent vowels from running together.",
    priority: 62,
  },
  "participle:to": {
    title: "The past participle is irregular",
    explanation: "This family uses a participle ending in -to instead of regular -ado or -ido.",
    priority: 63,
  },
  "participle:cho": {
    title: "The past participle is irregular",
    explanation: "This family uses a participle ending in -cho instead of regular -ado or -ido.",
    priority: 64,
  },
  "command:affirmative-tu-irregular": {
    title: "The affirmative tú command is irregular",
    explanation: "This short command belongs to the familiar ven-di-sal-haz-ten-ve-pon-sé set.",
    priority: 70,
  },
});

export const KNOWN_CONJUGATION_PATTERN_IDS = Object.freeze(Object.keys(PATTERN_DEFINITIONS));

const ENDINGS = Object.freeze({
  ar: {
    "Indicative/Present": { yo: "o", "tú": "as", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "áis" },
    "Indicative/Imperfect": { yo: "aba", "tú": "abas", "él/ella/usted": "aba", nosotros: "ábamos", "ustedes/ellos": "aban", vosotros: "abais" },
    "Indicative/Preterite": { yo: "é", "tú": "aste", "él/ella/usted": "ó", nosotros: "amos", "ustedes/ellos": "aron", vosotros: "asteis" },
    "Subjunctive/Present": { yo: "e", "tú": "es", "él/ella/usted": "e", nosotros: "emos", "ustedes/ellos": "en", vosotros: "éis" },
    "Subjunctive/Imperfect": { yo: "ara", "tú": "aras", "él/ella/usted": "ara", nosotros: "áramos", "ustedes/ellos": "aran", vosotros: "arais" },
    "Subjunctive/Imperfect (-se)": { yo: "ase", "tú": "ases", "él/ella/usted": "ase", nosotros: "ásemos", "ustedes/ellos": "asen", vosotros: "aseis" },
    "Subjunctive/Future": { yo: "are", "tú": "ares", "él/ella/usted": "are", nosotros: "áremos", "ustedes/ellos": "aren", vosotros: "areis" },
    "Imperative Affirmative/Present": { "tú": "a", "él/ella/usted": "e", nosotros: "emos", "ustedes/ellos": "en", vosotros: "ad" },
    "Imperative Negative/Present": { "tú": "es", "él/ella/usted": "e", nosotros: "emos", "ustedes/ellos": "en", vosotros: "éis" },
  },
  er: {
    "Indicative/Present": { yo: "o", "tú": "es", "él/ella/usted": "e", nosotros: "emos", "ustedes/ellos": "en", vosotros: "éis" },
    "Indicative/Imperfect": { yo: "ía", "tú": "ías", "él/ella/usted": "ía", nosotros: "íamos", "ustedes/ellos": "ían", vosotros: "íais" },
    "Indicative/Preterite": { yo: "í", "tú": "iste", "él/ella/usted": "ió", nosotros: "imos", "ustedes/ellos": "ieron", vosotros: "isteis" },
    "Subjunctive/Present": { yo: "a", "tú": "as", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "áis" },
    "Subjunctive/Imperfect": { yo: "iera", "tú": "ieras", "él/ella/usted": "iera", nosotros: "iéramos", "ustedes/ellos": "ieran", vosotros: "ierais" },
    "Subjunctive/Imperfect (-se)": { yo: "iese", "tú": "ieses", "él/ella/usted": "iese", nosotros: "iésemos", "ustedes/ellos": "iesen", vosotros: "ieseis" },
    "Subjunctive/Future": { yo: "iere", "tú": "ieres", "él/ella/usted": "iere", nosotros: "iéremos", "ustedes/ellos": "ieren", vosotros: "iereis" },
    "Imperative Affirmative/Present": { "tú": "e", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "ed" },
    "Imperative Negative/Present": { "tú": "as", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "áis" },
  },
  ir: {
    "Indicative/Present": { yo: "o", "tú": "es", "él/ella/usted": "e", nosotros: "imos", "ustedes/ellos": "en", vosotros: "ís" },
    "Indicative/Imperfect": { yo: "ía", "tú": "ías", "él/ella/usted": "ía", nosotros: "íamos", "ustedes/ellos": "ían", vosotros: "íais" },
    "Indicative/Preterite": { yo: "í", "tú": "iste", "él/ella/usted": "ió", nosotros: "imos", "ustedes/ellos": "ieron", vosotros: "isteis" },
    "Subjunctive/Present": { yo: "a", "tú": "as", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "áis" },
    "Subjunctive/Imperfect": { yo: "iera", "tú": "ieras", "él/ella/usted": "iera", nosotros: "iéramos", "ustedes/ellos": "ieran", vosotros: "ierais" },
    "Subjunctive/Imperfect (-se)": { yo: "iese", "tú": "ieses", "él/ella/usted": "iese", nosotros: "iésemos", "ustedes/ellos": "iesen", vosotros: "ieseis" },
    "Subjunctive/Future": { yo: "iere", "tú": "ieres", "él/ella/usted": "iere", nosotros: "iéremos", "ustedes/ellos": "ieren", vosotros: "iereis" },
    "Imperative Affirmative/Present": { "tú": "e", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "id" },
    "Imperative Negative/Present": { "tú": "as", "él/ella/usted": "a", nosotros: "amos", "ustedes/ellos": "an", vosotros: "áis" },
  },
});

const FUTURE_ENDINGS = { yo: "é", "tú": "ás", "él/ella/usted": "á", nosotros: "emos", "ustedes/ellos": "án", vosotros: "éis" };
const CONDITIONAL_ENDINGS = { yo: "ía", "tú": "ías", "él/ella/usted": "ía", nosotros: "íamos", "ustedes/ellos": "ían", vosotros: "íais" };

export const canonicalConjugationLemma = (lemma) => String(lemma || "").trim().normalize("NFC").toLowerCase();

function infinitiveInfo(lemma) {
  const canonical = canonicalConjugationLemma(lemma);
  const pronominal = /se$/.test(canonical);
  const bare = pronominal ? canonical.slice(0, -2) : canonical;
  const match = bare.match(/([aáeéií])r$/);
  if (!match) return null;
  const verbClass = ({ a: "ar", "á": "ar", e: "er", "é": "er", i: "ir", "í": "ir" })[match[1]];
  const infinitive = `${bare.slice(0, -2)}${verbClass}`;
  return { lemma: canonical, bare, infinitive, stem: infinitive.slice(0, -2), verbClass, pronominal };
}

const cell = (table, tense, slot) => String(table?.tenses?.[tense]?.[slot] || "").normalize("NFC");

function regularFinite(info, tense, slot) {
  const futureEnding = tense === FUTURE ? FUTURE_ENDINGS[slot] : tense === CONDITIONAL ? CONDITIONAL_ENDINGS[slot] : null;
  if (futureEnding !== null) return futureEnding === undefined ? "" : `${info.infinitive}${futureEnding}`;
  const ending = ENDINGS[info.verbClass]?.[tense]?.[slot];
  if (ending === undefined) return "";
  const prefix = tense === "Imperative Negative/Present" ? "no " : "";
  return `${prefix}${info.stem}${ending}`;
}

function regularPrincipal(info, kind) {
  if (kind === "gerund") return `${info.stem}${info.verbClass === "ar" ? "ando" : "iendo"}`;
  return `${info.stem}${info.verbClass === "ar" ? "ado" : "ido"}`;
}

export function regularConjugationModel(lemma) {
  const info = infinitiveInfo(lemma);
  if (!info || info.pronominal) return null;
  const tenses = {};
  for (const tense of SIMPLE_TENSES) {
    const row = {};
    for (const slot of SLOTS) {
      const form = regularFinite(info, tense, slot);
      if (form) row[slot] = form;
    }
    tenses[tense] = row;
  }
  return {
    gerund: regularPrincipal(info, "gerund"),
    pastParticiple: regularPrincipal(info, "participle"),
    tenses,
  };
}

function exactRegular(info, table) {
  if (!info || info.pronominal) return false;
  const model = regularConjugationModel(info.infinitive);
  if (!model || String(table?.gerund || "").normalize("NFC") !== model.gerund ||
      String(table?.pastParticiple || "").normalize("NFC") !== model.pastParticiple) return false;
  return SIMPLE_TENSES.every((tense) =>
    Object.entries(model.tenses[tense]).every(([slot, expected]) => cell(table, tense, slot) === expected)
  );
}

function lastReplacement(stem, from, to) {
  const index = stem.lastIndexOf(from);
  return index < 0 ? null : { stem: `${stem.slice(0, index)}${to}${stem.slice(index + from.length)}`, index };
}

function surfaceStem(info, stem, ending) {
  return info.infinitive.endsWith("guir") && /^(?:o|a)/.test(ending) && stem.endsWith("gu")
    ? stem.slice(0, -1)
    : stem;
}

function changedFinite(info, from, to, tense, slot) {
  const changed = lastReplacement(info.stem, from, to);
  const ending = ENDINGS[info.verbClass]?.[tense]?.[slot];
  if (!changed || ending === undefined) return "";
  return `${surfaceStem(info, changed.stem, ending)}${ending}`;
}

function changedGerund(info, from, to) {
  const changed = lastReplacement(info.stem, from, to);
  if (!changed) return "";
  return `${changed.stem}${info.verbClass === "ar" ? "ando" : "iendo"}`;
}

function rangeFor(form, token, { last = true } = {}) {
  const index = last ? form.lastIndexOf(token) : form.indexOf(token);
  return index < 0 ? [] : [[index, index + token.length]];
}

function wholeRange(form) {
  return form ? [[0, form.length]] : [];
}

function evidence(label, form, token = null, extra = {}) {
  return {
    label,
    form,
    emphasis: token ? rangeFor(form, token, extra) : wholeRange(form),
    ...extra.meta,
  };
}

function cellEvidence(table, tense, slot, token = null, meta = {}) {
  const form = cell(table, tense, slot);
  return evidence(slot, form, token, { meta: { source: "cell", tense, slot, ...meta } });
}

function principalEvidence(table, kind, token = null, meta = {}) {
  const form = String(kind === "gerund" ? table?.gerund || "" : table?.pastParticiple || "").normalize("NFC");
  return evidence(kind === "gerund" ? "gerundio" : "participio", form, token, {
    meta: { source: kind, ...meta },
  });
}

function notice(id, evidenceRows, overrides = {}) {
  const definition = PATTERN_DEFINITIONS[id];
  return {
    id,
    title: definition.title,
    explanation: definition.explanation,
    priority: definition.priority,
    evidence: evidenceRows,
    ...overrides,
  };
}

function stemNotice(id, table, changedToken, unchangedToken, thirdToken = changedToken) {
  return notice(id, [
    cellEvidence(table, PRESENT, "yo", changedToken, { role: "changed" }),
    cellEvidence(table, PRESENT, "nosotros", unchangedToken, { role: "contrast" }),
    cellEvidence(table, PRETERITE, "ustedes/ellos", thirdToken, { role: "changed" }),
  ]);
}

function presentStemNotice(id, table, changedToken, unchangedToken) {
  return notice(id, [
    cellEvidence(table, PRESENT, "yo", changedToken, { role: "changed" }),
    cellEvidence(table, PRESENT, "nosotros", unchangedToken, { role: "contrast" }),
    cellEvidence(table, PRESENT, "ustedes/ellos", changedToken, { role: "changed" }),
  ]);
}

function matchesStemPresent(info, table, from, to) {
  return cell(table, PRESENT, "yo") === changedFinite(info, from, to, PRESENT, "yo") &&
    cell(table, PRESENT, "nosotros") === regularFinite(info, PRESENT, "nosotros") &&
    cell(table, PRESENT, "ustedes/ellos") === changedFinite(info, from, to, PRESENT, "ustedes/ellos");
}

function matchesChangedPast(info, table, from, to) {
  return cell(table, PRETERITE, "ustedes/ellos") === changedFinite(info, from, to, PRETERITE, "ustedes/ellos") &&
    String(table?.gerund || "").normalize("NFC") === changedGerund(info, from, to);
}

function strongPreteriteStem(table) {
  const yo = cell(table, PRETERITE, "yo");
  const nosotros = cell(table, PRETERITE, "nosotros");
  const plural = cell(table, PRETERITE, "ustedes/ellos");
  if (!yo || yo.endsWith("é") || !yo.endsWith("e") || !nosotros.endsWith("imos")) return null;
  const yoStem = yo.slice(0, -1);
  const nosotrosStem = nosotros.slice(0, -4);
  const pluralEnding = plural.endsWith("ieron") ? "ieron" : plural.endsWith("eron") ? "eron" : "";
  if (!pluralEnding) return null;
  const pluralStem = plural.slice(0, -pluralEnding.length);
  return yoStem && yoStem === nosotrosStem && yoStem === pluralStem ? yoStem : null;
}

function futureStem(table) {
  const yo = cell(table, FUTURE, "yo");
  const nosotros = cell(table, FUTURE, "nosotros");
  const conditional = cell(table, CONDITIONAL, "yo");
  if (!yo.endsWith("é") || !nosotros.endsWith("emos") || !conditional.endsWith("ía")) return null;
  const stems = [yo.slice(0, -1), nosotros.slice(0, -4), conditional.slice(0, -2)];
  return stems[0] && stems.every((stem) => stem === stems[0]) ? stems[0] : null;
}

function hasCompleteEvidence(item) {
  return item.evidence.length > 0 && item.evidence.length <= 3 && item.evidence.every((row) => {
    if (!row.form || !row.emphasis?.length) return false;
    if (row.slot && !VISIBLE_EVIDENCE_SLOTS.has(row.slot)) return false;
    return row.emphasis.every(([start, end]) => Number.isInteger(start) && start >= 0 && end > start && end <= row.form.length);
  });
}

export function analyzeConjugationPatterns({ lemma, conjugation } = {}) {
  const info = infinitiveInfo(lemma);
  const table = conjugation;
  if (!info || !table?.tenses) return { regular: null, notices: [], patternIds: [] };

  if (exactRegular(info, table)) {
    const anchor = info.verbClass === "ar" ? "hablar" : info.verbClass === "er" ? "comer" : "vivir";
    return {
      regular: { class: info.verbClass, anchor },
      notices: [],
      patternIds: [],
    };
  }

  const found = new Map();
  const add = (item) => {
    if (item && hasCompleteEvidence(item) && !found.has(item.id)) found.set(item.id, item);
  };

  const eIe = matchesStemPresent(info, table, "e", "ie");
  const oUe = matchesStemPresent(info, table, "o", "ue");
  const uUe = matchesStemPresent(info, table, "u", "ue");
  const eI = matchesStemPresent(info, table, "e", "i");
  const ePastI = matchesChangedPast(info, table, "e", "i");
  const oPastU = matchesChangedPast(info, table, "o", "u");

  if (eIe && ePastI) add(stemNotice("stem:e-ie_then_e-i", table, "ie", "e", "i"));
  else if (eIe) add(presentStemNotice("stem:e-ie", table, "ie", "e"));

  if (oUe && oPastU) add(stemNotice("stem:o-ue_then_o-u", table, "ue", "o", "u"));
  else if (oUe) add(presentStemNotice("stem:o-ue", table, "ue", "o"));

  if (eI && ePastI) add(stemNotice("stem:e-i", table, "i", "e", "i"));
  if (uUe) add(presentStemNotice("stem:u-ue", table, "ue", "u"));
  if (matchesStemPresent(info, table, "i", "í")) add(presentStemNotice("stem:i-accent", table, "í", "i"));
  if (matchesStemPresent(info, table, "u", "ú")) add(presentStemNotice("stem:u-accent", table, "ú", "u"));

  if (info.lemma === "haber" && cell(table, PRESENT, "yo") === "he" &&
      cell(table, PRESENT, "nosotros") === "hemos" && cell(table, PRESENT, "ustedes/ellos") === "han") {
    add(notice("present:haber", [
      cellEvidence(table, PRESENT, "yo", "he"),
      cellEvidence(table, PRESENT, "nosotros", "hemos"),
      cellEvidence(table, PRESENT, "ustedes/ellos", "han"),
    ]));
  }

  const presentYo = cell(table, PRESENT, "yo");
  const subjunctiveYo = cell(table, SUBJUNCTIVE_PRESENT, "yo");
  if (["soy", "estoy", "voy", "doy"].includes(presentYo)) {
    add(notice("present:yo-y", [
      cellEvidence(table, PRESENT, "yo", "y"),
      cellEvidence(table, PRESENT, "nosotros"),
      cellEvidence(table, PRESENT, "ustedes/ellos"),
    ]));
  }
  if (presentYo.endsWith("zco") && subjunctiveYo.endsWith("zca")) {
    add(notice("present:yo-zco", [
      cellEvidence(table, PRESENT, "yo", "zc"),
      cellEvidence(table, PRESENT, "nosotros"),
      cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "zc"),
    ]));
  }

  const stem = info.stem;
  const preteriteYo = cell(table, PRETERITE, "yo");
  const preteriteNosotros = cell(table, PRETERITE, "nosotros");
  const preteritePlural = cell(table, PRETERITE, "ustedes/ellos");
  let guDrops = false;

  if (info.infinitive.endsWith("car")) {
    const changed = `${stem.slice(0, -1)}qu`;
    if (preteriteYo === `${changed}é` && preteriteNosotros === regularFinite(info, PRETERITE, "nosotros") && subjunctiveYo === `${changed}e`) {
      add(notice("spelling:c-qu", [
        cellEvidence(table, PRETERITE, "yo", "qu"),
        cellEvidence(table, PRETERITE, "nosotros", "c"),
        cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "qu"),
      ]));
    }
  }
  if (info.infinitive.endsWith("gar")) {
    const changed = `${stem.slice(0, -1)}gu`;
    if (preteriteYo === `${changed}é` && preteriteNosotros === regularFinite(info, PRETERITE, "nosotros") && subjunctiveYo === `${changed}e`) {
      add(notice("spelling:g-gu", [
        cellEvidence(table, PRETERITE, "yo", "gu"),
        cellEvidence(table, PRETERITE, "nosotros", "g"),
        cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "gu"),
      ]));
    }
  }
  if (info.infinitive.endsWith("zar")) {
    const changed = `${stem.slice(0, -1)}c`;
    if (preteriteYo === `${changed}é` && preteriteNosotros === regularFinite(info, PRETERITE, "nosotros") && subjunctiveYo === `${changed}e`) {
      add(notice("spelling:z-c", [
        cellEvidence(table, PRETERITE, "yo", "c"),
        cellEvidence(table, PRETERITE, "nosotros", "z"),
        cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "c"),
      ]));
    }
  }
  if (/(?:ger|gir)$/.test(info.infinitive) && !info.infinitive.endsWith("guir")) {
    const changed = `${stem.slice(0, -1)}j`;
    if (presentYo === `${changed}o` && cell(table, PRESENT, "nosotros") === regularFinite(info, PRESENT, "nosotros") && subjunctiveYo === `${changed}a`) {
      add(notice("spelling:g-j", [
        cellEvidence(table, PRESENT, "yo", "j"),
        cellEvidence(table, PRESENT, "nosotros", "g"),
        cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "j"),
      ]));
    }
  }
  if (info.infinitive.endsWith("guir")) {
    // seguir/conseguir also carry e→i underneath the spelling adjustment: sigu- becomes
    // sig- before o/a. Distinguir-type verbs only need the spelling adjustment.
    const underlying = eI ? lastReplacement(stem, "e", "i")?.stem || stem : stem;
    const changed = underlying.slice(0, -1);
    if (presentYo === `${changed}o` && subjunctiveYo === `${changed}a`) {
      guDrops = true;
      add(notice("spelling:gu-g", [
        cellEvidence(table, PRESENT, "yo", "g"),
        cellEvidence(table, PRESENT, "nosotros", "gu"),
        cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "g"),
      ]));
    }
  }
  if (info.infinitive.endsWith("guar")) {
    const changed = `${stem.slice(0, -2)}gü`;
    if (preteriteYo === `${changed}é` && preteriteNosotros === regularFinite(info, PRETERITE, "nosotros") && subjunctiveYo === `${changed}e`) {
      add(notice("spelling:gu-diaeresis", [
        cellEvidence(table, PRETERITE, "yo", "gü"),
        cellEvidence(table, PRETERITE, "nosotros", "gu"),
        cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "gü"),
      ]));
    }
  }

  const regularPreteriteYo = regularFinite(info, PRETERITE, "yo");
  const regularPreteritePlural = regularFinite(info, PRETERITE, "ustedes/ellos");
  const regularGerund = regularPrincipal(info, "gerund");
  const actualGerund = String(table?.gerund || "").normalize("NFC");
  const iY = preteriteYo === regularPreteriteYo &&
    preteritePlural === regularPreteritePlural.replace(/ieron$/, "yeron") &&
    actualGerund === regularGerund.replace(/iendo$/, "yendo") && regularGerund.endsWith("iendo");
  if (iY) {
    add(notice("spelling:i-y", [
      cellEvidence(table, PRETERITE, "yo", "í", { role: "contrast" }),
      cellEvidence(table, PRETERITE, "ustedes/ellos", "y", { role: "changed" }),
      principalEvidence(table, "gerund", "y", { role: "changed" }),
    ]));
  }

  if (!guDrops && presentYo.endsWith("go") && subjunctiveYo.endsWith("ga")) {
    add(notice("present:yo-go", [
      cellEvidence(table, PRESENT, "yo", "go"),
      cellEvidence(table, PRESENT, "nosotros"),
      cellEvidence(table, SUBJUNCTIVE_PRESENT, "yo", "ga"),
    ]));
  }

  const serIrPreterite = preteriteYo === "fui" && preteriteNosotros === "fuimos" && preteritePlural === "fueron";
  if (serIrPreterite) {
    add(notice("preterite:ser-ir", [
      cellEvidence(table, PRETERITE, "yo"),
      cellEvidence(table, PRETERITE, "nosotros"),
      cellEvidence(table, PRETERITE, "ustedes/ellos"),
    ]));
  } else if (["dar", "ver"].includes(info.lemma) &&
      ((preteriteYo === "di" && preteriteNosotros === "dimos" && preteritePlural === "dieron") ||
       (preteriteYo === "vi" && preteriteNosotros === "vimos" && preteritePlural === "vieron"))) {
    add(notice("preterite:short-unaccented", [
      cellEvidence(table, PRETERITE, "yo"),
      cellEvidence(table, PRETERITE, "nosotros"),
      cellEvidence(table, PRETERITE, "ustedes/ellos"),
    ]));
  } else {
    const strongStem = strongPreteriteStem(table);
    if (strongStem) {
      const id = strongStem.endsWith("j") ? "preterite:j-stem"
        : strongStem.includes("uv") ? "preterite:uv-stem"
        : strongStem.includes("u") ? "preterite:u-stem"
        : strongStem.includes("i") ? "preterite:i-stem"
        : "preterite:strong-other";
      add(notice(id, [
        cellEvidence(table, PRETERITE, "yo", strongStem),
        cellEvidence(table, PRETERITE, "nosotros", strongStem),
        cellEvidence(table, PRETERITE, "ustedes/ellos", strongStem),
      ], { stem: strongStem }));
    }
  }

  const irregularFutureStem = futureStem(table);
  if (irregularFutureStem && irregularFutureStem !== info.infinitive) {
    const id = irregularFutureStem === "har" ? "future:har-stem"
      : irregularFutureStem === "dir" ? "future:dir-stem"
      : irregularFutureStem.endsWith("dr") ? "future:dr-stem"
      : "future:shortened-stem";
    add(notice(id, [
      cellEvidence(table, FUTURE, "yo", irregularFutureStem),
      cellEvidence(table, FUTURE, "nosotros", irregularFutureStem),
      cellEvidence(table, CONDITIONAL, "yo", irregularFutureStem),
    ], { stem: irregularFutureStem }));
  }

  if (!found.has("stem:e-i") && !found.has("stem:e-ie_then_e-i") && actualGerund === changedGerund(info, "e", "i")) {
    add(notice("gerund:e-i", [
      principalEvidence(table, "gerund", "i", { role: "changed" }),
      cellEvidence(table, PRESENT, "nosotros", "e", { role: "contrast" }),
    ]));
  }
  if (!found.has("stem:o-ue_then_o-u") && actualGerund === changedGerund(info, "o", "u")) {
    add(notice("gerund:o-u", [
      principalEvidence(table, "gerund", "u", { role: "changed" }),
      cellEvidence(table, PRESENT, "nosotros", "o", { role: "contrast" }),
    ]));
  }
  if (!iY && actualGerund === regularGerund.replace(/iendo$/, "yendo") && regularGerund.endsWith("iendo")) {
    add(notice("gerund:yendo", [
      principalEvidence(table, "gerund", "y"),
      cellEvidence(table, PRESENT, "nosotros"),
    ]));
  }

  const regularParticiple = regularPrincipal(info, "participle");
  const actualParticiple = String(table?.pastParticiple || "").normalize("NFC");
  if (actualParticiple && actualParticiple !== regularParticiple) {
    if (actualParticiple.endsWith("cho")) {
      add(notice("participle:cho", [principalEvidence(table, "participle", "cho")]));
    } else if (actualParticiple.endsWith("to")) {
      add(notice("participle:to", [principalEvidence(table, "participle", "to")]));
    }
  }

  const irregularTuCommands = new Map([
    ["venir", "ven"], ["decir", "di"], ["salir", "sal"], ["hacer", "haz"],
    ["tener", "ten"], ["ir", "ve"], ["poner", "pon"], ["ser", "sé"],
  ]);
  const command = irregularTuCommands.get(info.lemma);
  if (command && cell(table, AFFIRMATIVE_COMMAND, "tú") === command) {
    add(notice("command:affirmative-tu-irregular", [
      cellEvidence(table, AFFIRMATIVE_COMMAND, "tú"),
      cellEvidence(table, AFFIRMATIVE_COMMAND, "ustedes/ellos"),
    ]));
  }

  const notices = [...found.values()].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return { regular: null, notices, patternIds: notices.map((item) => item.id) };
}

export function isValidConjugationEvidence(item) {
  return Boolean(item && hasCompleteEvidence(item));
}

/**
 * Personal familiarity is a read-only presentation hint. A package rebuild may have moved
 * a dictionary id, so the manifest's old-id alias is treated exactly like a direct dictKey;
 * no personal row is rewritten merely to sort or badge a family suggestion.
 */
export function isConjugationFamilyMemberFamiliar(entryId, items = [], previousIds = {}) {
  return items.some((item) =>
    item?.dictKey === entryId || previousIds?.[item?.dictKey] === entryId
  );
}

/**
 * Joins analyzer output to the small set of precomputed family rows loaded by the reference
 * reader. Packaged order is retained inside the familiar/unfamiliar partitions; the browser
 * never repeats the pipeline's frequency sort.
 */
export function buildConjugationTeachingView({
  analysis,
  familyRows = [],
  currentEntry,
  items = [],
  previousIds = {},
  familyLimit = 20,
} = {}) {
  if (!analysis) return { regular: null, notices: [] };

  const currentLemma = canonicalConjugationLemma(currentEntry?.lemma);
  const rowsById = new Map(familyRows.map((row) => [row.id, row.members || []]));
  const claimedLemmas = new Set();
  const prioritizedNotices = [...analysis.notices].sort(
    (a, b) => a.priority - b.priority || a.id.localeCompare(b.id)
  );
  const notices = prioritizedNotices.map((item) => {
    const withinFamily = new Set();
    const candidates = [];

    for (const member of rowsById.get(item.id) || []) {
      const lemma = canonicalConjugationLemma(member?.lemma);
      if (!member?.id || !lemma || lemma === currentLemma || withinFamily.has(lemma) || claimedLemmas.has(lemma)) {
        continue;
      }
      withinFamily.add(lemma);
      candidates.push({
        entry: member,
        familiar: isConjugationFamilyMemberFamiliar(member.id, items, previousIds),
      });
    }

    // Claim every matching sibling before applying the display cap. Otherwise a member just
    // below 20 could reappear under a lower-priority notice.
    for (const lemma of withinFamily) claimedLemmas.add(lemma);
    const ordered = [
      ...candidates.filter((member) => member.familiar),
      ...candidates.filter((member) => !member.familiar),
    ];

    return {
      ...item,
      members: ordered.slice(0, familyLimit),
      totalMembers: ordered.length,
      remainderCount: Math.max(0, ordered.length - familyLimit),
    };
  });

  return { regular: analysis.regular, notices };
}
