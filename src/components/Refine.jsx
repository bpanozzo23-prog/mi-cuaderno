import { SlidersHorizontal } from "lucide-react";
import { C } from "../theme.jsx";

/**
 * The Refine disclosure, shared by the Cuaderno list and both hubs.
 *
 * It is a disclosure, not a dialog: the panel renders in normal document flow directly under its
 * button, so there is no focus trap, no scroll lock and nothing to restore focus to. The whole
 * a11y contract is `aria-expanded` plus `aria-controls` pointing at the panel's id.
 *
 * The count lives in the button's accessible name ("Refine (2)") rather than a separate pill —
 * a hidden refinement must always say how much it is hiding (Phase 4z).
 */

/** The one copy of the select chrome all three surfaces share. */
export const controlStyle = { background: C.card, borderColor: C.line, color: C.ink };

export function RefineBar({ panelId, open, count = 0, onToggle }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm"
      style={{ color: count ? C.pen : C.mut }}
    >
      <SlidersHorizontal size={16} />
      Refine{count ? ` (${count})` : ""}
    </button>
  );
}

export function RefinePanel({ id, children }) {
  return (
    <div
      id={id}
      className="mt-1 grid grid-cols-2 gap-2 rounded-xl border p-3"
      style={{ borderColor: C.line, background: C.card }}
    >
      {children}
    </div>
  );
}

/**
 * One labelled select. Options arrive as children so each caller keeps control of its own
 * placeholder and of synthetic options like "Search relevance". `wide` spans both columns.
 */
export function RefineSelect({
  label,
  ariaLabel,
  value,
  onChange,
  disabled = false,
  wide = false,
  children,
}) {
  return (
    <label className={`${wide ? "col-span-2 " : ""}min-w-0 text-xs`} style={{ color: C.mut }}>
      <span className="mb-1 block">{label}</span>
      <select
        aria-label={ariaLabel || label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none disabled:opacity-70"
        style={controlStyle}
      >
        {children}
      </select>
    </label>
  );
}
