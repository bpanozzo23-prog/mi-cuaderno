import { PAGE_ROLE_META } from "./pageRoleMeta.js";

/**
 * The folder tab, carrying the page's role badge down the card's left edge.
 *
 * `role` is the first entry of `enabledPageRoles(page)` — the page's own focus. Only that one is
 * named: a page's secondary structures are already legible in the count line beneath the title, so
 * repeating them here is the clutter this tab replaced. A page with no role to name (a Diario
 * entry in the mixed list) gets the bare band.
 *
 * The label is present but visually hidden (owner-picked 2026-08-28). The band is 38px wide, which
 * fits the glyph and not the word, and rotating the word would have made it slower to read for
 * everyone and worse for a screen reader. Colour plus icon carries it visually — redundant coding
 * rather than colour alone — while the name still reaches assistive technology and the card's
 * accessible name is unchanged.
 *
 * Must render inside the card's open-page button so the tab hit-tests to opening the page.
 */
export default function PageFolderTab({ role = null }) {
  const detail = role ? PAGE_ROLE_META[role] : null;
  const RoleIcon = detail?.icon;

  return (
    <span className="page-folder-tab" style={detail ? { color: detail.color } : undefined}>
      {detail && (
        <>
          <RoleIcon size={17} />
          <span className="sr-only">{detail.label}</span>
        </>
      )}
    </span>
  );
}
