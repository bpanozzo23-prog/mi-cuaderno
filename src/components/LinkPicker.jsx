import { useEffect, useMemo, useState } from "react";
import { Search, X, Check, FileText, BookMarked, CalendarDays, Type, Plus } from "lucide-react";
import { C, SERIF, MONO, Card } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { POS_LABEL } from "./DictCard.jsx";
import DuplicateWarning from "./DuplicateWarning.jsx";
import { pickerMatches } from "../lib/links.js";
import { mergeResults } from "../lib/search.js";
import { findPersonalHeadingDuplicates } from "../lib/duplicateGuard.js";
import { searchDictionary } from "../db/ref/search.js";
import { installedMeta } from "../db/ref/entries.js";
import { meaningGlossText } from "../lib/meanings.js";

/**
 * One box for linking anything (Phase 4, requirement 1).
 *
 * It replaces two separate controls on the detail screen: a `<select>` listing every personal
 * item, which stops being usable at a few hundred words, and a separate "link a dictionary
 * word" button. Both layers are searched here, because `linkedKeys[]` may point at either
 * (section 6) and the owner should not have to know which layer a word lives in before
 * looking for it.
 *
 * The cross-cutting acceptance criterion for this phase is that **linking never requires
 * navigating away**. Nothing in here opens another screen: the picker sits inside the detail
 * screen, and picking a result links it and stays put.
 *
 * Personal matching is synchronous over items already in memory, so it lands on every
 * keystroke. Only the dictionary half is debounced and guarded against out-of-order replies —
 * it reads IndexedDB, and a slow query for "sac" must never overwrite the results for "sacar"
 * typed after it. Both idioms are Cuaderno's (Phase 2e).
 */

const SEARCH_DEBOUNCE_MS = 140;
const LIMIT = 8;

/**
 * What tells two similar results apart, at a glance, on a phone. Always one line, so a
 * multi-line meaning is flattened rather than truncated at its first line break.
 */
const flatten = (text) => text.replace(/\s+/g, " ").trim();

function contextLine(item) {
  if (item.type === "page") {
    if (item.pageDate) return item.pageDate;
    return item.body ? flatten(item.body).slice(0, 60) : "page";
  }
  const glosses = meaningGlossText(item, " · ");
  return glosses ? flatten(glosses) : item.notes ? flatten(item.notes).slice(0, 60) : "";
}

function Row({ icon: Icon, heading, suffix, context, reason, linked, onPick }) {
  return (
    <button
      onClick={linked ? undefined : onPick}
      disabled={linked}
      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg"
      style={{ background: C.paper, opacity: linked ? 0.55 : 1 }}
    >
      <Icon size={13} className="shrink-0" style={{ color: C.mut }} />
      <div className="min-w-0 flex-1">
        <span style={{ fontFamily: SERIF, color: C.ink, fontWeight: 600 }}>{heading}</span>
        {suffix && (
          <>
            {" "}
            <span className="italic text-xs ml-1.5" style={{ color: C.mut }}>
              {suffix}
            </span>
          </>
        )}
        {context && (
          <div className="text-xs truncate" style={{ color: C.mut }}>
            {context}
          </div>
        )}
        {reason && (
          <div className="text-xs italic truncate" style={{ color: C.mut }}>
            {reason}
          </div>
        )}
      </div>
      {linked && (
        <span
          className="shrink-0 inline-flex items-center gap-1 text-[11px]"
          style={{ fontFamily: MONO, color: C.mut }}
        >
          <Check size={12} /> linked
        </span>
      )}
    </button>
  );
}

/**
 * Quick-create-and-link (requirement 2): when nothing suitable exists, make it here.
 *
 * The point is what does NOT happen — the owner does not leave the page they are writing to
 * go and create a word. Creating logs a `create` event (it is content) and linking logs
 * nothing (it is bookkeeping, Phase 1c); neither navigates, so a half-written journal entry
 * is still on screen, still unsaved, still exactly as it was.
 *
 * A query with a space in it becomes a `phrase` rather than a `word` — brief §7 makes both
 * first-class, and "de repente" is not a word.
 */
