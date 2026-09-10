import { useEffect, useState } from "react";
import { BookMarked, Unlink, Search, X, ChevronRight } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { grammarAbbreviations } from "../lib/partOfSpeech.js";
import { resolveEntry, dictionaryInstalled } from "../db/ref/entries.js";
import { updateItem } from "../db/items.js";
import {
  appendDictionaryKey,
  dictionaryKeysForItem,
  uniqueDictionaryKeys,
} from "../lib/dictionaryAttachments.js";
import { DictionaryResultRows, useDictionarySearch } from "./DictionarySearch.jsx";

/**
 * The §5 seam, seen from the personal side.
 *
 * A lexical item may be attached to a dictionary entry. That attachment is a relationship,
 * not the item's identity: the item keeps its own term and personal meanings, and if the entry
 * disappears in a dataset rebuild the item keeps working. The three states:
 *
 *   attached    the entry resolves — show it, and offer to open it
 *   orphaned    the entry is gone and the alias map cannot find it — say so quietly,
 *               and offer to re-attach or to forget the link entirely
 *   unknown     no dictionary is installed — show nothing at all. Not installed is not
 *               orphaned, and a warning the owner cannot act on is just noise.
 */

const sameKeys = (left, right) =>
  left.length === right.length && left.every((key, index) => key === right[index]);

export function DictPicker({ term, placeholder = "Find the dictionary entry…", onPick, onCancel }) {
  const [query, setQuery] = useState(term || "");
  const { results } = useDictionarySearch(query);

  return (
    <Card className="mt-2" style={{ borderColor: C.pen }}>
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 border" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.mut }} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: C.ink }}
        />
        <button onClick={onCancel} aria-label="Cancel">
          <X size={14} style={{ color: C.mut }} />
        </button>
      </div>

      <div className="mt-2 space-y-1">
        <DictionaryResultRows
          results={results}
          onPick={onPick}
          emptyMessage="Nothing in the dictionary matches that."
        />
      </div>
    </Card>
  );
}

