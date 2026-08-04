import { db, getPref } from "./db.js";
import { EVENT_TYPES, logEvent } from "./events.js";
import { newLexical, newLexicalFromEntry } from "./items.js";
import { nowIso } from "../lib/dates.js";
import { isDictKey, isPageGroupKey, isUserKey } from "../lib/ids.js";
import {
  deriveCollection,
  pruneCollectionItemKeys,
  reorderCollectionMemberLinks,
  validateCollectionGroups,
} from "../lib/collections.js";
import {
  isPageProfile,
  PAGE_PROFILES,
  PINNED_PAGE_IDS_PREF,
} from "../lib/pageProfiles.js";
import { requestPersistence } from "../lib/persistence.js";
import {
  annotationForTarget,
  makeLinkAnnotation,
  reorientRelationship,
} from "../lib/relationships.js";
import { installedMeta } from "./ref/entries.js";

export { PINNED_PAGE_IDS_PREF } from "../lib/pageProfiles.js";

const sameArray = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const withoutLinkAnnotation = (item, targetKey) =>
  (item?.linkAnnotations || []).filter((annotation) => annotation?.targetKey !== targetKey);

const physicalConnectionRemovalPatch = (item, targetKey, at) => {
  const linkedKeys = (item?.linkedKeys || []).filter((key) => key !== targetKey);
  const linkAnnotations = withoutLinkAnnotation(item, targetKey);
  const linkChanged = linkedKeys.length !== (item?.linkedKeys || []).length;
  const annotationsChanged = linkAnnotations.length !== (item?.linkAnnotations || []).length;
  if (!linkChanged && !annotationsChanged) return null;
  return {
    linkedKeys,
    linkAnnotations,
    // Removing an actual physical edge keeps link removal's existing recency behaviour. Cleaning
    // only malformed leftover metadata remains timestamp-neutral.
    ...(linkChanged ? { updatedAt: at } : {}),
  };
};

const assertPage = (item, pageId) => {
  if (!item || item.type !== "page") throw new Error(`Page ${pageId} does not exist.`);
  return item;
};

const cloneGroups = (page) =>
  (page.collection?.groups || []).map((group) => ({
    id: group.id,
    name: group.name,
    itemKeys: [...(group.itemKeys || [])],
  }));

/** Preserves every page field and dormant Collection layout; only the active profile changes. */
export async function setPageProfile(pageId, profile) {
  if (!isPageProfile(profile)) throw new Error("Page profile must be general or collection.");
  let result;

  await db.transaction("rw", db.items, db.events, async () => {
    const page = assertPage(await db.items.get(pageId), pageId);
    if (page.pageProfile === profile) {
      result = page;
      return;
    }

    const next = {
      ...page,
      pageProfile: profile,
      collection: page.collection || { groups: [] },
      updatedAt: nowIso(),
    };
    await db.items.put(next);
    await logEvent(EVENT_TYPES.edit, pageId);
    result = next;
  });

  return result;
}

const personalCandidateId = (candidate) => candidate?.itemId;

const createCandidateItem = (candidate) => {
  if (candidate?.kind === "dictionary") {
    if (
      !candidate.entry ||
      !isDictKey(candidate.entry.id) ||
      !String(candidate.entry.lemma || "").trim()
    ) {
      throw new Error("A dictionary candidate must include its resolved dictionary entry.");
    }
    return newLexicalFromEntry(candidate.entry);
  }

  if (candidate?.kind === "new") {
    const term = String(candidate.term || "").trim();
    if (!term) throw new Error("A new vocabulary candidate needs a Spanish term.");
    const form = candidate.form ?? (term.includes(" ") ? "phrase" : "word");
    if (form !== "word" && form !== "phrase") throw new Error("Vocabulary form must be word or phrase.");
    return newLexical({
      term,
      form,
      meanings: candidate.meanings || [],
      pos: candidate.pos || "",
      notes: candidate.notes || "",
      tags: candidate.tags || [],
      myExamples: candidate.myExamples || [],
      mediaLinks: candidate.mediaLinks || [],
    });
  }

  throw new Error("Unknown Collection vocabulary candidate.");
};

