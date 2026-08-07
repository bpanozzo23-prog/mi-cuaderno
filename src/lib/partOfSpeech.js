/** English abbreviations shared by personal and dictionary vocabulary surfaces. */
export const PART_OF_SPEECH_ABBR = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adj: "adj.",
  adverb: "adv.",
  adv: "adv.",
  pron: "pron.",
  prep: "prep.",
  conj: "conj.",
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
