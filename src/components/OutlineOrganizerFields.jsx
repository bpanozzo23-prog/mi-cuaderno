import { ArrowDown, ArrowUp } from "lucide-react";
import { C } from "../theme.jsx";
import {
  moveOutlineSibling,
  outlineHierarchy,
  outlineSiblingState,
  reparentOutlineRow,
} from "../lib/oneLevelOutline.js";

const fieldStyle = { background: C.card, borderColor: C.line, color: C.ink };

/** Shared name, sibling-order, and parent controls for every one-level page outline. */
export default function OutlineOrganizerFields({ rows, row, index, onChange }) {
  const hierarchy = outlineHierarchy(rows);
  const siblingState = outlineSiblingState(rows, row.id);
  const label = row.name || index + 1;

  return (
    <>
      <div className="flex items-center gap-1">
        <input
          aria-label={`Section ${index + 1} name`}
          value={row.name}
          onChange={(event) => onChange(rows.map((candidate) => (
            candidate.id === row.id ? { ...candidate, name: event.target.value } : candidate
          )))}
          className="min-h-11 min-w-0 flex-1 rounded-lg border px-2 text-sm outline-none"
          style={fieldStyle}
        />
        <button
          type="button"
          aria-label={`Move section ${label} up`}
          disabled={siblingState.position <= 0}
          onClick={() => onChange(moveOutlineSibling(rows, row.id, -1))}
          className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
        >
          <ArrowUp size={15} style={{ color: C.mut }} />
        </button>
        <button
          type="button"
          aria-label={`Move section ${label} down`}
          disabled={siblingState.position < 0 || siblingState.position === siblingState.indexes.length - 1}
          onClick={() => onChange(moveOutlineSibling(rows, row.id, 1))}
          className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
        >
          <ArrowDown size={15} style={{ color: C.mut }} />
        </button>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="text-[11px] font-semibold" style={{ color: C.mut }}>
          {row.parentId ? "Subsection" : "Section"}
        </span>
        <select
          aria-label={`Parent for ${row.name || `section ${index + 1}`}`}
          value={row.parentId || ""}
          disabled={row.parentId === null && (hierarchy.childrenByParent.get(row.id) || []).length > 0}
          onChange={(event) => onChange(reparentOutlineRow(rows, row.id, event.target.value))}
          className="min-h-11 min-w-0 flex-1 rounded-lg border px-2 text-xs disabled:opacity-60"
          style={fieldStyle}
        >
          <option value="">Top level</option>
          {hierarchy.roots.filter((root) => root.id !== row.id).map((root) => (
            <option key={root.id} value={root.id}>Under {root.name || "Unnamed section"}</option>
          ))}
        </select>
      </div>
    </>
  );
}
