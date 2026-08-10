const DRILL_TYPES = new Set(["drill_pass", "drill_fail"]);

const ratio = (passed, answered) => answered ? passed / answered : null;

const summary = (rows) => {
  const answered = rows.length;
  const passed = rows.filter((row) => row.passed).length;
  return { answered, passed, accuracy: ratio(passed, answered) };
};

function recoverySummary(rows, initialMisses, stage) {
  const missedPrompts = new Set(initialMisses.map((row) => row.promptId));
  const attempts = rows.filter((row) => row.stage === stage && missedPrompts.has(row.promptId));
  const attempted = new Set(attempts.map((row) => row.promptId));
  const recovered = new Set(attempts.filter((row) => row.passed).map((row) => row.promptId));
  return { attempted: attempted.size, recovered: recovered.size, accuracy: ratio(recovered.size, attempted.size) };
}

/** Mode-separated Phase 18 statistics derived only from recall and typed-Endings events. */
export function gymDepthPerformance(events, { tenses = null } = {}) {
  const allowed = tenses?.length ? new Set(tenses) : null;
  const rows = (events || [])
    .filter((event) => DRILL_TYPES.has(event?.type))
    .map((event, index) => ({
      id: event.id || `event-${index}`,
      passed: event.type === "drill_pass",
      skill: event.metadata?.skill || null,
      mode: event.metadata?.mode || null,
      tense: event.metadata?.tense || null,
      verdict: event.metadata?.verdict || null,
      stage: event.metadata?.stage || "initial",
      promptId: event.metadata?.promptId || event.id || `event-${index}`,
    }))
    .filter((row) => row.tense && (!allowed || allowed.has(row.tense)));

  const usageRows = rows.filter((row) => row.skill === "usage" && row.mode === "recall");
  const usageInitial = usageRows.filter((row) => row.stage === "initial");
  const usageMissed = usageRows.filter((row) => row.stage === "missed");

  const endingsRows = rows.filter((row) => row.skill === "endings" && row.mode === "typed");
  const endingsInitial = endingsRows.filter((row) => row.stage === "initial");
  const endingsMisses = endingsInitial.filter((row) => !row.passed);
  const endingFirstAttempts = {
    ...summary(endingsInitial),
    exact: endingsInitial.filter((row) => row.passed && row.verdict === "exact").length,
    accents: endingsInitial.filter((row) => row.passed && row.verdict === "accents").length,
  };

  return {
    usageRecall: {
      firstAttempts: summary(usageInitial),
      missed: summary(usageMissed),
    },
    typedEndings: {
      firstAttempts: endingFirstAttempts,
      immediate: recoverySummary(endingsRows, endingsMisses, "retry"),
      missed: recoverySummary(endingsRows, endingsMisses, "missed"),
    },
  };
}
