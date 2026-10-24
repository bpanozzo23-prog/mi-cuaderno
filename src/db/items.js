import Dexie from "dexie";
import { db, getPref } from "./db.js";
import { logEvent, logPracticeWrite, EVENT_TYPES } from "./events.js";
import { isDictKey, isUserKey, newUserKey } from "../lib/ids.js";
import { nowIso } from "../lib/dates.js";
import { requestPersistence } from "../lib/persistence.js";
import { cleanMeanings, newMeaning } from "../lib/meanings.js";
import { contentFingerprint } from "../lib/contentFingerprint.js";
import { personalPosForEntryPos } from "../lib/partOfSpeech.js";
import { validateCollectionGroups } from "../lib/collections.js";
import { isPageProfile, PAGE_PROFILES } from "../lib/pageProfiles.js";
import {
  isPageFocus,
  normalizeNoteSections,
  normalizePageStructures,
  PAGE_FOCUSES,
  PINNED_PAGE_IDS_PREF,
  validatePageStructures,
  validateNoteSections,
} from "../lib/pageKinds.js";
import { validateStoredFeedback } from "../lib/diarioReview.js";
import { PINNED_LEXICAL_IDS_PREF } from "../lib/lexicalViews.js";
import {
  annotationForTarget,
  makeLinkAnnotation,
  normalizeRelationship,
  reorientRelationship,
} from "../lib/relationships.js";
import { resolveLinkedKeys } from "./linkedEntries.js";
import { resolveEntry } from "./ref/entries.js";
import {
  appendDictionaryKey,
  dictionaryKeysForItem,
  uniqueDictionaryKeys,
} from "../lib/dictionaryAttachments.js";
import {
  clearSourcePageReferences,
  prunePageVocabularyReferences,
} from "../lib/pageReferences.js";

/**
 * Personal-layer CRUD (brief section 7). Every mutation logs its event, because
 * the log — not any field on the record — is what statistics and state are read from.
 *
 * The seam rule (section 5): a lexical item always stores its own `term` and personal
 * `meanings`, even when `dictKeys[]` attaches it to dictionary entries, so it stays meaningful
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
  noteSections = [],
  tags = [],
  myExamples = [],
  mediaLinks = [],
  linkedKeys = [],
  linkAnnotations = [],
  dictKeys = undefined,
  // Input-only compatibility for callers being migrated; schema-v12 records never store it.
  dictKey = null,
} = {}) {
  const at = nowIso();
  const normalizedNoteSections = normalizeNoteSections(noteSections);
  const noteErrors = validateNoteSections(normalizedNoteSections, { where: "lexical.noteSections" });
  if (noteErrors.length) throw new Error(noteErrors[0]);
  const attachmentKeys = uniqueDictionaryKeys(
    dictKeys ?? (dictKey === null || dictKey === undefined ? [] : [dictKey])
  );
  if (attachmentKeys.some((key) => !isDictKey(key))) {
    throw new Error("Dictionary attachments need dictionary entry keys.");
  }
  return {
    id: newUserKey(),
    type: "lexical",
    dictKeys: attachmentKeys,
    form: form === "phrase" ? "phrase" : "word",
    term: String(term || "").trim(),
    meanings: cleanMeanings(meanings),
    pos,
    notes,
    noteSections: normalizedNoteSections,
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
 * speech carried over, one dictionary attachment set. Pure: takes a plain entry object, no reference-layer
 * import, so it can be reused wherever an entry needs a one-tap way into the cuaderno
 * (the entry's own "Add to my cuaderno" button, and the Repaso "keep looking these up"
 * rail alike). The seam rule (section 5) is why this only ever seeds the item — term and
 * gloss are copied into independent personal records, not referenced.
 */
export function lexicalSeedFromEntry(entry) {
  return {
    term: entry.lemma,
    meanings: entry.senses?.[0]?.gloss ? [newMeaning({ gloss: entry.senses[0].gloss })] : [],
    pos: personalPosForEntryPos(entry.pos),
    dictKeys: [entry.id],
  };
}

