import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { C, SERIF } from "../theme.jsx";
import { sectionFamily } from "./pageRoleMeta.js";

/**
 * The spine's geometry, in one place so the line and the nodes hung on it cannot drift apart.
 * The line sits on the heading band's own left edge (owner-requested 2026-08-28), so the band and
 * everything under it share one left margin and the section reads as a single bracket down the
 * page. It was inset 10px before that, which left the spine floating inside the band above it.
 * The gap between line and content is unchanged.
 */
const SPINE_LEFT = "ml-0";
const SPINE_PAD = "pl-4";
/** Half a 6px node, left of the line: -(padding 16 + border 2) + 1px line centre - 3px radius. */
const SPINE_NODE_LEFT = "left-[-20px]";

/**
 * A tick on the section spine, marking one level of nesting inside a section — a group header, say.
 * Render inside a `relative` wrapper whose left edge is the spine's content edge; purely decorative,
 * so it is hidden from assistive technology, which reads the heading instead.
 *
 * The default vertical offset centres the node on the first line of a group heading, measured in
 * the running app rather than derived: a heading that wraps to two lines pushes its own text up, and
 * anchoring to the first line keeps the node steady instead of chasing the block's centre.
 */
export function SectionSpineNode({ className = "top-[10px]", family = "notes" }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute ${SPINE_NODE_LEFT} h-1.5 w-1.5 rounded-full ${className}`}
      style={{ background: sectionFamily(family).spine }}
    />
  );
}

/**
 * Shared read-mode disclosure for the durable sections of a composable page.
 * Collapse is visit-local presentation state; children stay mounted so an in-progress editor is
 * not discarded if the owner briefly closes its section.
 *
 * The heading is a filled band in the family's colour carrying its glyph and its name, and nothing
 * else (owner-picked 2026-08-28). It briefly wore a rule instead, and briefly carried the section's
 * counts beside the title; the owner missed the band and did not miss the counts, so both went back
 * the way they came. What a section holds is legible once it is open, and the sections sit 48px
 * apart so the bands read as chapter markers rather than as a stack of boxes.
 *
 * `empty` quiets the heading while the section has nothing in it (owner-picked 2026-08-10):
 * the family fill drains to a dashed outline and the title drops to muted grey, so a section with
 * no content stops competing with the ones that have some. The family ink returns with the first
 * item — the quiet state deliberately uses none.
 */
export default function PageSectionDisclosure({
  id,
  title,
  icon = null,
  defaultCollapsed = false,
  resetKey,
  actions = null,
  family = "notes",
  empty = false,
  children,
}) {
  const colors = sectionFamily(family);
  const Glyph = icon || colors.icon;
  const [localState, setLocalState] = useState(() => ({ resetKey, collapsed: null }));
  const localCollapsed = Object.is(localState.resetKey, resetKey) ? localState.collapsed : null;
  const collapsed = localCollapsed ?? defaultCollapsed;
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;

  const setCollapsed = (next) => setLocalState((current) => {
    const currentLocal = Object.is(current.resetKey, resetKey) ? current.collapsed : null;
    const currentValue = currentLocal ?? defaultCollapsed;
    return {
      resetKey,
      collapsed: typeof next === "function" ? next(currentValue) : next,
    };
  });

  const actionContent = typeof actions === "function"
    ? actions({ collapsed, expand: () => setCollapsed(false) })
    : actions;

  return (
    <section id={id} aria-labelledby={headingId}>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2${empty ? " border-dashed" : ""}`}
        style={{ background: empty ? "transparent" : colors.band, borderColor: colors.line }}
      >
        <button
          type="button"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title} section`}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsed((closed) => !closed)}
          className="min-h-11 min-w-40 flex-1 rounded-lg px-1 text-left flex items-center gap-2.5"
        >
          {collapsed
            ? <ChevronRight size={17} className="shrink-0" style={{ color: C.mut }} />
            : <ChevronDown size={17} className="shrink-0" style={{ color: C.mut }} />}
          {Glyph && (
            <span aria-hidden="true" className="flex shrink-0 items-center" style={{ color: empty ? C.mut : colors.ink }}>
              <Glyph size={16} />
            </span>
          )}
          <h2 id={headingId} className={`min-w-0 break-words text-lg leading-tight ${empty ? "font-normal" : "font-bold"}`} style={{ color: empty ? C.mut : colors.ink, fontFamily: SERIF }}>
            {title}
          </h2>
        </button>
        {actionContent && (
          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2" onClickCapture={() => setCollapsed(false)}>
            {actionContent}
          </div>
        )}
      </div>
      <div
        id={contentId}
        hidden={collapsed}
        className={`border-l-2 ${SPINE_LEFT} ${SPINE_PAD}`}
        style={{ borderColor: colors.spine }}
      >
        {children}
      </div>
    </section>
  );
}
