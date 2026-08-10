/**
 * Curated reference content for the Gym recognition lanes.
 *
 * These constants deliberately know nothing about React, IndexedDB, or an installed
 * dictionary. They are the recognition equivalent of CORE_20: original, versioned
 * project content whose stable ids can safely be written to the event log.
 */

export const RECOGNITION_LANES = {
  usage: { label: "Tense usage", eyebrow: "What is it for?" },
  endings: { label: "Endings", eyebrow: "What does it look like?" },
};

export const RECOGNITION_EVERYDAY_TENSES = [
  "Indicative/Present",
  "Indicative/Preterite",
  "Indicative/Imperfect",
  "Indicative/Future",
  "Indicative/Conditional",
  "Subjunctive/Present",
];

export const RECOGNITION_CONFUSABLES = {
  "Indicative/Present": ["Subjunctive/Present", "Indicative/Future"],
  "Indicative/Preterite": ["Indicative/Imperfect", "Indicative/Present Perfect"],
  "Indicative/Imperfect": ["Indicative/Preterite", "Indicative/Conditional"],
  "Indicative/Future": ["Indicative/Conditional", "Indicative/Present"],
  "Indicative/Conditional": ["Indicative/Future", "Indicative/Conditional Perfect", "Indicative/Imperfect"],
  "Subjunctive/Present": ["Indicative/Present", "Subjunctive/Imperfect"],
  "Subjunctive/Imperfect": ["Subjunctive/Present", "Indicative/Conditional"],
  "Indicative/Present Perfect": ["Indicative/Preterite", "Indicative/Present"],
  "Indicative/Past Perfect": ["Subjunctive/Past Perfect", "Indicative/Imperfect"],
  "Indicative/Future Perfect": ["Indicative/Future", "Indicative/Conditional Perfect"],
  "Indicative/Conditional Perfect": ["Indicative/Conditional", "Indicative/Future Perfect"],
  "Subjunctive/Present Perfect": ["Subjunctive/Present", "Indicative/Present Perfect"],
  "Subjunctive/Past Perfect": ["Indicative/Past Perfect", "Subjunctive/Imperfect"],
  "Imperative Affirmative/Present": ["Imperative Negative/Present", "Subjunctive/Present"],
  "Imperative Negative/Present": ["Imperative Affirmative/Present", "Subjunctive/Present"],
};

const ending = (id, answer, verbClass, endings, options = {}) => ({
  id: `endings:${id}`,
  skill: "endings",
  answer,
  verbClass,
  endings,
  exampleLemma: options.exampleLemma || null,
  attachment: options.attachment || "stem",
  confusables: options.confusables || RECOGNITION_CONFUSABLES[answer] || [],
  prompt: options.prompt || `${verbClass} verbs: ${endings.join(", ")}`,
});

