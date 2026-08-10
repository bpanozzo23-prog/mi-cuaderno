/**
 * Shared mechanics for the Page structures that are intentionally limited to one root level and
 * one child level. Domain records keep their own IDs and content fields; this module knows only
 * about `id`, `parentId`, and `name`.
 */

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const isNonblankString = (value) => typeof value === "string" && value.trim() !== "";

export function outlineHierarchy(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const roots = list.filter((row) => row?.parentId == null);
  const childrenByParent = new Map(roots.map((row) => [row.id, []]));
  const unplaced = [];
  for (const row of list) {
    if (row?.parentId == null) continue;
    const siblings = childrenByParent.get(row.parentId);
    if (siblings) siblings.push(row);
    else unplaced.push(row);
  }
  return { roots, childrenByParent, unplaced };
}

/** Stable depth-first storage: every root is followed by its children; invalid rows are retained. */
export function canonicalOutline(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const { roots, childrenByParent, unplaced } = outlineHierarchy(list);
  return [
    ...roots.flatMap((root) => [root, ...(childrenByParent.get(root.id) || [])]),
    ...unplaced,
  ];
}

export function outlineCounts(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  return {
    sections: list.filter((row) => row?.parentId == null).length,
    subsections: list.filter((row) => row?.parentId != null).length,
  };
}

export function outlineBreadcrumb(row, rows = []) {
  if (!row) return "";
  if (row.parentId == null) return row.name || "";
  const parent = (rows || []).find((candidate) => candidate?.id === row.parentId);
  return parent ? `${parent.name} › ${row.name}` : row.name || "";
}

export function outlineSiblingState(rows, rowId) {
  const list = Array.isArray(rows) ? rows : [];
  const index = list.findIndex((row) => row?.id === rowId);
  const row = list[index];
  if (!row) return { index: -1, indexes: [], position: -1 };
  const parentId = row.parentId ?? null;
  const indexes = list.flatMap((candidate, candidateIndex) => (
    (candidate?.parentId ?? null) === parentId ? [candidateIndex] : []
  ));
  return { index, indexes, position: indexes.indexOf(index) };
}

export function moveOutlineSibling(rows, rowId, offset) {
  const list = Array.isArray(rows) ? rows : [];
  const { indexes, position } = outlineSiblingState(list, rowId);
  const targetPosition = position + offset;
  if (position < 0 || targetPosition < 0 || targetPosition >= indexes.length) return list;
  const next = [...list];
  const index = indexes[position];
  const targetIndex = indexes[targetPosition];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return canonicalOutline(next);
}

export function reparentOutlineRow(rows, rowId, requestedParentId) {
  const list = Array.isArray(rows) ? rows : [];
  const parentId = requestedParentId || null;
  const row = list.find((candidate) => candidate?.id === rowId);
  if (!row || (row.parentId ?? null) === parentId) return list;
  if (parentId !== null) {
    const parent = list.find((candidate) => candidate?.id === parentId);
    if (!parent || parent.id === rowId || parent.parentId != null) return list;
  }
  if (parentId !== null && list.some((candidate) => candidate?.parentId === rowId)) return list;
  return canonicalOutline(list.map((candidate) => candidate?.id === rowId
    ? { ...candidate, parentId }
    : candidate));
}

export function outlineNamesValid(rows, normalizeName) {
  const seenByParent = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = normalizeName(row?.name);
    if (!name) return false;
    const parentId = row?.parentId ?? null;
    const seen = seenByParent.get(parentId) || new Set();
    if (seen.has(name)) return false;
    seen.add(name);
    seenByParent.set(parentId, seen);
  }
  return true;
}

/**
 * Deeply validate the shared one-level contract while allowing each domain to supply its own ID
 * namespace, error path, global-ID set, and schema-era parent-field rule.
 */
export function validateOneLevelOutline(rows, {
  where,
  isId,
  idLabel,
  seenIds = new Set(),
  normalizeName,
  parentMode = "required",
} = {}) {
  const errors = [];
  if (!Array.isArray(rows)) {
    errors.push(`${where} must be an array`);
    return errors;
  }

  const localById = new Map();
  rows.forEach((row, index) => {
    const rowWhere = `${where}[${index}]`;
    if (!isPlainObject(row)) {
      errors.push(`${rowWhere} is not an object`);
      return;
    }
    if (!isId(row.id)) errors.push(`${rowWhere}.id must be a ${idLabel} UUID`);
    else {
      if (seenIds.has(row.id)) errors.push(`Duplicate ${idLabel} id "${row.id}".`);
      else seenIds.add(row.id);
      if (!localById.has(row.id)) localById.set(row.id, row);
    }

    if (parentMode === "required") {
      if (row.parentId !== null && !isId(row.parentId)) {
        errors.push(`${rowWhere}.parentId must be null or a ${idLabel} UUID`);
      }
    } else if (Object.prototype.hasOwnProperty.call(row, "parentId")) {
      errors.push(`${rowWhere}.parentId is not part of this schema`);
    }

    if (!isNonblankString(row.name)) errors.push(`${rowWhere}.name must be a nonblank string`);
    else if (row.name !== row.name.trim()) errors.push(`${rowWhere}.name must be trimmed`);
  });

  const seenNamesByParent = new Map();
  rows.forEach((row, index) => {
    if (!isPlainObject(row) || !isNonblankString(row.name)) return;
    const rowWhere = `${where}[${index}]`;
    const parentKey = parentMode === "required" ? row.parentId : null;
    const seenNames = seenNamesByParent.get(parentKey) || new Set();
    const nameKey = normalizeName(row.name);
    if (seenNames.has(nameKey)) {
      errors.push(parentMode === "required"
        ? `${where} must have unique names among siblings`
        : `${where} must have unique names`);
    } else {
      seenNames.add(nameKey);
      seenNamesByParent.set(parentKey, seenNames);
    }

    if (parentMode !== "required" || row.parentId === null || !isId(row.parentId)) return;
    if (row.parentId === row.id) {
      errors.push(`${rowWhere}.parentId must not point to the section itself`);
      return;
    }
    const parent = localById.get(row.parentId);
    if (!parent) errors.push(`${rowWhere}.parentId must point to a section on the same page`);
    else if (parent.parentId !== null) {
      errors.push(`${rowWhere}.parentId would exceed the one subsection level`);
    }
  });

  if (parentMode === "required") {
    let hasCycle = false;
    for (const row of rows) {
      if (!isPlainObject(row) || !isId(row.id)) continue;
      const path = new Set();
      let current = row;
      while (current && current.parentId !== null && isId(current.parentId)) {
        if (path.has(current.id)) {
          hasCycle = true;
          break;
        }
        path.add(current.id);
        current = localById.get(current.parentId);
      }
      if (hasCycle) break;
    }
    if (hasCycle) errors.push(`${where} must not contain a parent cycle`);
  }
  return errors;
}
