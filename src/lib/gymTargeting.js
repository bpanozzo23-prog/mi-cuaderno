import { deriveCollection } from "./collections.js";

const exactSpanish = new Intl.Collator("es", { sensitivity: "variant" });

/** Derives only currently resolved, conjugable Saved targets from the in-memory notebook. */
export function deriveSavedGymTargeting(items = [], savedVerbs = []) {
  const itemById = new Map((items || []).map((item) => [item.id, item]));
  const eligibleKeys = new Set((savedVerbs || []).map((verb) => verb.itemKey).filter(Boolean));
  const eligibleItems = [...eligibleKeys].map((key) => itemById.get(key)).filter(Boolean);

  const tagMembers = new Map();
  for (const item of eligibleItems) {
    for (const tag of new Set(item.tags || [])) {
      if (typeof tag !== "string" || !tag) continue;
      const members = tagMembers.get(tag) || [];
      members.push(item.id);
      tagMembers.set(tag, members);
    }
  }
  const tags = [...tagMembers.entries()]
    .map(([tag, itemKeys]) => ({ tag, itemKeys, count: itemKeys.length }))
    .sort((a, b) => exactSpanish.compare(a.tag, b.tag));

  const pages = (items || [])
    .filter((page) => page.type === "page" && page.collection?.enabled === true)
    .map((page) => {
      const itemKeys = deriveCollection(page, items).memberKeys.filter((key) => eligibleKeys.has(key));
      return {
        id: page.id,
        title: page.title || "Untitled page",
        itemKeys,
        count: itemKeys.length,
      };
    })
    .filter((page) => page.count > 0)
    .sort((a, b) => exactSpanish.compare(a.title, b.title) || a.id.localeCompare(b.id));

  return { eligibleKeys: [...eligibleKeys], tags, pages };
}

export function isSavedGymSubsetValid(selection, targeting) {
  if (!selection || selection.kind === "all") return true;
  if (selection.kind === "tag") return targeting.tags.some((row) => row.tag === selection.value);
  if (selection.kind === "page") return targeting.pages.some((row) => row.id === selection.value);
  return false;
}

export function savedGymVerbsForSubset(savedVerbs = [], targeting, selection = { kind: "all", value: "" }) {
  if (!selection || selection.kind === "all") return savedVerbs;
  const row = selection.kind === "tag"
    ? targeting.tags.find((candidate) => candidate.tag === selection.value)
    : selection.kind === "page"
      ? targeting.pages.find((candidate) => candidate.id === selection.value)
      : null;
  if (!row) return savedVerbs;
  const allowed = new Set(row.itemKeys);
  return savedVerbs.filter((verb) => allowed.has(verb.itemKey));
}