/** One row per approved tense × class over the five Latin-American display slots. */
export const TENSE_ENDINGS = [
  ending("indicative-present-ar", "Indicative/Present", "-ar", ["o", "as", "a", "amos", "an"], { exampleLemma: "hablar" }),
  ending("indicative-present-er", "Indicative/Present", "-er", ["o", "es", "e", "emos", "en"], { exampleLemma: "comer" }),
  ending("indicative-present-ir", "Indicative/Present", "-ir", ["o", "es", "e", "imos", "en"], { exampleLemma: "vivir" }),
  ending("indicative-imperfect-ar", "Indicative/Imperfect", "-ar", ["aba", "abas", "aba", "ábamos", "aban"], { exampleLemma: "hablar" }),
  ending("indicative-imperfect-er-ir", "Indicative/Imperfect", "-er/-ir", ["ía", "ías", "ía", "íamos", "ían"], { exampleLemma: "comer" }),
  ending("indicative-preterite-ar", "Indicative/Preterite", "-ar", ["é", "aste", "ó", "amos", "aron"], { exampleLemma: "hablar" }),
  ending("indicative-preterite-er-ir", "Indicative/Preterite", "-er/-ir", ["í", "iste", "ió", "imos", "ieron"], { exampleLemma: "vivir" }),
  ending("indicative-future-all", "Indicative/Future", "all verbs", ["é", "ás", "á", "emos", "án"], {
    exampleLemma: "hablar",
    attachment: "infinitive",
    prompt: "Added to the whole infinitive (all verbs): é, ás, á, emos, án",
  }),
  ending("indicative-conditional-all", "Indicative/Conditional", "all verbs", ["ía", "ías", "ía", "íamos", "ían"], {
    exampleLemma: "comer",
    attachment: "infinitive",
    prompt: "Added to the whole infinitive (all verbs): ía, ías, ía, íamos, ían",
  }),
  ending("subjunctive-present-ar", "Subjunctive/Present", "-ar", ["e", "es", "e", "emos", "en"], { exampleLemma: "hablar" }),
  ending("subjunctive-present-er-ir", "Subjunctive/Present", "-er/-ir", ["a", "as", "a", "amos", "an"], { exampleLemma: "vivir" }),
  ending("subjunctive-imperfect-ar", "Subjunctive/Imperfect", "-ar", ["ara", "aras", "ara", "áramos", "aran"], { exampleLemma: "hablar" }),
  ending("subjunctive-imperfect-er-ir", "Subjunctive/Imperfect", "-er/-ir", ["iera", "ieras", "iera", "iéramos", "ieran"], { exampleLemma: "comer" }),

  ending("indicative-present-perfect", "Indicative/Present Perfect", "haber + participle", ["he", "has", "ha", "hemos", "han"], {
    attachment: "participle", prompt: "he, has, ha, hemos, han + -ado/-ido",
  }),
  ending("indicative-past-perfect", "Indicative/Past Perfect", "haber + participle", ["había", "habías", "había", "habíamos", "habían"], {
    attachment: "participle", prompt: "había, habías, había, habíamos, habían + participle",
  }),
  ending("indicative-future-perfect", "Indicative/Future Perfect", "haber + participle", ["habré", "habrás", "habrá", "habremos", "habrán"], {
    attachment: "participle", prompt: "habré, habrás, habrá, habremos, habrán + participle",
  }),
  ending("indicative-conditional-perfect", "Indicative/Conditional Perfect", "haber + participle", ["habría", "habrías", "habría", "habríamos", "habrían"], {
    attachment: "participle", prompt: "habría, habrías, habría, habríamos, habrían + participle",
  }),
  ending("subjunctive-present-perfect", "Subjunctive/Present Perfect", "haber + participle", ["haya", "hayas", "haya", "hayamos", "hayan"], {
    attachment: "participle", prompt: "haya, hayas, haya, hayamos, hayan + participle",
  }),
  ending("subjunctive-past-perfect", "Subjunctive/Past Perfect", "haber + participle", ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubieran"], {
    attachment: "participle", prompt: "hubiera, hubieras, hubiera, hubiéramos, hubieran + participle",
  }),
];

const usage = (id, answer, prompt, options = {}) => ({
  id: `usage:${id}`,
  skill: "usage",
  answer,
  prompt,
  alsoAcceptable: options.alsoAcceptable || [],
  contrast: options.contrast || null,
  confusables: options.confusables || RECOGNITION_CONFUSABLES[answer] || [],
});

