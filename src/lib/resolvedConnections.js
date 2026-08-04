import {
  normalizeRelationship,
  reorientRelationship,
  relationshipLabel,
} from "./relationships.js";

/**
 * Converts the relationship-bearing result of resolveLinkedKeys into the same plain connection
 * rows used by groupConnections and the shared cards. Unlike re-deriving through linkedKeys, this
 * remains correct in the render immediately after an alias rewrite, when the component's item prop
 * can still contain the old raw key and annotation.
 *
 * `perspective: "target"` is the read-only dictionary-detail view: the personal item remains the
 * physical owner, while the directional label is inverted for the dictionary endpoint.
 */
export function connectionFromResolvedEntryLink(owner, entryLink, { perspective = "owner" } = {}) {
  if (!owner?.id || !entryLink?.entry || entryLink.conflict) return null;
  if (perspective !== "owner" && perspective !== "target") {
    throw new Error("Resolved dictionary perspective must be owner or target.");
  }

  const stored = normalizeRelationship(entryLink.relationship);
  const relationship = perspective === "owner" ? stored : reorientRelationship(stored);
  const canonicalKey = entryLink.canonicalKey || entryLink.entry.id;
  return {
    kind: perspective === "owner" ? "entry" : "item",
    key: perspective === "owner" ? canonicalKey : owner.id,
    ...(perspective === "owner" ? { entry: entryLink.entry } : { item: owner }),
    ownerKey: owner.id,
    targetKey: canonicalKey,
    rawKeys: [...(entryLink.rawKeys || [])],
    type: relationship.type,
    subject: relationship.subject,
    note: relationship.note,
    label: relationshipLabel(relationship, "owner"),
    relationship,
  };
}

export function connectionsFromResolvedEntryLinks(owner, entryLinks = [], options = {}) {
  return entryLinks
    .map((entryLink) => connectionFromResolvedEntryLink(owner, entryLink, options))
    .filter(Boolean);
}
