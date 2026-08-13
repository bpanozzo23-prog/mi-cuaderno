import { isJournalPage } from "./pageKinds.js";
import {
  connectionsFor,
  normalizeRelationship,
  relationshipForTarget,
} from "./relationships.js";
import { connectionsFromResolvedEntryLinks } from "./resolvedConnections.js";

export function eligibleWanderItems(items = []) {
  return items.filter((item) => item?.type === "lexical");
}

/** Uniform over the current personal lexical population; random is injectable for proof. */
export function sampleWanderStart(items = [], random = Math.random) {
  const eligible = eligibleWanderItems(items);
  if (!eligible.length) return null;
  const draw = Number(random());
  const index = Math.min(
    eligible.length - 1,
    Math.max(0, Math.floor((Number.isFinite(draw) ? draw : 0) * eligible.length))
  );
  return eligible[index];
}

const explicitRelationship = (relationship) =>
  relationship.type !== "related" || relationship.note !== "";

const sameRelationship = (a, b) =>
  a.type === b.type && a.subject === b.subject && a.note === b.note;

/**
 * Personal edges come from both physical directions. Dictionary descriptors may carry a raw old
 * key resolved read-only to a canonical entry; that preserves the raw annotation without healing
 * personal data. Two conflicting explicit aliases stay silent until ordinary Detail resolves them.
 */
export function deriveWanderConnections(item, items = [], entries = []) {
  const personal = connectionsFor(item, items).filter(
    (row) => row.kind !== "item" || !isJournalPage(row.item)
  );
  const resolvedByCanonical = new Map();

  for (const candidate of entries || []) {
    const entry = candidate?.entry || candidate;
    const rawKey = candidate?.rawKey || entry?.id;
    if (!entry?.id || !rawKey || !(item?.linkedKeys || []).includes(rawKey)) continue;
    const relationship = normalizeRelationship(
      candidate?.relationship || relationshipForTarget(item, rawKey)
    );
    const current = resolvedByCanonical.get(entry.id);
    if (!current) {
      resolvedByCanonical.set(entry.id, { entry, rawKey, relationship, conflict: false });
      continue;
    }
    if (current.conflict || sameRelationship(current.relationship, relationship)) continue;
    if (explicitRelationship(current.relationship) && explicitRelationship(relationship)) {
      current.conflict = true;
    } else if (explicitRelationship(relationship)) {
      resolvedByCanonical.set(entry.id, { entry, rawKey, relationship, conflict: false });
    }
  }

  const entryLinks = [...resolvedByCanonical.values()]
    .filter((row) => !row.conflict)
    .map(({ entry, rawKey, relationship }) => ({
      entry,
      canonicalKey: entry.id,
      rawKeys: [rawKey],
      relationship,
    }));
  return [...personal, ...connectionsFromResolvedEntryLinks(item, entryLinks)];
}

/** Saved personal items attached to any loaded Phase 21 member, preserving notebook order. */
export function deriveSavedFamilySiblings(item, items = [], familyRows = [], previousIds = {}) {
  const memberIds = new Set(
    (familyRows || []).flatMap((row) => (row?.members || []).map((entry) => entry?.id).filter(Boolean))
  );
  if (!memberIds.size) return [];
  return items.filter((candidate) => {
    if (candidate?.type !== "lexical" || candidate.id === item?.id || !candidate.dictKey) return false;
    const canonical = previousIds?.[candidate.dictKey] || candidate.dictKey;
    return memberIds.has(canonical);
  });
}
