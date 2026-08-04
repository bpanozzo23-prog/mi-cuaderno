/**
 * Relationship annotations are sparse descriptions of ordinary links. `linkedKeys[]` remains
 * the authority for whether a connection exists; nothing in this module creates connectivity.
 *
 * A directional definition's `forwardLabel` belongs to the endpoint named by `subject` on the
 * stored annotation. The other endpoint receives `inverseLabel`. Symmetric relationships always
 * normalize to `subject: "owner"` because their two perspectives are identical.
 */

export const RELATIONSHIP_DEFINITIONS = Object.freeze([
  Object.freeze({
    type: "similar_meaning",
    forwardLabel: "Similar meaning",
    inverseLabel: "Similar meaning",
    directional: false,
  }),
  Object.freeze({
    type: "contrast",
    forwardLabel: "Contrast",
    inverseLabel: "Contrast",
    directional: false,
  }),
  Object.freeze({
    type: "often_confused",
    forwardLabel: "Often confused",
    inverseLabel: "Often confused",
    directional: false,
  }),
  Object.freeze({
    type: "variant",
    forwardLabel: "Variant",
    inverseLabel: "Variant",
    directional: false,
  }),
  Object.freeze({
    type: "explained_by",
    forwardLabel: "Explained by",
    inverseLabel: "Explains",
    directional: true,
  }),
  Object.freeze({
    type: "found_in",
    forwardLabel: "Found in",
    inverseLabel: "Contains",
    directional: true,
  }),
  Object.freeze({
    type: "related",
    forwardLabel: "Related",
    inverseLabel: "Related",
    directional: false,
  }),
]);

export const RELATIONSHIP_TYPES = Object.freeze(
  RELATIONSHIP_DEFINITIONS.map((definition) => definition.type)
);

export const RELATIONSHIP_SUBJECTS = Object.freeze(["owner", "target"]);

const DEFINITIONS_BY_TYPE = new Map(
  RELATIONSHIP_DEFINITIONS.map((definition) => [definition.type, definition])
);

/** Native-select-ready choices, including both perspectives for directional relationships. */
export const RELATIONSHIP_OPTIONS = Object.freeze(
  RELATIONSHIP_DEFINITIONS.flatMap((definition) => {
    const forward = Object.freeze({
      value: `${definition.type}:owner`,
      type: definition.type,
      subject: "owner",
      label: definition.forwardLabel,
    });
    if (!definition.directional) return [forward];
    return [
      forward,
      Object.freeze({
        value: `${definition.type}:target`,
        type: definition.type,
        subject: "target",
        label: definition.inverseLabel,
      }),
    ];
  })
);

export const isRelationshipType = (type) => DEFINITIONS_BY_TYPE.has(type);

export const isDirectionalRelationshipType = (type) =>
  DEFINITIONS_BY_TYPE.get(type)?.directional === true;

/**
 * Normalizes owner input without imposing a prose length limit. Missing input derives the
 * default Related relationship. Invalid enums and non-text notes are rejected before storage.
 */
export function normalizeRelationship(relationship = {}) {
  const source = typeof relationship === "string" ? { type: relationship } : relationship || {};
  const type = source.type ?? "related";
  const definition = DEFINITIONS_BY_TYPE.get(type);
  if (!definition) throw new Error(`Unknown relationship type: ${type}`);

  if (source.note != null && typeof source.note !== "string") {
    throw new Error("A connection note must be plain text.");
  }
  const note = String(source.note || "").trim();

  let subject = "owner";
  if (definition.directional) {
    subject = source.subject ?? "owner";
    if (!RELATIONSHIP_SUBJECTS.includes(subject)) {
      throw new Error("A directional relationship subject must be owner or target.");
    }
  }

  return { type, subject, note };
}

export const isImplicitRelationship = (relationship) => {
  const normalized = normalizeRelationship(relationship);
  return normalized.type === "related" && normalized.note === "";
};

/** Returns null for the implicit Related/blank representation so annotations stay sparse. */
export function makeLinkAnnotation(targetKey, relationship) {
  const normalized = normalizeRelationship(relationship);
  if (isImplicitRelationship(normalized)) return null;
  return { targetKey, ...normalized };
}

export function annotationForTarget(item, targetKey) {
  return (item?.linkAnnotations || []).find((annotation) => annotation?.targetKey === targetKey) || null;
}

export function relationshipForTarget(item, targetKey) {
  return normalizeRelationship(annotationForTarget(item, targetKey) || {});
}

/**
 * Flips which endpoint receives a directional relationship's forward label. Used both when a
 * backlink editor writes through to the physical owner and when Collection promotion moves an
 * edge to the opposite endpoint.
 */
export function reorientRelationship(relationship) {
  const normalized = normalizeRelationship(relationship);
  if (!isDirectionalRelationshipType(normalized.type)) return normalized;
  return {
    ...normalized,
    subject: normalized.subject === "owner" ? "target" : "owner",
  };
}