export function newLexicalFromEntry(entry) {
  return newLexical(lexicalSeedFromEntry(entry));
}

export function newPage({
  title,
  body = "",
  pageDate = null,
  pageFocus = undefined,
  noteSections = undefined,
  // Temporary creation compatibility while the schema-v4 UI is replaced. Never persisted.
  pageProfile = undefined,
  collection = undefined,
  source = undefined,
  grammar = undefined,
  apuntes = null,
  tags = [],
  mediaLinks = [],
  linkedKeys = [],
  linkAnnotations = [],
} = {}) {
  if (pageProfile !== undefined && !isPageProfile(pageProfile)) {
    throw new Error("Page profile must be general or collection.");
  }
  if (pageFocus !== undefined && !isPageFocus(pageFocus)) {
    throw new Error("Page focus must be notes, vocabulary, source or grammar.");
  }

  const requestedFocus = pageFocus
    ?? (pageProfile === PAGE_PROFILES.collection ? PAGE_FOCUSES.vocabulary : PAGE_FOCUSES.notes);
  const structures = normalizePageStructures({
    pageFocus: requestedFocus,
    noteSections,
    pageProfile,
    collection: {
      ...(collection || {}),
      enabled: typeof collection?.enabled === "boolean"
        ? collection.enabled
        : pageProfile === PAGE_PROFILES.collection,
    },
    source,
    grammar,
  });
  structures.pageFocus = requestedFocus;
  structures.collection.groups = validateCollectionGroups(structures.collection.groups ?? [], {
    allowedItemKeys: (linkedKeys || []).filter(isUserKey),
  });
  if (Array.isArray(structures.grammar.sections)) {
    structures.grammar.sections = structures.grammar.sections.map((section) => ({
      ...section,
      name: typeof section?.name === "string" ? section.name.trim() : section?.name,
    }));
  }

  const at = nowIso();
  const page = {
    id: newUserKey(),
    type: "page",
    title: String(title || "").trim(),
    body,
    pageDate: pageDate || null,
    ...structures,
    // Not a page structure — the persisted latest AI review (schema v8), absent as null.
    feedback: null,
    // Not a page structure either — the owner's Apuntes beside a Diario entry (schema v9).
    apuntes: typeof apuntes === "string" && apuntes.trim() !== "" ? apuntes : null,
    tags: cleanTags(tags),
    linkedKeys,
    linkAnnotations: [...(linkAnnotations || [])],
    mediaLinks,
    createdAt: at,
    updatedAt: at,
  };

  const structureErrors = validatePageStructures(page);
  if (structureErrors.length) throw new Error(structureErrors[0]);
  const outgoing = new Set((linkedKeys || []).filter(isUserKey));
  for (const capture of page.source.captures) {
    if (capture.itemKeys.some((key) => !outgoing.has(key))) {
      throw new Error("Source capture itemKeys must reference current page vocabulary members.");
    }
  }
  for (const section of page.grammar.sections) {
    for (const example of section.examples) {
      if (example.itemKeys.some((key) => !outgoing.has(key))) {
        throw new Error("Grammar example itemKeys must reference current page vocabulary members.");
      }
      const ref = example.sourceCaptureRef;
      if (ref && ref.pageId !== page.id && !outgoing.has(ref.pageId)) {
        throw new Error("An external Source capture reference requires an outgoing page link.");
      }
    }
  }
  return page;
}

// Only called inside the complete operation's items/events transaction.
async function insertItemWithEvent(item) {
  await db.items.add(item);
  await logEvent(EVENT_TYPES.create, item.id);
  return item;
}

function requestPersistenceAfterCommit() {
  const request = () => Dexie.ignoreTransaction(() => requestPersistence().catch(() => {}));
  // Most callers own the outer transaction. A nested caller must not ask the browser
  // or access prefs until its parent has also committed; an abort never fires complete.
  let transaction = Dexie.currentTransaction;
  if (!transaction) return request();
  while (transaction.parent) transaction = transaction.parent;
  transaction.on("complete", request);
}

