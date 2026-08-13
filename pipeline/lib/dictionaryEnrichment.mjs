/**
 * Pure shaping helpers for the optional Wiktionary enrichment carried by dictionary r4.
 * Keeping these rules outside the streaming build makes the lossy choices small, explicit and
 * directly testable before a 90 MB source pass is involved.
 */

const PROSE_ETYM_START = /^(?:Inherited|Borrowed|From|Unadapted|Learned|Semi-learned|Compound|Doublet|Blend|Clipping|Deverbal|Derived|Univerbation|Calque|Ultimately|Possibly|Probably)\b/i;

const compactText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const comparable = (value) => compactText(value).normalize("NFC").toLocaleLowerCase("es");

const ABBREVIATION_BEFORE_PERIOD = /(?:\b(?:c|ca|cf|e\.g|i\.e|etc|lit|approx|no|vol|p|pp|q\.v))$/i;

const firstSentence = (value) => {
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") parentheses += 1;
    else if (character === ")") parentheses = Math.max(0, parentheses - 1);
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets = Math.max(0, brackets - 1);
    if (character !== "." || (value[index + 1] && !/\s/.test(value[index + 1]))) continue;
    if (parentheses || brackets || ABBREVIATION_BEFORE_PERIOD.test(value.slice(0, index))) continue;
    return value.slice(0, index + 1);
  }
  return value;
};

export function relationWords(rows = []) {
  const result = [];
  const seen = new Set();
  for (const row of rows || []) {
    const word = compactText(typeof row === "string" ? row : row?.word);
    const key = comparable(word);
    if (!word || seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

export function relationWordsExceptLemma(rows = [], lemma = "") {
  const lemmaKey = comparable(lemma);
  return relationWords(rows).filter((word) => comparable(word) !== lemmaKey);
}

export function trimEtymology(value) {
  const original = String(value || "").trim();
  if (!original) return "";

  let prose = original;
  if (/^Etymology tree(?:\r?\n|$)/i.test(prose)) {
    prose = prose
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .find((line) => PROSE_ETYM_START.test(line)) || "";
  }

  prose = compactText(prose);
  if (!prose) return "";
  return firstSentence(prose);
}

export function mostSpecificGloss(glosses = []) {
  for (let index = (glosses || []).length - 1; index >= 0; index -= 1) {
    const gloss = compactText(glosses[index]);
    if (gloss) return gloss;
  }
  return "";
}

export function shapeSenseExamples(examples = [], lemma = "") {
  const lemmaKey = comparable(lemma);
  return (examples || [])
    .map((example, index) => ({
      es: compactText(example?.text),
      en: compactText(example?.english),
      index,
    }))
    .filter(({ es }) => es && es.length <= 200 && comparable(es) !== lemmaKey)
    .sort((a, b) => Number(Boolean(b.en)) - Number(Boolean(a.en)) || a.index - b.index)
    .slice(0, 2)
    .map(({ es, en }) => en ? [es, en] : [es]);
}

export function relatedWordsForRecord(record, includedSenses = []) {
  return relationWordsExceptLemma([
    ...(record?.derived || []),
    ...(record?.related || []),
    ...includedSenses.flatMap((sense) => [...(sense?.derived || []), ...(sense?.related || [])]),
  ], record?.word);
}