/**
 * Resolves a picker selection and commits all new lexical rows, incoming-edge promotions,
 * links and target-group placement in one transaction. Raw dictionary IDs are intentionally
 * not accepted: an entry must first become (or reuse) an independent personal lexical item.
 */
export async function commitCollectionAdd(
  pageId,
  { targetGroupId = null, candidates = [] } = {}
) {
  if (!Array.isArray(candidates)) throw new Error("Collection candidates must be an array.");
  if (targetGroupId !== null && !isPageGroupKey(targetGroupId)) {
    throw new Error("Target Collection group ID is invalid.");
  }

  const dictionaryMeta = await installedMeta();
  const canonicalDictKey = (key) => dictionaryMeta?.previousIds?.[key] || key;
  let result;
  let shouldRequestPersistence = false;

  await db.transaction("rw", db.items, db.events, async () => {
    const page = assertPage(await db.items.get(pageId), pageId);
    if (page.pageProfile !== PAGE_PROFILES.collection) {
      throw new Error("Vocabulary can be added only while the page is a Collection.");
    }

    const groups = cloneGroups(page);
    const targetIndex = targetGroupId === null ? -1 : groups.findIndex((group) => group.id === targetGroupId);
    if (targetGroupId !== null && targetIndex < 0) throw new Error("Target Collection group does not exist.");

    const all = await db.items.toArray();
    const byId = new Map(all.map((item) => [item.id, item]));
    const attachedByDictKey = new Map();
    for (const item of all) {
      if (item.type !== "lexical" || !item.dictKey) continue;
      if (!attachedByDictKey.has(item.dictKey)) attachedByDictKey.set(item.dictKey, item);
      const canonicalKey = canonicalDictKey(item.dictKey);
      if (!attachedByDictKey.has(canonicalKey)) attachedByDictKey.set(canonicalKey, item);
    }
    const memberIds = [];
    const selected = new Set();
    const createdItems = [];

    for (const candidate of candidates) {
      let lexical;
      if (candidate?.kind === "personal") {
        const itemId = personalCandidateId(candidate);
        if (!isUserKey(itemId)) throw new Error("A personal candidate needs a personal item ID.");
        lexical = byId.get(itemId);
        if (!lexical || lexical.type !== "lexical") {
          throw new Error("Collection members must be existing personal lexical items.");
        }
      } else if (candidate?.kind === "dictionary") {
        if (
          !candidate.entry ||
          !isDictKey(candidate.entry.id) ||
          !String(candidate.entry.lemma || "").trim()
        ) {
          throw new Error("A dictionary candidate must include its resolved dictionary entry.");
        }
        lexical = attachedByDictKey.get(candidate.entry.id) || attachedByDictKey.get(canonicalDictKey(candidate.entry.id));
        if (!lexical) {
          lexical = createCandidateItem(candidate);
          await db.items.add(lexical);
          await logEvent(EVENT_TYPES.create, lexical.id);
          byId.set(lexical.id, lexical);
          attachedByDictKey.set(candidate.entry.id, lexical);
          attachedByDictKey.set(canonicalDictKey(candidate.entry.id), lexical);
          createdItems.push(lexical);
        }
      } else {
        lexical = createCandidateItem(candidate);
        await db.items.add(lexical);
        await logEvent(EVENT_TYPES.create, lexical.id);
        byId.set(lexical.id, lexical);
        if (lexical.dictKey) attachedByDictKey.set(lexical.dictKey, lexical);
        createdItems.push(lexical);
      }

      if (selected.has(lexical.id)) continue;
      selected.add(lexical.id);
      memberIds.push(lexical.id);
    }

    const at = nowIso();
    let nextPageAnnotations = [...(page.linkAnnotations || [])];
    // Selecting an incoming lexical backlink as a member atomically moves both the edge and its
    // annotation onto the page. Directional subject flips because the physical owner reverses,
    // preserving which real endpoint receives the forward label.
    for (const itemId of memberIds) {
      const lexical = byId.get(itemId);
      if (!(lexical.linkedKeys || []).includes(pageId)) continue;
      const incomingAnnotation = annotationForTarget(lexical, pageId);
      const nextLexical = {
        ...lexical,
        linkedKeys: lexical.linkedKeys.filter((key) => key !== pageId),
        linkAnnotations: withoutLinkAnnotation(lexical, pageId),
        updatedAt: at,
      };
      await db.items.put(nextLexical);
      byId.set(itemId, nextLexical);

      if (incomingAnnotation && !nextPageAnnotations.some((annotation) => annotation?.targetKey === itemId)) {
        const moved = makeLinkAnnotation(itemId, reorientRelationship(incomingAnnotation));
        if (moved) nextPageAnnotations.push(moved);
      }
    }

    const existing = new Set(page.linkedKeys || []);
    const addedIds = memberIds.filter((itemId) => !existing.has(itemId));
    const annotationsChanged = JSON.stringify(nextPageAnnotations) !== JSON.stringify(page.linkAnnotations || []);
    let nextPage = page;
    if (addedIds.length || annotationsChanged) {
      if (targetIndex >= 0) groups[targetIndex].itemKeys.push(...addedIds);
      nextPage = {
        ...page,
        linkedKeys: [...(page.linkedKeys || []), ...addedIds],
        linkAnnotations: nextPageAnnotations,
        collection: { ...(page.collection || {}), groups },
        ...(addedIds.length ? { updatedAt: at } : {}),
      };
      await db.items.put(nextPage);
    }

    shouldRequestPersistence = createdItems.length > 0;
    result = { page: nextPage, memberIds, addedIds, createdItems };
  });

  if (shouldRequestPersistence) requestPersistence().catch(() => {});
  return result;
}

