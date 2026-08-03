import { db } from "./db.js";
import { logEvent, EVENT_TYPES } from "./events.js";
import { isUserKey, newUserKey } from "../lib/ids.js";
import { nowIso } from "../lib/dates.js";
import { requestPersistence } from "../lib/persistence.js";
import { cleanMeanings, newMeaning } from "../lib/meanings.js";
import { pruneCollectionItemKeys, validateCollectionGroups } from "../lib/collections.js";
import { isPageProfile, PAGE_PROFILES, PINNED_PAGE_IDS_PREF } from "../lib/pageProfiles.js";

/**
 * Personal-layer CRUD (brief section 7). Every mutation logs its event, because
 * the log — not any field on the record — is what statistics and state are read from.
 *
 * The seam rule (section 5): a lexical item always stores its own `term` and personal
 * `meanings`, even when `dictKey` attaches it to a dictionary entry, so it stays meaningful
 * on its own if that entry ever disappears. Meaning IDs never come from dictionary senses.
 */

const cleanTags = (tags) =>
  [...new Set((tags || []).map((t) => String(t).trim()).filter(Boolean))];

export function newLexical({
  term,
  meanings = [],
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
    meanings: cleanMeanings(meanings),
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

/**
 * Builds a lexical item attached to a dictionary entry — term, first gloss and part of
 * speech carried over, dictKey set. Pure: takes a plain entry object, no reference-layer
 * import, so it can be reused wherever an entry needs a one-tap way into the cuaderno
 * (the entry's own "Add to my cuaderno" button, and the Repaso "keep looking these up"
 * rail alike). The seam rule (section 5) is why this only ever seeds the item — term and
 * gloss are copied into independent personal records, not referenced.
 */
export function newLexicalFromEntry(entry) {
  return newLexical({
    term: entry.lemma,
    meanings: entry.senses?.[0]?.gloss ? [newMeaning({ gloss: entry.senses[0].gloss })] : [],
    pos: entry.pos === "adj" ? "adjective" : entry.pos === "adv" ? "adverb" : entry.pos,
    dictKey: entry.id,
  });
}

export function newPage({
  title,
  body = "",
  pageDate = null,
  pageProfile = PAGE_PROFILES.general,
  collection = { groups: [] },
  tags = [],
  mediaLinks = [],
  linkedKeys = [],
} = {}) {
  if (!isPageProfile(pageProfile)) throw new Error("Page profile must be general or collection.");
  const groups = validateCollectionGroups(collection?.groups ?? [], {
    allowedItemKeys: (linkedKeys || []).filter(isUserKey),
  });
  const at = nowIso();
  return {
    id: newUserKey(),
    type: "page",
    title: String(title || "").trim(),
    body,
    pageDate: pageDate || null,
    pageProfile,
    collection: { groups },
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
  if (next.meanings) next.meanings = cleanMeanings(next.meanings);
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
  await db.transaction("rw", db.items, db.prefs, async () => {
    // A layout reference is not authoritative, but it must still be cleaned even if an older
    // or malformed row has already lost the matching link. The personal notebook is small, so
    // one scan makes that dormant-metadata cleanup reliable.
    const candidates = await db.items.toArray();
    const linkers = candidates.filter((item) => {
      if (item.id === id) return false;
      if ((item.linkedKeys || []).includes(id)) return true;
      return item.type === "page" && (item.collection?.groups || []).some((group) =>
        (group.itemKeys || []).includes(id)
      );
    });
    await Promise.all(
      linkers.map((item) => {
        const next = {
          linkedKeys: (item.linkedKeys || []).filter((key) => key !== id),
          updatedAt: nowIso(),
        };
        if (item.type === "page") {
          const pruned = pruneCollectionItemKeys(item, [id]);
          if (pruned.changed) next.collection = pruned.collection;
        }
        return db.items.update(item.id, next);
      })
    );

    const pinned = await db.prefs.get(PINNED_PAGE_IDS_PREF);
    if (Array.isArray(pinned?.value) && pinned.value.includes(id)) {
      await db.prefs.put({ ...pinned, value: pinned.value.filter((pageId) => pageId !== id) });
    }
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
    const patch = { linkedKeys: item.linkedKeys.filter((k) => k !== toKey) };
    if (item.type === "page") {
      const pruned = pruneCollectionItemKeys(item, [toKey]);
      if (pruned.changed) patch.collection = pruned.collection;
    }
    return updateItem(fromId, patch, { logEdit: false });
  }
  // The link may have been made from the other side; remove it there.
  const other = await db.items.get(toKey);
  if (other?.linkedKeys.includes(fromId)) {
    const patch = { linkedKeys: other.linkedKeys.filter((k) => k !== fromId) };
    if (other.type === "page") {
      const pruned = pruneCollectionItemKeys(other, [fromId]);
      if (pruned.changed) patch.collection = pruned.collection;
    }
    return updateItem(toKey, patch, { logEdit: false });
  }
  return item;
}

/**
 * The reverse direction, straight off the `*linkedKeys` multi-entry index — one indexed
 * lookup rather than a scan. `deleteItem` uses the same query to clean up.
 *
 * Reading both directions for a screen is a render-time derivation over items already in
 * memory, and lives in src/lib/links.js as a pure function; this is the database half.
 */
export async function backlinksFor(key) {
  return db.items.where("linkedKeys").equals(key).toArray();
}

export function displayTitle(item) {
  if (!item) return "";
  return item.type === "page" ? item.title || "Untitled page" : item.term;
}
