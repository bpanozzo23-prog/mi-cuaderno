import { normalize } from "./normalize.js";
import { SIMPLE_TENSES, SLOTS } from "./conjugation.js";

/**
 * Turning an example sentence into a fill-in-the-blank question (Phase 10b).
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

/** Clitic pronouns can collide with short normalized verb forms, so they stay unsafe. */
const CLITICS = new Set(["me", "te", "se", "nos", "os"]);

/** Every word of a sentence with the offsets it occupies in the original text. */
export function tokenizeWords(text) {
  const tokens = [];
  for (const match of String(text || "").matchAll(WORD)) {
    tokens.push({ start: match.index, end: match.index + match[0].length, norm: normalize(match[0]) });
  }
  return tokens;
}

/**
 * The single-word forms of one verb, for matching a conjugated example against its lemma.
 *
 * Only the simple tenses are read. In a multi-word simple cell the verb is always the
 * final token; anything before it is negation or a pronoun ("no te vayas", "lo paso").
 * The perfect tenses are "haber + participle", so pulling them in would add haber's own
 * forms and let "he" or "han" blank the wrong word. Ambiguous clitic-sized forms stay
 * excluded for the same reason.
 */
export function verbForms(table) {
  const forms = new Set();
  const add = (value) => {
    const words = String(value || "").trim().split(/\s+/).filter(Boolean);
    const norm = normalize(words[words.length - 1] || "");
    if (norm && !CLITICS.has(norm)) forms.add(norm);
  };

  for (const tenseName of SIMPLE_TENSES) {
    const tense = table?.tenses?.[tenseName];
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
export function matchTermInText(text, { term, forms } = {}) {
  text = String(text || "");
  const wanted = normalize(term || "").split(/\s+/).filter(Boolean);
  if (!text || !wanted.length) return null;

  const tokens = tokenizeWords(text);
  const extra = forms instanceof Set ? forms : new Set(forms || []);

  const matchAt = (start, length, kind) => {
    const run = tokens.slice(start, start + length);
    return {
      start: run[0].start,
      end: run[run.length - 1].end,
      surface: text.slice(run[0].start, run[run.length - 1].end),
      normalizedSurface: run.map((token) => token.norm).join(" "),
      kind,
    };
  };

  // An exact term anywhere in the sentence is stronger evidence than an earlier
  // homographic inflection ("ayuda ... ayudar") or multi-word conjugation helper.
  for (let start = 0; start + wanted.length <= tokens.length; start += 1) {
    const run = tokens.slice(start, start + wanted.length);
    const matches = run.every((token, offset) => token.norm === wanted[offset]);
    if (matches) return matchAt(start, wanted.length, "exact");
  }

  // A single-word term also matches any inflection its caller knows about, which is how
  // "Saqué la basura" becomes a cloze for *sacar*.
  if (wanted.length === 1) {
    const inflectedAt = tokens.findIndex((token) => extra.has(token.norm));
    if (inflectedAt >= 0) return matchAt(inflectedAt, 1, "inflected");
  }
  return null;
}

export function clozeFromExample(example, { term, forms } = {}) {
  const text = String(example?.es || "");
  const match = matchTermInText(text, { term, forms });
  if (!match) return null;
  return {
    before: text.slice(0, match.start),
    answer: match.surface,
    after: text.slice(match.end),
  };
}

/** Stock dictionary examples are positional arrays; personal ones are already objects. */
const asExample = (example) =>
  Array.isArray(example) ? { es: example[0] || "", en: example[1] || "" } : {
    es: example?.es || "",
    en: example?.en || "",
  };

/**
 * The examples of one entry, split by who wrote them. The owner's own sentences are a
 * different kind of material from the dictionary's: they carry the context they were
 * recorded in, so a stock example is a fallback rather than an equal alternative.
 */
export function clozeCandidates(item, entry) {
  return {
    personal: [
      ...(item?.meanings || []).flatMap((meaning) => meaning?.examples || []),
      ...(item?.myExamples || []),
    ].map(asExample),
    stock: (entry?.examples || []).map(asExample),
  };
}

/**
 * One usable cloze for this card, or null to leave it an ordinary card.
 *
 * The owner's sentences are exhausted before the dictionary's is considered at all —
 * picking across both pools at once would quietly demote personal material every time an
 * entry happened to ship more examples than the owner wrote. Within a pool the choice is
 * random so a word with several sentences does not always ask the same one; `rng` is
 * injectable so a test can stand on a known choice.
 */
export function pickCloze(item, entry, { forms, rng = Math.random } = {}) {
  const { personal, stock } = clozeCandidates(item, entry);

  const workable = (examples) => {
    const usable = [];
    for (const example of examples) {
      const split = clozeFromExample(example, { term: item?.term, forms });
      if (split) usable.push({ ...split, es: example.es, en: example.en });
    }
    return usable;
  };

  const usable = workable(personal);
  const pool = usable.length ? usable : workable(stock);
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}