const validateMemberList = (name, keys, allowed, seen) => {
  if (!Array.isArray(keys)) throw new Error(`${name} must be an array.`);
  return keys.map((key) => {
    if (!isUserKey(key) || !allowed.has(key)) {
      throw new Error(`${name} can contain only current Collection members.`);
    }
    if (seen.has(key)) throw new Error("Each Collection member needs exactly one organizer destination.");
    seen.add(key);
    return key;
  });
};

/** One validated, coherent Organizer save. Omitted members must be named in removedItemKeys. */
export async function saveCollectionOrganization(
  pageId,
  { groups, ungroupedItemKeys, removedItemKeys = [] } = {}
) {
  let result;

  await db.transaction("rw", db.items, db.events, async () => {
    const page = assertPage(await db.items.get(pageId), pageId);
    if (page.pageProfile !== PAGE_PROFILES.collection) {
      throw new Error("A page must be a Collection before it can be organized.");
    }

    const all = await db.items.toArray();
    const currentMemberKeys = deriveCollection(page, all).memberKeys;
    const allowed = new Set(currentMemberKeys);
    const nextGroups = validateCollectionGroups(groups, { allowedItemKeys: allowed });
    const seen = new Set(nextGroups.flatMap((group) => group.itemKeys));
    const nextUngrouped = validateMemberList("ungroupedItemKeys", ungroupedItemKeys, allowed, seen);
    const removed = validateMemberList("removedItemKeys", removedItemKeys, allowed, seen);

    if (seen.size !== allowed.size || currentMemberKeys.some((key) => !seen.has(key))) {
      throw new Error("Every current Collection member must be placed or explicitly removed.");
    }

    const groupedItemKeys = nextGroups.flatMap((group) => group.itemKeys);
    const nextLinkedKeys = reorderCollectionMemberLinks(
      page.linkedKeys || [],
      currentMemberKeys,
      nextUngrouped,
      { fixedMemberKeys: groupedItemKeys }
    );
    const groupsChanged = JSON.stringify(nextGroups) !== JSON.stringify(page.collection?.groups || []);
    const linksChanged = !sameArray(nextLinkedKeys, page.linkedKeys || []);
    const nextLinkAnnotations = (page.linkAnnotations || []).filter(
      (annotation) => !removed.includes(annotation?.targetKey)
    );
    const annotationsChanged = nextLinkAnnotations.length !== (page.linkAnnotations || []).length;

    if (!groupsChanged && !linksChanged && !annotationsChanged) {
      result = { page, changed: false, removedItemKeys: removed };
      return;
    }

    const at = nowIso();
    const nextPage = {
      ...page,
      linkedKeys: nextLinkedKeys,
      linkAnnotations: nextLinkAnnotations,
      collection: { ...(page.collection || {}), groups: nextGroups },
      updatedAt: at,
    };
    await db.items.put(nextPage);
    // Schema v4 preserves untouched reciprocal legacy topology. Once the owner explicitly
    // removes a member, however, every physical copy of that conceptual connection must go so it
    // cannot immediately reappear as an incoming ordinary connection.
    for (const itemId of removed) {
      const member = all.find((candidate) => candidate.id === itemId);
      const reversePatch = physicalConnectionRemovalPatch(member, pageId, at);
      if (reversePatch) await db.items.update(itemId, reversePatch);
    }
    await logEvent(EVENT_TYPES.edit, pageId);
    result = { page: nextPage, changed: true, removedItemKeys: removed };
  });

  return result;
}

