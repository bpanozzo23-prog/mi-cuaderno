/**
 * English abbreviations shared by personal and dictionary vocabulary surfaces.
 *
 * Both spellings of a part of speech are keys, because the two layers name them differently: the
 * dictionary stores `prep`, the personal layer stores `preposition`, and a card may render either.
 * A value missing here falls through as itself, so an incomplete row reads as a card that spells
 * out "preposition" beside another abbreviating "adv." — visible only in the running app, which is
 * how the four full-word keys below were found missing.
 */
export const PART_OF_SPEECH_ABBR = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adj: "adj.",
  adverb: "adv.",
  adv: "adv.",
  pronoun: "pron.",
  pron: "pron.",
  preposition: "prep.",
  prep: "prep.",
  conjunction: "conj.",
  conj: "conj.",
  interjection: "interj.",
  det: "det.",
  article: "art.",
  num: "num.",
  intj: "interj.",
  phrase: "phr.",
  prep_phrase: "prep. phr.",
  proverb: "prov.",
  contraction: "contr.",
  particle: "part.",
  name: "prop. n.",
  other: "",
};

export const partOfSpeechAbbreviation = (pos) => PART_OF_SPEECH_ABBR[pos] ?? pos ?? "";

/**
 * A dictionary entry's part of speech, in the vocabulary the personal layer stores
 * (`LEXICAL_POS_OPTIONS` in `meanings.js`). Seeding an item from an entry used to translate only
 * `adj` and `adv`, so the other abbreviations were copied in raw and then dropped on sight by the
 * select that offers no such value — an owner saving *como* as a preposition silently lost the
 * part of speech. One table, applied at the seam, is what keeps that from recurring per caller.
 *
 * Anything unlisted maps to "", never to a raw abbreviation: a value the owner cannot see in the
 * select is worse than no value, because only one of the two is visibly missing. `phrase` is
 * unlisted on purpose — `form` carries that distinction, and storing it here would let the two
 * disagree.
 */
export const PERSONAL_POS_FOR_ENTRY_POS = {
  noun: "noun",
  verb: "verb",
  adj: "adjective",
  adjective: "adjective",
  adv: "adverb",
  adverb: "adverb",
  pron: "pronoun",
  prep: "preposition",
  conj: "conjunction",
  intj: "interjection",
  det: "other",
  article: "other",
  num: "other",
  contraction: "other",
  particle: "other",
};

export const personalPosForEntryPos = (pos) => PERSONAL_POS_FOR_ENTRY_POS[pos] ?? "";

export const genderAbbreviation = (gender) => ({
  m: "m.",
  f: "f.",
  mf: "m./f.",
  "m-f": "m./f.",
}[gender] ?? gender ?? "");

export const grammarAbbreviations = (pos, gender) => [
  partOfSpeechAbbreviation(pos),
  genderAbbreviation(gender),
].filter(Boolean).join(" · ");
