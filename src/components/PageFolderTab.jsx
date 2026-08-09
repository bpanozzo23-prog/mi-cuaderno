import { PAGE_ROLE_META } from "./pageRoleMeta.js";

/**
 * The folder tab, carrying the page's role badge.
 *
 * `role` is the first entry of `enabledPageRoles(page)` — the page's own focus. Only that one is
 * named: a page's secondary structures are already legible in the count line beneath the title, so
 * repeating them here is the clutter this tab replaced. A page with no role to name (a Diario
 * entry in the mixed list) gets the bare tab.
 *
 * Must render inside the card's open-page button so the tab hit-tests to opening the page.
 */
export default function PageFolderTab({ role = null }) {
  const detail = role ? PAGE_ROLE_META[role] : null;
  const RoleIcon = detail?.icon;

  return (
    <span className="page-folder-tab">
      {detail && (
        /* No pill: on a tab tinted with the role's own family the pale pill dissolves into its
           background, so the label sits directly on the tab in the family ink. */
        <span
          className="inline-flex items-center gap-1 px-1 py-1 text-xs font-semibold"
          style={{ color: detail.color }}
        >
          <RoleIcon size={13} /> {detail.label}
        </span>
      )}
    </span>
  );
}