export async function createItem(item) {
  await db.transaction("rw", db.items, db.events, () => insertItemWithEvent(item));
  requestPersistenceAfterCommit();
  return item;
}

/** Quick-create is one save: the new item, its history and its ordinary connection. */
export async function createAndLinkItem(sourceId, item, relationship = undefined) {
  await db.transaction("rw", db.items, db.events, async () => {
    if (!await db.items.get(sourceId)) {
      throw new Error("The item you were linking from no longer exists.");
    }
    await insertItemWithEvent(item);
    await linkItems(sourceId, item.id, relationship);
  });
  requestPersistenceAfterCommit();
  return item;
}

/**
 * Several new items and their connections as one save. Each item logs its `create` event; each
 * connection is stored once, on `ownerId`, without an `edit` event. Every link must have at least
 * one end among the new items, so no existing entry's content changes. See `applyKeep`.
 *
 * Resolves with { created: [id], linked: [link], skipped: [{ ...link, reason }] }.
 */
export async function createItemsWithLinks({ items = [], links = [] } = {}) {
  const { created, linked, skipped } = await applyKeep({ items, links });
  return { created, linked, skipped };
}

/**
 * Adds ticked additions to one existing word or phrase, inside `applyKeep`'s transaction.
 * Returns "updated", "unchanged" (nothing new remained) or why it was skipped.
 *
 * The fingerprint frozen with what Claude saw must still match: an entry edited since is never
 * merged into. Additions are appended to the fresh record — examples to the meanings they name,
 * new meanings after the others (fresh IDs), a paragraph after the General note, tags after the
 * existing ones — so nothing the owner wrote is rewritten. One `updateItem`, so one edit event,
 * and its meaning-connection protection still runs.
 */
async function addToItem(update) {
  const item = await db.items.get(update.itemId);
  if (!item || item.type !== "lexical") return "entry_deleted";
  if (contentFingerprint(item) !== update.fingerprint) return "entry_changed";

  const byMeaning = update.examplesByMeaningId || {};
  const meaningIds = new Set((item.meanings || []).map((meaning) => meaning.id));
  // Unreachable while the fingerprint matches, but an example must never land on another meaning.
  if (Object.keys(byMeaning).some((id) => !meaningIds.has(id))) return "entry_changed";

  const patch = {};
  const addedMeanings = update.meanings || [];
  if (Object.keys(byMeaning).length > 0 || addedMeanings.length > 0) {
    patch.meanings = [
      ...(item.meanings || []).map((meaning) => (byMeaning[meaning.id]
        ? { ...meaning, examples: [...(meaning.examples || []), ...byMeaning[meaning.id]] }
        : meaning)),
      ...addedMeanings.map((meaning) => newMeaning(meaning)),
    ];
  }
  if ((update.myExamples || []).length > 0) patch.myExamples = [...(item.myExamples || []), ...update.myExamples];
  const note = String(update.note || "").trim();
  if (note) {
    const current = String(item.notes || "").replace(/\s+$/, "");
    patch.notes = current ? `${current}\n\n${note}` : note;
  }
  const tags = (update.tags || []).filter((tag) => !(item.tags || []).includes(tag));
  if (tags.length > 0) patch.tags = [...(item.tags || []), ...tags];

  // Nothing new: no write, so no edit event and no recency change.
  if (Object.keys(patch).length === 0) return "unchanged";
  await updateItem(item.id, patch);
  return "updated";
}

const connected = (a, b) => (a?.linkedKeys || []).includes(b?.id) || (b?.linkedKeys || []).includes(a?.id);

/**
 * Keep's Apply as one save: additions to attached entries, new items and connections. Each
 * changed entry logs one `edit` event, each new item its `create` event, and connections none.
 *
 * Every link must touch a new item or an entry in `attachedIds` (Claude saw those in full). It is
 * stored once, on `ownerId`. An existing end that has been deleted, or a pair already connected
 * in either direction, is skipped and reported — never counted as saved, since `linkItems`
 * quietly keeps an earlier edge. An entry whose content changed since Keep froze it is skipped
 * with all its additions. Anything else rolls the whole save back.
 *
 * Resolves with { created: [id], updated: [id], linked: [link], skipped: [{ ...link, reason }],
 * skippedUpdates: [{ itemId, reason }] }.
 */
