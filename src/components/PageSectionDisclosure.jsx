import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { C, SERIF } from "../theme.jsx";

/**
 * The spine's geometry, in one place so the line and the nodes hung on it cannot drift apart.
 * The 21px margin centres the 2px line under the header's chevron (1px border + 8px bar padding +
 * 4px button padding + half of a 17px icon), so the line reads as dripping from the header.
 */
const SPINE_LEFT = "ml-[21px]";
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
export function SectionSpineNode({ className = "top-[10px]" }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute ${SPINE_NODE_LEFT} h-1.5 w-1.5 rounded-full ${className}`}
      style={{ background: C.sectionSpine }}
    />
  );
}

/**
 * Shared read-mode disclosure for the durable sections of a composable page.
 * Collapse is visit-local presentation state; children stay mounted so an in-progress editor is
 * not discarded if the owner briefly closes its section.
 */
export default function PageSectionDisclosure({
  id,
  title,
  summary = "",
  defaultCollapsed = false,
  resetKey,
  actions = null,
  children,
}) {
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
        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border px-2 py-1.5"
        style={{ background: C.penPale, borderColor: C.chipBorder }}
      >
        <button
          type="button"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${title} section`}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsed((closed) => !closed)}
          className="min-h-11 min-w-40 flex-1 rounded-lg px-1 text-left flex items-center gap-2"
        >
          {collapsed
            ? <ChevronRight size={17} className="shrink-0" style={{ color: C.mut }} />
            : <ChevronDown size={17} className="shrink-0" style={{ color: C.mut }} />}
          <div className="min-w-0">
            <h2 id={headingId} className="break-words text-lg font-bold leading-tight" style={{ color: C.ink, fontFamily: SERIF }}>
              {title}
            </h2>
            {summary && <div className="break-words text-xs" style={{ color: C.mut }}>{summary}</div>}
          </div>
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
        style={{ borderColor: C.sectionSpine }}
      >
        {children}
      </div>
    </section>
  );
}
