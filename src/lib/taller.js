import { JOURNAL_PROMPT_CATEGORIES, JOURNAL_PROMPTS } from "./journalPrompts.js";
import { conjugationPerformance } from "./conjugationStats.js";
import { deriveReviewState } from "./review.js";
import { localDate } from "./dates.js";
import { TENSE_ENDINGS } from "./recognitionContent.js";

/**
 * Taller — the Diario's skill-directed writing drill (docs/DIARIO-TALLER-DIRECTION.md).
 * Everything here is a pure derivation over the items and event log; nothing stores state.
 * The literal event type matches EVENT_TYPES.practiceWrite in src/db/events.js — spelled out
 * here so this stays a pure lib module, the conjugationStats.js precedent.
 */
export const PRACTICE_WRITE_TYPE = "practice_write";

export const TALLER_SKILL_CATEGORY_IDS = Object.freeze(["narrate", "imagine", "connect"]);

export const DRILL_TIERS = Object.freeze(["standard", "easier", "harder"]);

/** How often a weak-tense prompt is preferred over the whole pool — a bias, not a lock-in. */
const WEAK_TENSE_PREFERENCE = 2 / 3;

const OFFERED_WORDS_MAX = 3;
const OFFERED_WORDS_MIN = 2;
const RECENTLY_ADDED_DAYS = 14;
const LONG_UNTOUCHED_DAYS = 60;
const DAY_MS = 86400000;

const practiceEvents = (events) => (events || []).filter((event) => event.type === PRACTICE_WRITE_TYPE);

function dayOfYear(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!Number.isFinite(year)) return 0;
  return Math.round((new Date(year, month - 1, day) - new Date(year, 0, 1)) / DAY_MS);
}

/**
 * The door's one proposed skill: the least-recently-practiced of the three skill categories,
 * derived from practice events at render. Before any practice data exists every category ties,
 * so the local day-of-year picks — the proposal changes daily with zero storage. The
 * stale/weak-skill upgrade is deferred with the display work, per the direction.
 */
export function proposeTallerSkill(events, today = localDate()) {
  const latest = new Map();
  for (const event of practiceEvents(events)) {
    const skill = event.metadata?.skill;
    if (!TALLER_SKILL_CATEGORY_IDS.includes(skill)) continue;
    if (event.at > (latest.get(skill) || "")) latest.set(skill, event.at);
  }
  if (latest.size === 0) {
    return TALLER_SKILL_CATEGORY_IDS[dayOfYear(today) % TALLER_SKILL_CATEGORY_IDS.length];
  }
  return [...TALLER_SKILL_CATEGORY_IDS].sort((a, b) => {
    const lastA = latest.get(a) || "";
    const lastB = latest.get(b) || "";
    if (lastA !== lastB) return lastA < lastB ? -1 : 1;
    return TALLER_SKILL_CATEGORY_IDS.indexOf(a) - TALLER_SKILL_CATEGORY_IDS.indexOf(b);
  })[0];
}

/** The tenses the Conjugation Gym's own weakness rule currently marks weak. */
export function weakTenses(events, items) {
  const performance = conjugationPerformance(events || [], { items: items || [] });
  return new Set(performance.tenses.filter((row) => row.weak).map((row) => row.tense));
}

/**
 * Draws the drill's prompt within the chosen category. Tense-targeted prompts are preferred —
 * not guaranteed — when the Gym's derivations mark that tense weak, so a weak preterite biases
 * Narrate toward preterite prompts without ever hiding the rest of the pool.
 */
export function drawDrillPrompt(categoryId, { events = [], items = [], random = Math.random } = {}) {
  const pool = JOURNAL_PROMPTS.filter((prompt) => prompt.category === categoryId);
  if (pool.length === 0) return null;
  const weak = weakTenses(events, items);
  const preferred = pool.filter((prompt) => prompt.tense && weak.has(prompt.tense));
  const candidates = preferred.length > 0 && random() < WEAK_TENSE_PREFERENCE ? preferred : pool;
  return candidates[Math.floor(random() * candidates.length)];
}

/**
 * 2–3 of the owner's own lexical items for a word-offering prompt: one draw from each of the
 * mixed pool's cohorts — due in Repaso, recently added, long-untouched — topped up from their
 * union, never labelled. Under two candidates in total offers nothing rather than a lone chip.
 * Offering creates no link and no event against the word.
 */
