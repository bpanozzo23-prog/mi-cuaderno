/**
 * The two page-role glyphs lucide has no honest equivalent for (owner-picked 2026-08-28).
 *
 * Both replace a lucide icon that was saying the wrong thing about its family:
 *
 * - `Braces` is a code-editor mark, and everything around it on a card is desk stationery — the
 *   manila folder, the die-cut edge, the ruled page. A Grammar page is nested sentence structure,
 *   so it wears a sentence-diagram branch instead: one stem, two descending branches. Two rather
 *   than three, because at the 17px the folder edge renders, three legs across this span merge
 *   into a blur.
 * - `Library` drew four spines with nothing under them, so they read as bars rather than books —
 *   and that is the same read as `BarChart3` on the Repaso tab, in persistent chrome, on the same
 *   screen. The shelf line is the whole fix; the spines overrun it by a hair so their round caps
 *   sit on the shelf rather than hovering above it.
 *
 * They take lucide's props contract — `size`, `strokeWidth`, `color`, and anything else passed
 * through — because `PAGE_ROLE_META` entries are consumed interchangeably with the lucide icons
 * beside them (`PageFolderTab`, `PageContextSummary`, and `CollectionPage`'s kicker pill). Colour
 * normally arrives as `currentColor` from the parent, exactly as the lucide icons take it.
 */
function RoleGlyph({ size = 24, strokeWidth = 2, color = "currentColor", children, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Grammar: a sentence-diagram branch — one stem, one crossbar, two constituents. */
export function SentenceTree(props) {
  return (
    <RoleGlyph {...props}>
      <path d="M12 6v5" />
      <path d="M6 11h12" />
      <path d="M6 11v6" />
      <path d="M18 11v6" />
    </RoleGlyph>
  );
}

/** Vocabulary: three book spines, one leaning, resting on a shelf. */
export function Shelf(props) {
  return (
    <RoleGlyph {...props}>
      <path d="M5 5v14" />
      <path d="M10 5v14" />
      <path d="m15 6 4 13" />
      <path d="M3 20.5h18" />
    </RoleGlyph>
  );
}