export async function applyKeep({ items = [], links = [], updates = [], attachedIds = [] } = {}) {
  const newIds = new Set(items.map((item) => item.id));
  const attached = new Set(attachedIds);
  for (const link of links) {
    const touches = (id) => newIds.has(id) || attached.has(id);
    if (!touches(link.ownerId) && !touches(link.targetId)) {
      throw new Error("Each connection in a batch must involve a new item or an attached entry.");
    }
  }
  for (const update of updates) {
    if (!attached.has(update.itemId)) throw new Error("Additions can only go to attached entries.");
  }
  let outcome;
  await db.transaction("rw", db.items, db.events, async () => {
    const updated = [];
    const skippedUpdates = [];
    for (const update of updates) {
      const result = await addToItem(update);
      if (result === "updated") updated.push(update.itemId);
      else if (result !== "unchanged") skippedUpdates.push({ itemId: update.itemId, reason: result });
    }
    const created = [];
    for (const item of items) {
      await insertItemWithEvent(item);
      created.push(item.id);
    }
    const linked = [];
    const skipped = [];
    for (const link of links) {
      const [owner, target] = await Promise.all([db.items.get(link.ownerId), db.items.get(link.targetId)]);
      if (owner?.type !== "lexical" || target?.type !== "lexical") {
        skipped.push({ ...link, reason: "target_deleted" });
        continue;
      }
      if (connected(owner, target)) {
        skipped.push({ ...link, reason: "already_connected" });
        continue;
      }
      const saved = await linkItems(link.ownerId, link.targetId, link.relationship);
      if ((saved?.linkedKeys || []).includes(link.targetId)) linked.push(link);
      else skipped.push({ ...link, reason: "already_connected" });
    }
    outcome = { created, updated, linked, skipped, skippedUpdates };
  });
  requestPersistenceAfterCommit();
  return outcome;
}

/** The caller prepares the dated page, including the prompt only when requested. */
export async function createKeptPracticeEntry(page, details) {
  await db.transaction("rw", db.items, db.events, async () => {
    await insertItemWithEvent(page);
    await logPracticeWrite(page.id, { ...details, kept: true });
  });
  requestPersistenceAfterCommit();
  return page;
}

export async function getItem(id) {
  return db.items.get(id);
}

export async function allItems() {
  return db.items.orderBy("updatedAt").reverse().toArray();
}

/**
 * Diario suppresses later edit events within one editor visit. The content still
 * commits as one save, including the fresh meaning-connection protection check.
 */
export async function updateItem(id, patch, { logEdit = true } = {}) {
  return db.transaction("rw", db.items, db.events, async () => {
    if (!await db.items.get(id)) throw new Error("This item no longer exists.");
    if (Object.prototype.hasOwnProperty.call(patch, "dictKey")) {
      throw new Error("Schema v12 stores dictionary attachments in dictKeys.");
    }
    const next = { ...patch, updatedAt: nowIso() };
    if (next.tags) next.tags = cleanTags(next.tags);
    if (Object.prototype.hasOwnProperty.call(next, "dictKeys")) {
      if (!Array.isArray(next.dictKeys) || next.dictKeys.some((key) => !isDictKey(key))) {
        throw new Error("Dictionary attachments need dictionary entry keys.");
      }
      next.dictKeys = uniqueDictionaryKeys(next.dictKeys);
    }
    if (next.meanings) {
      next.meanings = cleanMeanings(next.meanings);
      const retained = new Set(next.meanings.map((meaning) => meaning.id));
      const all = await db.items.toArray();
      const blocked = [];
      for (const candidate of all) {
        for (const annotation of candidate.linkAnnotations || []) {
          if (candidate.id === id && annotation.ownerMeaningId && !retained.has(annotation.ownerMeaningId)) {
            blocked.push(annotation.ownerMeaningId);
          }
          if (annotation.targetKey === id && annotation.targetMeaningId && !retained.has(annotation.targetMeaningId)) {
            blocked.push(annotation.targetMeaningId);
          }
        }
      }
      if (blocked.length) {
        throw new Error("This meaning is used by a meaning-specific connection. Make that connection whole-entry, reassign it, or remove it first.");
      }
    }
    await db.items.update(id, next);
    if (logEdit) await logEvent(EVENT_TYPES.edit, id);
    return db.items.get(id);
  });
}

