import { useMemo, useState } from "react";
import { ArrowRight, Download, Trash2, X } from "lucide-react";
import { C, SERIF, Button, Card } from "../theme.jsx";
import { applyGlobalTagChange } from "../db/tags.js";
import { allTagsIn, planGlobalTagChange, suggestTags } from "../lib/tags.js";
import TagChip from "./TagChip.jsx";

const entryAmount = (count) => `${count} ${count === 1 ? "entry" : "entries"}`;
const labeledEntryAmount = (count, label) =>
  `${count} ${label} ${count === 1 ? "entry" : "entries"}`;

export default function TagManagementSheet({
  source,
  items = [],
  onClose,
  onSaved,
  onExportBackup,
}) {
  const [draft, setDraft] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backupNote, setBackupNote] = useState("");
  const [problem, setProblem] = useState("");

  const destinationPlan = useMemo(
    () => planGlobalTagChange(items, { source, destination: draft }),
    [draft, items, source]
  );
  const removalPlan = useMemo(
    () => planGlobalTagChange(items, { source, destination: null }),
    [items, source]
  );
  const suggestions = useMemo(
    () => suggestTags(allTagsIn(items).filter((tag) => tag !== source), draft),
    [draft, items, source]
  );

  const sourceCount = removalPlan.sourceCount;
  const blocked = saving || exporting;

  function changeDraft(value) {
    setDraft(value);
    setConfirmation(null);
    setProblem("");
  }

  async function exportBackup() {
    if (!onExportBackup) return;
    setExporting(true);
    setBackupNote("");
    setProblem("");
    try {
      await onExportBackup();
      setBackupNote("Backup downloaded.");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The backup could not be downloaded.");
    } finally {
      setExporting(false);
    }
  }

  async function apply(destination) {
    setSaving(true);
    setProblem("");
    try {
      const result = await applyGlobalTagChange({ source, destination });
      await onSaved?.(result);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The tag change could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const close = blocked ? undefined : onClose;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: "rgba(33,42,61,0.35)" }}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-tag-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-4 pb-6"
        style={{ background: C.paper }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="manage-tag-title" className="text-lg font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
              Manage tag
            </h2>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <TagChip tag={source} className="max-w-full whitespace-normal break-all text-left" />
              <span className="text-xs" style={{ color: C.mut }}>
                {sourceCount === 1
                  ? "1 entry uses this exact tag."
                  : `${sourceCount} entries use this exact tag.`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={blocked}
            aria-label="Close tag management"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            <X size={17} style={{ color: C.mut }} />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor="tag-destination" className="text-sm font-semibold" style={{ color: C.ink }}>
            Rename to
          </label>
          <input
            id="tag-destination"
            aria-label="New tag name"
            autoFocus
            type="text"
            value={draft}
            disabled={blocked || confirmation !== null}
            onChange={(event) => changeDraft(event.target.value)}
            placeholder="Type a new or existing tag"
            className="mt-2 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ background: C.card, color: C.ink, borderColor: C.line }}
          />
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.mut }}>
            Exact spelling is identity. Similar tags are suggestions only.
          </p>

          {!confirmation && suggestions.length > 0 && (
            <div className="mt-2" aria-label="Existing tag suggestions">
              <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.06em" }}>
                Existing tags
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {suggestions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-label={`Use existing tag ${tag}`}
                    disabled={blocked}
                    onClick={() => changeDraft(tag)}
                    className="inline-flex min-h-11 min-w-0 max-w-full items-center rounded-lg px-1.5"
                  >
                    <TagChip tag={tag} className="max-w-full whitespace-normal break-all text-left" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!confirmation && destinationPlan.kind === "rename" && (
          <Card className="mt-4" style={{ borderColor: C.pen }}>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm" style={{ color: C.ink }}>
              <TagChip tag={source} className="max-w-full whitespace-normal break-all text-left" />
              <ArrowRight size={14} className="shrink-0" style={{ color: C.mut }} />
              <TagChip
                tag={destinationPlan.destination}
                className="max-w-full whitespace-normal break-all text-left"
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: C.mut }}>
              Rename on {entryAmount(destinationPlan.changedCount)}. Recently touched order will not move.
            </p>
            <Button
              className="mt-3 min-h-11"
              disabled={blocked}
              onClick={() => apply(destinationPlan.destination)}
            >
              {saving ? "Renaming…" : "Rename tag"}
            </Button>
          </Card>
        )}

        {!confirmation && destinationPlan.kind === "merge" && (
          <Card className="mt-4" style={{ borderColor: C.pen }}>
            <div className="text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
              Merge into an existing tag
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" style={{ color: C.ink }}>
              <div>{labeledEntryAmount(destinationPlan.sourceCount, "source")}</div>
              <div>{labeledEntryAmount(destinationPlan.destinationCount, "destination")}</div>
              <div>
                {destinationPlan.overlapCount === 1
                  ? "1 entry already has both"
                  : `${destinationPlan.overlapCount} entries already have both`}
              </div>
              <div>{destinationPlan.finalCount === 1 ? "1 entry after merge" : `${destinationPlan.finalCount} entries after merge`}</div>
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
              The destination spelling and colour will win. Each entry keeps only one copy.
            </p>
            <Button className="mt-3 min-h-11" disabled={blocked} onClick={() => setConfirmation("merge")}>
              Merge tags
            </Button>
          </Card>
        )}

        {!confirmation && destinationPlan.kind === "noop" && draft.trim() && (
          <div className="mt-3 text-xs" style={{ color: C.mut }}>
            Enter a different exact tag name.
          </div>
        )}

        {confirmation === "merge" && (
          <Card className="mt-4" style={{ borderColor: C.dangerBorder }}>
            <div className="text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
              Confirm merge
            </div>
            <p className="mt-1.5 break-all text-xs leading-relaxed" style={{ color: C.ink }}>
              Replace <strong>{source}</strong> with <strong>{destinationPlan.destination}</strong> on {entryAmount(destinationPlan.changedCount)}?
              This cannot be undone inside the app.
            </p>
            {onExportBackup && (
              <Button tone="quiet" className="mt-3 min-h-11" disabled={blocked} onClick={exportBackup}>
                <Download size={15} /> {exporting ? "Exporting…" : "Export backup first"}
              </Button>
            )}
            {backupNote && <div className="mt-2 text-xs" style={{ color: C.green }}>{backupNote}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                tone="dangerArmed"
                className="min-h-11"
                disabled={blocked}
                onClick={() => apply(destinationPlan.destination)}
              >
                {saving ? "Merging…" : "Confirm merge"}
              </Button>
              <Button tone="quiet" className="min-h-11" disabled={blocked} onClick={() => setConfirmation(null)}>
                Back
              </Button>
            </div>
          </Card>
        )}

        {confirmation === "remove" && (
          <Card className="mt-4" style={{ borderColor: C.dangerBorder }}>
            <div className="text-sm font-semibold" style={{ color: C.red, fontFamily: SERIF }}>
              Remove tag from {entryAmount(removalPlan.changedCount)}?
            </div>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: C.ink }}>
              The entries themselves will remain in your notebook.
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mut }}>
              Only this exact tag and its colour will be removed.
            </p>
            {onExportBackup && (
              <Button tone="quiet" className="mt-3 min-h-11" disabled={blocked} onClick={exportBackup}>
                <Download size={15} /> {exporting ? "Exporting…" : "Export backup first"}
              </Button>
            )}
            {backupNote && <div className="mt-2 text-xs" style={{ color: C.green }}>{backupNote}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                tone="dangerArmed"
                className="min-h-11"
                disabled={blocked}
                onClick={() => apply(null)}
              >
                {saving ? "Removing…" : "Confirm removal"}
              </Button>
              <Button tone="quiet" className="min-h-11" disabled={blocked} onClick={() => setConfirmation(null)}>
                Back
              </Button>
            </div>
          </Card>
        )}

        {problem && (
          <div role="alert" className="mt-3 rounded-lg p-2.5 text-xs" style={{ background: C.redPale, color: C.red }}>
            {problem}
          </div>
        )}

        {!confirmation && (
          <div className="mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: C.line }}>
            <Button
              tone="danger"
              className="min-h-11"
              disabled={blocked || removalPlan.kind === "noop"}
              onClick={() => {
                setProblem("");
                setBackupNote("");
                setConfirmation("remove");
              }}
            >
              <Trash2 size={15} /> Remove tag everywhere
            </Button>
            <Button tone="quiet" className="min-h-11" disabled={blocked} onClick={onClose}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
