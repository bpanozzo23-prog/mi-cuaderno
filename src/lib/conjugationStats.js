import {
  ALL_GYM_TENSES,
  GYM_CURRICULUM_REGISTRY,
  GYM_SLOTS,
  gymCurriculumForLemma,
  gymCellKey,
  gymCells,
  verbKeyForLemma,
} from "./conjugationGym.js";

const DRILL_TYPES = new Set(["drill_pass", "drill_fail"]);
const isPassed = (event) => event.type === "drill_pass";

/**
 * Recognition lanes (Tense usage, Endings, Contrasts) reuse the drill event types. Forms
 * performance must stay blind to them by structure: every recognition session stamps
 * `sessionKind: "recognition"`, and the skill list is the belt to that braces — a lane
 * added later that forgets the session kind still fails the second test, and the
 * adversarial contract tests pin each lane individually.
 */
const RECOGNITION_SKILLS = new Set(["usage", "endings", "contrast"]);
const isRecognitionEvent = (event) => (
  event?.metadata?.sessionKind === "recognition" || RECOGNITION_SKILLS.has(event?.metadata?.skill)
);
const isTypedMode = (mode) => mode === "typed" || mode === "type";
const ratio = (passed, answered) => (answered ? passed / answered : null);

function summary(rows) {
  const answered = rows.length;
  const passed = rows.filter((row) => row.passed).length;
  const exact = rows.filter((row) => row.verdict === "exact").length;
  const accents = rows.filter((row) => row.verdict === "accents").length;
  return { answered, passed, exact, accents, accuracy: ratio(passed, answered) };
}

function aggregate(rows, field, outputField = field) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row[field];
    if (!key) continue;
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  }
  return [...grouped.entries()]
    .map(([key, values]) => ({
      [outputField]: key,
      ...summary(values),
      weak: values.length >= 3 && values.filter((value) => value.passed).length / values.length < 0.8,
    }))
    .sort((a, b) =>
      (a.accuracy ?? 1) - (b.accuracy ?? 1) || b.answered - a.answered ||
      String(a[outputField]).localeCompare(String(b[outputField]))
    );
}

function targetPriority(target) {
  if (target.source === "saved") return 0;
  const curriculum = target.curriculum || gymCurriculumForLemma(target.lemma);
  const index = Object.keys(GYM_CURRICULUM_REGISTRY).indexOf(curriculum);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index + 1;
}

function activeTargetsFor(activeVerbs, source) {
  const eligible = (activeVerbs || [])
    .filter((target) => source === "all" || target.source === source)
    .map((target) => ({
      ...target,
      curriculum: target.source === "core"
        ? (GYM_CURRICULUM_REGISTRY[target.curriculum] ? target.curriculum : gymCurriculumForLemma(target.lemma))
        : null,
    }))
    .sort((a, b) => targetPriority(a) - targetPriority(b) || a.lemma.localeCompare(b.lemma));
  const chosen = new Map();
  for (const target of eligible) if (!chosen.has(target.verbKey)) chosen.set(target.verbKey, target);
  return [...chosen.values()].sort((a, b) => a.lemma.localeCompare(b.lemma));
}

function itemLemma(itemLemmas, item, targetByItem) {
  if (!item) return null;
  const supplied = itemLemmas instanceof Map ? itemLemmas.get(item.id) : itemLemmas?.[item.id];
  return supplied || targetByItem.get(item.id)?.lemma || item.term || null;
}

function normalizeEvents(events, { items, itemLemmas, targets, source, tenses }) {
  const itemById = new Map((items || []).map((item) => [item.id, item]));
  const targetByItem = new Map(targets.filter((target) => target.itemKey).map((target) => [target.itemKey, target]));
  const allowedTenses = tenses?.length ? new Set(tenses) : null;

  return (events || [])
    .filter((event) => DRILL_TYPES.has(event?.type))
    .filter((event) => !isRecognitionEvent(event))
    .map((event, order) => {
      const metadata = event.metadata || {};
      const item = event.itemKey ? itemById.get(event.itemKey) : null;
      const lemma = metadata.lemma || itemLemma(itemLemmas, item, targetByItem);
      return {
        event,
        order,
        at: String(event.at || ""),
        passed: isPassed(event),
        source: metadata.source || "saved",
        stage: metadata.stage || "initial",
        mode: metadata.mode || null,
        verdict: metadata.verdict || (isPassed(event) ? "exact" : "wrong"),
        diagnosis: metadata.diagnosis || (isPassed(event) ? null : "wrong"),
        promptId: metadata.promptId || null,
        verbKey: metadata.verbKey || verbKeyForLemma(lemma),
        lemma,
        tense: metadata.tense || null,
        slot: metadata.slot || null,
      };
    })
    .filter((row) => source === "all" || row.source === source)
    .filter((row) => !allowedTenses || (row.tense && allowedTenses.has(row.tense)))
    .sort((a, b) => a.at.localeCompare(b.at) || a.order - b.order);
}