/**
 * Appends owner-selected one-time copies from a dictionary entry to an existing personal item.
 * The fresh read and edit event share one transaction, so a failed save cannot leave content and
 * history disagreeing. The current canonical dictionary key joins the target's attachment list
 * without replacing or duplicating anything already there.
 */
export async function addDictionaryMeaningsToItem(id, meanings, dictKey = null) {
  return db.transaction("rw", db.items, db.events, async () => {
    const item = await db.items.get(id);
    if (!item || item.type !== "lexical") {
      throw new Error("Dictionary meanings need an existing personal word or phrase.");
    }
    const imported = cleanMeanings(meanings);
    if (!imported.length) throw new Error("Choose at least one dictionary meaning to add.");

    const existingIds = new Set((item.meanings || []).map((meaning) => meaning.id));
    if (imported.some((meaning) => existingIds.has(meaning.id))) {
      throw new Error("An imported meaning must have a fresh personal ID.");
    }

    const currentKeys = dictionaryKeysForItem(item);
    const dictKeys = isDictKey(dictKey)
      ? appendDictionaryKey(currentKeys, dictKey)
      : currentKeys;
    return updateItem(id, {
      meanings: [...(item.meanings || []), ...imported],
      dictKeys,
    });
  });
}

/**
 * Hard-delete plus a `delete` event — the append-only log is the tombstone
 * (brief section 7). Links pointing at the item are removed; its historical
 * events stay in the log but are excluded from queues and statistics.
 */
export async function deleteItem(id) {
  await db.transaction("rw", db.items, db.prefs, db.events, async () => {
    // A layout reference is not authoritative, but it must still be cleaned even if an older
    // or malformed row has already lost the matching link. The personal notebook is small, so
    // one scan makes that dormant-metadata cleanup reliable.
    const candidates = await db.items.toArray();
    const linkers = candidates.filter((item) => {
      if (item.id === id) return false;
      if ((item.linkedKeys || []).includes(id)) return true;
      if ((item.linkAnnotations || []).some((annotation) => annotation?.targetKey === id)) return true;
      if (item.type !== "page") return false;
      if ((item.collection?.groups || []).some((group) => (group.itemKeys || []).includes(id))) return true;
      if ((item.source?.captures || []).some((capture) => (capture.itemKeys || []).includes(id))) return true;
      return (item.grammar?.sections || []).some((section) =>
        (section.examples || []).some((example) =>
          (example.itemKeys || []).includes(id) || example.sourceCaptureRef?.pageId === id
        )
      );
    });
    await Promise.all(
      linkers.map((item) => {
        const linkedKeys = (item.linkedKeys || []).filter((key) => key !== id);
        const linkAnnotations = (item.linkAnnotations || []).filter(
          (annotation) => annotation?.targetKey !== id
        );
        const next = {
          linkedKeys,
          linkAnnotations,
        };
        // Every row in this loop is a dependent of the deleted owner. Clearing its ordinary and
        // nested references is automatic bookkeeping, so its timestamp and event history stay
        // untouched even when a physical edge was present.
        if (item.type === "page") {
          const vocabularyPruned = prunePageVocabularyReferences(item, [id]);
          if (vocabularyPruned.changed) {
            next.collection = vocabularyPruned.collection;
            next.source = vocabularyPruned.source;
            next.grammar = vocabularyPruned.grammar;
          }
          const sourcePruned = clearSourcePageReferences(
            { ...item, grammar: next.grammar || item.grammar },
            id
          );
          if (sourcePruned.changed) next.grammar = sourcePruned.grammar;
        }
        return db.items.update(item.id, next);
      })
    );

    // Both pin lists are cleaned here. A stale id would not merely show a phantom card: the
    // backup validator rejects a pinned key pointing at an item the export does not contain.
    for (const prefKey of [PINNED_PAGE_IDS_PREF, PINNED_LEXICAL_IDS_PREF]) {
      const pinned = await db.prefs.get(prefKey);
      if (Array.isArray(pinned?.value) && pinned.value.includes(id)) {
        await db.prefs.put({ ...pinned, value: pinned.value.filter((pinnedId) => pinnedId !== id) });
      }
    }
    await db.items.delete(id);
    // The delete event is the tombstone. Keep it in the same transaction as the hard delete and
    // every dependent cleanup so an event-store failure rolls the entire operation back.
    await logEvent(EVENT_TYPES.delete, id);
  });
}

