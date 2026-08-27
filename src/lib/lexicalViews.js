import { normalize } from "./normalize.js";
import { LEXICAL_POS_OPTIONS, USAGE_LABELS, VERB_BEHAVIORS } from "./meanings.js";
import { activePageContextsForLexical } from "./pageReferences.js";

/**
 * Phase 8's Words & phrases hub organizes lexical items by things the notebook already derives.
 * Like `organization.js`, nothing here stores a preference, counter or cached ordering: every
 * helper takes data the caller already holds in memory and returns a new value.
 *
 * The two filters take an ALREADY-DERIVED input — a context list, a review state — rather than
 * the notebook or the event log. That keeps them pure, keeps the expensive derivations to one
 * pass per notebook change, and means the hub's filter and its cards can never disagree about
 * what a word's context or box actually is.
 */

/** Pinned vocabulary is a UI preference, exactly like `PINNED_PAGE_IDS_PREF` in pageKinds.js. */
export const PINNED_LEXICAL_IDS_PREF = "pinnedLexicalIds";

/**
 * Where a word lives. The values are the `kind` strings `activePageContextsForLexical` already
 * emits, so there is no mapping layer that could drift from the contexts themselves; the hub
 * supplies the owner-facing label ("In a Collection" for `vocabulary`).
 *
 * That helper deliberately ignores disabled structures, which is what makes a word sitting in a
 * hidden Collection read as `none` here — hidden content stays outside retrieval (§7).
 */
export const LEXICAL_CONTEXTS = Object.freeze({
  anywhere: "anywhere",
  vocabulary: "vocabulary",
  source: "source",
  grammar: "grammar",
  none: "none",
});

/**
 * Every lexical item's active page contexts, in one pass over the notebook. Built once per
 * notebook change rather than per render, because each lookup scans the pages.
 */
export function pageContextIndex(items = []) {
  const index = new Map();
  for (const item of items) {
    if (item?.type !== "lexical") continue;
    index.set(item.id, activePageContextsForLexical(item.id, items));
  }
  return index;
}

export function matchesContextFilter(contexts = [], filter = LEXICAL_CONTEXTS.anywhere) {
  if (!filter || filter === LEXICAL_CONTEXTS.anywhere) return true;
  if (filter === LEXICAL_CONTEXTS.none) return contexts.length === 0;
  return contexts.some((context) => context?.kind === filter);
}

/** One exact active Page context, composed after the broad habitat choice. */
export function matchesPageFilter(contexts = [], pageId = "") {
  if (!pageId) return true;
  return contexts.some((context) => context?.pageId === pageId);
}

const spanishPageTitles = new Intl.Collator("es", { sensitivity: "base" });

/**
 * Contextual Page choices for the current lexical lens. A word counts once per Page even when it
 * appears in several captures, groups or Grammar examples on that Page.
 */
export function pageContextCountsIn(items = [], contextIndex = new Map()) {
  const counts = new Map();
  for (const item of items) {
    const seen = new Set();
    for (const context of contextIndex.get(item.id) || []) {
      if (!context?.pageId || seen.has(context.pageId)) continue;
      seen.add(context.pageId);
      const current = counts.get(context.pageId) || {
        pageId: context.pageId,
        pageTitle: context.pageTitle || "Untitled page",
        count: 0,
      };
      current.count += 1;
      counts.set(context.pageId, current);
    }
  }
  return [...counts.values()].sort(
    (left, right) => spanishPageTitles.compare(left.pageTitle, right.pageTitle)
      || left.pageId.localeCompare(right.pageId)
  );
}

/**
 * The learning lens. Display and retrieval only — grading stays in Repaso (§12).
 *
 * "In review" means the queue is currently carrying the word: enrolled and not yet retired.
 * A graduated word is deliberately excluded from it and has its own choice, because the two
 * answer different questions ("what am I working on" versus "what have I finished").
 */
export const LEXICAL_LEARNING = Object.freeze({
  any: "any",
  tricky: "tricky",
  reviewing: "reviewing",
  due: "due",
  graduated: "graduated",
});

