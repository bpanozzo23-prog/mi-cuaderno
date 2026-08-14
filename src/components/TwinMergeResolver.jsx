import { useEffect, useId, useState } from "react";
import { Type } from "lucide-react";
import { mergeLinkedEntryIntoTwin } from "../db/linkedEntries.js";
import { normalizeRelationship, relationshipLabel } from "../lib/relationships.js";
import { Button, C, MONO, SERIF } from "../theme.jsx";
import RelationshipSelect from "./RelationshipSelect.jsx";

/**
 * The conflict half of the personal-twin merge: the dictionary connection and an existing
 * personal link to the same twin carry different explicit descriptions, so merging must not
 * silently discard either — the same owner-data rule AliasConflictResolver enforces, but styled
 * as an offer rather than an alarm, because nothing here is broken. Nothing merges by rendering
 * or selecting; only the explicit Save calls the database with the chosen (optionally edited)
 * survivor.
 */

const SOURCE_LABELS = {
  dictionary: "From the dictionary link",
  personal: "From your existing link",
};

const firstExplicit = (conflict) =>
  conflict?.candidates?.find((candidate) => candidate.explicit) || conflict?.candidates?.[0];

export default function TwinMergeResolver({
  itemId,
  canonicalKey,
  twin,
  conflict,
  onMerged,
  onCancel,
  mergeTwin = mergeLinkedEntryIntoTwin,
}) {
  const radioName = useId();
  const [selectedSource, setSelectedSource] = useState(() => firstExplicit(conflict)?.source || "");
  const [draft, setDraft] = useState(
    () => normalizeRelationship(firstExplicit(conflict)?.relationship || {})
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const conflictContentKey = JSON.stringify({
    canonicalKey,
    twinId: twin?.id || "",
    candidates: (conflict?.candidates || []).map((candidate) => {
      const relationship = normalizeRelationship(candidate.relationship);
      return [candidate.source, relationship.type, relationship.subject, relationship.note];
    }),
  });

  // Notebook refreshes recreate plain conflict objects; key the reset to their content so a
  // background reload cannot erase an in-progress owner draft (the AliasConflictResolver rule).
  useEffect(() => {
    const first = firstExplicit(conflict);
    setSelectedSource(first?.source || "");
    setDraft(normalizeRelationship(first?.relationship || {}));
    setSaving(false);
    setError("");
  }, [conflictContentKey]);

  if (!conflict || !twin) return null;

  const choose = (candidate) => {
    setSelectedSource(candidate.source);
    setDraft(normalizeRelationship(candidate.relationship));
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await mergeTwin(itemId, canonicalKey, twin.id, draft);
      if (!result?.merged) {
        setError(result?.reason === "not_installed"
          ? "The dictionary is no longer installed. Reinstall it before merging this connection."
          : "Could not merge this connection into your entry.");
        return;
      }
      onMerged?.(result);
    } catch (caught) {
      setError(caught?.message || "Could not merge this connection into your entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="w-full max-w-full overflow-hidden rounded-xl border p-3"
      style={{ background: C.card, borderColor: C.pen }}
    >
      <div className="flex items-start gap-2">
        <Type aria-hidden="true" size={17} className="mt-0.5 shrink-0" style={{ color: C.penDark }} />
        <div className="min-w-0">
          <h3 className="font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            Point this link at “{twin.term}”
          </h3>
          <p className="mt-1 text-xs" style={{ color: C.mut }}>
            The dictionary link and your existing link to this entry describe the connection
            differently. Choose one below, then keep it or edit the surviving relationship and
            note.
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
                key={candidate.source}
                className="flex min-h-11 min-w-0 cursor-pointer items-start gap-2 rounded-lg border p-2"
                style={{
                  background: selectedSource === candidate.source ? C.penPale : C.paper,
                  borderColor: selectedSource === candidate.source ? C.pen : C.line,
                }}
              >
                <input
                  type="radio"
                  name={radioName}
                  checked={selectedSource === candidate.source}
                  onChange={() => choose(candidate)}
                  aria-label={`Use ${label} ${SOURCE_LABELS[candidate.source] || candidate.source}`}
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
                  <span className="mt-1 block text-[10px]" style={{ color: C.mut, fontFamily: MONO }}>
                    {SOURCE_LABELS[candidate.source] || candidate.source}
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
          {saving ? "Merging…" : "Merge into my entry"}
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
