import { relatedTo } from "./links.js";
import { allTagsIn } from "./tags.js";

/**
 * Phase 5b's organizational views are render-time derivations over the notebook already in
 * memory. Nothing here writes a preference, counter, link or cached ordering.
 *
 * The root list and the empty-query link picker currently receive `notebook.items` in
 * most-recently-touched order from `allItems()`. Every helper returns a new array so a browse
 * choice can never reorder that shared source behind the picker's back.
 */

export const BROWSE_ORDERS = {
  touched: "touched",
  added: "added",
  alphabetical: "alphabetical",
};

export const MAINTENANCE_VIEWS = {
  all: "all",
  missingMeaning: "missing-meaning",
  missingExamples: "missing-examples",
  unlinked: "unlinked",
};

const headingOf = (item) =>
  String(item?.type === "page" ? item.title || "Untitled page" : item?.term || "");
const byCreatedDesc = (a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
const spanishHeadings = new Intl.Collator("es", { sensitivity: "base" });

/**
 * Orders the root browse list only. Search results never pass through this helper: §8 relevance
 * remains authoritative while a query is active.
 *
 * "Touched" deliberately preserves the supplied order. `useNotebook` already establishes that
 * order from IndexedDB, and copying rather than re-sorting is what protects stable ties and the
 * link picker's existing recency contract.
 */
export function orderItems(items = [], order = BROWSE_ORDERS.touched) {
  const ordered = [...items];
  if (order === BROWSE_ORDERS.added) return ordered.sort(byCreatedDesc);
  if (order === BROWSE_ORDERS.alphabetical) {
    return ordered.sort((a, b) => spanishHeadings.compare(headingOf(a), headingOf(b)));
  }
  return ordered;
}

/**
 * Neutral maintenance subsets. Call this with the COMPLETE notebook before a type filter: an
 * otherwise empty word is still linked when a page points to it, even if the active UI type is
 * `palabras` and that page will later be hidden.
 *
 * A dictionary key in `linkedKeys[]` is a stored link and counts. `dictKey`, by contrast, is the
 * separate reference attachment defined by the personal/reference seam, not an item link.
 */
export function maintenanceItems(items = [], view = MAINTENANCE_VIEWS.all) {
  const candidates = [...items];

  if (view === MAINTENANCE_VIEWS.missingMeaning) {
    return candidates.filter(
      (item) => item.type === "lexical" && String(item.translation ?? "").trim() === ""
    );
  }

  if (view === MAINTENANCE_VIEWS.missingExamples) {
    return candidates.filter((item) => item.type === "lexical" && !(item.myExamples || []).length);
  }

  if (view === MAINTENANCE_VIEWS.unlinked) {
    return candidates.filter(
      (item) => !(item.linkedKeys || []).length && relatedTo(item, items).length === 0
    );
  }

  return candidates;
}

/**
 * Counts how many items in the caller's active type/maintenance context carry each exact stored
 * tag. The selected tag is intentionally not an input: Phase 5c can keep the full contextual
 * vocabulary visible while one tag narrows the result cards.
 */
export function tagCountsIn(items = []) {
  const counts = new Map(allTagsIn(items).map((tag) => [tag, 0]));
  for (const item of items) {
    for (const tag of new Set(item.tags || [])) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts].map(([tag, count]) => ({ tag, count }));
}