/** Owner-reviewed usage prompts. Each prompt has exactly one canonical answer. */
export const TENSE_USAGE_CARDS = [
  usage("present-habit", "Indicative/Present", "A habitual action or routine — what someone does in general.", { contrast: "The present describes what happens habitually or generally." }),
  usage("present-state", "Indicative/Present", "A state or fact that is true in the present (Vivo en Chicago)."),
  usage("present-scheduled-future", "Indicative/Present", "A scheduled or already-decided future event stated in the present (Salgo mañana; El tren sale a las ocho).", { alsoAcceptable: ["Indicative/Future"], contrast: "The present can state a scheduled future; the future tense makes a prediction, promise, or future statement." }),

  usage("preterite-completed", "Indicative/Preterite", "A completed past action with a clear beginning or end.", { contrast: "The preterite is for an action that finished; the imperfect frames an ongoing past." }),
  usage("preterite-sequence", "Indicative/Preterite", "A sequence of events in the past, each happening once."),
  usage("preterite-interruption", "Indicative/Preterite", "The action that interrupted something already in progress.", { contrast: "The preterite is the interrupting event; the imperfect is what was already underway." }),

  usage("imperfect-habit", "Indicative/Imperfect", "An ongoing or habitual past action — what used to happen.", { contrast: "The imperfect keeps the past action open or habitual; the preterite closes it." }),
  usage("imperfect-background", "Indicative/Imperfect", "Background description in a story: weather, scenery, or feelings."),
  usage("imperfect-time-age-date", "Indicative/Imperfect", "Telling time, age, or dates in the past."),
  usage("imperfect-in-progress", "Indicative/Imperfect", "What was already happening when something else occurred.", { contrast: "The imperfect is the action in progress; the preterite is the event that interrupted it." }),

  usage("future-event", "Indicative/Future", "A prediction, promise, or statement about what will happen (Lloverá mañana; Te llamaré esta noche).", { contrast: "The future states what will happen; the conditional states what would happen." }),
  usage("future-probability", "Indicative/Future", "A guess or probability about what is true now (¿Quién será? — who could it be?)."),

  usage("conditional-hypothesis", "Indicative/Conditional", "What would happen under a hypothetical condition (si tuviera dinero, viajaría más).", { contrast: "The conditional is the would-result; si tuviera uses the imperfect subjunctive." }),
  usage("conditional-polite", "Indicative/Conditional", "A polite request or softened statement (¿Podrías…?)."),
  usage("conditional-past-speculation", "Indicative/Conditional", "Speculation about the past (Serían las dos)."),

  usage("subj-present-want", "Subjunctive/Present", "After wanting or requesting that someone else do something (quiero que…).", { contrast: "A present main-clause trigger takes the present subjunctive; a past trigger takes the imperfect subjunctive." }),
  usage("subj-present-doubt", "Subjunctive/Present", "After doubt or denial (no creo que…)."),
  usage("subj-present-emotion", "Subjunctive/Present", "After emotion or a value judgment (me alegra que…, es importante que…)."),
  usage("subj-present-ojala", "Subjunctive/Present", "After ojalá, for a wish that may still come true (ojalá venga).", { alsoAcceptable: ["Subjunctive/Imperfect"], contrast: "Ojalá with the imperfect subjunctive (ojalá tuviera) makes the wish unlikely or contrary to fact." }),
  usage("subj-present-purpose", "Subjunctive/Present", "In a purpose clause after a present-tense main clause (trabajo para que puedas…).", { alsoAcceptable: ["Subjunctive/Imperfect"], contrast: "A past main clause (trabajé para que pudieras…) takes the imperfect subjunctive instead." }),
  usage("subj-present-nonexistent", "Subjunctive/Present", "Describing someone or something that may not exist (busco a alguien que…)."),

  usage("subj-imperfect-past-trigger", "Subjunctive/Imperfect", "A subjunctive trigger whose main clause is in the past (quería que…).", { contrast: "A past main-clause trigger takes the imperfect subjunctive; quiero que takes the present subjunctive." }),
  usage("subj-imperfect-si", "Subjunctive/Imperfect", "A contrary-to-fact si clause (si tuviera…).", { contrast: "Si tuviera is imperfect subjunctive; its result, viajaría, is conditional." }),
  usage("subj-imperfect-polite", "Subjunctive/Imperfect", "A very polite wish (quisiera…)."),
  usage("subj-imperfect-como-si", "Subjunctive/Imperfect", "After como si, describing something unreal (habla como si supiera todo)."),

  usage("present-perfect-current-period", "Indicative/Present Perfect", "A completed past action connected to the present, especially within a time period still ongoing (hoy, esta semana, este año).", { alsoAcceptable: ["Indicative/Preterite"], contrast: "The present perfect connects a completed action to now; Mexican Spanish often also uses the preterite here." }),
  usage("present-perfect-experience", "Indicative/Present Perfect", "Life experience up to now (¿Has estado alguna vez…?).", { alsoAcceptable: ["Indicative/Preterite"] }),
  usage("past-perfect-before-past", "Indicative/Past Perfect", "A past action completed before another past action.", { contrast: "The indicative past perfect reports an earlier real past action; the subjunctive past perfect frames an unreal or triggered one." }),
  usage("future-perfect-deadline", "Indicative/Future Perfect", "Something that will already be completed by a future point (Para mañana, habré terminado)."),
  usage("conditional-perfect-unreal-result", "Indicative/Conditional Perfect", "What would have happened under a different past condition (Habría ido, pero estaba enfermo).", { contrast: "The conditional perfect is the would-have result; si hubiera sabido uses the subjunctive past perfect." }),
  usage("subj-present-perfect-present", "Subjunctive/Present Perfect", "A completed action connected to the present, after a subjunctive trigger (me alegra que hayas venido)."),
  usage("subj-present-perfect-possible", "Subjunctive/Present Perfect", "A subjunctive action that may already have happened (dudo que haya terminado)."),
  usage("subj-past-perfect-unreal", "Subjunctive/Past Perfect", "An unreal past condition — something that did not happen (si hubiera sabido…).", { contrast: "Si hubiera sabido is the unreal condition; habría venido is its conditional-perfect result." }),
  usage("affirmative-command", "Imperative Affirmative/Present", "Telling someone directly to do something."),
  usage("negative-command", "Imperative Negative/Present", "Telling someone not to do something."),
];

export const RECOGNITION_CARDS = {
  usage: TENSE_USAGE_CARDS,
  endings: TENSE_ENDINGS,
};

export function recognitionTenses(skill) {
  return [...new Set((RECOGNITION_CARDS[skill] || []).map((card) => card.answer))];
}
