import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { C, MONO, SERIF } from "../theme.jsx";
import { sectionFamily } from "./pageRoleMeta.js";

/**
 * The spine's geometry, in one place so the line and the nodes hung on it cannot drift apart.
 * The line now sits on the heading's own left edge (owner-picked 2026-08-28), which is where the
 * rule under the heading starts too, so a section reads as one bracket down the page. It was
 * inset 10px while the heading wore a filled band and had no left edge of its own to meet.
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
 * The heading is a glyph, the family's ink and a rule in the family's colour — the filled band it
 * wore until 2026-08-28 is gone (owner-picked). Four filled bars down a page read as four
 * containers competing with their own contents; the rule says the same thing and lets the sections
 * sit closer together, which is why `CollectionPage` now spaces them 36px apart rather than 48px.
 *
 * `empty` quiets the heading while the section has nothing in it (owner-picked 2026-08-10):
 * the glyph's fill drains to a dashed outline, the rule goes dashed with it and the title drops to
 * muted grey, so a section with no content stops competing with the ones that have some. The
 * family ink returns with the first item — the quiet state deliberately uses none.
 */
export default function PageSectionDisclosure({
  id,
  title,
  summary = "",
  summaryLayout = "inline",
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
  /* Inline is the rule: a count belongs on the title's own line, which saves every section a
     second one (owner-picked 2026-08-28). Source and Grammar opt out because what sits there is
     identity and structure rather than a count — "Book · Gabriel García Márquez", three levels of
     guide counts — and neither survives being squeezed beside the title at 375px. */
  const blockSummary = Boolean(summary) && summaryLayout === "block";
  const inlineSummary = Boolean(summary) && !blockSummary;
  /* The trailing sections recede on a hairline; the four typed families get the 2px family rule. */
  const thinRule = family === "neutral";
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
        className={`flex flex-wrap justify-between gap-2 pb-[7px] ${blockSummary ? "items-start" : "items-center"} ${thinRule ? "border-b" : "border-b-2"}${empty ? " border-dashed" : ""}`}
        style={{ borderColor: colors.rule }}
      >
        <button
          type="button"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title} section`}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsed((closed) => !closed)}
          className={`min-h-11 min-w-40 flex-1 rounded-lg text-left flex gap-2.5 ${blockSummary ? "items-start" : "items-center"}`}
        >
          <span
            aria-hidden="true"
            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] border${empty ? " border-dashed" : ""}${blockSummary ? " mt-px" : ""}`}
            style={{
              background: empty ? "transparent" : colors.band,
              borderColor: colors.rule,
              color: empty ? C.mut : colors.ink,
            }}
          >
            {Glyph && <Glyph size={15} />}
          </span>
          <span className="shrink-0">
            <h2 id={headingId} className={`break-words text-lg leading-tight ${empty ? "font-normal" : "font-bold"}`} style={{ color: empty ? C.mut : colors.ink, fontFamily: SERIF }}>
              {title}
            </h2>
            {blockSummary && <span className="mt-0.5 block break-words text-xs" style={{ color: C.mut }}>{summary}</span>}
          </span>
          <span className={`ml-auto flex min-w-0 items-center gap-2 ${blockSummary ? "mt-1.5" : ""}`}>
            {inlineSummary && (
              <span className="truncate text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>{summary}</span>
            )}
            {collapsed
              ? <ChevronRight size={16} className="shrink-0" style={{ color: C.mut }} />
              : <ChevronDown size={16} className="shrink-0" style={{ color: C.mut }} />}
          </span>
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
