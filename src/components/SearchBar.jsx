import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { C } from "../theme.jsx";
import { logEvent, EVENT_TYPES } from "../db/events.js";

/**
 * A search_miss is logged only once the typing has settled and the query still
 * found nothing — keystrokes on the way to a word are not misses. Queries already
 * logged this session are not logged again, so a failed search the owner stares at
 * does not become twenty identical events.
 */
export const SEARCH_SETTLE_MS = 1500;
const loggedThisSession = new Set();

export default function SearchBar({ value, onChange, resultCount, onMissLogged }) {
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    const query = value.trim();
    if (!query || resultCount > 0) return;

    timer.current = setTimeout(async () => {
      const key = query.toLowerCase();
      if (loggedThisSession.has(key)) return;
      loggedThisSession.add(key);
      await logEvent(EVENT_TYPES.searchMiss, null, { query });
      onMissLogged?.();
    }, SEARCH_SETTLE_MS);

    return () => clearTimeout(timer.current);
  }, [value, resultCount]);

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 border"
      style={{ background: C.card, borderColor: C.line }}
    >
      <Search size={16} style={{ color: C.mut }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search words, meanings, notes, pages…"
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: C.ink }}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search">
          <X size={14} style={{ color: C.mut }} />
        </button>
      )}
    </div>
  );
}
