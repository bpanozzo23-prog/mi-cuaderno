import { useMemo, useState } from "react";
import { Check, FileText, Library, Search, Type, X } from "lucide-react";
import { C, Card, MONO, SERIF } from "../theme.jsx";
import { pickerMatches } from "../lib/links.js";
import { isJournalEntry } from "../lib/journal.js";
import { meaningGlossText } from "../lib/meanings.js";
import { effectivePageKind, PAGE_KINDS } from "../lib/pageProfiles.js";
import { personalHeadingSuffix } from "./ItemCard.jsx";

const LIMIT = 8;

export default function JournalLinkPicker({ mode, item, items, linkedIds, onPick, onClose }) {
  const [query, setQuery] = useState("");
  const candidates = useMemo(
    () => items.filter((candidate) => {
      if (candidate.id === item.id) return false;
      if (mode === "vocabulary") return candidate.type === "lexical";
      return candidate.type === "page" && !isJournalEntry(candidate);
    }),
    [item.id, items, mode]
  );
  const results = useMemo(
    () => pickerMatches(candidates, query, { limit: LIMIT }),
    [candidates, query]
  );

  return (
    <Card className="mt-2" style={{ borderColor: C.pen }}>
      <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.mut }} />
        <input
          autoFocus
          aria-label={mode === "vocabulary" ? "Find personal vocabulary" : "Find a page relation"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === "vocabulary" ? "Find one of your words or phrases…" : "Find a General page or Collection…"}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: C.ink }}
        />
        <button type="button" onClick={onClose} aria-label="Close link picker" className="p-1">
          <X size={14} style={{ color: C.mut }} />
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {results.length === 0 && (
          <div className="px-1 py-2 text-xs" style={{ color: C.mut }}>
            {query.trim() ? "Nothing personal matches that." : mode === "vocabulary" ? "No personal vocabulary to add yet." : "No pages to relate yet."}
          </div>
        )}
        {results.map(({ item: candidate }) => {
          const linked = linkedIds.has(candidate.id);
          const isPage = candidate.type === "page";
          const isCollection = isPage && effectivePageKind(candidate) === PAGE_KINDS.collection;
          const heading = isPage ? candidate.title || "Untitled page" : candidate.term;
          const context = isPage
            ? candidate.body?.replace(/\s+/g, " ").trim().slice(0, 70)
            : meaningGlossText(candidate, " · ");
          const Icon = isPage ? (isCollection ? Library : FileText) : Type;
          return (
            <button
              type="button"
              key={candidate.id}
              onClick={() => linked ? undefined : onPick(candidate.id)}
              disabled={linked}
              aria-label={`${linked ? "Already linked" : "Link"} ${heading}`}
              className="w-full rounded-lg px-2 py-2 text-left flex items-start gap-2"
              style={{ background: C.paper, opacity: linked ? 0.55 : 1 }}
            >
              <Icon size={14} className="mt-0.5 shrink-0" style={{ color: C.mut }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                  {heading}
                  {!isPage && personalHeadingSuffix(candidate) && (
                    <span className="ml-1.5 text-xs italic font-normal" style={{ color: C.mut }}>
                      {personalHeadingSuffix(candidate)}
                    </span>
                  )}
                </div>
                {context && <div className="truncate text-xs" style={{ color: C.mut }}>{context}</div>}
              </div>
              {linked && <Check size={13} className="mt-0.5 shrink-0" style={{ color: C.mut }} />}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
        {mode === "vocabulary" ? "Personal words and phrases only" : "Journal moments are related through reflection"}
      </div>
    </Card>
  );
}
