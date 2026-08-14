import { resolveEntry, isDictKey, dictionaryInstalled, installedMeta } from "./ref/entries.js";
import { db } from "./db.js";
import { isUserKey } from "../lib/ids.js";
import {
  annotationForTarget,
  isImplicitRelationship,
  makeLinkAnnotation,
  normalizeRelationship,
  reorientRelationship,
} from "../lib/relationships.js";

/**
 * The section 5 seam for ordinary dictionary LINKS. `dictKey` attachments deliberately do not
 * pass through here: an attachment and a typed ordinary connection remain separate concepts.
 *
 * An alias normally rewrites the physical key and its sparse annotation together. A rebuild can,
 * however, reveal that both an old key and its canonical replacement were linked and annotated.
 * If those explicit annotations disagree, automatically choosing either would discard owner data.
 * That one canonical group therefore stays byte-for-byte untouched until the owner resolves it.
 */

const relationshipSignature = (relationship) => {
  const normalized = normalizeRelationship(relationship);
  return JSON.stringify([normalized.type, normalized.subject, normalized.note]);
};

function candidateFor(item, rawKey) {
  const stored = annotationForTarget(item, rawKey);
  const implicit = !stored || isImplicitRelationship(stored);
  return {
    rawKey,
    explicit: !implicit,
    annotation: implicit ? null : { ...stored },
    relationship: normalizeRelationship(implicit ? {} : stored),
  };
}

const distinctExplicitRelationships = (candidates) => {
  const bySignature = new Map();
  for (const candidate of candidates) {
    if (!candidate.explicit) continue;
    const signature = relationshipSignature(candidate.relationship);
    if (!bySignature.has(signature)) bySignature.set(signature, candidate.relationship);
  }
  return [...bySignature.values()];
};

function replaceKeys(linkedKeys, rawKeys, canonicalKey) {
  const raw = new Set(rawKeys);
  let inserted = false;
  const next = [];
  for (const key of linkedKeys || []) {
    if (!raw.has(key)) {
      next.push(key);
      continue;
    }
    if (!inserted) {
      next.push(canonicalKey);
      inserted = true;
    }
  }
  return next;
}

function replaceAnnotations(linkAnnotations, rawKeys, canonicalKey, relationship) {
  const raw = new Set(rawKeys);
  const replacement = makeLinkAnnotation(canonicalKey, relationship);
  let inserted = false;
  const next = [];

  for (const annotation of linkAnnotations || []) {
    if (!raw.has(annotation?.targetKey)) {
      next.push(annotation);
      continue;
    }
    if (!inserted && replacement) {
      next.push(replacement);
      inserted = true;
    }
  }
  if (!inserted && replacement) next.push(replacement);
  return next;
}

const arraysEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Applies alias plans to one current row. The callback is intentionally synchronous so it can run
 * inside a single personal-database transaction without crossing into the reference database.
 */
function applyAliasPlans(item, plans) {
  let linkedKeys = [...(item.linkedKeys || [])];
  let linkAnnotations = [...(item.linkAnnotations || [])];

  for (const plan of plans) {
    const stillLinked = plan.rawKeys.filter((key) => linkedKeys.includes(key));
    if (!stillLinked.length) continue;

    const candidates = stillLinked.map((key) => candidateFor({ ...item, linkAnnotations }, key));
    const explicit = distinctExplicitRelationships(candidates);
    // A conflict that appeared after the initial read is still owner data: leave this group alone.
    if (explicit.length > 1 && !plan.forceRelationship) continue;

    const relationship = plan.forceRelationship
      ? normalizeRelationship(plan.forceRelationship)
      : explicit[0] || normalizeRelationship();
    linkedKeys = replaceKeys(linkedKeys, stillLinked, plan.canonicalKey);
    linkAnnotations = replaceAnnotations(
      linkAnnotations,
      stillLinked,
      plan.canonicalKey,
      relationship
    );
  }

  return { linkedKeys, linkAnnotations };
}

async function persistAliasPlans(itemId, plans) {
  if (!itemId || !plans.length) return false;
  let changed = false;
  await db.transaction("rw", db.items, async () => {
    const current = await db.items.get(itemId);
    if (!current) return;
    const next = applyAliasPlans(current, plans);
    changed = !arraysEqual(current.linkedKeys || [], next.linkedKeys)
      || !arraysEqual(current.linkAnnotations || [], next.linkAnnotations);
    if (changed) {
      // Directly update the two connection fields. `updateItem` intentionally stamps recency and
      // can log an edit; alias repair is reference-data maintenance and must do neither.
      await db.items.update(itemId, next);
    }
  });
  return changed;
}

const groupResolvedRows = (rows) => {
  const groups = new Map();
  for (const row of rows) {
    if (!row.entry) continue;
    if (!groups.has(row.entry.id)) groups.set(row.entry.id, { entry: row.entry, rows: [] });
    groups.get(row.entry.id).rows.push(row);
  }
  return [...groups.values()];
};

