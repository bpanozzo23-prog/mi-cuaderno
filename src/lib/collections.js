import { isDictKey, isPageGroupKey, isUserKey, newPageGroupKey } from "./ids.js";
import { PAGE_PROFILES } from "./pageProfiles.js";

export const NOT_GROUPED_LABEL = "Not grouped yet";

export const collectionGroupNameKey = (name) =>
  String(name || "").trim().normalize("NFKC").toLocaleLowerCase("es");

const uniqueStrings = (values = []) => {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    if (typeof value !== "string" || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
};

/**
 * Validates and deep-clones saved group layout. Name comparison deliberately performs Unicode
 * normalization and case folding, but does not strip accents: "Énfasis" and "énfasis" collide,
 * while "enfasis" remains a distinct owner-written name.
 */
export function validateCollectionGroups(groups, { allowedItemKeys = null } = {}) {
  if (!Array.isArray(groups)) throw new Error("Collection groups must be an array.");

  const allowed = allowedItemKeys == null ? null : new Set(allowedItemKeys);
  const ids = new Set();
  const names = new Set();
  const placements = new Set();

  return groups.map((group, index) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) {
      throw new Error(`Collection group ${index + 1} must be an object.`);
    }
    if (!isPageGroupKey(group.id)) throw new Error(`Collection group ${index + 1} has an invalid ID.`);
    if (ids.has(group.id)) throw new Error("Collection group IDs must be unique within a page.");
    ids.add(group.id);

    const name = String(group.name || "").trim();
    if (!name) throw new Error("Collection group names cannot be blank.");
    const nameKey = collectionGroupNameKey(name);
    if (names.has(nameKey)) throw new Error("Collection group names must be unique within a page.");
    names.add(nameKey);

    if (!Array.isArray(group.itemKeys)) throw new Error(`Collection group “${name}” must have itemKeys.`);
    const itemKeys = group.itemKeys.map((key) => {
      if (!isUserKey(key)) throw new Error("Collection groups can contain only personal lexical item IDs.");
      if (allowed && !allowed.has(key)) {
        throw new Error("Collection group itemKeys must reference current Collection members.");
      }
      if (placements.has(key)) throw new Error("A Collection member can appear in only one group.");
      placements.add(key);
      return key;
    });

    return { id: group.id, name, itemKeys };
  });
}

export function newPageGroup(name, itemKeys = []) {
  return validateCollectionGroups([{ id: newPageGroupKey(), name, itemKeys }])[0];
}

const collectionGroups = (page) => (Array.isArray(page?.collection?.groups) ? page.collection.groups : []);

/**
 * Derives Collection display state from the one relationship authority: page.linkedKeys.
 * Group itemKeys are used only for layout; dangling, dictionary and page keys cannot become
 * members merely by appearing in that layout metadata.
 */
export function deriveCollection(page, items = []) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const outgoingKeys = uniqueStrings(page?.linkedKeys || []);
  const memberKeys = outgoingKeys.filter((key) => byId.get(key)?.type === "lexical" && isUserKey(key));
  const memberSet = new Set(memberKeys);
  const placed = new Set();

  const groups = collectionGroups(page).map((group) => {
    const itemKeys = [];
    for (const key of Array.isArray(group?.itemKeys) ? group.itemKeys : []) {
      if (!memberSet.has(key) || placed.has(key)) continue;
      placed.add(key);
      itemKeys.push(key);
    }
    return {
      id: group?.id,
      name: String(group?.name || "").trim(),
      itemKeys,
      items: itemKeys.map((key) => byId.get(key)),
    };
  });

  const ungroupedItemKeys = memberKeys.filter((key) => !placed.has(key));
  const ungroupedItems = ungroupedItemKeys.map((key) => byId.get(key));
  const members = memberKeys.map((key) => byId.get(key));
  const outgoingMemberSet = new Set(memberKeys);

  // Preserve the existing Related ordering: `items` arrives in the notebook's selected order.
  // Outgoing lexical links are members and therefore suppressed; incoming lexical backlinks
  // and page links in either direction remain Related.
  const outgoing = new Set(outgoingKeys);
  const relatedItems = items.filter(
    (item) =>
      item.id !== page?.id &&
      !outgoingMemberSet.has(item.id) &&
      (outgoing.has(item.id) || (item.linkedKeys || []).includes(page?.id))
  );
  const relatedDictKeys = outgoingKeys.filter(isDictKey);

  return {
    groups,
    ungroupedItemKeys,
    ungroupedItems,
    memberKeys,
    members,
    itemCount: memberKeys.length,
    groupCount: groups.length,
    relatedItems,
    relatedDictKeys,
    practiceEligible: members.some((item) =>
      (item.meanings || []).some((meaning) => String(meaning?.gloss || "").trim())
    ),
  };
}

