import { db } from "./db.js";
import { EVENT_TYPES, logEvent } from "./events.js";
import { planGlobalTagChange } from "../lib/tags.js";
import { TAG_COLORS_PREF, tagColorsAfterChange } from "../lib/tagColors.js";

const sameMap = (left, right) => {
  const leftEntries = Object.entries(left || {});
  const rightKeys = Object.keys(right || {});
  return leftEntries.length === rightKeys.length
    && leftEntries.every(([key, value]) =>
      Object.prototype.hasOwnProperty.call(right, key) && right[key] === value
    );
};

const usableColorMap = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

/**
 * Exact global tag maintenance (Phase 20).
 *
 * Tags, one edit per changed owner and the exact colour map share one transaction. Updates write
 * only `tags`, deliberately preserving every item's `updatedAt`; using updateItem() here would
 * both move recency and split the batch into independently committed writes.
 */
export async function applyGlobalTagChange({ source, destination = null } = {}) {
  return db.transaction("rw", db.items, db.events, db.prefs, async () => {
    const exactSource = typeof source === "string" ? source : "";
    const cleanDestination = destination === null
      ? null
      : typeof destination === "string"
        ? destination.trim()
        : "";
    const sourceRows = exactSource.trim()
      ? await db.items.where("tags").equals(exactSource).toArray()
      : [];
    const destinationRows = cleanDestination
      ? await db.items.where("tags").equals(cleanDestination).toArray()
      : [];
    const relevant = new Map();
    for (const item of [...sourceRows, ...destinationRows]) relevant.set(item.id, item);

    const plan = planGlobalTagChange([...relevant.values()], {
      source: exactSource,
      destination: cleanDestination,
    });
    if (plan.kind === "noop") return plan;

    for (const update of plan.updates) {
      await db.items.update(update.id, { tags: update.tags });
    }

    const colorRow = await db.prefs.get(TAG_COLORS_PREF);
    const currentColors = usableColorMap(colorRow?.value);
    const nextColors = tagColorsAfterChange(currentColors, plan);
    if (!sameMap(currentColors, nextColors)) {
      await db.prefs.put({ key: TAG_COLORS_PREF, value: nextColors });
    }

    for (const update of plan.updates) {
      await logEvent(EVENT_TYPES.edit, update.id);
    }

    return plan;
  });
}
