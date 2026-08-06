import { SLOTS, COLLAPSED_SLOTS } from "./conjugation.js";

/**
 * Building a conjugation drill (Phase 7c).
 *
 * The dictionary ships full paradigms for around 1,250 verbs, and until now they were
 * only ever read. A drill asks one cell of one table — "Preterite, ustedes/ellos —
 * *poner*" — and reveals the answer. That is the whole exercise.
 *
 * It is deliberately ungraded and writes nothing. A missed conjugation is not the same
 * fact as a missed meaning, so folding it into the Leitner ladder would make a box number
 * mean two different things at once. Brief §14 also defers practice history, grading and
 * scheduling; this stays on the right side of that line by storing nothing at all.
 *
 * Pure, and takes its randomness by injection so a test can stand on a known deck.
 */

/**
 * The six tenses worth drilling for conversational Latin American Spanish. Everything
 * else the tables hold — the perfects, the -se imperfect subjunctive, the future
 * subjunctive that survives mainly in legal set phrases — is available in the dictionary
 * but would make a short drill mostly rarities.
 */
export const DRILL_TENSES = [
  "Indicative/Present",
  "Indicative/Preterite",
  "Indicative/Imperfect",
  "Indicative/Future",
  "Indicative/Conditional",
  "Subjunctive/Present",
];

export const DECK_SIZE = 10;

/** Vosotros is collapsed everywhere else in this notebook (§3), so it is not drilled. */
const DRILL_SLOTS = SLOTS.filter((slot) => !COLLAPSED_SLOTS.has(slot));

/**
 * Every answerable cell of one verb: a tense this drill covers, a slot it asks, and a
 * form actually present in the table. An empty cell is not a gap in the data — Spanish
 * has no first-person imperative — so cells are read rather than assumed.
 */
export function drillCells(verb) {
  const cells = [];
  for (const tense of DRILL_TENSES) {
    const row = verb?.conjugation?.tenses?.[tense];
    if (!row) continue;
    for (const slot of DRILL_SLOTS) {
      const answer = String(row[slot] || "").trim();
      if (answer) cells.push({ itemId: verb.itemId, term: verb.term, tense, slot, answer });
    }
  }
  return cells;
}

/** Fisher-Yates, so every ordering is equally likely rather than merely jumbled. */
function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A deck of prompts drawn across the owner's verbs.
 *
 * Two verbs in a row would make the drill feel like a single verb's table, so a card is
 * swapped forward when it repeats its predecessor and something else is available. With
 * only one verb to draw from that is impossible, and the deck simply runs consecutively
 * rather than returning short.
 */
export function buildDrillDeck(verbs, { size = DECK_SIZE, rng = Math.random } = {}) {
  const pool = shuffle((verbs || []).flatMap(drillCells), rng);
  const deck = [];

  while (deck.length < size && pool.length) {
    const previous = deck[deck.length - 1];
    // Prefer a different verb from the one just asked; fall back to the next card when
    // the pool holds only that verb, so a one-verb notebook still gets a full deck.
    let next = previous ? pool.findIndex((card) => card.itemId !== previous.itemId) : 0;
    if (next === -1) next = 0;
    deck.push(pool[next]);
    pool.splice(next, 1);
  }

  return deck;
}