function CreateRow({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg"
      style={{ background: C.penPale, color: C.penDark }}
    >
      <Icon size={13} className="shrink-0" />
      <span className="text-sm truncate">{label}</span>
    </button>
  );
}

export default function LinkPicker({ item, items, linkedKeys, onPick, onCancel, onCreate }) {
  const [query, setQuery] = useState("");
  const [dictResults, setDictResults] = useState([]);
  const [dictionaryMeta, setDictionaryMeta] = useState(null);
  const typed = query.trim();

  const personal = useMemo(
    () => pickerMatches(items, query, { excludeId: item.id, limit: LIMIT }),
    [items, query, item.id]
  );
  const lexicalDuplicates = useMemo(
    () => findPersonalHeadingDuplicates(items, "lexical", typed),
    [items, typed]
  );
  const pageDuplicates = useMemo(
    () => findPersonalHeadingDuplicates(items, "page", typed),
    [items, typed]
  );

  useEffect(() => {
    let current = true;
    installedMeta().then((meta) => {
      if (current) setDictionaryMeta(meta);
    });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    const timer = setTimeout(async () => {
      const found = await searchDictionary(query, { limit: LIMIT });
      if (current) setDictResults(found);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  /**
   * The same merge the search screen uses (Phase 2e): tier decides first, the owner's own
   * item wins inside a tier, and a dictionary entry the owner has already attached to one of
   * their items is REPLACED by that item. Without that last rule the picker would offer
   * *sacar* twice — once as their word, once as the dictionary's — and linking the entry
   * rather than their own note is almost never what they meant.
   */
  const rows = useMemo(
    () => mergeResults(personal, dictResults, items, {
      previousIds: dictionaryMeta?.previousIds,
    }).slice(0, LIMIT),
    [personal, dictResults, items, dictionaryMeta]
  );

  return (
    <Card className="mt-2" style={{ borderColor: C.pen }}>
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 border" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.mut }} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Link a word, phrase, page or dictionary entry…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: C.ink }}
        />
        <button onClick={onCancel} aria-label="Cancel">
          <X size={14} style={{ color: C.mut }} />
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {rows.length === 0 && (
          <div className="text-xs py-2" style={{ color: C.mut }}>
            {typed ? "Nothing matches that yet." : "Nothing else in the cuaderno to link to yet."}
          </div>
        )}

        {rows.map((row) =>
          row.kind === "entry" ? (
            <Row
              key={row.key}
              icon={BookMarked}
              heading={row.entry.lemma}
              suffix={POS_LABEL[row.entry.pos] || row.entry.pos}
              context={row.entry.senses?.[0]?.gloss}
              reason={row.reason}
              linked={linkedKeys.has(row.entry.id)}
              onPick={() => onPick(row.entry.id)}
            />
          ) : (
            <Row
              key={row.key}
              icon={row.item.type === "page" ? (row.item.pageDate ? CalendarDays : FileText) : Type}
              heading={row.item.type === "page" ? row.item.title || "Untitled page" : row.item.term}
              suffix={row.item.type === "page" ? null : personalHeadingSuffix(row.item)}
              context={contextLine(row.item)}
              reason={row.reason}
              linked={linkedKeys.has(row.item.id)}
              onPick={() => onPick(row.item.id)}
            />
          )
        )}
      </div>

      {typed && (
        <div className="mt-2 pt-2 space-y-1 border-t" style={{ borderColor: C.line }}>
          <div className="space-y-1">
            {lexicalDuplicates.length > 0 && <DuplicateWarning kind="lexical" />}
            <CreateRow
              icon={Plus}
              label={`Create ${typed.includes(" ") ? "phrase" : "word"} “${typed}” and link it`}
              onClick={() => onCreate("lexical", typed)}
            />
          </div>
          <div className="space-y-1">
            {pageDuplicates.length > 0 && <DuplicateWarning kind="page" />}
            <CreateRow
              icon={Plus}
              label={`Create page “${typed}” and link it`}
              onClick={() => onCreate("page", typed)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