/** Label from the physical link owner's or target's perspective. */
export function relationshipLabel(relationship, perspective = "owner") {
  if (!RELATIONSHIP_SUBJECTS.includes(perspective)) {
    throw new Error("Relationship perspective must be owner or target.");
  }
  const normalized = normalizeRelationship(relationship);
  const definition = DEFINITIONS_BY_TYPE.get(normalized.type);
  if (!definition.directional || normalized.subject === perspective) return definition.forwardLabel;
  return definition.inverseLabel;
}

/** Parse one of RELATIONSHIP_OPTIONS' stable values while preserving a separately edited note. */
export function relationshipFromOption(value, note = "") {
  const option = RELATIONSHIP_OPTIONS.find((candidate) => candidate.value === value);
  if (!option) throw new Error(`Unknown relationship option: ${value}`);
  return normalizeRelationship({ type: option.type, subject: option.subject, note });
}

export function relationshipOptionValue(relationship) {
  const normalized = normalizeRelationship(relationship);
  return `${normalized.type}:${normalized.subject}`;
}

const edgeCandidates = (subjectKey, otherKey, byId) => {
  const subject = byId.get(subjectKey);
  const other = byId.get(otherKey);
  const candidates = [];
  if ((subject?.linkedKeys || []).includes(otherKey)) {
    candidates.push({ owner: subject, targetKey: otherKey });
  }
  if ((other?.linkedKeys || []).includes(subjectKey)) {
    candidates.push({ owner: other, targetKey: subjectKey });
  }
  // A schema-v4 pair has at most one annotation. When tolerating a reciprocal legacy edge,
  // prefer its sole explicit annotation over an implicit copy before falling back to direction.
  return candidates.find(({ owner, targetKey }) => annotationForTarget(owner, targetKey)) || candidates[0];
};

const connectionRow = ({ subjectKey, edge, kind, item = null, entry = null }) => {
  const stored = relationshipForTarget(edge.owner, edge.targetKey);
  const perspective = edge.owner.id === subjectKey ? "owner" : "target";
  const relationship = perspective === "owner" ? stored : reorientRelationship(stored);
  const key = item?.id || entry?.id || (perspective === "owner" ? edge.targetKey : edge.owner.id);
  return {
    kind,
    key,
    ...(item ? { item } : {}),
    ...(entry ? { entry } : {}),
    ownerKey: edge.owner.id,
    targetKey: edge.targetKey,
    type: relationship.type,
    subject: relationship.subject,
    note: relationship.note,
    label: relationshipLabel(relationship, "owner"),
    relationship,
  };
};

/**
 * Derives one conceptual connection per target from either endpoint. `subject` may be a personal
 * item or a bare dictionary key. `items` should use the notebook's desired display order;
 * resolved dictionary entries follow in their supplied order. Missing entries remain hidden so
 * an uninstalled dictionary is never mislabeled as orphaned by this database-free helper.
 */
export function connectionsFor(subject, items = [], entries = []) {
  const subjectKey = typeof subject === "string" ? subject : subject?.id;
  if (!subjectKey) return [];

  const personalItems = [...items];
  if (subject && typeof subject === "object" && !personalItems.some((item) => item.id === subject.id)) {
    personalItems.push(subject);
  }
  const byId = new Map(personalItems.map((item) => [item.id, item]));
  const subjectItem = byId.get(subjectKey);
  const rows = [];

  for (const item of personalItems) {
    if (!item || item.id === subjectKey) continue;
    const edge = edgeCandidates(subjectKey, item.id, byId);
    if (!edge) continue;
    rows.push(connectionRow({ subjectKey, edge, kind: "item", item }));
  }

  if (subjectItem) {
    const outgoing = new Set(subjectItem.linkedKeys || []);
    const seenEntries = new Set();
    for (const entry of entries) {
      if (!entry?.id || seenEntries.has(entry.id) || !outgoing.has(entry.id)) continue;
      seenEntries.add(entry.id);
      rows.push(connectionRow({
        subjectKey,
        edge: { owner: subjectItem, targetKey: entry.id },
        kind: "entry",
        entry,
      }));
    }
  }

  return rows;
}

const relationshipGroupKey = (relationship) => {
  const normalized = normalizeRelationship(relationship);
  return isDirectionalRelationshipType(normalized.type)
    ? `${normalized.type}:${normalized.subject}`
    : normalized.type;
};

/** Groups a mixed item/dictionary list in the fixed approved order, with Related last. */
export function groupConnections(connections = []) {
  const buckets = new Map();
  for (const connection of connections) {
    const key = relationshipGroupKey(connection.relationship || connection);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(connection);
  }

  const groups = [];
  for (const definition of RELATIONSHIP_DEFINITIONS) {
    const subjects = definition.directional ? ["owner", "target"] : ["owner"];
    for (const subject of subjects) {
      const relationship = normalizeRelationship({ type: definition.type, subject });
      const key = relationshipGroupKey(relationship);
      const rows = buckets.get(key);
      if (!rows?.length) continue;
      groups.push({
        key,
        name: relationshipLabel(relationship, "owner"),
        type: definition.type,
        subject,
        label: relationshipLabel(relationship, "owner"),
        rows,
      });
    }
  }
  return groups;
}
