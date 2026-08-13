import { newMeaningKey } from "./ids.js";

export const USAGE_LABELS = [
  "formal",
  "informal",
  "colloquial",
  "slang",
  "vulgar",
  "offensive",
  "dated",
  "archaic",
  "rare",
  "humorous",
  "figurative",
  "literal",
];

export const LEXICAL_POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "other"];
export const MEANING_POS_OPTIONS = [
  "",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "interjection",
  "other",
];
export const VERB_BEHAVIORS = ["transitive", "intransitive", "reflexive", "pronominal", "impersonal"];
export const COMMON_REGIONS = ["Mexico", "Latin America", "Spain"];

const cleanList = (values = []) => {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const cleaned = String(value || "").trim();
    const key = cleaned.toLocaleLowerCase("en");
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
};

const cleanExamples = (examples = []) =>
  (examples || [])
    .map((example) => ({
      es: String(example?.es || "").trim(),
      en: String(example?.en || "").trim(),
    }))
    .filter((example) => example.es || example.en);

export function newMeaning({
  id = newMeaningKey(),
  gloss = "",
  usageCue = "",
  regions = [],
  usageLabels = [],
  posOverride = "",
  verbBehavior = [],
  note = "",
  examples = [],
} = {}) {
  return {
    id,
    gloss: String(gloss || ""),
    usageCue: String(usageCue || ""),
    regions: [...regions],
    usageLabels: [...usageLabels],
    posOverride,
    verbBehavior: [...verbBehavior],
    note: String(note || ""),
    examples: examples.map((example) => ({ ...example })),
  };
}

export function meaningHasContext(meaning) {
  return Boolean(
    String(meaning?.usageCue || "").trim() ||
      String(meaning?.note || "").trim() ||
      (meaning?.regions || []).length ||
      (meaning?.usageLabels || []).length ||
      String(meaning?.posOverride || "").trim() ||
      (meaning?.verbBehavior || []).length ||
      (meaning?.examples || []).some((example) =>
        String(example?.es || example?.en || "").trim()
      )
  );
}

export function cleanMeaning(meaning) {
  const gloss = String(meaning?.gloss || "").trim();
  const usageCue = String(meaning?.usageCue || "").trim();
  const note = String(meaning?.note || "").trim();
  const regions = cleanList(meaning?.regions);
  const usageLabels = cleanList(meaning?.usageLabels).filter((label) => USAGE_LABELS.includes(label));
  const posOverride = MEANING_POS_OPTIONS.includes(meaning?.posOverride) ? meaning.posOverride : "";
  const verbBehavior = cleanList(meaning?.verbBehavior).filter((label) => VERB_BEHAVIORS.includes(label));
  const examples = cleanExamples(meaning?.examples);

  return {
    id: typeof meaning?.id === "string" && meaning.id.startsWith("meaning:") ? meaning.id : newMeaningKey(),
    gloss,
    usageCue,
    regions,
    usageLabels,
    posOverride,
    verbBehavior,
    note,
    examples,
  };
}

/**
 * Completely blank draft rows disappear. A row carrying context but no gloss is an error so
 * optional notes or examples can never be discarded silently.
 */
export function cleanMeanings(meanings = []) {
  const cleaned = [];
  for (const meaning of meanings || []) {
    const next = cleanMeaning(meaning);
    if (!next.gloss) {
      if (meaningHasContext(next)) throw new Error("Every saved meaning with details needs an English gloss.");
      continue;
    }
    cleaned.push(next);
  }
  return cleaned;
}

export function cloneMeanings(meanings = []) {
  return meanings.map((meaning) => newMeaning({ ...meaning, examples: meaning.examples || [] }));
}

/**
 * Dictionary label → personal usage label.
 *
 * The personal list is closed (§7's meaning-block amendment) and deliberately smaller than the
 * tags the pipeline keeps, so a label only crosses when the personal vocabulary already has a
 * word for it. Everything else is reported as dropped rather than bent into an approximate
 * match: "obsolete" is not "archaic", and guessing would put a word in the owner's notebook
 * that the owner never wrote.
 */
const USAGE_LABEL_FROM_DICT = {
  formal: "formal",
  informal: "informal",
  colloquial: "colloquial",
  slang: "slang",
  vulgar: "vulgar",
  offensive: "offensive",
  dated: "dated",
  archaic: "archaic",
  rare: "rare",
  humorous: "humorous",
  figuratively: "figurative",
  literally: "literal",
};