/**
 * Resolves, deduplicates for display, and safely repairs the dictionary keys in one item.
 *
 * Existing callers may keep using `entries`, `orphans`, and `rewritten`. `entryLinks`,
 * `orphanDetails`, and `conflicts` carry the raw-key and relationship information needed by the
 * typed-connection UI without changing dictionary entry objects.
 */
export async function resolveLinkedKeys(item) {
  const keys = (item?.linkedKeys || []).filter(isDictKey);
  if (!keys.length || !(await dictionaryInstalled())) {
    return {
      entries: [],
      entryLinks: [],
      orphans: [],
      orphanDetails: [],
      conflicts: [],
      rewritten: false,
    };
  }

  // Prefer the current stored row over a render-time snapshot before deciding what may be
  // rewritten. A detached plain object still resolves read-only, which keeps this helper useful in
  // focused tests and previews.
  const stored = item?.id ? await db.items.get(item.id) : null;
  const source = stored || item;
  const sourceKeys = (source?.linkedKeys || []).filter(isDictKey);
  const resolved = await Promise.all(
    sourceKeys.map(async (key) => ({ key, ...(await resolveEntry(key)) }))
  );

  const orphanDetails = [];
  const seenOrphans = new Set();
  for (const row of resolved) {
    if (row.entry || seenOrphans.has(row.key)) continue;
    seenOrphans.add(row.key);
    orphanDetails.push({ key: row.key, ...candidateFor(source, row.key) });
  }

  const entries = [];
  const entryLinks = [];
  const conflicts = [];
  const plans = [];

  for (const group of groupResolvedRows(resolved)) {
    const rawKeys = [...new Set(group.rows.map((row) => row.key))];
    const candidates = rawKeys.map((key) => candidateFor(source, key));
    const explicit = distinctExplicitRelationships(candidates);
    const hasAlias = group.rows.some((row) => Boolean(row.resolvedFrom));
    const conflict = hasAlias && explicit.length > 1
      ? {
          canonicalKey: group.entry.id,
          entry: group.entry,
          rawKeys,
          candidates,
        }
      : null;

    entries.push(group.entry); // exactly one visible entry per canonical dictionary id
    entryLinks.push({
      canonicalKey: group.entry.id,
      entry: group.entry,
      rawKeys,
      relationship: conflict ? null : explicit[0] || normalizeRelationship(),
      conflict,
    });

    if (conflict) {
      conflicts.push(conflict);
    } else if (hasAlias) {
      plans.push({
        canonicalKey: group.entry.id,
        rawKeys,
      });
    }
  }

  const rewritten = await persistAliasPlans(source?.id, plans);
  return {
    entries,
    entryLinks,
    orphans: orphanDetails.map(({ key }) => key),
    orphanDetails,
    conflicts,
    rewritten,
  };
}

/**
 * Canonicalizes one unresolved alias group after the owner has chosen or edited its surviving
 * relationship. The chosen metadata replaces every raw candidate in the same transaction as the
 * physical-key deduplication, while timestamps and activity events stay untouched.
 */
export async function resolveLinkedEntryConflict(itemId, canonicalKey, relationship) {
  if (!isDictKey(canonicalKey)) throw new Error("A canonical dictionary key is required.");
  if (!(await dictionaryInstalled())) {
    return { resolved: false, reason: "not_installed", item: await db.items.get(itemId) };
  }

  const item = await db.items.get(itemId);
  if (!item) throw new Error("The item containing this connection no longer exists.");
  const rows = await Promise.all(
    (item.linkedKeys || []).filter(isDictKey).map(async (key) => ({
      key,
      ...(await resolveEntry(key)),
    }))
  );
  const rawKeys = [...new Set(
    rows.filter((row) => row.entry?.id === canonicalKey).map((row) => row.key)
  )];
  if (!rawKeys.length) throw new Error("No matching dictionary connection remains to resolve.");

  const changed = await persistAliasPlans(itemId, [{
    canonicalKey,
    rawKeys,
    forceRelationship: normalizeRelationship(relationship),
  }]);
  return { resolved: changed, canonicalKey, item: await db.items.get(itemId) };
}

/**
 * Owner-triggered "personal twin" merge: re-points one ordinary dictionary connection at the
 * personal item attached to the same entry. Nothing automatic calls this — resolveLinkedKeys
 * still never treats a dictKey attachment as an ordinary link — and it keeps the same manners as
 * resolveLinkedEntryConflict: only `linkedKeys`/`linkAnnotations` change, inside one personal
 * transaction, with no `updatedAt` stamp and no event. The twin's attachment is untouched.
 *
 * Links are stored once, so the personal edge may already exist on either row. An outgoing edge
 * (the item already links the twin) means the dictionary keys simply disappear; an incoming edge
 * (the twin links the item) must NOT gain a reciprocal copy, so the surviving annotation lands
 * on the twin's row, reoriented into its perspective. If the dictionary connection and the
 * existing personal edge carry conflicting explicit annotations and no survivor was passed,
 * nothing is written and the candidates come back for the owner to choose — the same
 * owner-data rule the alias-conflict seam enforces.
 */
