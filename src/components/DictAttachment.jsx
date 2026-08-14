import { useEffect, useState } from "react";
import { BookMarked, Unlink, Search, X, ChevronRight } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { grammarAbbreviations } from "../lib/partOfSpeech.js";
import { resolveEntry, dictionaryInstalled } from "../db/ref/entries.js";
import { searchDictionary } from "../db/ref/search.js";
import { updateItem } from "../db/items.js";

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

const STATE = { loading: "loading", none: "none", attached: "attached", orphaned: "orphaned" };

export function DictPicker({ term, placeholder = "Find the dictionary entry…", onPick, onCancel }) {
  const [query, setQuery] = useState(term || "");
  const [results, setResults] = useState([]);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      const found = await searchDictionary(query, { limit: 8 });
      if (current) setResults(found);
    }, 140);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

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
        {results.length === 0 && (
          <div className="text-xs py-2" style={{ color: C.mut }}>
            Nothing in the dictionary matches that.
          </div>
        )}
        {results.map(({ entry }) => (
          <button
            key={entry.id}
            onClick={() => onPick(entry)}
            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: C.paper }}
          >
            <div className="min-w-0 flex-1">
              <span style={{ fontFamily: SERIF, color: C.ink, fontWeight: 600 }}>{entry.lemma}</span>
              <span className="italic text-xs ml-1.5" style={{ color: C.mut }}>
                {grammarAbbreviations(entry.pos, entry.gender)}
              </span>
              <div className="text-xs truncate" style={{ color: C.mut }}>
                {entry.senses[0]?.gloss}
              </div>
            </div>
            <ChevronRight size={14} className="shrink-0" style={{ color: C.mut }} />
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function DictAttachment({ item, onOpen, onChanged, onEntryResolved }) {
  const [state, setState] = useState(STATE.loading);
  const [entry, setEntry] = useState(null);
  const [picking, setPicking] = useState(false);
  // Whether the unattached state may offer attaching: only with a dictionary installed. "Not
  // installed" deliberately renders nothing (Phase 2f) — a control that can only fail is noise.
  const [canAttach, setCanAttach] = useState(false);

  useEffect(() => {
    let alive = true;
    setPicking(false);
    onEntryResolved?.(null);
    (async () => {
      if (!item.dictKey) {
        const installed = await dictionaryInstalled();
        if (alive) {
          setCanAttach(installed);
          setState(STATE.none);
        }
        return;
      }
      if (!(await dictionaryInstalled())) {
        if (alive) {
          setCanAttach(false);
          setState(STATE.none);
        }
        return;
      }
      const { entry: found, resolvedFrom } = await resolveEntry(item.dictKey);
      if (!alive) return;
      // The alias map found it under a new id. Rewrite the link rather than leaving the
      // item pointing at an id that will orphan on the next rebuild too (§6). Not an
      // `edit` — the owner changed nothing, the dataset did.
      if (found && resolvedFrom) {
        await updateItem(item.id, { dictKey: found.id }, { logEdit: false });
        onChanged?.();
      }
      setEntry(found);
      setState(found ? STATE.attached : STATE.orphaned);
      onEntryResolved?.(found);
    })();
    return () => {
      alive = false;
    };
  }, [item.id, item.dictKey, onEntryResolved]);

  async function attachTo(picked) {
    setPicking(false);
    await updateItem(item.id, { dictKey: picked.id }, { logEdit: false });
    onChanged?.();
  }

  async function forget() {
    await updateItem(item.id, { dictKey: null }, { logEdit: false });
    onChanged?.();
  }

  if (state === STATE.loading) return null;

  // Never attached. The §5 seam is a reversible relationship the owner may add at any time, so
  // a word created without its dictionary entry — from a journal page, quick-create, or before
  // the dictionary was installed — can gain the attachment later through the same picker the
  // orphan Re-attach flow uses. Until 2026-08-14 this state rendered nothing: the picker
  // existed but no control could reach it, so attach-later was a promise without a button.
  if (state === STATE.none) {
    if (picking) {
      return <DictPicker term={item.term} onPick={attachTo} onCancel={() => setPicking(false)} />;
    }
    if (!canAttach) return null;
    return (
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs"
        style={{ background: C.paper, borderColor: C.line, borderStyle: "dashed", color: C.mut }}
      >
        <BookMarked size={13} /> Attach dictionary entry
      </button>
    );
  }

  if (state === STATE.attached) {
    return (
      <button
        onClick={() => onOpen(entry.id)}
        className="mt-3 w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg border"
        style={{ background: C.paper, borderColor: C.line, borderStyle: "dashed" }}
      >
        <BookMarked size={14} className="shrink-0" style={{ color: C.mut }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm truncate" style={{ color: C.ink }}>
            <span style={{ fontFamily: SERIF, fontWeight: 600 }}>{entry.lemma}</span>
            <span className="italic text-xs ml-1.5" style={{ color: C.mut }}>
              {grammarAbbreviations(entry.pos, entry.gender)}
            </span>
          </div>
          <div className="text-xs truncate" style={{ color: C.mut }}>
            {entry.senses[0]?.gloss}
          </div>
        </div>
        <ChevronRight size={14} className="shrink-0" style={{ color: C.mut }} />
      </button>
    );
  }

  return (
    <>
      <div
        className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg"
        style={{ background: C.paper, border: `1px dashed ${C.line}` }}
      >
        <Unlink size={13} className="shrink-0 mt-0.5" style={{ color: C.mut }} />
        <div className="min-w-0">
          <div className="text-xs" style={{ color: C.mut }}>
            Reference unlinked — this word is no longer in the dictionary. Your notes are untouched.
          </div>
          <div className="mt-0.5 text-[11px] truncate" style={{ fontFamily: MONO, color: C.mut }}>
            {item.dictKey}
          </div>
          <div className="mt-1.5 flex gap-2">
            <Button tone="quiet" onClick={() => setPicking((v) => !v)}>
              Re-attach
            </Button>
            <Button tone="quiet" onClick={forget}>
              Forget the link
            </Button>
          </div>
        </div>
      </div>
      {picking && <DictPicker term={item.term} onPick={attachTo} onCancel={() => setPicking(false)} />}
    </>
  );
}
