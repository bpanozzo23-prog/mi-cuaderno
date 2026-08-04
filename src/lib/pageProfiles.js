/**
 * Temporary schema-v4 compatibility surface. New code should import the composable-page helpers
 * from pageKinds.js; these aliases keep older components buildable during the Phase 7 refactor.
 */
import { isJournalPage } from "./pageKinds.js";

export * from "./pageKinds.js";

export const PAGE_PROFILES = Object.freeze({
  general: "general",
  collection: "collection",
});

export const PAGE_KINDS = Object.freeze({
  general: "general",
  collection: "collection",
  journal: "journal",
});

export function isPageProfile(profile) {
  return profile === PAGE_PROFILES.general || profile === PAGE_PROFILES.collection;
}

/**
 * Legacy display-kind derivation used until Collection/General consumers move to pageFocus.
 * Enabled Vocabulary wins; otherwise a dated page with no enabled structures is a Journal entry.
 */
export function effectivePageKind(page) {
  if (page?.collection?.enabled === true || page?.pageProfile === PAGE_PROFILES.collection) {
    return PAGE_KINDS.collection;
  }
  if (isJournalPage(page) || (page?.pageDate && !page?.source && !page?.grammar)) {
    return PAGE_KINDS.journal;
  }
  return PAGE_KINDS.general;
}