export function matchesLearningFilter(state, filter = LEXICAL_LEARNING.any) {
  if (!filter || filter === LEXICAL_LEARNING.any) return true;
  if (!state) return false;
  if (filter === LEXICAL_LEARNING.tricky) return state.tricky === true;
  if (filter === LEXICAL_LEARNING.due) return state.due === true;
  if (filter === LEXICAL_LEARNING.graduated) return state.graduated === true;
  return state.enrolled === true && state.graduated !== true;
}

/**
 * The part-of-speech lens. `any` is the off position; every other value is one of
 * `LEXICAL_POS_OPTIONS`.
 *
 * A word matches on its own `pos` OR on any meaning's `posOverride`, and that disjunction is the
 * whole point. The dictionary splits a word like *como* into one entry per part of speech, but the
 * notebook keeps it as a single item whose meanings carry the different roles; matching only the
 * entry-level `pos` would hide *como* from a "conjunction" filter and push the owner into
 * splitting entries to be findable — the storage shape bending to the filter rather than the
 * reverse. True homographs stay separate items and are unaffected either way.
 */
export const LEXICAL_POS_ANY = "any";

export function posValuesOf(item) {
  const values = new Set();
  if (item?.pos) values.add(item.pos);
  for (const meaning of item?.meanings || []) {
    if (meaning?.posOverride) values.add(meaning.posOverride);
  }
  return values;
}

export function matchesPosFilter(item, filter = LEXICAL_POS_ANY) {
  if (!filter || filter === LEXICAL_POS_ANY) return true;
  return posValuesOf(item).has(filter);
}

/**
 * The parts of speech actually present in the current lens, in `LEXICAL_POS_OPTIONS` order rather
 * than by count, so the choices do not reshuffle under the owner as they filter. A word counts
 * once per distinct value it carries, and in both places when its entry and a meaning disagree —
 * the same word the filter would return for either choice.
 */
export function posCountsIn(items = []) {
  const counts = new Map();
  for (const item of items) {
    for (const pos of posValuesOf(item)) {
      counts.set(pos, (counts.get(pos) || 0) + 1);
    }
  }
  return LEXICAL_POS_OPTIONS
    .filter((pos) => pos && counts.has(pos))
    .map((pos) => ({ pos, count: counts.get(pos) }));
}

/** Off positions for the two closed, meaning-level refinements. */
export const LEXICAL_USAGE_ANY = "any";
export const LEXICAL_VERB_BEHAVIOR_ANY = "any";

const meaningFilterIsActive = (value, anyValue) => Boolean(value) && value !== anyValue;

/**
 * Meanings satisfying every active semantic refinement, in their saved order. Part of speech is
 * resolved per meaning: an override wins, otherwise the entry value is inherited. Array-backed
 * labels use exact membership because their values are closed vocabularies, not search text.
 */
export function matchingMeaningsForFilters(item, {
  pos = LEXICAL_POS_ANY,
  usage = LEXICAL_USAGE_ANY,
  verbBehavior = LEXICAL_VERB_BEHAVIOR_ANY,
} = {}) {
  const posActive = meaningFilterIsActive(pos, LEXICAL_POS_ANY);
  const usageActive = meaningFilterIsActive(usage, LEXICAL_USAGE_ANY);
  const behaviorActive = meaningFilterIsActive(
    verbBehavior,
    LEXICAL_VERB_BEHAVIOR_ANY
  );

  return (item?.meanings || []).filter((meaning) => {
    const effectivePos = meaning?.posOverride || item?.pos || "";
    return (!posActive || effectivePos === pos)
      && (!usageActive || (meaning?.usageLabels || []).includes(usage))
      && (!behaviorActive || (meaning?.verbBehavior || []).includes(verbBehavior));
  });
}

/**
 * Usage or behavior turns matching into a same-meaning intersection. POS alone deliberately keeps
 * the hub's established entry-or-override behavior, including entries that have no meanings yet.
 */
