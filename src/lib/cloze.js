import { normalize } from "./normalize.js";
import { SLOTS } from "./conjugation.js";

/**
 * Turning an example sentence into a fill-in-the-blank question (Phase 7b).
 *
 * A card that shows *sacar* and asks for "to take out" tests recognition of a word in
 * isolation. Blanking that same word out of a sentence the owner already wrote —
 * "Tengo que ___ la basura" — asks for it in the place it actually gets used. The
 * material is already in the notebook: meaning examples, entry examples, and the stock
 * examples of an attached dictionary entry.
 *
 * Matching goes through src/lib/normalize.js like everything else, so "año" can never be
 * blanked by a search for "ano" (the §8 tripwire). That file is imported, never modified.
 *
 * Everything here is pure. The caller supplies the extra inflected forms, because where
 * they come from — a conjugation table, nothing at all — is a data-layer question and
 * this file should stay testable without a database.
 */

/** Unicode letters, so acentos and ñ hold a token together and punctuation splits it. */
const WORD = /[\p{L}\p{M}]+/gu;

/** Clitic pronouns lead a pronominal verb's stored forms ("me arrepiento"). */
const CLITICS = new Set(["me", "te", "se", "nos", "os"]);

/** Every word of a sentence with the offsets it occupies in the original text. */
function tokenize(text) {
  const tokens = [];
  for (const match of String(text || "").matchAll(WORD)) {
    tokens.push({ start: match.index, end: match.index + match[0].length, norm: normalize(match[0]) });
  }
  return tokens;
}

/**
 * The single-word forms of one verb, for matching a conjugated example against its lemma.
 *
 * Only the simple tenses are read. The perfect tenses are "haber + participle", so their
 * only verb-specific word is the participle, which is taken directly — pulling them in
 * would add haber's own forms and let "he" or "han" blank the wrong word. Clitics are
 * dropped for the same reason.
 */
export function verbForms(table) {
  const forms = new Set();
  const add = (value) => {
    for (const word of String(value || "").split(/\s+/)) {
      const norm = normalize(word);
      if (norm && !CLITICS.has(norm)) forms.add(norm);
    }
  };

  for (const tense of Object.values(table?.tenses || {})) {
    for (const slot of SLOTS) add(tense?.[slot]);
  }
  add(table?.gerund);
  add(table?.pastParticiple);
  return forms;
}

/**
 * Splits one example around the term, or returns null when the term is not in it.
 *
 * Works on token runs rather than string indexes: normalization can change a string's
 * length, so an offset found in the normalized text cannot be trusted to point at the
 * same place in the original. Matching whole tokens also means a term never gets blanked
 * out of the middle of a longer word.
 */
export function clozeFromExample(example, { term, forms } = {}) {
  const text = String(example?.es || "");
  const wanted = normalize(term || "").split(/\s+/).filter(Boolean);
  if (!text || !wanted.length) return null;

  const tokens = tokenize(text);
  const extra = forms instanceof Set ? forms : new Set(forms || []);

  for (let start = 0; start + wanted.length <= tokens.length; start += 1) {
    const run = tokens.slice(start, start + wanted.length);
    const matches = run.every((token, offset) => token.norm === wanted[offset]);

    // A single-word term also matches any inflection its caller knows about, which is how
    // "Saqué la basura" becomes a cloze for *sacar*.
    const inflected = wanted.length === 1 && extra.has(run[0].norm);
    if (!matches && !inflected) continue;

    return {
      before: text.slice(0, run[0].start),
      answer: text.slice(run[0].start, run[run.length - 1].end),
      after: text.slice(run[run.length - 1].end),
    };
  }
  return null;
}

/** Stock dictionary examples are positional arrays; personal ones are already objects. */
const asExample = (example) =>
  Array.isArray(example) ? { es: example[0] || "", en: example[1] || "" } : {
    es: example?.es || "",
    en: example?.en || "",
  };

/**
 * The examples of one entry, best first: the owner's own writing before the dictionary's.
 * A sentence the owner chose to record carries context the stock example cannot.
 */
export function clozeCandidates(item, entry) {
  return [
    ...(item?.meanings || []).flatMap((meaning) => meaning?.examples || []),
    ...(item?.myExamples || []),
    ...(entry?.examples || []),
  ].map(asExample);
}

/**
 * One usable cloze for this card, or null to leave it an ordinary card.
 *
 * Every candidate is tried before choosing, so a word whose only workable sentence sits
 * behind two unusable ones still gets its cloze. `rng` is injectable so a test can stand
 * on a known choice.
 */
export function pickCloze(item, entry, { forms, rng = Math.random } = {}) {
  const usable = [];
  for (const example of clozeCandidates(item, entry)) {
    const split = clozeFromExample(example, { term: item?.term, forms });
    if (split) usable.push({ ...split, es: example.es, en: example.en });
  }
  if (!usable.length) return null;
  return usable[Math.min(usable.length - 1, Math.floor(rng() * usable.length))];
}
