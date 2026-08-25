import { checkTypedAnswer } from "./drill.js";
import { GYM_SLOTS } from "./conjugationGym.js";
import { TENSE_ENDINGS } from "./recognitionContent.js";

const tidy = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const shuffle = (values, rng) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const curatedEndingSet = (rows) => new Set(
  (rows || []).flatMap((row) => row.endings || []).map(tidy).filter(Boolean)
);

/**
 * Grades all five ending cells together. Exact checks happen before accent folding. An
 * accent-only near match fails when the literal typed value is another curated ending.
 */
export function gradeEndingRow(values, row, rows = TENSE_ENDINGS) {
  const curated = curatedEndingSet(rows);
  const slotVerdicts = {};
  let complete = true;
  let passed = true;

  GYM_SLOTS.forEach((slot, index) => {
    const given = Array.isArray(values) ? values[index] : values?.[slot];
    const answer = row?.endings?.[index];
    if (!tidy(given)) {
      complete = false;
      passed = false;
      slotVerdicts[slot] = "required";
      return;
    }
    const verdict = checkTypedAnswer(given, answer);
    if (verdict === "accents" && tidy(given) !== tidy(answer) && curated.has(tidy(given))) {
      passed = false;
      slotVerdicts[slot] = "accent_collision";
      return;
    }
    if (verdict === "wrong") passed = false;
    slotVerdicts[slot] = verdict;
  });

  return {
    passed,
    complete,
    verdict: !complete ? "required" : !passed ? "wrong" : Object.values(slotVerdicts).includes("accents") ? "accents" : "exact",
    slotVerdicts,
  };
}

const byAnswer = (row) => row.answer;

/**
 * Shuffles, then picks greedily so consecutive rows differ on `keyOf` whenever the pool
 * allows and keys spread evenly. Endings balance by tense; Transform balances by trigger
 * family. Rows are spliced from the pool, so a deck never repeats one.
 */
function balancedRows(rows, size, rng, keyOf = byAnswer) {
  const pool = shuffle(rows, rng);
  const deck = [];
  const counts = new Map();
  while (deck.length < size && pool.length) {
    const previous = deck.at(-1);
    const canSwitch = previous && pool.some((row) => keyOf(row) !== keyOf(previous));
    let bestIndex = 0;
    let bestScore = null;
    for (let index = 0; index < pool.length; index += 1) {
      const row = pool[index];
      const score = [
        canSwitch && keyOf(row) === keyOf(previous) ? 1 : 0,
        counts.get(keyOf(row)) || 0,
      ];
      if (!bestScore || score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
        bestIndex = index;
        bestScore = score;
      }
    }
    const [next] = pool.splice(bestIndex, 1);
    deck.push(next);
    counts.set(keyOf(next), (counts.get(keyOf(next)) || 0) + 1);
  }
  return deck;
}

/** A finite, unique-row typed deck balanced on `keyOf`, capped honestly at the rows available. */
export function buildTypedDeck(rows, { size = 10, rng = Math.random, keyOf = byAnswer } = {}) {
  const candidates = rows || [];
  return balancedRows(candidates, Math.min(Number(size) || 0, candidates.length), rng, keyOf);
}

/** Repeats every initially missed row once, de-duplicated by its stable id. */
export function rebuildMissedTypedDeck(rows, { rng = Math.random, keyOf = byAnswer } = {}) {
  const unique = [...new Map((rows || []).map((row) => [row.id, row])).values()];
  return balancedRows(unique, unique.length, rng, keyOf);
}

/** Builds a finite, unique-row production deck and caps honestly at available rows. */
export function buildEndingsProductionDeck(
  rows,
  { size = 10, tenseScope = [], rng = Math.random } = {}
) {
  const allowed = tenseScope?.length ? new Set(tenseScope) : null;
  const candidates = (rows || []).filter((row) => !allowed || allowed.has(row.answer));
  return buildTypedDeck(candidates, { size, rng });
}

/** Repeats every initially missed row once, de-duplicated by its stable row id. */
export function rebuildMissedEndingsProductionDeck(rows, { rng = Math.random } = {}) {
  return rebuildMissedTypedDeck(rows, { rng });
}