export function matchesMeaningFilters(item, {
  pos = LEXICAL_POS_ANY,
  usage = LEXICAL_USAGE_ANY,
  verbBehavior = LEXICAL_VERB_BEHAVIOR_ANY,
} = {}) {
  const hasMeaningSpecificFilter = meaningFilterIsActive(usage, LEXICAL_USAGE_ANY)
    || meaningFilterIsActive(verbBehavior, LEXICAL_VERB_BEHAVIOR_ANY);
  if (!hasMeaningSpecificFilter) return matchesPosFilter(item, pos);
  return matchingMeaningsForFilters(item, { pos, usage, verbBehavior }).length > 0;
}

/** Usage choices present after every upstream refinement, in the editor's canonical order. */
export function usageCountsIn(items = [], { pos = LEXICAL_POS_ANY } = {}) {
  return USAGE_LABELS
    .map((usage) => ({
      usage,
      count: items.reduce(
        (total, item) => total + Number(matchesMeaningFilters(item, { pos, usage })),
        0
      ),
    }))
    .filter(({ count }) => count > 0);
}

/** Verb-behavior choices present after POS and Usage, in the editor's canonical order. */
export function verbBehaviorCountsIn(items = [], {
  pos = LEXICAL_POS_ANY,
  usage = LEXICAL_USAGE_ANY,
} = {}) {
  return VERB_BEHAVIORS
    .map((verbBehavior) => ({
      verbBehavior,
      count: items.reduce(
        (total, item) => total + Number(matchesMeaningFilters(item, {
          pos,
          usage,
          verbBehavior,
        })),
        0
      ),
    }))
    .filter(({ count }) => count > 0);
}

/**
 * Presentation-only explanation for a hub card. Search never contributes to this descriptor:
 * refinements alone choose the preview, and an inactive semantic lens returns no descriptor so
 * the ordinary card stays unchanged.
 */
export function meaningFilterMatch(item, {
  pos = LEXICAL_POS_ANY,
  usage = LEXICAL_USAGE_ANY,
  verbBehavior = LEXICAL_VERB_BEHAVIOR_ANY,
} = {}) {
  const criteria = [];
  if (meaningFilterIsActive(pos, LEXICAL_POS_ANY)) {
    criteria.push({ label: "Part of speech", value: pos });
  }
  if (meaningFilterIsActive(usage, LEXICAL_USAGE_ANY)) {
    criteria.push({ label: "Usage", value: usage });
  }
  if (meaningFilterIsActive(verbBehavior, LEXICAL_VERB_BEHAVIOR_ANY)) {
    criteria.push({ label: "Verb behavior", value: verbBehavior });
  }
  if (criteria.length === 0) return null;

  const meanings = matchingMeaningsForFilters(item, { pos, usage, verbBehavior });
  return {
    meaning: meanings[0] || item?.meanings?.[0] || null,
    criteria,
    additionalCount: Math.max(0, meanings.length - 1),
  };
}

/** Terms that start with a digit or punctuation, and any blank term, share one trailing group. */
export const OTHER_INITIAL = "#";

/**
 * The A–Z heading a term belongs under. `normalize` is what decides it, so accents fold into
 * their base letter (*árbol* under A) while ñ stays its own letter (*ñoño* under Ñ, never N) —
 * the same rule the whole app matches by.
 */
export function initialOf(item) {
  const heading = item?.type === "page" ? item?.title : item?.term;
  const first = normalize(heading).charAt(0);
  if (!first || !/\p{L}/u.test(first)) return OTHER_INITIAL;
  return first.toUpperCase();
}

/**
 * Groups an ALREADY-ORDERED list under its initials, preserving the order the caller established
 * (`orderItems` with the Spanish collator puts Ñ after N). Each letter appears at most once and
 * `#` is forced last, so the index stays readable even if the ordering ever interleaves.
 */
export function groupByInitial(items = []) {
  const groups = new Map();
  for (const item of items) {
    const letter = initialOf(item);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(item);
  }

  const other = groups.get(OTHER_INITIAL);
  groups.delete(OTHER_INITIAL);
  const ordered = [...groups].map(([letter, group]) => ({ letter, items: group }));
  if (other) ordered.push({ letter: OTHER_INITIAL, items: other });
  return ordered;
}
