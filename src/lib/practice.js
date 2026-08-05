/**
 * Session-only free-practice helpers.
 *
 * These functions deliberately know nothing about the database or event log. Repaso owns
 * scheduled review; free practice only selects and orders personal lexical entries for one
 * in-memory session.
 */

export const PRACTICE_LIMITS = Object.freeze([10, 20, "all"]);
export const DEFAULT_PRACTICE_LIMIT = 20;

export const PRACTICE_ORDERS = Object.freeze({
  shuffled: "shuffled",
  current: "current",
});

/** A flashcard needs at least one saved personal meaning to have an answer side. */
export function isPracticeEligible(item) {
  return item?.type === "lexical"
    && Boolean(item.meanings?.some((meaning) => String(meaning?.gloss || "").trim()));
}

/** Fisher-Yates over a copy. `random` is injectable so the order can be proven in tests. */
export function shufflePracticeItems(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/**
 * Builds one stable practice deck from an already-filtered, already-ordered hub view.
 * Ineligible entries are removed before the size limit is applied, so "20" means up to
 * 20 answerable cards rather than 20 rows that may contain holes.
 */
export function buildPracticeDeck(
  items,
  { limit = DEFAULT_PRACTICE_LIMIT, order = PRACTICE_ORDERS.shuffled, random = Math.random } = {}
) {
  const eligible = items.filter(isPracticeEligible);
  const arranged = order === PRACTICE_ORDERS.current
    ? [...eligible]
    : shufflePracticeItems(eligible, random);
  const count = limit === "all"
    ? arranged.length
    : Math.min(arranged.length, Math.max(0, Number(limit) || 0));
  return arranged.slice(0, count);
}