/**
 * Stores or clears (`null`) the latest AI review on a Diario entry. The review is metadata about
 * the entry, not an edit of it: no `updatedAt` bump and no event, so recency views and the lookup
 * counts that decide what Repaso enrolls never move. Staleness against later edits is carried by
 * the review's own `reviewedHash`, not by timestamps.
 */
export async function saveEntryFeedback(id, feedback) {
  const errors = validateStoredFeedback(feedback);
  if (errors.length) throw new Error(errors[0]);
  let result;
  await db.transaction("rw", db.items, async () => {
    const item = await db.items.get(id);
    if (!item || item.type !== "page") throw new Error(`Page ${id} does not exist.`);
    await db.items.update(id, { feedback });
    result = await db.items.get(id);
  });
  return result;
}

const annotationsWithoutTarget = (item, targetKey) =>
  (item?.linkAnnotations || []).filter((annotation) => annotation?.targetKey !== targetKey);

const annotationsWithRelationship = (item, targetKey, relationship, anchors = undefined) => {
  const annotations = annotationsWithoutTarget(item, targetKey);
  const annotation = makeLinkAnnotation(targetKey, relationship, anchors);
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
export async function linkItems(fromId, toKey, relationship = undefined, meaningPair = undefined) {
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

    let other;
    if (isUserKey(toKey)) {
      other = await db.items.get(toKey);
      if (!other) return;
      if ((other.linkedKeys || []).includes(fromId)) return;
    }

    const normalized = normalizeRelationship(relationship);
    let anchors;
    if (meaningPair) {
      if (item.type !== "lexical" || other?.type !== "lexical" || normalized.type !== "similar_meaning") {
        throw new Error("Meaning-specific connections require two personal lexical entries and Similar meaning.");
      }
      if (!(item.meanings || []).some(({ id }) => id === meaningPair.fromMeaningId) ||
          !(other.meanings || []).some(({ id }) => id === meaningPair.toMeaningId)) {
        throw new Error("A selected meaning no longer exists on its entry.");
      }
      anchors = { ownerMeaningId: meaningPair.fromMeaningId, targetMeaningId: meaningPair.toMeaningId };
    }
    const next = {
      ...item,
      linkedKeys: [...linkedKeys, toKey],
      linkAnnotations: annotationsWithRelationship(item, toKey, normalized, anchors),
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
export async function setLinkRelationship(aKey, bKey, relationship, meaningPair = undefined) {
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
    let anchors;
    if (meaningPair) {
      if (a?.type !== "lexical" || b?.type !== "lexical" || normalized.type !== "similar_meaning") {
        throw new Error("Meaning-specific connections require two personal lexical entries and Similar meaning.");
      }
      if (!(a.meanings || []).some(({ id }) => id === meaningPair.aMeaningId) ||
          !(b.meanings || []).some(({ id }) => id === meaningPair.bMeaningId)) {
        throw new Error("A selected meaning no longer exists on its entry.");
      }
      anchors = chosen.owner.id === aKey
        ? { ownerMeaningId: meaningPair.aMeaningId, targetMeaningId: meaningPair.bMeaningId }
        : { ownerMeaningId: meaningPair.bMeaningId, targetMeaningId: meaningPair.aMeaningId };
    }

    for (const candidate of candidates) {
      const base = await db.items.get(candidate.owner.id);
      const nextAnnotations = candidate === chosen
        ? annotationsWithRelationship(base, candidate.targetKey, stored, anchors)
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
        const pruned = prunePageVocabularyReferences(current, [targetKey]);
        if (pruned.changed) {
          patch.collection = pruned.collection;
          patch.source = pruned.source;
          patch.grammar = pruned.grammar;
        }
        const sourcePruned = clearSourcePageReferences(
          { ...current, grammar: patch.grammar || current.grammar },
          targetKey
        );
        if (sourcePruned.changed) patch.grammar = sourcePruned.grammar;
      }
      await db.items.update(current.id, patch);
    }

    // A valid v5 contextual edge is outgoing from the page that owns the nested reference, but
    // tolerate legacy/incomplete direction by cleaning either endpoint after physical removal.
    const endpoints = await Promise.all([
      isUserKey(fromId) ? db.items.get(fromId) : undefined,
      isUserKey(toKey) ? db.items.get(toKey) : undefined,
    ]);
    for (const endpoint of endpoints) {
      if (endpoint?.type !== "page") continue;
      const otherKey = endpoint.id === fromId ? toKey : fromId;
      const other = endpoints.find((candidate) => candidate?.id === otherKey);
      const patch = {};
      if (other?.type === "lexical") {
        const pruned = prunePageVocabularyReferences(endpoint, [otherKey]);
        if (pruned.changed) Object.assign(patch, {
          collection: pruned.collection,
          source: pruned.source,
          grammar: pruned.grammar,
        });
      } else if (other?.type === "page") {
        const pruned = clearSourcePageReferences(endpoint, otherKey);
        if (pruned.changed) patch.grammar = pruned.grammar;
      }
      if (Object.keys(patch).length) await db.items.update(endpoint.id, patch);
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

const sameArray = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

/**
 * Pinned vocabulary, the lexical counterpart of `getPinnedPageIds`/`setPagePinned` in
 * collections.js. It lives here rather than there because collections.js already imports from
 * this module; the reverse import would close a cycle.
 *
 * Stale, duplicate and non-lexical ids are filtered defensively on read, so a pin surviving a
 * restore of older data can never resurrect a card or point at a page.
 */
const filterPinnedLexicalIds = async (value) => {
  if (!Array.isArray(value)) return [];
  const lexicalIds = new Set(await db.items.where("type").equals("lexical").primaryKeys());
  const seen = new Set();
  return value.filter((id) => {
    if (!isUserKey(id) || !lexicalIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export async function getPinnedLexicalIds() {
  return filterPinnedLexicalIds(await getPref(PINNED_LEXICAL_IDS_PREF, []));
}

/** Pinning is a UI preference: no item write, timestamp change or event. */
export async function setLexicalPinned(itemId, pinned) {
  if (typeof pinned !== "boolean") throw new Error("Pinned state must be true or false.");
  let result;
  await db.transaction("rw", db.items, db.prefs, async () => {
    const item = await db.items.get(itemId);
    if (pinned && (!item || item.type !== "lexical")) {
      throw new Error(`Word or phrase ${itemId} does not exist.`);
    }

    const row = await db.prefs.get(PINNED_LEXICAL_IDS_PREF);
    const current = await filterPinnedLexicalIds(row?.value || []);
    const next = pinned
      ? current.includes(itemId) ? current : [...current, itemId]
      : current.filter((id) => id !== itemId);

    if (!row || !sameArray(next, row.value || [])) {
      await db.prefs.put({ key: PINNED_LEXICAL_IDS_PREF, value: next });
    }
    result = next;
  });
  return result;
}
