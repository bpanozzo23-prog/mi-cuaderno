import { db } from "./db.js";
import { logEvent, EVENT_TYPES } from "./events.js";
import { newUserKey } from "../lib/ids.js";
import { nowIso } from "../lib/dates.js";
import { requestPersistence } from "../lib/persistence.js";

/**
 * Personal-layer CRUD (brief section 7). Every mutation logs its event, because
 * the log — not any field on the record — is what statistics and state are read from.
 *
 * The seam rule (section 5): a lexical item always stores its own `term` and
 * `translation`, even when `dictKey` attaches it to a dictionary entry, so it stays
 * meaningful on its own if that entry ever disappears.
 */

const cleanTags = (tags) =>
  [...new Set((tags || []).map((t) => String(t).trim()).filter(Boolean))];

export function newLexical({
  term,
  translation = "",
  form = "word",
  pos = "",
  notes = "",
  tags = [],
  myExamples = [],
  mediaLinks = [],
  linkedKeys = [],
  dictKey = null,
} = {}) {
  const at = nowIso();
  return {
    id: newUserKey(),
    type: "lexical",
    dictKey,
    form: form === "phrase" ? "phrase" : "word",
    term: String(term || "").trim(),
    translation: String(translation || "").trim(),
    pos,
    notes,
    myExamples,
    tags: cleanTags(tags),
    linkedKeys,
    mediaLinks,
    createdAt: at,
    updatedAt: at,
  };
}

export function newPage({
  title,
  body = "",
  pageDate = null,
  tags = [],
  mediaLinks = [],
  linkedKeys = [],
} = {}) {
  const at = nowIso();
  return {
    id: newUserKey(),
    type: "page",
    title: String(title || "").trim(),
    body,
    pageDate: pageDate || null,
    tags: cleanTags(tags),
    linkedKeys,
    mediaLinks,
    createdAt: at,
    updatedAt: at,
  };
}

export async function createItem(item) {
  await db.items.add(item);
  await logEvent(EVENT_TYPES.create, item.id);
  // First meaningful use — this is the moment to ask the browser to keep the data.
  requestPersistence().catch(() => {});
  return item;
}

export async function getItem(id) {
  return db.items.get(id);
}

export async function allItems() {
  return db.items.orderBy("updatedAt").reverse().toArray();
}

/**
 * `logEdit` is false for changes the owner did not explicitly save (none today),
 * so the log records deliberate edits rather than keystrokes.
 */
export async function updateItem(id, patch, { logEdit = true } = {}) {
  const next = { ...patch, updatedAt: nowIso() };
  if (next.tags) next.tags = cleanTags(next.tags);
  await db.items.update(id, next);
  if (logEdit) await logEvent(EVENT_TYPES.edit, id);
  return db.items.get(id);
}

/**
 * Hard-delete plus a `delete` event — the append-only log is the tombstone
 * (brief section 7). Links pointing at the item are removed; its historical
 * events stay in the log but are excluded from queues and statistics.
 */
export async function deleteItem(id) {
  await db.transaction("rw", db.items, async () => {
    const linkers = await db.items.where("linkedKeys").equals(id).toArray();
    await Promise.all(
      linkers.map((item) =>
        db.items.update(item.id, {
          linkedKeys: item.linkedKeys.filter((key) => key !== id),
          updatedAt: nowIso(),
        })
      )
    );
    await db.items.delete(id);
  });
  await logEvent(EVENT_TYPES.delete, id);
}

/**
 * Links are stored once, on the item where the link was made. The reverse
 * direction is computed (see backlinksFor) because Phase 2 links may point at
 * read-only dictionary entries, which cannot store a reciprocal link.
 */
export async function linkItems(fromId, toKey) {
  const item = await db.items.get(fromId);
  if (!item || fromId === toKey) return item;
  if (item.linkedKeys.includes(toKey)) return item;
  return updateItem(fromId, { linkedKeys: [...item.linkedKeys, toKey] }, { logEdit: false });
}

export async function unlinkItems(fromId, toKey) {
  const item = await db.items.get(fromId);
  if (!item) return item;
  if (item.linkedKeys.includes(toKey)) {
    return updateItem(fromId, { linkedKeys: item.linkedKeys.filter((k) => k !== toKey) }, { logEdit: false });
  }
  // The link may have been made from the other side; remove it there.
  const other = await db.items.get(toKey);
  if (other?.linkedKeys.includes(fromId)) {
    return updateItem(toKey, { linkedKeys: other.linkedKeys.filter((k) => k !== fromId) }, { logEdit: false });
  }
  return item;
}

export async function backlinksFor(key) {
  return db.items.where("linkedKeys").equals(key).toArray();
}

/** Everything connected to an item, in both directions, deduplicated. */
export async function relatedItems(item) {
  if (!item) return [];
  const [forward, backward] = await Promise.all([
    db.items.bulkGet(item.linkedKeys),
    backlinksFor(item.id),
  ]);
  const byId = new Map();
  for (const found of forward) if (found) byId.set(found.id, found);
  for (const found of backward) byId.set(found.id, found);
  byId.delete(item.id);
  return [...byId.values()];
}

export function displayTitle(item) {
  if (!item) return "";
  return item.type === "page" ? item.title || "Untitled page" : item.term;
}
