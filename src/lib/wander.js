import { isJournalPage } from "./pageKinds.js";
import {
  connectionsFor,
  normalizeRelationship,
  relationshipForTarget,
} from "./relationships.js";
import { connectionsFromResolvedEntryLinks } from "./resolvedConnections.js";

// Compatibility export: Phase 23's pure tests and callers keep their established import while
// the implementation now lives beside the shared Phase 25 family preparer.
export { deriveSavedFamilySiblings } from "./wordFamilies.js";

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

/** Uniform over lexical entries other than the center currently on screen. */
export function sampleWanderNext(items = [], currentId, random = Math.random) {
  return sampleWanderStart(
    eligibleWanderItems(items).filter((item) => item.id !== currentId),
    random
  );
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
