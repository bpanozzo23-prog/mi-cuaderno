import { C, MONO } from "../theme.jsx";
import {
  RELATIONSHIP_OPTIONS,
  normalizeRelationship,
  relationshipFromOption,
  relationshipOptionValue,
} from "../lib/relationships.js";

/**
 * One native, phone-friendly selector shared by every connection composer and editor.
 * Its value is always expressed from the screen's current endpoint; the database mutation
 * translates that perspective back to whichever row physically owns the edge.
 */
export default function RelationshipSelect({ relationship, onChange, compact = false }) {
  const normalized = normalizeRelationship(relationship);

  return (
    <label className="block text-xs" style={{ color: C.mut }}>
      <span className={compact ? "sr-only" : "mb-1 block"} style={{ fontFamily: MONO }}>
        Relationship
      </span>
      <select
        aria-label="Relationship"
        value={relationshipOptionValue(normalized)}
        onChange={(event) => onChange(relationshipFromOption(event.target.value, normalized.note))}
        className="min-h-11 w-full rounded-lg border px-2 py-2 text-sm outline-none"
        style={{ background: C.card, borderColor: C.line, color: C.ink }}
      >
        {RELATIONSHIP_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
