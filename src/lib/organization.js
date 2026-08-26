import { relatedTo } from "./links.js";
import { allTagsIn } from "./tags.js";
import { allPersonalExamples } from "./meanings.js";
import { localDate, mondayWeekStart, monthOfDate } from "./dates.js";
import { enabledPageRoles, PAGE_FOCUSES } from "./pageKinds.js";

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
  added7Days: "added-7-days",
  added30Days: "added-30-days",
  withMedia: "with-media",
  missingMeaning: "missing-meaning",
  missingExamples: "missing-examples",
  unlinked: "unlinked",
  unattachedWord: "unattached-word",
};

const DAY_MS = 24 * 60 * 60 * 1000;

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
 * Derived browse and maintenance subsets. Call this with the COMPLETE notebook before a type filter: an
 * otherwise empty word is still linked when a page points to it, even if the active UI type is
 * `palabras` and that page will later be hidden.
 *
 * A dictionary key in `linkedKeys[]` is a stored link and counts. `dictKey`, by contrast, is the
 * separate reference attachment defined by the personal/reference seam, not an item link.
 */
export function maintenanceItems(items = [], view = MAINTENANCE_VIEWS.all, now = new Date()) {
  const candidates = [...items];

  if (view === MAINTENANCE_VIEWS.added7Days || view === MAINTENANCE_VIEWS.added30Days) {
    const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
    const days = view === MAINTENANCE_VIEWS.added7Days ? 7 : 30;
    const cutoff = nowMs - days * DAY_MS;
    return candidates.filter((item) => {
      const createdAt = Date.parse(item?.createdAt);
      return Number.isFinite(nowMs)
        && Number.isFinite(createdAt)
        && createdAt >= cutoff
        && createdAt <= nowMs;
    });
  }

  if (view === MAINTENANCE_VIEWS.withMedia) {
    return candidates.filter((item) => (item.mediaLinks || []).length > 0);
  }

  if (view === MAINTENANCE_VIEWS.missingMeaning) {
    return candidates.filter((item) => item.type === "lexical" && !(item.meanings || []).length);
  }

  if (view === MAINTENANCE_VIEWS.missingExamples) {
    return candidates.filter((item) => item.type === "lexical" && allPersonalExamples(item).length === 0);
  }

  if (view === MAINTENANCE_VIEWS.unlinked) {
    return candidates.filter(
      (item) => !(item.linkedKeys || []).length && relatedTo(item, items).length === 0
    );
  }

  if (view === MAINTENANCE_VIEWS.unattachedWord) {
    return candidates.filter(
      (item) => item.type === "lexical" && item.form === "word" && !item.dictKey
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

/**
 * How the Pages hub browse list arranges itself. Grouping is a render-time arrangement of the
 * same flat list, not a hierarchy and not a filter: every page the current filters admit is still
 * on screen, and `none` is exactly the flat stack the hub has always shown. Nothing here is
 * stored, so removing the control would lose no data.
 */
export const PAGE_GROUPINGS = {
  none: "none",
  kind: "kind",
  touched: "touched",
  added: "added",
};

/** Fixed bucket order, so a pile never moves because its size changed. */
export const RECENCY_BUCKETS = ["today", "week", "month", "earlier"];

/**
 * Kind order follows the hub's role chips, so the eye maps the headings onto the control directly
 * above them. What each heading is *named* stays with the cards (`PAGE_ROLE_META`), which is why
 * this file needs nothing from `src/components/`.
 */
const KIND_ORDER = [
  PAGE_FOCUSES.source,
  PAGE_FOCUSES.grammar,
  PAGE_FOCUSES.vocabulary,
  PAGE_FOCUSES.notes,
];

/**
 * Which recency bucket a timestamp falls in, decided on `localDate` strings rather than
 * milliseconds: the owner's calendar day is the unit §7 makes daily grouping use, and the week is
 * the same Monday-start week the activity calendar counts by. "This week" is checked before "this
 * month" so a Monday at the turn of a month still reads as this week.
 *
 * An unparseable or missing timestamp sinks to `earlier`, the way an unlettered term sinks to the
 * A–Z index's `#` — a page is never dropped from the list to avoid naming its pile.
 */
function recencyBucketOf(iso, today) {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "earlier";
  const day = localDate(new Date(parsed));
  if (day === today) return "today";
  if (mondayWeekStart(day) === mondayWeekStart(today)) return "week";
  if (monthOfDate(day) === monthOfDate(today)) return "month";
  return "earlier";
}

/**
 * Buckets an ALREADY-ORDERED list under fixed keys, preserving the order the caller established —
 * the same contract `groupByInitial` keeps for the A–Z index. Empty groups are dropped, so a role
 * the notebook has no page for says nothing rather than reporting itself as zero.
 */
function groupsFrom(items, order, keyOf) {
  const groups = new Map(order.map((key) => [key, []]));
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups]
    .filter(([, group]) => group.length > 0)
    .map(([key, group]) => ({ key, items: group }));
}

/**
 * The Pages hub's derived groups: `[{ key, items }]` in a fixed key order, or `[]` for `none`,
 * where the caller renders its ordinary flat stack.
 *
 * `kind` groups by the page's PRIMARY role — `enabledPageRoles`' first entry, the same rule that
 * already decides the folder tab and colour the card wears — so a card has exactly one home even
 * though most pages enable more than one role. That deliberately reads differently from the role
 * chips, which ask whether a role is enabled at all and so match a page under several of them.
 *
 * `touched` and `added` name their own timestamp instead of following the active order, so
 * changing the sort never quietly changes what a heading means.
 */
export function groupPages(pages = [], grouping = PAGE_GROUPINGS.none, { today = localDate() } = {}) {
  if (grouping === PAGE_GROUPINGS.kind) {
    return groupsFrom(pages, KIND_ORDER, (page) => enabledPageRoles(page)[0] || PAGE_FOCUSES.notes);
  }
  if (grouping === PAGE_GROUPINGS.touched || grouping === PAGE_GROUPINGS.added) {
    const field = grouping === PAGE_GROUPINGS.added ? "createdAt" : "updatedAt";
    return groupsFrom(pages, RECENCY_BUCKETS, (page) => recencyBucketOf(page?.[field], today));
  }
  return [];
}
