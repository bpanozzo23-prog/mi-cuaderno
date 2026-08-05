import { normalize } from "./normalize.js";
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
