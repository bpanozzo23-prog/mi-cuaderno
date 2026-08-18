import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { C } from "../theme.jsx";
import { logEvent, EVENT_TYPES } from "../db/events.js";

/**
 * A search_miss is logged only once the typing has settled and the query still
 * found nothing — keystrokes on the way to a word are not misses. Queries already
 * logged this session are not logged again, so a failed search the owner stares at
 * does not become twenty identical events.
 *
 * `pending` is true while the dictionary lookup is still in flight. A miss means "I
 * looked for this and it does not exist" (§7); logging one before the reference layer
 * has answered would record words the dictionary was about to find.
 *
 * `logMisses` is the same rule for a search that never consults the dictionary at all. The
 * Words & phrases hub searches only personal vocabulary, so it cannot tell a genuine miss from a
 * word the dictionary holds — it hands the query to Cuaderno's mixed list, which can.
 */
export const SEARCH_SETTLE_MS = 1500;
const loggedThisSession = new Set();

export default function SearchBar({
  value,
  onChange,
  resultCount,
  pending = false,
  onMissLogged,
  logMisses = true,
  placeholder = "Search words, meanings, notes, pages…",
  inputLabel = "Search notebook",
  autoFocus = false,
  className = "",
  inputClassName = "",
}) {
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    const query = value.trim();
    if (!query || resultCount > 0 || pending || !logMisses) return;

    timer.current = setTimeout(async () => {
      const key = query.toLowerCase();
      if (loggedThisSession.has(key)) return;
      loggedThisSession.add(key);
      await logEvent(EVENT_TYPES.searchMiss, null, { query });
      onMissLogged?.();
    }, SEARCH_SETTLE_MS);

    return () => clearTimeout(timer.current);
  }, [value, resultCount, pending, logMisses]);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-pen)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-paper)] ${className}`}
      style={{ background: C.card, borderColor: C.line }}
    >
      <Search size={16} style={{ color: C.mut }} />
      <input
        aria-label={inputLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${inputClassName}`}
        style={{ color: C.ink }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]"
        >
          <X size={14} style={{ color: C.mut }} />
        </button>
      )}
    </div>
  );
}
