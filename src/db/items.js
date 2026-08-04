import { db } from "./db.js";
import { logEvent, EVENT_TYPES } from "./events.js";
import { isDictKey, isUserKey, newUserKey } from "../lib/ids.js";
import { nowIso } from "../lib/dates.js";
import { requestPersistence } from "../lib/persistence.js";
import { cleanMeanings, newMeaning } from "../lib/meanings.js";
import { pruneCollectionItemKeys, validateCollectionGroups } from "../lib/collections.js";
import { isPageProfile, PAGE_PROFILES, PINNED_PAGE_IDS_PREF } from "../lib/pageProfiles.js";
import {
  annotationForTarget,
  makeLinkAnnotation,
  normalizeRelationship,
  reorientRelationship,
} from "../lib/relationships.js";
import { resolveLinkedKeys } from "./linkedEntries.js";
import { resolveEntry } from "./ref/entries.js";

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
  linkAnnotations = [],
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
    linkAnnotations: [...(linkAnnotations || [])],
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
  linkAnnotations = [],
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
    linkAnnotations: [...(linkAnnotations || [])],
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
      if ((item.linkAnnotations || []).some((annotation) => annotation?.targetKey === id)) return true;
      return item.type === "page" && (item.collection?.groups || []).some((group) =>
        (group.itemKeys || []).includes(id)
      );
    });
    await Promise.all(
      linkers.map((item) => {
        const linkedKeys = (item.linkedKeys || []).filter((key) => key !== id);
        const linkAnnotations = (item.linkAnnotations || []).filter(
          (annotation) => annotation?.targetKey !== id
        );
        const linkRemoved = linkedKeys.length !== (item.linkedKeys || []).length;
        const next = {
          linkedKeys,
          linkAnnotations,
        };
        // Keep deletion's established link-removal recency behaviour. Defensive cleanup of an
        // already-dangling annotation alone is metadata-only and does not move the item.
        if (linkRemoved) next.updatedAt = nowIso();
        if (item.type === "page") {
          const pruned = pruneCollectionItemKeys(item, [id]);
          if (pruned.changed) {
            next.collection = pruned.collection;
            next.updatedAt ||= nowIso();
          }
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

const annotationsWithoutTarget = (item, targetKey) =>
  (item?.linkAnnotations || []).filter((annotation) => annotation?.targetKey !== targetKey);

const annotationsWithRelationship = (item, targetKey, relationship) => {
  const annotations = annotationsWithoutTarget(item, targetKey);
  const annotation = makeLinkAnnotation(targetKey, relationship);
  if (annotation) annotations.push(annotation);
  return annotations;
};

const storedEdgeCandidates = (aKey, bKey, a, b) => {
  const candidates = [];
  const addCandidate = (owner, targetKey) => {
    if (!(owner?.linkedKeys || []).includes(targetKey)) return;
    if (candidates.some((candidate) =>
      candidate.owner.id === owner.id && candidate.targetKey === targetKey
    )) return;
    candidates.push({ owner, targetKey });
  };

  addCandidate(a, bKey);
  addCandidate(b, aKey);
  return candidates;
};

/**
 * Links are stored once, on the item where the link was made. A sparse annotation may describe
 * that physical edge, but never creates one. For personal targets the reverse side is checked so
 * the mutation API cannot add a reciprocal copy over an existing backlink.
 *
 * `relationship.subject` is expressed from `fromId`'s perspective. Since a newly created edge is
 * physically owned there, it is also the stored subject without conversion.
 */
export async function linkItems(fromId, toKey, relationship = undefined) {
  if (isDictKey(toKey)) {
    const source = await db.items.get(fromId);
    if (!source) return source;

    // Dictionary aliases are conceptual identity, not separate connection targets. Resolve the
    // current row before opening the personal write transaction: unambiguous groups may repair to
    // their canonical key without recency/events, while conflicts remain untouched. Either way,
    // an entryLink for this canonical target proves the connection already exists and prevents a
    // third physical key from being appended over old aliases.
    const [{ entryLinks }, target] = await Promise.all([
      resolveLinkedKeys(source),
      resolveEntry(toKey),
    ]);
    const conceptualTargetKey = target.entry?.id || toKey;
    if (entryLinks.some((entryLink) => entryLink.canonicalKey === conceptualTargetKey)) {
      return db.items.get(fromId);
    }
  }

  let result;
  await db.transaction("rw", db.items, async () => {
    const item = await db.items.get(fromId);
    result = item;
    if (!item || fromId === toKey) return;
    if (!isUserKey(toKey) && !isDictKey(toKey)) return;

    const linkedKeys = item.linkedKeys || [];
    if (linkedKeys.includes(toKey)) return;

    if (isUserKey(toKey)) {
      const other = await db.items.get(toKey);
      if (!other) return;
      if ((other.linkedKeys || []).includes(fromId)) return;
    }

    const normalized = normalizeRelationship(relationship);
    const next = {
      ...item,
      linkedKeys: [...linkedKeys, toKey],
      linkAnnotations: annotationsWithRelationship(item, toKey, normalized),
      updatedAt: nowIso(),
    };
    await db.items.put(next);
    result = next;
  });
  return result;
}

/**
 * Changes only the annotation on an existing conceptual connection. `aKey` is the endpoint whose
 * perspective the editor is showing, so a backlink save is reoriented before it is written to the
 * other row. No timestamp or activity event changes.
 */
export async function setLinkRelationship(aKey, bKey, relationship) {
  const normalized = normalizeRelationship(relationship);
  let result;

  await db.transaction("rw", db.items, async () => {
    const [a, b] = await Promise.all([
      isUserKey(aKey) ? db.items.get(aKey) : undefined,
      isUserKey(bKey) ? db.items.get(bKey) : undefined,
    ]);
    if ((isUserKey(aKey) && !a) || (isUserKey(bKey) && !b)) {
      throw new Error("A relationship cannot target a missing personal item.");
    }
    const candidates = storedEdgeCandidates(aKey, bKey, a, b);
    if (!candidates.length) throw new Error("A relationship can describe only an existing connection.");

    // Valid v4 data has one annotation per conceptual pair. When an old reciprocal edge survives,
    // keep the row that already owns the sole explicit value rather than silently moving it.
    const chosen = candidates.find(({ owner, targetKey }) => annotationForTarget(owner, targetKey))
      || candidates[0];
    const stored = chosen.owner.id === aKey ? normalized : reorientRelationship(normalized);

    for (const candidate of candidates) {
      const base = await db.items.get(candidate.owner.id);
      const nextAnnotations = candidate === chosen
        ? annotationsWithRelationship(base, candidate.targetKey, stored)
        : annotationsWithoutTarget(base, candidate.targetKey);
      if (JSON.stringify(nextAnnotations) === JSON.stringify(base.linkAnnotations || [])) continue;
      await db.items.update(base.id, { linkAnnotations: nextAnnotations });
    }
    result = await db.items.get(chosen.owner.id);
  });

  return result;
}

/** Removes every physical copy of a conceptual legacy connection and all matching annotations. */
export async function unlinkItems(fromId, toKey) {
  let result;
  await db.transaction("rw", db.items, async () => {
    const from = await db.items.get(fromId);
    result = from;
    if (!from) return;
    const other = isUserKey(toKey) ? await db.items.get(toKey) : undefined;
    const candidates = storedEdgeCandidates(fromId, toKey, from, other);
    if (!candidates.length) return;

    const at = nowIso();
    for (const { owner, targetKey } of candidates) {
      const current = await db.items.get(owner.id);
      const linkedKeys = (current.linkedKeys || []).filter((key) => key !== targetKey);
      const patch = {
        linkedKeys,
        linkAnnotations: annotationsWithoutTarget(current, targetKey),
        updatedAt: at,
      };
      if (current.type === "page") {
        const pruned = pruneCollectionItemKeys(current, [targetKey]);
        if (pruned.changed) patch.collection = pruned.collection;
      }
      await db.items.update(current.id, patch);
    }
    result = await db.items.get(fromId);
  });
  return result;
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