export async function mergeLinkedEntryIntoTwin(itemId, canonicalKey, twinId, relationship = undefined) {
  if (!isDictKey(canonicalKey)) throw new Error("A canonical dictionary key is required.");
  if (!isUserKey(twinId)) throw new Error("A personal twin key is required.");
  if (twinId === itemId) throw new Error("A connection cannot merge into its own item.");
  if (!(await dictionaryInstalled())) {
    return { merged: false, reason: "not_installed", item: await db.items.get(itemId) };
  }

  const item = await db.items.get(itemId);
  if (!item) throw new Error("The item containing this connection no longer exists.");
  const [twin, meta] = await Promise.all([db.items.get(twinId), installedMeta()]);
  const attached = twin?.type === "lexical" && twin.dictKey &&
    (twin.dictKey === canonicalKey || meta?.previousIds?.[twin.dictKey] === canonicalKey);
  if (!attached) throw new Error("That personal item is not attached to this dictionary entry.");

  // Reference reads stay outside the personal write transaction (the linkItems pattern).
  const resolved = await Promise.all(
    (item.linkedKeys || []).filter(isDictKey).map(async (key) => ({
      key,
      ...(await resolveEntry(key)),
    }))
  );
  const rawKeys = [...new Set(
    resolved.filter((row) => row.entry?.id === canonicalKey).map((row) => row.key)
  )];
  if (!rawKeys.length) throw new Error("No matching dictionary connection remains to merge.");

  let result;
  await db.transaction("rw", db.items, async () => {
    const current = await db.items.get(itemId);
    const twinRow = await db.items.get(twinId);
    if (!current || !twinRow) throw new Error("An endpoint of this merge no longer exists.");

    const stillLinked = rawKeys.filter((key) => (current.linkedKeys || []).includes(key));
    if (!stillLinked.length) throw new Error("No matching dictionary connection remains to merge.");

    const outgoing = (current.linkedKeys || []).includes(twinId);
    const incoming = (twinRow.linkedKeys || []).includes(itemId);

    // Every stored description of the conceptual connection, in the ITEM's perspective: the
    // dictionary raw keys plus the existing personal edge from whichever row physically owns it.
    const candidates = stillLinked.map((key) => candidateFor(current, key));
    if (outgoing || incoming) {
      const outgoingAnnotation = outgoing ? annotationForTarget(current, twinId) : null;
      const incomingAnnotation = incoming ? annotationForTarget(twinRow, itemId) : null;
      const stored = outgoingAnnotation
        || (incomingAnnotation && reorientRelationship(incomingAnnotation))
        || null;
      const implicit = !stored || isImplicitRelationship(stored);
      candidates.push({
        rawKey: twinId,
        explicit: !implicit,
        annotation: implicit ? null : { targetKey: twinId, ...normalizeRelationship(stored) },
        relationship: normalizeRelationship(implicit ? {} : stored),
      });
    }

    const explicit = distinctExplicitRelationships(candidates);
    if (explicit.length > 1 && !relationship) {
      result = { merged: false, reason: "conflict", candidates, item: current };
      return;
    }
    const survivor = relationship
      ? normalizeRelationship(relationship)
      : explicit[0] || normalizeRelationship();

    if (!outgoing && !incoming) {
      await db.items.update(itemId, {
        linkedKeys: replaceKeys(current.linkedKeys, stillLinked, twinId),
        linkAnnotations: replaceAnnotations(
          current.linkAnnotations, stillLinked, twinId, survivor
        ),
      });
    } else if (outgoing) {
      // The personal edge already exists on this row; the dictionary keys simply disappear and
      // the survivor becomes the pair's one annotation. A legacy reciprocal copy on the twin's
      // row keeps its physical key (mutation never repairs unrelated topology) but loses its
      // annotation copy, since valid v4 data has one annotation per conceptual pair.
      await db.items.update(itemId, {
        linkedKeys: (current.linkedKeys || []).filter((key) => !stillLinked.includes(key)),
        linkAnnotations: replaceAnnotations(
          (current.linkAnnotations || []).filter((annotation) => annotation?.targetKey !== twinId),
          stillLinked, twinId, survivor
        ),
      });
      if (incoming && annotationForTarget(twinRow, itemId)) {
        await db.items.update(twinId, {
          linkAnnotations: (twinRow.linkAnnotations || [])
            .filter((annotation) => annotation?.targetKey !== itemId),
        });
      }
    } else {
      // Incoming only: the twin owns the physical edge. The item just loses its dictionary
      // keys; the surviving annotation is written where the edge lives, reoriented.
      await db.items.update(itemId, {
        linkedKeys: (current.linkedKeys || []).filter((key) => !stillLinked.includes(key)),
        linkAnnotations: (current.linkAnnotations || [])
          .filter((annotation) => !stillLinked.includes(annotation?.targetKey)),
      });
      const twinAnnotation = makeLinkAnnotation(itemId, reorientRelationship(survivor));
      await db.items.update(twinId, {
        linkAnnotations: [
          ...(twinRow.linkAnnotations || []).filter((annotation) => annotation?.targetKey !== itemId),
          ...(twinAnnotation ? [twinAnnotation] : []),
        ],
      });
    }

    result = { merged: true, canonicalKey, twinId, item: await db.items.get(itemId) };
  });
  return result;
}
