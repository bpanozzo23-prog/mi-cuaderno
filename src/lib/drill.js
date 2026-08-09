import { normalize } from "./normalize.js";

/**
 * Typed grading and diagnosis for the Conjugation Gym.
 *
 * Deck construction belongs to `conjugationGym.js`. This module stays pure and compares
 * one typed response with its prompt and the verb's other forms; the caller owns event
 * persistence, retries and session scoring.
 */

/**
 * Marking a typed answer (Phase 13b): `exact`, `accents`, or `wrong`.
 *
 * **The first comparison must not normalize.** Everywhere else in this app matching goes
 * through `normalize.js` (§8), but that function strips acute accents, and in a conjugation
 * the accent *is* the answer: `hablo` is present and `habló` is preterite, `hable` is
 * subjunctive and `hablé` is preterite. Accepting one for the other would mark the wrong
 * tense correct in a drill whose whole subject is tense.
 *
 * So normalize is used only as the *second* comparison, to tell a near miss from a wrong
 * one. `hablo` for `habló` is the right form typed without its accent — worth passing, on a
 * phone where every accent is a long-press, but worth naming so it still teaches. It
 * preserves ñ, so `ano` for `año` stays wrong: that is a different word, not a slip.
 *
 * Case and surrounding space are forgiven in both passes. Internal runs of space collapse
 * so a pronominal form typed `me  arrepiento` is not marked wrong for the gap.
 */
export function checkTypedAnswer(given, answer) {
  const tidy = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const typed = tidy(given);
  const correct = tidy(answer);

  if (!typed || !correct) return "wrong";
  if (typed === correct) return "exact";
  if (normalize(typed) === normalize(correct)) return "accents";
  return "wrong";
}

/** Flatten a verb table for diagnosis; callers inject this rather than a database handle. */
export function conjugationForms(conjugation) {
  const forms = [];
  for (const [tense, row] of Object.entries(conjugation?.tenses || {})) {
    for (const [slot, raw] of Object.entries(row || {})) {
      const form = String(raw || "").trim();
      if (form) forms.push({ tense, slot, form });
    }
  }
  return forms;
}

const recognizableMatch = (given, answer) => checkTypedAnswer(given, answer) !== "wrong";
const REFLEXIVE = new Set(["me", "te", "se", "nos", "os"]);

function withoutNegativeNo(form) {
  return String(form || "").replace(/^no\s+/i, "");
}

function withoutReflexivePronoun(form) {
  const words = String(form || "").trim().split(/\s+/);
  if (REFLEXIVE.has(words[0]?.toLowerCase())) return words.slice(1).join(" ");
  if (words[0]?.toLowerCase() === "no" && REFLEXIVE.has(words[1]?.toLowerCase())) {
    return [words[0], ...words.slice(2)].join(" ");
  }
  return null;
}

/**
 * Diagnoses a typed answer around the existing exact-first checker. Ambiguity is resolved
 * by this fixed ladder: missing command/reflexive words, wrong person, wrong tense, then
 * another recognizable form. The typed string is returned nowhere and is never persisted.
 */
export function diagnoseTypedAnswer(given, card, forms = []) {
  const verdict = checkTypedAnswer(given, card?.answer);
  if (verdict !== "wrong") return { passed: true, verdict, diagnosis: verdict };

  const answer = String(card?.answer || "").trim();
  if (/^no\s+/i.test(answer) && recognizableMatch(given, withoutNegativeNo(answer))) {
    return { passed: false, verdict: "wrong", diagnosis: "missing_no" };
  }

  const withoutPronoun = withoutReflexivePronoun(answer);
  if (withoutPronoun && recognizableMatch(given, withoutPronoun)) {
    return { passed: false, verdict: "wrong", diagnosis: "missing_reflexive" };
  }

  const other = (forms || []).filter(({ tense, slot, form }) =>
    form && !(tense === card?.tense && slot === card?.slot) && recognizableMatch(given, form)
  );
  if (other.some(({ tense, slot }) => tense === card?.tense && slot !== card?.slot)) {
    return { passed: false, verdict: "wrong", diagnosis: "wrong_person" };
  }
  if (other.some(({ tense, slot }) => slot === card?.slot && tense !== card?.tense)) {
    return { passed: false, verdict: "wrong", diagnosis: "wrong_tense" };
  }
  if (other.length) return { passed: false, verdict: "wrong", diagnosis: "other_form" };
  return { passed: false, verdict: "wrong", diagnosis: "wrong" };
}
