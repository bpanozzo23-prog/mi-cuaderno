import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import { dictionaryInstalled, resolveEntry } from "../db/ref/entries.js";
import { meaningsFromEntryForItem, meaningsFromSenses } from "../lib/meanings.js";
import { dictionaryKeysForItem } from "../lib/dictionaryAttachments.js";
import { grammarAbbreviations } from "../lib/partOfSpeech.js";

/**
 * Copying senses out of the attached dictionary entry, once.
 *
 * The §5 seam only ever gave the personal side a place to *look at* the entry. This copies the
 * senses the owner picks into their own `meanings[]`, where they become ordinary editable rows —
 * no sense id, no ordering, no link back, nothing to synchronize later (§14). Whatever they
 * become after that is the owner's business, and a dataset rebuild cannot reach them.
 *
 * It appears only when the attachment actually resolves. An orphaned key is `DictAttachment`'s
 * story to tell, and this component reads entries without ever rewriting aliased attachment keys:
 * two components racing the same rewrite is a bug waiting for a rebuild to trigger it.
 */
export function DictionaryMeaningImportPanel({
  entry,
  item,
  onImport,
  onCancel,
  onComplete,
  entryAware = false,
  title = `Import meanings from ${entry?.lemma || "the dictionary"}`,
  actionVerb = "Import",
}) {
  const [chosen, setChosen] = useState(() => new Set());
  const [error, setError] = useState("");

  // Ids are minted here, so the rows the owner previews are the rows that get saved.
  const rows = useMemo(
    () => entryAware
      ? meaningsFromEntryForItem(entry, { id: item.id, meanings: item.meanings, pos: item.pos })
      : meaningsFromSenses(entry?.senses, item.meanings),
    [entry, entryAware, item.id, item.meanings, item.pos]
  );

  useEffect(() => {
    setChosen(new Set());
    setError("");
  }, [entry?.id, item?.id]);

  function toggle(key) {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen(next);
    setError("");
  }

  async function confirm() {
    try {
      await onImport(rows.filter((row) => chosen.has(row.key)).map((row) => row.meaning));
      setChosen(new Set());
      onComplete?.();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Those meanings could not be added.");
    }
  }

  if (!entry) return null;

  if (!rows.length) {
    return (
      <Card className="mt-2" style={{ borderColor: C.line }}>
        <div className="text-xs" style={{ color: C.mut }}>
          This dictionary entry has no meanings available to copy.
        </div>
        <Button tone="quiet" className="mt-2" onClick={onCancel}>Cancel</Button>
      </Card>
    );
  }

  return (
    <Card className="mt-2" style={{ borderColor: C.pen }}>
      <div className="font-semibold" style={{ fontFamily: SERIF }}>
        {title}
      </div>
      <div className="text-xs mt-1" style={{ color: C.mut }}>
        Copies become your own meanings. Editing one later changes only this entry — the
        dictionary is never touched, and nothing is kept in step with it.
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((row) => {
          const { meaning } = row;
          const labels = [
            ...meaning.regions,
            ...meaning.usageLabels,
            ...(meaning.posOverride ? [meaning.posOverride] : []),
            ...meaning.verbBehavior,
          ];
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
          {chosen.size === 1 ? `${actionVerb} 1 meaning` : `${actionVerb} ${chosen.size} meanings`}
        </Button>
        <Button tone="quiet" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

export default function DictMeaningImport({ item, onImport }) {
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [open, setOpen] = useState(false);
  const keys = useMemo(
    () => dictionaryKeysForItem({ type: item.type, dictKeys: item.dictKeys }),
    [item.type, item.dictKeys]
  );

  useEffect(() => {
    let alive = true;
    setEntries([]);
    setSelectedId(null);
    setOpen(false);
    if (!keys.length) return () => { alive = false; };
    (async () => {
      if (!(await dictionaryInstalled())) return;
      const resolved = await Promise.all(keys.map(async (key) => {
        try {
          return await resolveEntry(key);
        } catch {
          return { entry: null };
        }
      }));
      const found = [...new Map(resolved
        .map((row) => row.entry)
        .filter((entry) => entry && (entry.senses || []).some((sense) => String(sense?.gloss || "").trim()))
        .map((entry) => [entry.id, entry])).values()];
      if (alive) {
        setEntries(found);
        setSelectedId(found.length === 1 ? found[0].id : null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [item.id, keys]);

  if (!entries.length) return null;

  if (!open) {
    return (
      <Button tone="quiet" className="mt-2" onClick={() => setOpen(true)}>
        <BookMarked size={14} /> Import from the dictionary
      </Button>
    );
  }

  const selectedEntry = entries.find((entry) => entry.id === selectedId) || null;
  if (!selectedEntry) {
    return (
      <Card className="mt-2" style={{ borderColor: C.pen }}>
        <div className="font-semibold" style={{ fontFamily: SERIF }}>Choose a dictionary entry</div>
        <div className="mt-1 text-xs" style={{ color: C.mut }}>
          This personal entry is attached to more than one dictionary entry.
        </div>
        <div className="mt-3 space-y-2">
          {entries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              aria-label={`${entry.lemma} ${grammarAbbreviations(entry.pos, entry.gender)}`}
              onClick={() => setSelectedId(entry.id)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-left"
              style={{ background: C.paper, borderColor: C.line, color: C.ink }}
            >
              <span style={{ fontFamily: SERIF, fontWeight: 600 }}>{entry.lemma}</span>
              <span className="ml-2 text-xs italic" style={{ color: C.mut }}>
                {grammarAbbreviations(entry.pos, entry.gender)}
              </span>
            </button>
          ))}
        </div>
        <Button tone="quiet" className="mt-2" onClick={() => setOpen(false)}>Cancel</Button>
      </Card>
    );
  }

  return (
    <DictionaryMeaningImportPanel
      entry={selectedEntry}
      item={item}
      onImport={onImport}
      onCancel={() => entries.length > 1 ? setSelectedId(null) : setOpen(false)}
      onComplete={() => {
        setOpen(false);
        setSelectedId(entries.length === 1 ? entries[0].id : null);
      }}
    />
  );
}
