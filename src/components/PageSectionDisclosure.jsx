import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { C, SERIF } from "../theme.jsx";

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
      <div id={contentId} hidden={collapsed}>{children}</div>
    </section>
  );
}
