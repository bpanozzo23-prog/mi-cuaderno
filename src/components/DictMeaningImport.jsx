import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import { dictionaryInstalled, resolveEntry } from "../db/ref/entries.js";
import { meaningsFromSenses } from "../lib/meanings.js";

/**
 * Copying senses out of the attached dictionary entry, once.
 *
 * The §5 seam only ever gave the personal side a place to *look at* the entry. This copies the
 * senses the owner picks into their own `meanings[]`, where they become ordinary editable rows —
 * no sense id, no ordering, no link back, nothing to synchronize later (§14). Whatever they
 * become after that is the owner's business, and a dataset rebuild cannot reach them.
 *
 * It appears only when the attachment actually resolves. An orphaned key is `DictAttachment`'s
 * story to tell, and this component reads the entry without ever rewriting an aliased `dictKey`:
 * two components racing the same rewrite is a bug waiting for a rebuild to trigger it.
 */
export default function DictMeaningImport({ item, onImport }) {
  const [entry, setEntry] = useState(null);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(() => new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setEntry(null);
    setOpen(false);
    if (!item.dictKey) return () => { alive = false; };
    (async () => {
      if (!(await dictionaryInstalled())) return;
      const { entry: found } = await resolveEntry(item.dictKey);
      if (alive) setEntry(found);
    })();
    return () => {
      alive = false;
    };
  }, [item.id, item.dictKey]);

  // Ids are minted here, so the rows the owner previews are the rows that get saved.
  const rows = useMemo(
    () => meaningsFromSenses(entry?.senses, item.meanings),
    [entry, item.meanings]
  );

  if (!entry || !rows.length) return null;

  function toggle(key) {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen(next);
    setError("");
  }

  function start() {
    setChosen(new Set());
    setError("");
    setOpen(true);
  }

  async function confirm() {
    try {
      await onImport(rows.filter((row) => chosen.has(row.key)).map((row) => row.meaning));
      setOpen(false);
      setChosen(new Set());
    } catch (problem) {
      setError(problem.message);
    }
  }

  if (!open) {
    return (
      <Button tone="quiet" className="mt-2" onClick={start}>
        <BookMarked size={14} /> Import from the dictionary
      </Button>
    );
  }

  return (
    <Card className="mt-2" style={{ borderColor: C.pen }}>
      <div className="font-semibold" style={{ fontFamily: SERIF }}>
        Import meanings from {entry.lemma}
      </div>
      <div className="text-xs mt-1" style={{ color: C.mut }}>
        Copies become your own meanings. Editing one later changes only this entry — the
        dictionary is never touched, and nothing is kept in step with it.
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const { meaning } = row;
          const labels = [...meaning.regions, ...meaning.usageLabels, ...meaning.verbBehavior];
          return (
            <label
              key={row.key}
              className="flex items-start gap-2 p-2 rounded-lg"
              style={{ background: C.paper, opacity: row.duplicate ? 0.65 : 1 }}
            >
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                checked={chosen.has(row.key)}
                disabled={row.duplicate}
                onChange={() => toggle(row.key)}
                aria-label={`Import ${meaning.gloss}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
                  {meaning.gloss}
                </div>
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {labels.map((label) => (
                      <span
                        key={label}
                        className="text-[11px] px-1.5 py-0.5 rounded-full"
                        style={{ background: C.penPale, color: C.penDark }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
                {row.droppedLabels.length > 0 && (
                  <div className="text-[11px] mt-1" style={{ color: C.mut }}>
                    Not carried across: {row.droppedLabels.join(", ")}
                  </div>
                )}
                {row.duplicate && (
                  <div className="text-[11px] mt-1" style={{ color: C.mut }}>
                    Already in your meanings.
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {error && <div className="text-xs mt-2" style={{ color: C.red }}>{error}</div>}

      <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
        <Button onClick={confirm} disabled={chosen.size === 0}>
          <Check size={14} />
          {chosen.size === 1 ? "Import 1 meaning" : `Import ${chosen.size} meanings`}
        </Button>
        <Button tone="quiet" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </Card>
  );
}
