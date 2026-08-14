import { isHttpSourceUrl, isJournalPage, PAGE_FOCUSES } from "./pageKinds.js";

const FOCUS_LABELS = {
  [PAGE_FOCUSES.notes]: "Notes",
  [PAGE_FOCUSES.vocabulary]: "Vocabulary",
  [PAGE_FOCUSES.source]: "Source",
  [PAGE_FOCUSES.grammar]: "Grammar",
};
const cachedIndexes = new WeakMap();

/** Exact identity is the saved string after edge whitespace only; case, query and hash remain. */
export function canonicalSharedSourceUrl(value) {
  const url = String(value || "").trim();
  return isHttpSourceUrl(url) ? url : "";
}

function presentationFor(item) {
  if (item?.type === "lexical") {
    return {
      heading: item.term || "Untitled entry",
      kindLabel: item.form === "phrase" ? "Phrase" : "Word",
      roleLabel: "",
      date: "",
    };
  }
  if (isJournalPage(item)) {
    return {
      heading: item.title || item.pageDate || "Diario entry",
      kindLabel: "Diario",
      roleLabel: "",
      date: item.pageDate || "",
    };
  }
  return {
    heading: item?.title || "Untitled page",
    kindLabel: "Page",
    roleLabel: FOCUS_LABELS[item?.pageFocus] || "Notes",
    date: item?.pageDate || "",
  };
}

/** Pure exact-URL index over personal media plus enabled Source-notebook primary URLs. */
export function buildSharedSourceIndex(items = []) {
  const index = new Map();
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    if (item?.type !== "lexical" && item?.type !== "page") continue;
    const urls = new Map();
    const add = (value, origin) => {
      const url = canonicalSharedSourceUrl(value);
      if (!url) return;
      if (!urls.has(url)) urls.set(url, new Set());
      urls.get(url).add(origin);
    };

    for (const media of item.mediaLinks || []) add(media?.url, "media");
    if (item.type === "page" && item.source?.enabled) add(item.source.url, "source");

    for (const [url, origins] of urls) {
      if (!index.has(url)) index.set(url, []);
      index.get(url).push({
        item,
        itemId: item.id,
        itemIndex,
        url,
        origins: [...origins],
        ...presentationFor(item),
      });
    }
  }
  return index;
}

function sharedSourceIndexFor(items) {
  if (!items || typeof items !== "object") return buildSharedSourceIndex(items);
  if (!cachedIndexes.has(items)) cachedIndexes.set(items, buildSharedSourceIndex(items));
  return cachedIndexes.get(items);
}

export function sharedSourcePeers(items = [], currentItemId, value) {
  const url = canonicalSharedSourceUrl(value);
  if (!url) return [];
  return (sharedSourceIndexFor(items).get(url) || []).filter((row) => row.itemId !== currentItemId);
}

export function sharedSourceOriginLabel(origins = []) {
  const source = origins.includes("source");
  const media = origins.includes("media");
  if (source && media) return "Source URL + media link";
  if (source) return "Source URL";
  return "Media link";
}