export default function DictAttachment({ item, onOpen, onChanged, onEntriesResolved }) {
  const keys = dictionaryKeysForItem(item);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [picking, setPicking] = useState(null);
  // Whether the unattached state may offer attaching: only with a dictionary installed. "Not
  // installed" deliberately renders nothing (Phase 2f) — a control that can only fail is noise.
  const [canAttach, setCanAttach] = useState(false);

  useEffect(() => {
    let alive = true;
    setPicking(null);
    setLoading(true);
    setRows([]);
    onEntriesResolved?.([]);
    (async () => {
      const installed = await dictionaryInstalled();
      if (!alive) return;
      if (!installed) {
        setCanAttach(false);
        setLoading(false);
        return;
      }
      setCanAttach(true);
      const resolved = await Promise.all(keys.map(async (key) => {
        try {
          return { key, ...(await resolveEntry(key)) };
        } catch {
          return { key, entry: null, resolvedFrom: null };
        }
      }));
      if (!alive) return;
      // Heal aliases as one ordered set. If two old keys now resolve to the same entry, retain
      // the earliest attachment and collapse the duplicate without logging an owner edit.
      const healedKeys = uniqueDictionaryKeys(resolved.map((row) => row.entry?.id || row.key));
      if (!sameKeys(keys, healedKeys)) {
        await updateItem(item.id, { dictKeys: healedKeys }, { logEdit: false });
        onChanged?.();
      }
      const healedRows = uniqueDictionaryKeys(resolved.map((row) => row.entry?.id || row.key)).map((key) => {
        const source = resolved.find((row) => (row.entry?.id || row.key) === key);
        return { key, entry: source?.entry || null };
      });
      setRows(healedRows);
      setLoading(false);
      onEntriesResolved?.(healedRows.map((row) => row.entry).filter(Boolean));
    })();
    return () => {
      alive = false;
    };
  }, [item.id, item.dictKeys, onEntriesResolved]);

  async function attachTo(picked) {
    const activeKeys = rows.length ? rows.map((row) => row.key) : keys;
    const nextKeys = picking?.startsWith("replace:")
      ? uniqueDictionaryKeys(activeKeys.map((key) => key === picking.slice(8) ? picked.id : key))
      : appendDictionaryKey(activeKeys, picked.id);
    setPicking(null);
    await updateItem(item.id, { dictKeys: nextKeys }, { logEdit: false });
    onChanged?.();
  }

  async function forget(key) {
    const activeKeys = rows.length ? rows.map((row) => row.key) : keys;
    await updateItem(item.id, { dictKeys: activeKeys.filter((candidate) => candidate !== key) }, { logEdit: false });
    onChanged?.();
  }

  if (loading) return null;

  // Never attached. The §5 seam is a reversible relationship the owner may add at any time, so
  // a word created without its dictionary entry — from a journal page, quick-create, or before
  // the dictionary was installed — can gain the attachment later through the same picker the
  // orphan Re-attach flow uses. Until 2026-08-14 this state rendered nothing: the picker
  // existed but no control could reach it, so attach-later was a promise without a button.
  if (!rows.length) {
    if (picking === "add") {
      return <DictPicker term={item.term} onPick={attachTo} onCancel={() => setPicking(null)} />;
    }
    if (!canAttach) return null;
    return (
      <button
        type="button"
        onClick={() => setPicking("add")}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"
        style={{ background: C.paper, borderColor: C.line, borderStyle: "dashed", color: C.mut }}
      >
        <BookMarked size={13} /> Attach dictionary entry
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map(({ key, entry }) => entry ? (
        <div
          key={key}
          className="flex items-stretch rounded-lg border"
          style={{ background: C.paper, borderColor: C.line, borderStyle: "dashed" }}
        >
          <button onClick={() => onOpen(entry.id)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left">
            <BookMarked size={14} className="shrink-0" style={{ color: C.mut }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate" style={{ color: C.ink }}>
                <span style={{ fontFamily: SERIF, fontWeight: 600 }}>{entry.lemma}</span>
                <span className="italic text-xs ml-1.5" style={{ color: C.mut }}>
                  {grammarAbbreviations(entry.pos, entry.gender)}
                </span>
              </div>
              <div className="text-xs truncate" style={{ color: C.mut }}>{entry.senses[0]?.gloss}</div>
            </div>
            <ChevronRight size={14} className="shrink-0" style={{ color: C.mut }} />
          </button>
          <button
            type="button"
            onClick={() => forget(key)}
            aria-label={`Remove dictionary attachment ${entry.lemma} ${grammarAbbreviations(entry.pos, entry.gender)}`}
            className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-r-lg border-l"
            style={{ borderColor: C.line, color: C.mut }}
          >
            <Unlink size={14} />
          </button>
        </div>
      ) : (
        <div key={key} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: C.paper, border: `1px dashed ${C.line}` }}>
          <Unlink size={13} className="shrink-0 mt-0.5" style={{ color: C.mut }} />
          <div className="min-w-0 flex-1">
            <div className="text-xs" style={{ color: C.mut }}>Reference unlinked — this entry is no longer in the dictionary. Your notes are untouched.</div>
            <div className="mt-0.5 text-[11px] truncate" style={{ fontFamily: MONO, color: C.mut }}>{key}</div>
            <div className="mt-1.5 flex gap-2">
              <Button tone="quiet" onClick={() => setPicking(`replace:${key}`)}>Re-attach</Button>
              <Button tone="quiet" onClick={() => forget(key)}>Forget the link</Button>
            </div>
          </div>
        </div>
      ))}
      {picking ? (
        <DictPicker term={item.term} onPick={attachTo} onCancel={() => setPicking(null)} />
      ) : canAttach ? (
        <button
          type="button"
          onClick={() => setPicking("add")}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"
          style={{ background: C.paper, borderColor: C.line, borderStyle: "dashed", color: C.mut }}
        >
          <BookMarked size={13} /> Attach another dictionary entry
        </button>
      ) : null}
    </div>
  );
}