/** English glosses, so plain case folding — `normalize.js` is the Spanish matching seam. */
export const glossKey = (gloss) => String(gloss || "").trim().toLocaleLowerCase("en");

/**
 * One dictionary sense, seen as a candidate personal meaning.
 *
 * This is a **copy, not an attachment**: the row it produces is an ordinary `meaning:<uuid>`
 * record carrying no sense id and no sense ordering, exactly as the identity rule requires. Once
 * imported it is the owner's, editable like any other meaning, and a later dataset rebuild
 * cannot reach it. §14's deferred dictionary-sense attachment or synchronization stays deferred.
 *
 * `usageCue`, `posOverride`, `note` and `examples` are left for the owner. The entry's examples
 * are Tatoeba's and carry per-sentence attribution (§4) that a personal copy would strip, and
 * they belong to the entry rather than to one sense.
 */
export function meaningFromSense(sense, idFactory = newMeaningKey) {
  const labels = cleanList(sense?.labels);
  const usageLabels = [];
  const verbBehavior = [];
  const dropped = [];

  for (const label of labels) {
    const mapped = USAGE_LABEL_FROM_DICT[label.toLocaleLowerCase("en")];
    if (mapped) usageLabels.push(mapped);
    else if (VERB_BEHAVIORS.includes(label)) verbBehavior.push(label);
    else dropped.push(label);
  }

  return {
    meaning: newMeaning({
      id: idFactory(),
      gloss: String(sense?.gloss || "").trim(),
      regions: cleanList(sense?.regionLabels),
      usageLabels: cleanList(usageLabels),
      verbBehavior: cleanList(verbBehavior),
    }),
    droppedLabels: dropped,
  };
}

/**
 * Every sense of an attached entry, as importable rows. A sense already carried by one of the
 * owner's meanings is marked rather than hidden, so the sheet can say why it is not offered.
 * Senses without a gloss cannot become meanings at all and never appear.
 */
export function meaningsFromSenses(senses = [], existingMeanings = [], idFactory = newMeaningKey) {
  const taken = new Set((existingMeanings || []).map((meaning) => glossKey(meaning.gloss)));
  return (senses || [])
    .map((sense, index) => ({ key: `sense-${index}`, ...meaningFromSense(sense, idFactory) }))
    .filter((row) => row.meaning.gloss)
    .map((row) => ({ ...row, duplicate: taken.has(glossKey(row.meaning.gloss)) }));
}

/** Conservative schema-v1 rule: one trimmed nonblank line, including any marker, per meaning. */
export function meaningsFromTranslation(translation, idFactory = newMeaningKey) {
  return String(translation || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((gloss) => newMeaning({ id: idFactory(), gloss }));
}

export function upgradeLexicalItemV1(item, idFactory = newMeaningKey) {
  if (!item || item.type !== "lexical" || Array.isArray(item.meanings)) return { ...item };
  const { translation, ...rest } = item;
  return {
    ...rest,
    pos: typeof rest.pos === "string" ? rest.pos : "",
    meanings: meaningsFromTranslation(translation, idFactory),
  };
}

export const meaningGlosses = (item) => (item?.meanings || []).map((meaning) => meaning.gloss).filter(Boolean);
export const meaningGlossText = (item, separator = "\n") => meaningGlosses(item).join(separator);

/**
 * The one meaning a browsing card shows. A word with five senses would otherwise turn its row into
 * a paragraph, and the first meaning is the one the owner ordered first. Every other surface —
 * search, the entry itself, the pickers that exist to tell similar words apart — still reads them
 * all.
 */
export const firstMeaningGloss = (item) => meaningGlosses(item)[0] || "";

export const meaningContextText = (item) =>
  (item?.meanings || [])
    .flatMap((meaning) => [
      meaning.usageCue,
      ...(meaning.regions || []),
      ...(meaning.usageLabels || []),
      meaning.posOverride,
      ...(meaning.verbBehavior || []),
    ])
    .filter(Boolean)
    .join(" ");

export const meaningNotes = (item) =>
  (item?.meanings || []).map((meaning) => meaning.note).filter(Boolean).join("\n");

export const meaningExamples = (item) =>
  (item?.meanings || []).flatMap((meaning) => meaning.examples || []);

export const allPersonalExamples = (item) => [...(item?.myExamples || []), ...meaningExamples(item)];

export function meaningLabels(meaning) {
  return [
    ...(meaning?.regions || []),
    ...(meaning?.usageLabels || []),
    meaning?.posOverride || "",
    ...(meaning?.verbBehavior || []),
  ].filter(Boolean);
}
