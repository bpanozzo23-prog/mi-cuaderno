import {
  SLOTS,
  COLLAPSED_SLOTS,
  SIMPLE_TENSES,
  PERFECT_TENSES,
} from "./conjugation.js";

/**
 * The Conjugation Gym's pure curriculum and deck rules.
 *
 * This module deliberately knows nothing about React or IndexedDB. Callers supply fully
 * resolved verbs and event history, which keeps curriculum changes and adaptive ordering
 * deterministic and cheap to test.
 */

export const CORE_20 = [
  "ser", "estar", "tener", "haber", "poder", "ir", "hacer", "querer", "decir", "ver",
  "saber", "dar", "venir", "poner", "salir", "hablar", "comer", "vivir", "pedir", "dormir",
];

export const CORE_50 = [
  ...CORE_20,
  "creer", "deber", "dejar", "pensar", "necesitar", "llevar", "pasar", "volver", "parecer", "gustar",
  "esperar", "encontrar", "llamar", "sentir", "conocer", "seguir", "quedar", "tomar", "llegar", "morir",
  "ayudar", "mirar", "entender", "trabajar", "buscar", "escuchar", "preguntar", "perder", "empezar", "traer",
];

export const GYM_SLOTS = SLOTS.filter((slot) => !COLLAPSED_SLOTS.has(slot));

export const EVERYDAY_TENSES = [
  "Indicative/Present",
  "Indicative/Preterite",
  "Indicative/Imperfect",
  "Indicative/Future",
  "Indicative/Conditional",
  "Subjunctive/Present",
];

export const COMMAND_TENSES = [
  "Imperative Affirmative/Present",
  "Imperative Negative/Present",
];

export const SUBJUNCTIVE_TENSES = [
  "Subjunctive/Present",
  "Subjunctive/Imperfect",
];

export const PERFECT_PRACTICE_TENSES = [
  "Indicative/Present Perfect",
  "Indicative/Past Perfect",
  "Indicative/Future Perfect",
  "Indicative/Conditional Perfect",
  "Subjunctive/Present Perfect",
  "Subjunctive/Past Perfect",
];

export const ALL_GYM_TENSES = [...SIMPLE_TENSES, ...Object.keys(PERFECT_TENSES)];

export const RARE_TENSES = new Set([
  "Subjunctive/Imperfect (-se)",
  "Subjunctive/Future",
  "Indicative/Preterite (Archaic)",
  "Subjunctive/Future Perfect",
]);

export const TENSE_PACKS = {
  everyday: { label: "Everyday", tenses: EVERYDAY_TENSES },
  commands: { label: "Commands", tenses: COMMAND_TENSES },
  subjunctive: { label: "Subjunctive", tenses: SUBJUNCTIVE_TENSES },
  perfect: { label: "Perfect tenses", tenses: PERFECT_PRACTICE_TENSES },
  customize: { label: "Customize", tenses: ALL_GYM_TENSES },
};

export const canonicalLemma = (lemma) =>
  String(lemma ?? "").trim().normalize("NFC").toLowerCase();

export const verbKeyForLemma = (lemma) => {
  const canonical = canonicalLemma(lemma);
  return canonical ? `lemma:${canonical}` : null;
};

export const gymCellKey = (cell) => `${cell.verbKey}|${cell.tense}|${cell.slot}`;

/** All answerable cells for the chosen tenses and exact persisted slot strings. */
export function gymCells(verb, { tenses = EVERYDAY_TENSES, slots = GYM_SLOTS } = {}) {
  const lemma = String(verb?.lemma || verb?.term || "").trim().normalize("NFC");
  const verbKey = verb?.verbKey || verbKeyForLemma(lemma);
  if (!verbKey) return [];

  const cells = [];
  for (const tense of tenses) {
    const row = verb?.conjugation?.tenses?.[tense];
    if (!row) continue;
    for (const slot of slots) {
      const answer = String(row[slot] || "").trim();
      if (!answer) continue;
      cells.push({
        itemId: verb.itemId ?? verb.itemKey ?? null,
        itemKey: verb.itemKey ?? verb.itemId ?? null,
        dictKey: verb.dictKey ?? verb.entry?.id ?? null,
        source: verb.source || "saved",
        curriculum: verb.curriculum || null,
        lemma,
        term: verb.term || lemma,
        verbKey,
        tense,
        slot,
        answer,
      });
    }
  }
  return cells;
}

