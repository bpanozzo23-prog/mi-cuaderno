import { COLLAPSED_SLOTS } from "./conjugation.js";
import { ALL_GYM_TENSES } from "./conjugationGym.js";
import { RECOGNITION_CONFUSABLES } from "./recognitionContent.js";

/**
 * Four-option choices for a Forms card, built from the verb's own table
 * (docs/FORMS-CHOICE-DIRECTION.md).
 *
 * The answer plus three morphological distractors: one other person in the same tense, the
 * same person in a confusable tense (the curated Phase 17 map, so "confusable" is one fact
 * shared with the recognition lanes), and one more from either family. A tapped distractor
 * is then diagnosed by the typed ladder — wrong person, wrong tense — for free.
 *
 * Pure and rng-injectable. Forms compare as exact strings: an accent-only neighbour
 * (hablo / habló) is a legitimate distractor because the accent is the answer.
 */

const shuffle = (values, rng) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const pick = (values, rng) => values[Math.floor(rng() * values.length)];

/** The distractor pool: every other distinct form of the verb outside the collapsed slots. */
export function formChoicePool(card, forms) {
  const seen = new Set([card.answer]);
  const pool = [];
  for (const entry of forms || []) {
    if (!entry?.form || COLLAPSED_SLOTS.has(entry.slot)) continue;
    if (entry.tense === card.tense && entry.slot === card.slot) continue;
    if (seen.has(entry.form)) continue;
    seen.add(entry.form);
    pool.push(entry);
  }
  return pool;
}

export function formChoiceOptions(
  card,
  forms,
  { rng = Math.random, confusables = RECOGNITION_CONFUSABLES, tenses = ALL_GYM_TENSES } = {}
) {
  if (!card?.answer) return [];
  const pool = formChoicePool(card, forms);
  if (pool.length < 3) return [];
  // Family membership scans every cell (a form that repeats across persons, like «era», still
  // counts as the same-person candidate) and maps back to the de-duplicated pool by string.
  const byForm = new Map(pool.map((entry) => [entry.form, entry]));
  const cells = (forms || []).filter((entry) => byForm.has(entry?.form) && !COLLAPSED_SLOTS.has(entry.slot));
  const unique = (entries) => [...new Set(entries.map((entry) => byForm.get(entry.form)))];

  const persons = unique(cells.filter((entry) => entry.tense === card.tense && entry.slot !== card.slot));
  const preferredTenses = [
    ...(confusables[card.tense] || []),
    ...tenses.filter((tense) => tense !== card.tense && !(confusables[card.tense] || []).includes(tense)),
  ];
  const tenseCandidates = unique(preferredTenses
    .map((tense) => cells.find((entry) => entry.slot === card.slot && entry.tense === tense))
    .filter(Boolean));

  const chosen = [];
  const take = (entry) => {
    if (entry && !chosen.includes(entry)) chosen.push(entry);
  };
  if (persons.length) take(pick(persons, rng));
  // The first confusable tense the table actually has, in curated order; the fallback order is
  // the Gym's own tense list, so an uncommon tense never outranks an everyday one.
  take(tenseCandidates[0]);
  const family = [...persons, ...tenseCandidates].filter((entry) => !chosen.includes(entry));
  if (family.length) take(pick(family, rng));
  while (chosen.length < 3) {
    const rest = pool.filter((entry) => !chosen.includes(entry));
    if (!rest.length) break;
    take(pick(rest, rng));
  }
  if (chosen.length < 3) return [];
  return shuffle([card.answer, ...chosen.map((entry) => entry.form)], rng);
}

/** The cell a tapped form belongs to, preferring the prompt's own tense when a form repeats. */
export function formCellFor(form, card, forms) {
  const matches = (forms || []).filter((entry) => entry.form === form);
  return matches.find((entry) => entry.tense === card.tense) || matches[0] || null;
}
