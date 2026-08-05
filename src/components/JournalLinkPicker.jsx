import { useMemo, useState } from "react";
import { Check, FileText, Library, Search, Type, X } from "lucide-react";
import { C, Card, MONO, SERIF } from "../theme.jsx";
import { pickerMatches } from "../lib/links.js";
import { isJournalEntry } from "../lib/journal.js";
import { meaningGlossText } from "../lib/meanings.js";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { isImplicitRelationship, normalizeRelationship } from "../lib/relationships.js";
import RelationshipSelect from "./RelationshipSelect.jsx";

const LIMIT = 8;

export default function JournalLinkPicker({
  mode,
  item,
  items,
  linkedIds,
  connections = [],
  onPick,
  onClose,
}) {
  const [query, setQuery] = useState("");
  const [relationship, setRelationship] = useState(() => normalizeRelationship());
  const connectionByKey = useMemo(
    () => new Map(connections.map((connection) => [connection.key, connection])),
    [connections]
  );
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
      <RelationshipSelect relationship={relationship} onChange={setRelationship} />

      <div className="mt-2 flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.mut }} />
        <input
          autoFocus
          aria-label={mode === "vocabulary" ? "Find personal vocabulary" : "Find a page relation"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={mode === "vocabulary" ? "Find one of your words or phrases…" : "Find one of your Pages…"}
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
          const hasVocabulary = isPage && candidate.collection?.enabled === true;
          const heading = isPage ? candidate.title || "Untitled page" : candidate.term;
          const context = isPage
            ? candidate.body?.replace(/\s+/g, " ").trim().slice(0, 70)
            : meaningGlossText(candidate, " · ");
          const Icon = isPage ? (hasVocabulary ? Library : FileText) : Type;
          return (
            <button
              type="button"
              key={candidate.id}
              onClick={() => linked
                ? undefined
                : isImplicitRelationship(relationship)
                  ? onPick(candidate.id)
                  : onPick(candidate.id, relationship)}
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
              {linked && (
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
                  <Check size={13} /> {connectionByKey.get(candidate.id)?.label || "Related"}
                </span>
              )}
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
