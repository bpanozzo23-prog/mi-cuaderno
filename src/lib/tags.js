import { normalize } from "./normalize.js";

/**
 * Suggesting tags the owner has already used.
 *
 * The friction this solves is duplicate near-identical tags: nothing while typing hints that
 * `expression` already exists, so `expresion`, `Expression` and `expressions` accumulate
 * alongside it. `cleanTags` (src/db/items.js) dedupes exact strings only, so those really are
 * four different tags.
 *
 * Matching therefore goes through normalize() — the same ñ-preserving normalizer the whole app
 * shares — which makes it case- AND accent-insensitive. That is the part that actually fixes
 * the problem: typing "Expresion" surfaces the existing `expresión` and one tap reuses it.
 *
 * It only ever SUGGESTS. Typing a new tag still creates exactly what was typed — silently
 * folding what the owner wrote into an existing tag would be the kind of helpfulness that
 * annoys the third time it happens.
 *
 * Pure and database-free, like the rest of src/lib: the whole tag vocabulary is derivable from
 * items already in memory, so nothing here is stored (§7).
 */

const LIMIT = 6;

/** Every tag in use across the notebook, deduplicated, alphabetical. */
export function allTagsIn(items = []) {
  const seen = new Set();
  for (const item of items) for (const tag of item.tags || []) seen.add(tag);
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/**
 * Tags worth offering for what has been typed so far.
 *
 * Prefix matches rank above substring ones — typing "ex" means "expression" more often than
 * "complex" — and anything already on this item is left out, since offering it would be a
 * suggestion that does nothing.
 */
export function suggestTags(allTags = [], query, { exclude = [], limit = LIMIT } = {}) {
  const q = normalize((query || "").trim());
  const taken = new Set(exclude.map((tag) => normalize(tag)));

  const rows = [];
  for (const tag of allTags) {
    const n = normalize(tag);
    if (taken.has(n)) continue;
    if (!q) {
      rows.push({ tag, rank: 0 });
      continue;
    }
    if (n.startsWith(q)) rows.push({ tag, rank: 0 });
    else if (n.includes(q)) rows.push({ tag, rank: 1 });
  }

  return rows
    .sort((a, b) => a.rank - b.rank || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map((row) => row.tag);
}

const sameArray = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/**
 * Rewrites only the selected exact source/destination strings while preserving every unrelated
 * tag byte-for-byte. Imported backups can contain duplicates that ordinary CRUD would clean; a
 * global tag action must not silently turn into a cleanup of unrelated content.
 */
function tagsAfterGlobalChange(tags, source, destination) {
  const current = Array.isArray(tags) ? tags : [];
  if (destination === null) return current.filter((tag) => tag !== source);

  const destinationAlreadyHere = current.includes(destination);
  let keptDestination = false;
  let replacedSource = false;
  const next = [];

  for (const tag of current) {
    if (tag === source) {
      if (destinationAlreadyHere || replacedSource) continue;
      next.push(destination);
      replacedSource = true;
      continue;
    }
    if (tag === destination) {
      if (keptDestination) continue;
      keptDestination = true;
    }
    next.push(tag);
  }

  return next;
}

/**
 * One pure plan powers both the confirmation copy and the database writer. Exact stored spelling
 * is identity; normalization remains suggestion/search behavior only.
 */
export function planGlobalTagChange(items = [], { source, destination = null } = {}) {
  const exactSource = typeof source === "string" ? source : "";
  const cleanDestination = destination === null
    ? null
    : typeof destination === "string"
      ? destination.trim()
      : "";
  const rows = Array.isArray(items) ? items : [];
  const sourceRows = exactSource.trim()
    ? rows.filter((item) => Array.isArray(item?.tags) && item.tags.includes(exactSource))
    : [];
  const destinationRows = cleanDestination
    ? rows.filter((item) => Array.isArray(item?.tags) && item.tags.includes(cleanDestination))
    : [];
  const destinationIds = new Set(destinationRows.map((item) => item.id));
  const overlapCount = sourceRows.filter((item) => destinationIds.has(item.id)).length;
  const base = {
    kind: "noop",
    source: exactSource,
    destination: cleanDestination,
    sourceCount: sourceRows.length,
    destinationCount: destinationRows.length,
    overlapCount,
    finalCount: destinationRows.length,
    changedCount: 0,
    updates: [],
  };

  if (!sourceRows.length) return base;
  if (cleanDestination !== null && (!cleanDestination || cleanDestination === exactSource)) return base;

  const kind = cleanDestination === null
    ? "remove"
    : destinationRows.length
      ? "merge"
      : "rename";
  const updates = sourceRows
    .map((item) => ({
      id: item.id,
      tags: tagsAfterGlobalChange(item.tags, exactSource, cleanDestination),
    }))
    .filter((update, index) => !sameArray(update.tags, sourceRows[index].tags));

  return {
    ...base,
    kind,
    finalCount: cleanDestination === null
      ? 0
      : destinationRows.length + sourceRows.length - overlapCount,
    changedCount: updates.length,
    updates,
  };
}