/** Collection-only placements for the lexical detail screen; dormant General layout is hidden. */
export function getCollectionPlacements(itemId, items = []) {
  const placements = [];
  for (const page of items) {
    if (page.type !== "page" || page.pageProfile !== PAGE_PROFILES.collection) continue;
    const derived = deriveCollection(page, items);
    if (!derived.memberKeys.includes(itemId)) continue;
    const group = derived.groups.find((candidate) => candidate.itemKeys.includes(itemId));
    placements.push({
      page,
      pageId: page.id,
      pageTitle: page.title || "Untitled page",
      groupId: group?.id || null,
      groupName: group?.name || NOT_GROUPED_LABEL,
    });
  }
  return placements;
}

/** Active Collections that can accept this lexical item from its own detail screen. */
export function getAvailableCollectionDestinations(itemId, items = []) {
  const destinations = [];
  for (const page of items) {
    if (page.type !== "page" || page.pageProfile !== PAGE_PROFILES.collection) continue;
    const derived = deriveCollection(page, items);
    if (derived.memberKeys.includes(itemId)) continue;
    destinations.push({
      page,
      pageId: page.id,
      pageTitle: page.title || "Untitled page",
      groups: [
        { id: null, name: NOT_GROUPED_LABEL },
        ...derived.groups.map((group) => ({ id: group.id, name: group.name })),
      ],
    });
  }
  return destinations.sort((a, b) =>
    a.pageTitle.localeCompare(b.pageTitle, "es", { sensitivity: "base" })
    || a.pageId.localeCompare(b.pageId)
  );
}

/** Removes layout references without deciding whether the active profile is Collection. */
export function pruneCollectionItemKeys(page, removedItemKeys) {
  const removed = new Set(removedItemKeys || []);
  const groups = collectionGroups(page);
  let changed = false;
  const nextGroups = groups.map((group) => {
    const itemKeys = (group.itemKeys || []).filter((key) => !removed.has(key));
    if (itemKeys.length !== (group.itemKeys || []).length) changed = true;
    return { ...group, itemKeys };
  });
  return { changed, collection: { ...(page?.collection || {}), groups: nextGroups } };
}

/**
 * Replaces only reorderable current-member slots. Nonmember page/dictionary links and optional
 * fixed members keep their positions; removed members disappear, and extra desired members append.
 * Organizer uses grouped members as fixed because their display order lives in group.itemKeys;
 * only Not-grouped order needs to be encoded back into linkedKeys.
 */
export function reorderCollectionMemberLinks(
  linkedKeys,
  currentMemberKeys,
  desiredMemberKeys,
  { fixedMemberKeys = [] } = {}
) {
  const current = new Set(currentMemberKeys || []);
  const fixed = new Set(fixedMemberKeys || []);
  const desired = uniqueStrings(desiredMemberKeys || []);
  let cursor = 0;
  const result = [];
  for (const key of linkedKeys || []) {
    if (!current.has(key)) {
      result.push(key);
      continue;
    }
    if (fixed.has(key)) {
      result.push(key);
      continue;
    }
    if (cursor < desired.length) result.push(desired[cursor++]);
  }
  result.push(...desired.slice(cursor));
  return result;
}
