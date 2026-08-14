import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Plus } from "lucide-react";
import { Button, C, MONO, SERIF } from "../theme.jsx";
import { mentionedHereFor, prepareContextIndex } from "../lib/contextConnections.js";
import { firstMeaningGloss } from "../lib/meanings.js";

const problemMessage = (error) =>
  error instanceof Error && error.message
    ? error.message
    : "This mention could not be added. Nothing else was changed.";

function MentionRow({ row, onOpen, onAdd, problem, saving }) {
  const gloss = firstMeaningGloss(row.item);
  const matchedDifferently = String(row.surface || "").trim() !== String(row.item.term || "").trim();
  return (
    <div className="rounded-lg border px-3 py-2" style={{ background: C.card, borderColor: C.line }}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onOpen?.(row.item.id)}
          aria-label={`Open ${row.item.term}`}
          className="min-h-11 min-w-0 flex-1 text-left"
        >
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            <span className="break-words">{row.item.term}</span>
            <ExternalLink size={12} className="shrink-0" style={{ color: C.mut }} />
          </span>
          {gloss && <span className="mt-0.5 block break-words text-xs" style={{ color: C.mut }}>{gloss}</span>}
          {matchedDifferently && (
            <span className="mt-1 block text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
              Matched as “{row.surface}”
            </span>
          )}
        </button>
        <Button
          type="button"
          tone="quiet"
          className="min-h-11 shrink-0"
          disabled={saving}
          aria-label={`Add mentioned vocabulary ${row.item.term}`}
          onClick={() => onAdd(row)}
        >
          <Plus size={13} /> {saving ? "Adding…" : "Add"}
        </Button>
      </div>
      {problem && <div role="alert" className="mt-1 text-xs" style={{ color: C.red }}>{problem}</div>}
    </div>
  );
}

/**
 * Lazy, collapsed confirmation surface shared by every active Phase 26 prose slot. It never
 * mutates on detection: the caller owns the explicit Add action for that slot.
 */
export default function MentionedHere({ items = [], contextId, onOpen, onAdd }) {
  const [prepared, setPrepared] = useState(null);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [savingId, setSavingId] = useState(null);
  const [problems, setProblems] = useState(() => new Map());

  useEffect(() => {
    let alive = true;
    setPrepared(null);
    setDismissed(new Set());
    setProblems(new Map());
    prepareContextIndex(items).then((index) => {
      if (alive) setPrepared(index);
    }).catch(() => {
      if (alive) setPrepared(null);
    });
    return () => { alive = false; };
  }, [items]);

  useEffect(() => {
    setOpen(false);
    setShowAll(false);
    setDismissed(new Set());
    setSavingId(null);
    setProblems(new Map());
  }, [contextId]);

  const rows = useMemo(
    () => prepared
      ? mentionedHereFor(prepared, contextId).filter((row) => !dismissed.has(row.itemId))
      : [],
    [contextId, dismissed, prepared]
  );
  if (!prepared || rows.length === 0 || typeof onAdd !== "function") return null;

  const visible = showAll ? rows : rows.slice(0, 5);
  const ambiguousCounts = new Map();
  for (const row of visible) {
    if (row.ambiguous) ambiguousCounts.set(row.ambiguityKey, (ambiguousCounts.get(row.ambiguityKey) || 0) + 1);
  }
  const announcedAmbiguities = new Set();

  async function add(row) {
    setSavingId(row.itemId);
    setProblems((current) => {
      const next = new Map(current);
      next.delete(row.itemId);
      return next;
    });
    try {
      await onAdd(row);
      setDismissed((current) => new Set(current).add(row.itemId));
    } catch (error) {
      setProblems((current) => new Map(current).set(row.itemId, problemMessage(error)));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mt-3 border-t pt-2" style={{ borderColor: C.line }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`mentioned-here-${contextId}`}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left text-xs font-semibold"
        style={{ color: C.pen }}
      >
        <span>Mentioned here · {rows.length}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      <div id={`mentioned-here-${contextId}`} hidden={!open}>
        <div className="space-y-2 pb-1">
          {visible.map((row) => {
            const announceAmbiguity = row.ambiguous
              && ambiguousCounts.get(row.ambiguityKey) > 1
              && !announcedAmbiguities.has(row.ambiguityKey);
            if (announceAmbiguity) announcedAmbiguities.add(row.ambiguityKey);
            return (
              <div key={row.itemId}>
                {announceAmbiguity && (
                  <div className="mb-1 text-[11px]" style={{ color: C.mut }}>
                    Choose the intended entry for “{row.surface}”.
                  </div>
                )}
                <MentionRow
                  row={row}
                  onOpen={onOpen}
                  onAdd={add}
                  saving={savingId === row.itemId}
                  problem={problems.get(row.itemId)}
                />
              </div>
            );
          })}
        </div>
        {rows.length > 5 && (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
            className="min-h-11 text-xs font-medium"
            style={{ color: C.pen }}
          >
            {showAll ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
