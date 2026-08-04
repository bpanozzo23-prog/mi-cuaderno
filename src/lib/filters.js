/**
 * The Cuaderno list's type filter.
 *
 * Words and phrases are both `type: "lexical"` and are told apart by `form: word | phrase` —
 * a field locked in brief §7 and set since Phase 1b, already surfaced on cards as *loc.*
 * The filter used to compare `type` alone, so the word/phrase choice made at creation had no
 * effect on the list and everything landed under *palabras*.
 *
 * Splitting the filter is therefore NOT a third content type (§7 forbids one without an
 * amendment): it surfaces a distinction the schema has always carried. Nothing is stored and
 * no migration is involved.
 *
 * This Cuaderno filter remains separate from connection presentation. Standard Detail and
 * Collection screens group mixed item kinds by relationship type; Diario keeps its specialized
 * kind sections and groups by relationship within each. None of those views changes this filter.
 */

export const FILTERS = {
  all: "all",
  word: "word",
  phrase: "phrase",
  page: "page",
};

export const TYPE_FILTERS = [
  { id: FILTERS.all, label: "todo" },
  { id: FILTERS.word, label: "palabras" },
  { id: FILTERS.phrase, label: "frases" },
  { id: FILTERS.page, label: "páginas" },
];

export function matchesTypeFilter(item, filter) {
  if (!filter || filter === FILTERS.all) return true;
  if (filter === FILTERS.page) return item.type === "page";
  if (item.type !== "lexical") return false;
  // Anything not explicitly a phrase is a word: `newLexical` normalizes `form`, but an item
  // restored from an old backup should still land somewhere rather than vanish from every tab.
  return filter === FILTERS.phrase ? item.form === "phrase" : item.form !== "phrase";
}

/**
 * Whether dictionary results belong alongside the personal ones (brief §8's single list).
 *
 * Filtering to *páginas* or to a tag means "look through my own things" (Phase 2e). *Frases*
 * means the same in practice for a different reason: the bundled dictionary is lemma-focused
 * (§1), so a phrase filter would fill up with single-word lemmas the owner did not ask for.
 */
export function wantsDictionary(filter, tagFilter) {
  if (tagFilter) return false;
  return filter === FILTERS.all || filter === FILTERS.word;
}
