const SKILLS = new Set(["usage", "endings"]);

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

/** Recognition statistics derived only from additive choice-event metadata. */
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
      chosen: event.metadata.chosen || null,
      stage: event.metadata.stage || "initial",
    }))
    .filter((row) => row.tense && (!allowed || allowed.has(row.tense)));
  const initial = rows.filter((row) => row.stage === "initial");
  const missed = rows.filter((row) => row.stage === "missed");

  const lanes = aggregate(initial, "skill", "skill");
  const tensesRows = aggregate(initial, "tense", "tense").map((tense) => ({
    ...tense,
    lanes: aggregate(initial.filter((row) => row.tense === tense.tense), "skill", "skill"),
  }));

  const confusionGroups = new Map();
  for (const row of initial) {
    if (row.passed || !row.chosen || row.chosen === row.tense) continue;
    const key = `${row.tense}|${row.chosen}`;
    const value = confusionGroups.get(key) || { tense: row.tense, chosen: row.chosen, count: 0 };
    value.count += 1;
    confusionGroups.set(key, value);
  }
  const confusions = [...confusionGroups.values()]
    .sort((a, b) => b.count - a.count || a.tense.localeCompare(b.tense) || a.chosen.localeCompare(b.chosen));

  return {
    lifetime: summary(initial),
    lanes,
    tenses: tensesRows,
    confusions,
    missed: summary(missed),
  };
}
