/** Choice lanes: tense-keyed Usage and Endings, and the pair-keyed Contrasts lane. */
const SKILLS = new Set(["usage", "endings", "contrast"]);

const summary = (rows) => {
  const answered = rows.length;
  const passed = rows.filter((row) => row.passed).length;
  return { answered, passed, accuracy: answered ? passed / answered : null };
};

function aggregate(rows, field, outputField = field) {
  const groups = new Map();
  for (const row of rows) {
    if (!row[field]) continue;
    const values = groups.get(row[field]) || [];
    values.push(row);
    groups.set(row[field], values);
  }
  return [...groups.entries()]
    .map(([key, values]) => ({ [outputField]: key, ...summary(values) }))
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1) || b.answered - a.answered || String(a[outputField]).localeCompare(String(b[outputField])));
}

/** Directional miss counts, most frequent first, keyed by the persisted answer and the chosen option. */
function confusionsOf(rows, answerField) {
  const groups = new Map();
  for (const row of rows) {
    if (row.passed || !row.chosen || row.chosen === row.answer) continue;
    const key = `${row.answer}|${row.chosen}`;
    const value = groups.get(key) || { [answerField]: row.answer, chosen: row.chosen, count: 0 };
    value.count += 1;
    groups.set(key, value);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a[answerField].localeCompare(b[answerField]) || a.chosen.localeCompare(b.chosen));
}

/**
 * Recognition statistics derived only from additive choice-event metadata.
 *
 * Tense lanes persist a canonical `tense`; the tense-pack scope applies to them. Contrasts
 * answers persist `pair` and `answer` and no tense, so they are never scoped by pack and
 * never appear in the per-tense rows — they aggregate per pair instead.
 */
export function recognitionPerformance(events, { tenses = null } = {}) {
  const allowed = tenses?.length ? new Set(tenses) : null;
  const rows = (events || [])
    .filter((event) => (
      (event?.type === "drill_pass" || event?.type === "drill_fail")
      && SKILLS.has(event?.metadata?.skill)
      && event?.metadata?.mode === "choice"
    ))
    .map((event) => ({
      passed: event.type === "drill_pass",
      skill: event.metadata.skill,
      cardId: event.metadata.cardId || null,
      tense: event.metadata.tense || null,
      pair: event.metadata.pair || null,
      answer: event.metadata.tense || event.metadata.answer || null,
      chosen: event.metadata.chosen || null,
      stage: event.metadata.stage || "initial",
    }))
    .filter((row) => row.answer && (row.pair ? true : row.tense && (!allowed || allowed.has(row.tense))));
  const initial = rows.filter((row) => row.stage === "initial");
  const missed = rows.filter((row) => row.stage === "missed");
  const tenseInitial = initial.filter((row) => row.tense);
  const pairInitial = initial.filter((row) => row.pair);

  const lanes = aggregate(initial, "skill", "skill");
  const tensesRows = aggregate(tenseInitial, "tense", "tense").map((tense) => ({
    ...tense,
    lanes: aggregate(tenseInitial.filter((row) => row.tense === tense.tense), "skill", "skill"),
  }));
  const pairs = aggregate(pairInitial, "pair", "pair").map((pair) => ({
    ...pair,
    confusions: confusionsOf(pairInitial.filter((row) => row.pair === pair.pair), "answer"),
  }));

  return {
    lifetime: summary(initial),
    lanes,
    tenses: tensesRows,
    pairs,
    confusions: confusionsOf(tenseInitial, "tense"),
    missed: summary(missed),
  };
}