function shuffled(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uniqueCells(verbs, options) {
  const byKey = new Map();
  for (const cell of (verbs || []).flatMap((verb) => gymCells(verb, options))) {
    if (!byKey.has(gymCellKey(cell))) byKey.set(gymCellKey(cell), cell);
  }
  return [...byKey.values()];
}

function balancedSelection(candidates, size, { rng = Math.random, seedDeck = [] } = {}) {
  const pool = shuffled(candidates, rng);
  const deck = [...seedDeck];
  const tenseCounts = new Map();
  const slotCounts = new Map();
  const verbCounts = new Map();

  for (const card of deck) {
    tenseCounts.set(card.tense, (tenseCounts.get(card.tense) || 0) + 1);
    slotCounts.set(card.slot, (slotCounts.get(card.slot) || 0) + 1);
    verbCounts.set(card.verbKey, (verbCounts.get(card.verbKey) || 0) + 1);
  }

  while (deck.length < size && pool.length) {
    const previous = deck.at(-1);
    const canSwitchVerb = previous && pool.some((card) => card.verbKey !== previous.verbKey);
    let bestIndex = 0;
    let bestScore = null;

    for (let index = 0; index < pool.length; index += 1) {
      const card = pool[index];
      const score = [
        canSwitchVerb && card.verbKey === previous.verbKey ? 1 : 0,
        tenseCounts.get(card.tense) || 0,
        slotCounts.get(card.slot) || 0,
        verbCounts.get(card.verbKey) || 0,
      ];
      if (!bestScore || score.some((value, i) => value < bestScore[i] && score.slice(0, i).every((v, j) => v === bestScore[j]))) {
        bestIndex = index;
        bestScore = score;
      }
    }

    const [card] = pool.splice(bestIndex, 1);
    deck.push(card);
    tenseCounts.set(card.tense, (tenseCounts.get(card.tense) || 0) + 1);
    slotCounts.set(card.slot, (slotCounts.get(card.slot) || 0) + 1);
    verbCounts.set(card.verbKey, (verbCounts.get(card.verbKey) || 0) + 1);
  }
  return deck;
}

/**
 * Balanced practice: no repeated cell, broad tense/person coverage, and no consecutive
 * verb when another verb is available.
 */
export function buildBalancedGymDeck(
  verbs,
  { size = 10, tenses = EVERYDAY_TENSES, slots = GYM_SLOTS, rng = Math.random } = {}
) {
  return balancedSelection(uniqueCells(verbs, { tenses, slots }), size, { rng });
}

const isInitialAnswer = (event) =>
  (event?.type === "drill_pass" || event?.type === "drill_fail") &&
  (event.metadata.stage || "initial") === "initial";

const isTyped = (event) => event?.metadata?.mode === "typed" || event?.metadata?.mode === "type";

function historyForAdaptive(events) {
  const initial = (events || []).filter(isInitialAnswer);
  const cellStats = new Map();
  const exposureCounts = new Map();
  const tenseStats = new Map();
  const slotStats = new Map();
  const recoveries = new Set(
    (events || [])
      .filter((event) => event.type === "drill_pass" && event.metadata?.stage && event.metadata.stage !== "initial")
      .map((event) => event.metadata?.promptId)
      .filter(Boolean)
  );

  const add = (map, key, passed, at) => {
    if (!key) return;
    const value = map.get(key) || { attempts: 0, passed: 0, lastAt: "" };
    value.attempts += 1;
    if (passed) value.passed += 1;
    if (String(at || "") > value.lastAt) value.lastAt = String(at || "");
    map.set(key, value);
  };

  const failures = [];
  for (const event of initial) {
    const metadata = event.metadata || {};
    if (!metadata.verbKey || !metadata.tense || !metadata.slot) continue;
    const key = `${metadata.verbKey}|${metadata.tense}|${metadata.slot}`;
    const passed = event.type === "drill_pass";
    exposureCounts.set(key, (exposureCounts.get(key) || 0) + 1);
    // Typed initial attempts are measured recall. Reveal grades are useful evidence of a
    // recent miss and of exposure, but a self-reported Got it must not manufacture a weak
    // or strong dimension.
    if (isTyped(event)) {
      add(cellStats, key, passed, event.at);
      add(tenseStats, metadata.tense, passed, event.at);
      add(slotStats, metadata.slot, passed, event.at);
    }
    if (!passed) {
      failures.push({
        key,
        at: String(event.at || ""),
        recovered: Boolean(metadata.promptId && recoveries.has(metadata.promptId)),
      });
    }
  }

  failures.sort((a, b) => Number(a.recovered) - Number(b.recovered) || b.at.localeCompare(a.at));
  return { cellStats, exposureCounts, tenseStats, slotStats, failures };
}

const isWeak = (stats) => stats && stats.attempts >= 3 && stats.passed / stats.attempts < 0.8;

function appendRanked(deck, selected, candidates, count) {
  let remaining = count;
  while (remaining > 0) {
    const available = candidates.filter((card) => !selected.has(gymCellKey(card)));
    if (!available.length) break;
    const previous = deck.at(-1);
    const next = available.find((card) => !previous || card.verbKey !== previous.verbKey) || available[0];
    deck.push(next);
    selected.add(gymCellKey(next));
    remaining -= 1;
  }
}

/**
 * Opt-in adaptive practice. Roughly 40% targets recent initial misses, 30% targets weak
 * tense/person dimensions, and the rest favors unseen or least-practised cells. When any
 * bucket is sparse, the remainder falls back to the same balanced, under-practised pool.
 */
export function buildAdaptiveGymDeck(
  verbs,
  events,
  { size = 10, tenses = EVERYDAY_TENSES, slots = GYM_SLOTS, rng = Math.random } = {}
) {
  const cells = uniqueCells(verbs, { tenses, slots });
  if (!cells.length) return [];
  const history = historyForAdaptive(events);
  const byKey = new Map(cells.map((cell) => [gymCellKey(cell), cell]));
  const recent = [];
  const seenRecent = new Set();
  for (const failure of history.failures) {
    if (seenRecent.has(failure.key) || !byKey.has(failure.key)) continue;
    recent.push(byKey.get(failure.key));
    seenRecent.add(failure.key);
  }

  const weak = shuffled(
    cells.filter((cell) => isWeak(history.tenseStats.get(cell.tense)) || isWeak(history.slotStats.get(cell.slot))),
    rng
  ).sort((a, b) => {
    const aStats = history.cellStats.get(gymCellKey(a));
    const bStats = history.cellStats.get(gymCellKey(b));
    return (aStats?.passed / aStats?.attempts || 0) - (bStats?.passed / bStats?.attempts || 0);
  });

  const underPractised = shuffled(cells, rng).sort((a, b) => {
    const left = history.cellStats.get(gymCellKey(a));
    const right = history.cellStats.get(gymCellKey(b));
    return (history.exposureCounts.get(gymCellKey(a)) || 0) - (history.exposureCounts.get(gymCellKey(b)) || 0) ||
      (left?.attempts || 0) - (right?.attempts || 0) ||
      String(left?.lastAt || "").localeCompare(String(right?.lastAt || ""));
  });

  const deck = [];
  const selected = new Set();
  appendRanked(deck, selected, recent, Math.round(size * 0.4));
  appendRanked(deck, selected, weak, Math.round(size * 0.3));
  appendRanked(deck, selected, underPractised, size - deck.length);

  if (deck.length < Math.min(size, cells.length)) {
    const remainder = cells.filter((cell) => !selected.has(gymCellKey(cell)));
    return balancedSelection(remainder, Math.min(size, cells.length), { rng, seedDeck: deck });
  }
  return deck;
}
