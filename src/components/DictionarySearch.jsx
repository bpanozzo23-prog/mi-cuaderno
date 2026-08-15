import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { C, SERIF } from "../theme.jsx";
import { grammarAbbreviations } from "../lib/partOfSpeech.js";
import { searchDictionary } from "../db/ref/search.js";

/** Shared by every type-ahead that reads the optional offline dictionary. */
export const DICTIONARY_SEARCH_DEBOUNCE_MS = 140;

/**
 * Debounced reference-layer lookup with stale-reply protection. A missing dictionary or failed
 * optional read is ordinary absence here: personal creation and attachment remain usable.
 */
export function useDictionarySearch(query, { enabled = true, limit = 8 } = {}) {
  const [results, setResults] = useState([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let current = true;
    const trimmed = String(query || "").trim();
    if (!enabled || !trimmed) {
      setResults([]);
      setPending(false);
      return () => { current = false; };
    }

    // Do not leave suggestions for the previous spelling visible during the debounce window.
    setResults([]);
    setPending(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchDictionary(trimmed, { limit });
        if (current) setResults(found);
      } catch {
        if (current) setResults([]);
      } finally {
        if (current) setPending(false);
      }
    }, DICTIONARY_SEARCH_DEBOUNCE_MS);

    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [enabled, limit, query]);

  return { results, pending };
}

/** Compact, disambiguated dictionary rows shared by attachment and creation pickers. */
export function DictionaryResultRows({
  results = [],
  onPick,
  disabledEntryIds = new Set(),
  disabledLabel = "Already in your cuaderno",
  emptyMessage = "",
  showReason = false,
}) {
  if (results.length === 0) {
    return emptyMessage ? (
      <div className="text-xs py-2" style={{ color: C.mut }}>
        {emptyMessage}
      </div>
    ) : null;
  }

  return results.map(({ entry, reason }) => {
    const disabled = disabledEntryIds.has(entry.id);
    return (
      <button
        key={entry.id}
        type="button"
        disabled={disabled}
        onClick={() => onPick(entry)}
        className="w-full min-h-11 text-left flex items-center gap-2 px-2 py-1.5 rounded-lg"
        style={{ background: C.paper, opacity: disabled ? 0.58 : 1 }}
      >
        <div className="min-w-0 flex-1">
          <span style={{ fontFamily: SERIF, color: C.ink, fontWeight: 600 }}>{entry.lemma}</span>
          <span className="italic text-xs ml-1.5" style={{ color: C.mut }}>
            {grammarAbbreviations(entry.pos, entry.gender)}
          </span>
          <div className="text-xs truncate" style={{ color: C.mut }}>
            {entry.senses?.[0]?.gloss}
          </div>
          {showReason && reason && (
            <div className="text-xs italic truncate" style={{ color: C.mut }}>
              {reason}
            </div>
          )}
        </div>
        {disabled ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[11px]" style={{ color: C.mut }}>
            <Check size={12} /> {disabledLabel}
          </span>
        ) : (
          <ChevronRight size={14} className="shrink-0" style={{ color: C.mut }} />
        )}
      </button>
    );
  });
}