function recoveryFrom(rows) {
  const initialMisses = rows.filter((row) => isTypedMode(row.mode) && row.stage === "initial" && !row.passed);
  const missedIds = new Set(initialMisses.map((row) => row.promptId).filter(Boolean));
  const retryPasses = new Set(
    rows
      .filter((row) => isTypedMode(row.mode) && row.stage === "retry" && row.passed && missedIds.has(row.promptId))
      .map((row) => row.promptId)
  );
  const missedAttempts = rows.filter(
    (row) => isTypedMode(row.mode) && row.stage === "missed" && missedIds.has(row.promptId)
  );
  const attemptedIds = new Set(missedAttempts.map((row) => row.promptId));
  const recoveredIds = new Set(missedAttempts.filter((row) => row.passed).map((row) => row.promptId));
  return {
    initialMisses: initialMisses.length,
    immediateRecovered: retryPasses.size,
    missedAttempted: attemptedIds.size,
    missedRecovered: recoveredIds.size,
  };
}

/**
 * Dedicated Gym performance derived entirely from the event log.
 *
 * Primary accuracy means typed, initial attempts only. Retry and missed-round events are
 * retained for recovery analysis, reveal grades are kept as separate exposure evidence,
 * and deleted verbs can affect aggregate skill history without becoming action targets.
 */
export function conjugationPerformance(
  events,
  {
    items = [],
    itemLemmas = new Map(),
    activeVerbs = [],
    dictionaryAvailable = false,
    source = "all",
    tenses = null,
  } = {}
) {
  const activeTargets = activeTargetsFor(activeVerbs, source);
  const rows = normalizeEvents(events, { items, itemLemmas, targets: activeTargets, source, tenses });
  const primary = rows.filter((row) => isTypedMode(row.mode) && row.stage === "initial");
  const revealRows = rows.filter((row) => row.mode === "reveal" && row.stage === "initial");
  const recentRows = primary.slice(-50);
  const previousRows = primary.slice(-100, -50);
  const recent = summary(recentRows);
  const previous = summary(previousRows);
  recent.comparison = recent.answered >= 10 && previous.answered >= 10
    ? {
        answered: previous.answered,
        accuracy: previous.accuracy,
        points: Math.round((recent.accuracy - previous.accuracy) * 100),
      }
    : null;

  const tensesRows = aggregate(primary, "tense", "tense").map((tenseRow) => ({
    ...tenseRow,
    slots: aggregate(primary.filter((row) => row.tense === tenseRow.tense), "slot", "slot"),
  }));
  const slotsRows = aggregate(primary, "slot", "slot");
  const targetByKey = new Map(activeTargets.map((target) => [target.verbKey, target]));

  const verbGroups = new Map();
  for (const row of primary) {
    if (!row.verbKey || !targetByKey.has(row.verbKey)) continue;
    const list = verbGroups.get(row.verbKey) || [];
    list.push(row);
    verbGroups.set(row.verbKey, list);
  }
  const verbs = [...verbGroups.entries()]
    .map(([verbKey, values]) => ({
      verbKey,
      lemma: targetByKey.get(verbKey).lemma,
      target: targetByKey.get(verbKey),
      ...summary(values),
      weak: values.length >= 3 && values.filter((value) => value.passed).length / values.length < 0.8,
    }))
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1) || b.answered - a.answered || a.lemma.localeCompare(b.lemma));

  const coverageTenses = tenses?.length ? tenses : ALL_GYM_TENSES;
  const possibleCells = new Map();
  if (dictionaryAvailable) {
    for (const target of activeTargets) {
      for (const cell of gymCells(target, { tenses: coverageTenses, slots: GYM_SLOTS })) {
        const key = gymCellKey(cell);
        if (!possibleCells.has(key)) possibleCells.set(key, { ...cell, target });
      }
    }
  }

  const cellGroups = new Map();
  for (const row of primary) {
    if (!row.verbKey || !row.tense || !row.slot) continue;
    const key = `${row.verbKey}|${row.tense}|${row.slot}`;
    if (!possibleCells.has(key)) continue;
    const list = cellGroups.get(key) || [];
    list.push(row);
    cellGroups.set(key, list);
  }
  const problemForms = [...cellGroups.entries()]
    .map(([key, values]) => ({
      key,
      ...possibleCells.get(key),
      ...summary(values),
      weak: values.length >= 3 && values.filter((value) => value.passed).length / values.length < 0.8,
    }))
    .filter((row) => row.weak)
    .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered);

  const practisedKeys = new Set(cellGroups.keys());
  const coverage = dictionaryAvailable
    ? {
        available: true,
        verbs: activeTargets.length,
        practised: practisedKeys.size,
        total: possibleCells.size,
        rate: ratio(practisedKeys.size, possibleCells.size),
      }
    : { available: false, verbs: null, practised: null, total: null, rate: null };

  const diagnoses = aggregate(
    primary.filter((row) => !row.passed).map((row) => ({ ...row, diagnosis: row.diagnosis || "wrong" })),
    "diagnosis",
    "diagnosis"
  );

  const weakVerb = verbs.find((row) => row.weak);
  const weakTense = tensesRows.find((row) => row.weak);
  const practiceNext = problemForms[0]
    ? {
        kind: "cell",
        target: problemForms[0].target,
        tense: problemForms[0].tense,
        slot: problemForms[0].slot,
      }
    : weakVerb
      ? { kind: "verb", target: weakVerb.target }
      : weakTense
        ? { kind: "tense", tense: weakTense.tense }
        : null;

  return {
    recent,
    previous,
    lifetime: summary(primary),
    reveal: summary(revealRows),
    recovery: recoveryFrom(rows),
    tenses: tensesRows,
    slots: slotsRows,
    verbs,
    problemForms,
    diagnoses,
    coverage,
    practiceNext,
    activeTargets,
  };
}