/** Removes every stored copy of a member connection and dormant layout; never the lexical item. */
export async function removeCollectionMember(pageId, itemId) {
  let result;
  await db.transaction("rw", db.items, async () => {
    const page = assertPage(await db.items.get(pageId), pageId);
    if (!(page.linkedKeys || []).includes(itemId)) {
      result = page;
      return;
    }

    const lexical = await db.items.get(itemId);
    if (!lexical || lexical.type !== "lexical") {
      throw new Error("Collection members must be personal lexical items.");
    }
    const at = nowIso();
    const pruned = pruneCollectionItemKeys(page, [itemId]);
    const nextPage = {
      ...page,
      linkedKeys: page.linkedKeys.filter((key) => key !== itemId),
      linkAnnotations: withoutLinkAnnotation(page, itemId),
      ...(pruned.changed ? { collection: pruned.collection } : {}),
      updatedAt: at,
    };
    await db.items.put(nextPage);
    const reversePatch = physicalConnectionRemovalPatch(lexical, pageId, at);
    if (reversePatch) await db.items.update(itemId, reversePatch);
    result = nextPage;
  });
  return result;
}

const filterPinnedIds = async (value) => {
  if (!Array.isArray(value)) return [];
  const pageIds = new Set(await db.items.where("type").equals("page").primaryKeys());
  const seen = new Set();
  return value.filter((id) => {
    if (!isUserKey(id) || !pageIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/** Returns stable preference order while defensively ignoring stale, duplicate or nonpage IDs. */
export async function getPinnedPageIds() {
  return filterPinnedIds(await getPref(PINNED_PAGE_IDS_PREF, []));
}

/** Pinning is a UI preference: no page write, timestamp change or event. */
export async function setPagePinned(pageId, pinned) {
  if (typeof pinned !== "boolean") throw new Error("Pinned state must be true or false.");
  let result;
  await db.transaction("rw", db.items, db.prefs, async () => {
    const page = await db.items.get(pageId);
    if (pinned && (!page || page.type !== "page")) throw new Error(`Page ${pageId} does not exist.`);

    const row = await db.prefs.get(PINNED_PAGE_IDS_PREF);
    const current = await filterPinnedIds(row?.value || []);
    const next = pinned
      ? current.includes(pageId) ? current : [...current, pageId]
      : current.filter((id) => id !== pageId);

    if (!row || !sameArray(next, row.value || [])) {
      await db.prefs.put({ key: PINNED_PAGE_IDS_PREF, value: next });
    }
    result = next;
  });
  return result;
}
