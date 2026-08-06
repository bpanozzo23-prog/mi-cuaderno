import { useEffect, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { resolveLinkedEntryConflict } from "../db/linkedEntries.js";
import { normalizeRelationship, relationshipLabel } from "../lib/relationships.js";
import { Button, C, MONO, SERIF } from "../theme.jsx";
import RelationshipSelect from "./RelationshipSelect.jsx";

const initialChoice = (conflict) =>
  normalizeRelationship(conflict?.candidates?.find((candidate) => candidate.explicit)?.relationship || {});

/**
 * Lossless alias-conflict UI shared by every surface that can show dictionary connections.
 * Nothing is canonicalized merely by rendering or selecting a row; only the explicit Save calls
 * the database resolver with the owner's chosen (and optionally edited) survivor.
 */
export default function AliasConflictResolver({
  itemId,
  conflict,
  onResolved,
  onCancel,
  resolveConflict = resolveLinkedEntryConflict,
}) {
  const radioName = useId();
  const [selectedRawKey, setSelectedRawKey] = useState(
    () => conflict?.candidates?.find((candidate) => candidate.explicit)?.rawKey || ""
  );
  const [draft, setDraft] = useState(() => initialChoice(conflict));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const conflictContentKey = JSON.stringify({
    canonicalKey: conflict?.canonicalKey || "",
    candidates: (conflict?.candidates || []).map((candidate) => {
      const relationship = normalizeRelationship(candidate.relationship);
      return [
        candidate.rawKey,
        Boolean(candidate.explicit),
        relationship.type,
        relationship.subject,
        relationship.note,
      ];
    }),
  });

  // Notebook reloads recreate plain conflict objects even when their stored content is unchanged.
  // Key this reset to that content so a view/event refresh cannot erase an in-progress owner draft.
  useEffect(() => {
    const first = conflict?.candidates?.find((candidate) => candidate.explicit)
      || conflict?.candidates?.[0];
    setSelectedRawKey(first?.rawKey || "");
    setDraft(normalizeRelationship(first?.relationship || {}));
    setSaving(false);
    setError("");
  }, [conflictContentKey]);

  if (!conflict) return null;

  const choose = (candidate) => {
    setSelectedRawKey(candidate.rawKey);
    setDraft(normalizeRelationship(candidate.relationship));
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await resolveConflict(itemId, conflict.canonicalKey, draft);
      if (!result?.resolved) {
        setError(result?.reason === "not_installed"
          ? "The dictionary is no longer installed. Reinstall it before resolving this connection."
          : "Could not resolve this dictionary connection.");
        return;
      }
      onResolved?.(result);
    } catch (caught) {
      setError(caught?.message || "Could not resolve this dictionary connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="w-full max-w-full overflow-hidden rounded-xl border p-3"
      style={{ background: C.card, borderColor: C.dangerBorder }}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden="true" size={17} className="mt-0.5 shrink-0" style={{ color: C.red }} />
        <div className="min-w-0">
          <h3 className="font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            Resolve dictionary connection
          </h3>
          <p className="mt-1 text-xs" style={{ color: C.mut }}>
            A dictionary update found different descriptions for the same connection. Choose one
            below, then keep it or edit the surviving relationship and note.
          </p>
        </div>
      </div>

      <fieldset className="mt-3 min-w-0">
        <legend className="mb-1 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
          Existing descriptions
        </legend>
        <div className="grid min-w-0 gap-2">
          {conflict.candidates.map((candidate) => {
            const relationship = normalizeRelationship(candidate.relationship);
            const label = relationshipLabel(relationship, "owner");
            return (
              <label
                key={candidate.rawKey}
                className="flex min-h-11 min-w-0 cursor-pointer items-start gap-2 rounded-lg border p-2"
                style={{
                  background: selectedRawKey === candidate.rawKey ? C.penPale : C.paper,
                  borderColor: selectedRawKey === candidate.rawKey ? C.pen : C.line,
                }}
              >
                <input
                  type="radio"
                  name={radioName}
                  checked={selectedRawKey === candidate.rawKey}
                  onChange={() => choose(candidate)}
                  aria-label={`Use ${label} from ${candidate.rawKey}`}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium" style={{ color: C.ink }}>{label}</span>
                  {relationship.note ? (
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-xs" style={{ color: C.penDark }}>
                      {relationship.note}
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-xs" style={{ color: C.mut }}>No shared note</span>
                  )}
                  <span className="mt-1 block break-all text-[10px]" style={{ color: C.mut, fontFamily: MONO }}>
                    {candidate.rawKey}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <RelationshipSelect relationship={draft} onChange={setDraft} />
        <label className="mt-3 block text-xs" style={{ color: C.mut }}>
          <span className="mb-1 block" style={{ fontFamily: MONO }}>Surviving shared note (optional)</span>
          <textarea
            aria-label="Surviving shared note"
            value={draft.note}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            className="min-h-24 w-full max-w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: C.paper, borderColor: C.line, color: C.ink }}
          />
        </label>
      </div>

      {error && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{error}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" disabled={saving} className="min-h-11">
          {saving ? "Resolving…" : "Resolve connection"}
        </Button>
        {onCancel && (
          <Button type="button" tone="quiet" onClick={onCancel} disabled={saving} className="min-h-11">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
