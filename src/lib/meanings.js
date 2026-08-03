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

export const MEANING_POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "other"];
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
