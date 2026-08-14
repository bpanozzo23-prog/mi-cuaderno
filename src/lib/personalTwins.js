import {
  annotationForTarget,
  isImplicitRelationship,
  normalizeRelationship,
  reorientRelationship,
} from "./relationships.js";

/**
 * "Personal twin" derivation: an ordinary dictionary connection whose entry the owner has since
 * attached to one of their own lexical items. The LinkPicker prevents creating this double from
 * the start (mergeResults replaces an attached entry with the owner's item), but a link made
 * BEFORE the personal entry existed still points at the dictionary. This module only detects the
 * situation; the owner-triggered rewrite lives in src/db/linkedEntries.js, and nothing automatic
 * ever merges — a dictKey attachment stays deliberately separate from an ordinary connection.
 *
 * Pure and database-free: callers supply the notebook rows, the resolved entryLinks from
 * resolveLinkedKeys, and the installed dataset's previousIds alias map.
 */

const relationshipSignature = (relationship) => {
  const normalized = normalizeRelationship(relationship);
  return JSON.stringify([normalized.type, normalized.subject, normalized.note]);
};

/**
 * Personal lexical items whose reversible dictKey attachment names this canonical entry. Alias
 * awareness mirrors the DictDetail attachments memo: an old attachment key counts when the
 * installed dataset's previousIds map says it now names the same entry.
 */
export function attachedTwinsFor(canonicalKey, items = [], previousIds = {}) {
  if (!canonicalKey) return [];
  return items.filter((item) =>
    item?.type === "lexical" &&
    item.dictKey &&
    (item.dictKey === canonicalKey || previousIds?.[item.dictKey] === canonicalKey)
  );
}

/**
 * The existing personal edge between item and twin, if any, described from the ITEM's
 * perspective. Links are stored once (brief section 7), so the physical row may be either
 * endpoint's; a legacy reciprocal pair prefers the side owning an explicit annotation, the same
 * preference edgeCandidates applies in relationships.js.
 */
function personalEdgeFor(item, twin) {
  const outgoing = (item.linkedKeys || []).includes(twin.id);
  const incoming = (twin.linkedKeys || []).includes(item.id);
  if (!outgoing && !incoming) return null;

  const outgoingAnnotation = outgoing ? annotationForTarget(item, twin.id) : null;
  const incomingAnnotation = incoming ? annotationForTarget(twin, item.id) : null;

  if (outgoing && (outgoingAnnotation || !incomingAnnotation)) {
    return {
      direction: "outgoing",
      relationship: normalizeRelationship(outgoingAnnotation || {}),
    };
  }
  return {
    direction: outgoing ? "outgoing" : "incoming",
    relationship: reorientRelationship(normalizeRelationship(incomingAnnotation || {})),
  };
}

/**
 * Per rendered dictionary-connection row: the attached twins and, for each, whether a personal
 * edge already exists and whether merging would need the owner to choose between two conflicting
 * explicit annotations. Conflicted entryLinks are skipped outright — the alias-conflict resolver
 * runs first and such a row never renders an ordinary card. The self-twin (an item attached to
 * the entry it also links) is excluded: merging it would create a forbidden self-link.
 */
export function derivePersonalTwinMerges(item, entryLinks = [], items = [], previousIds = {}) {
  const merges = new Map();
  if (!item?.id) return merges;

  for (const entryLink of entryLinks) {
    if (!entryLink?.canonicalKey || entryLink.conflict) continue;
    const twins = attachedTwinsFor(entryLink.canonicalKey, items, previousIds)
      .filter((twin) => twin.id !== item.id);
    if (!twins.length) continue;

    const dictRelationship = normalizeRelationship(entryLink.relationship || {});
    const dictExplicit = !isImplicitRelationship(dictRelationship);

    merges.set(entryLink.canonicalKey, {
      canonicalKey: entryLink.canonicalKey,
      entry: entryLink.entry,
      twins: twins.map((twin) => {
        const personalEdge = personalEdgeFor(item, twin);
        const personalExplicit = Boolean(
          personalEdge && !isImplicitRelationship(personalEdge.relationship)
        );
        const conflict = dictExplicit && personalExplicit &&
          relationshipSignature(dictRelationship) !== relationshipSignature(personalEdge.relationship)
          ? {
              candidates: [
                { source: "dictionary", explicit: true, relationship: dictRelationship },
                { source: "personal", explicit: true, relationship: personalEdge.relationship },
              ],
            }
          : null;
        return {
          twin,
          alreadyLinked: personalEdge?.direction || null,
          dictRelationship,
          personalRelationship: personalEdge?.relationship || null,
          conflict,
        };
      }),
    });
  }

  return merges;
}
