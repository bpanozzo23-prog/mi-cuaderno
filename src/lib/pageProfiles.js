/** The only stored page profiles in schema v3. */
export const PAGE_PROFILES = Object.freeze({
  general: "general",
  collection: "collection",
});

/** Effective kinds include Journal, which remains a dated General page rather than a profile. */
export const PAGE_KINDS = Object.freeze({
  general: "general",
  collection: "collection",
  journal: "journal",
});

export const PINNED_PAGE_IDS_PREF = "pinnedPageIds";

export function isPageProfile(profile) {
  return profile === PAGE_PROFILES.general || profile === PAGE_PROFILES.collection;
}

/**
 * Collection wins over a date. A dated General (including a legacy page with no profile yet)
 * remains a Journal entry, preserving the page behavior that predates stored profiles.
 */
export function effectivePageKind(page) {
  if (page?.pageProfile === PAGE_PROFILES.collection) return PAGE_KINDS.collection;
  if (page?.pageDate) return PAGE_KINDS.journal;
  return PAGE_KINDS.general;
}