export function sampleOfferedWords(items, events, { today = localDate(), random = Math.random } = {}) {
  const lexical = (items || []).filter((item) => item.type === "lexical");
  if (lexical.length === 0) return [];

  const { due } = deriveReviewState(lexical, events || [], today);

  const lastEventAt = new Map();
  for (const event of events || []) {
    if (!event.itemKey) continue;
    if (event.at > (lastEventAt.get(event.itemKey) || "")) lastEventAt.set(event.itemKey, event.at);
  }
  const todayMs = new Date(`${today}T12:00:00`).getTime();
  const recentlyAdded = lexical.filter(
    (item) => todayMs - Date.parse(item.createdAt) <= RECENTLY_ADDED_DAYS * DAY_MS
  );
  const longUntouched = lexical.filter((item) => {
    const last = lastEventAt.get(item.id);
    return !last || todayMs - Date.parse(last) >= LONG_UNTOUCHED_DAYS * DAY_MS;
  });

  const picked = [];
  const pickedIds = new Set();
  const drawFrom = (cohort) => {
    const open = cohort.filter((item) => !pickedIds.has(item.id));
    if (open.length === 0) return false;
    const item = open[Math.floor(random() * open.length)];
    picked.push(item);
    pickedIds.add(item.id);
    return true;
  };

  for (const cohort of [due, recentlyAdded, longUntouched]) {
    if (picked.length < OFFERED_WORDS_MAX) drawFrom(cohort);
  }
  const union = [...due, ...recentlyAdded, ...longUntouched];
  while (picked.length < OFFERED_WORDS_MIN && drawFrom(union)) {
    // topping up from the union until the minimum is met or the pool runs dry
  }
  return picked.length >= OFFERED_WORDS_MIN ? picked : [];
}

/**
 * The owner-edited interest list ("escalada, cocina, mi perro…"), stored as a preference on
 * the existing generic preference/backup path — the `pinnedLexicalIds` precedent. Private
 * personal data, never in the repo; edited inside Taller so the feature stays self-contained.
 */
export const TALLER_TEMAS_PREF = "tallerTemas";

/** Trimmed, unique, non-empty strings — the shape the preference stores and validation expects. */
export function cleanTemas(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const cleaned = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const tema = raw.trim();
    if (!tema || seen.has(tema)) continue;
    seen.add(tema);
    cleaned.push(tema);
  }
  return cleaned;
}

/**
 * One tema draw for the chip. The shuffle excludes the current tema so a redraw always moves;
 * with nothing else to move to, the current tema stays rather than vanishing mid-drill.
 */
export function drawTema(temas, { random = Math.random, exclude = null } = {}) {
  const pool = (temas || []).filter((tema) => tema !== exclude);
  if (pool.length === 0) return exclude ?? null;
  return pool[Math.floor(random() * pool.length)];
}

/** The shipped regular-endings rows for a tense-targeted prompt — reused Gym reference data. */
export function endingsForTense(tense) {
  if (!tense) return [];
  return TENSE_ENDINGS.filter((row) => row.answer === tense);
}

export function promptHasTiers(prompt) {
  return Boolean(prompt?.easier || prompt?.harder);
}

/** The prompt's bilingual text at a tier, falling back to the standard text. */
export function promptTextForTier(prompt, tier) {
  if (tier === "easier" && prompt?.easier) return prompt.easier;
  if (tier === "harder" && prompt?.harder) return prompt.harder;
  return { es: prompt?.es || "", en: prompt?.en || "" };
}

/** The keep-time opt-in: the prompt's Spanish as one ordinary quote block above the writing. */
export function bodyWithIncludedPrompt(promptEs, body) {
  return `> ${promptEs}\n\n${body}`;
}

const PRACTICE_TARGET_LABELS = Object.freeze({
  "Indicative/Preterite": "Indicative preterite",
  "Indicative/Imperfect": "Indicative imperfect",
  "Indicative/Present Perfect": "Present perfect",
  "Indicative/Past Perfect": "Past perfect",
  "Indicative/Conditional": "Conditional",
  "Indicative/Future": "Future",
  "Subjunctive/Present": "Present subjunctive",
  "Subjunctive/Present Perfect": "Present perfect subjunctive",
  "Subjunctive/Imperfect": "Imperfect subjunctive",
  "Subjunctive/Past Perfect": "Past perfect subjunctive",
  "Imperative Affirmative/Present": "Affirmative commands",
  "Imperative Negative/Present": "Negative commands",
});

/** A concise timeline label for the grammar or language target a prompt practices. */
export function practiceTargetLabel(prompt) {
  if (!prompt) return null;
  if (prompt.focus) return prompt.focus;
  return PRACTICE_TARGET_LABELS[prompt.tense] || null;
}

/**
 * Timeline provenance: kept practice events mapped page id → category and practice target,
 * derived at render by joining the stored prompt id to the shipped prompt library. Entries whose
 * events are gone, or that predate Taller, simply produce no marker.
 */
export function practiceDetailsByPage(events) {
  const categoryById = new Map(JOURNAL_PROMPT_CATEGORIES.map((category) => [category.id, category]));
  const promptById = new Map(JOURNAL_PROMPTS.map((prompt) => [prompt.id, prompt]));
  const byPage = new Map();
  for (const event of practiceEvents(events)) {
    if (!event.itemKey) continue;
    const category = categoryById.get(event.metadata?.skill);
    if (!category) continue;
    const prompt = promptById.get(event.metadata?.promptId);
    byPage.set(event.itemKey, {
      categoryId: category.id,
      categoryLabel: category.label,
      targetLabel: prompt?.category === category.id ? practiceTargetLabel(prompt) : null,
    });
  }
  return byPage;
}

/** Kept for callers that need only the broad category label. */
export function practiceSkillByPage(events) {
  return new Map(
    [...practiceDetailsByPage(events)].map(([pageId, details]) => [pageId, details.categoryLabel])
  );
}
