import { isHttpSourceUrl, PAGE_FOCUSES } from "./pageKinds.js";

/**
 * The Android share sheet hands the app whatever the sending app chose to put in each field,
 * and the split is unreliable: Chrome shares a page as `text` holding the bare URL, other apps
 * use `url`, chat apps send prose. The rule here stays deliberately narrow — it is a URL share
 * only when `share_url` validates or the ENTIRE trimmed `share_text` is one http(s) URL.
 * Prose that merely contains a link is still a text share: the owner shared it for the words.
 */
export function parseSharePayload(search) {
  let params;
  try {
    params = new URLSearchParams(search || "");
  } catch {
    return null;
  }
  const title = (params.get("share_title") || "").trim();
  const text = (params.get("share_text") || "").trim();
  const url = (params.get("share_url") || "").trim();

  if (isHttpSourceUrl(url)) return { kind: "url", url, title };
  if (isHttpSourceUrl(text)) return { kind: "url", url: text, title };
  if (text !== "") return { kind: "text", text };
  // A share carrying only a title still arrived on purpose; searching it beats dropping it.
  if (title !== "") return { kind: "text", text: title };
  return null;
}

/**
 * Creation seed for a URL share: the Source-notebook starter shape (pageSeedFromRecipe's
 * "source" family) with no format preselected — a shared link may be an article, a video,
 * or a podcast, and that choice stays the owner's. `sourceUrl` and `title` ride along for
 * AddSheet to prefill; nothing is saved until the owner presses Create.
 */
export function sourceShareStarter({ url, title = "" }) {
  return {
    pageFocus: PAGE_FOCUSES.source,
    collectionEnabled: true,
    sourceEnabled: true,
    grammarEnabled: false,
    noteSections: [],
    groupNames: [],
    sectionNames: [],
    sourceFormat: "",
    sourceUrl: url,
    title,
  };
}

/**
 * Creation seed for "this shared video IS a new grammar topic": the Grammar-guide starter
 * shape (pageSeedFromRecipe's grammar branch) with no recipe's sections preselected — the
 * owner shapes the guide after watching. The video rides along as a media link rather than a
 * Source identity URL, because a Grammar guide has no source identity of its own.
 */
export function grammarShareStarter({ url, title = "" }) {
  return {
    pageFocus: PAGE_FOCUSES.grammar,
    collectionEnabled: true,
    sourceEnabled: false,
    grammarEnabled: true,
    noteSections: [],
    groupNames: [],
    sectionNames: [],
    sourceFormat: "",
    mediaLinks: [{ url, label: title }],
    title,
  };
}
