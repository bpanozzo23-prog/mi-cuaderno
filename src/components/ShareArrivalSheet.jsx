import { useMemo, useState } from "react";
import { BookOpen, FileText, Link2, Search, Sigma, Type, X } from "lucide-react";
import { C, SERIF, Card } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { pickerMatches } from "../lib/links.js";
import { isJournalEntry } from "../lib/journal.js";
import { grammarShareStarter, sourceShareStarter } from "../lib/shareTarget.js";

/**
 * Destination chooser for a URL shared in from another Android app (share_target → App's
 * startup dispatch → Cuaderno). The owner's dominant case is short learning videos, several a
 * week, so "always a new Source page" would scatter near-empty pages; this sheet routes
 * instead. It writes nothing itself except through `onAttach`, which the parent implements as
 * one ordinary media-link edit — dismissing the sheet leaves the notebook untouched.
 *
 * The picker searches personal pages, words and phrases only (both already carry
 * `mediaLinks`). No dictionary layer and no relationships: this is attaching a video, not
 * linking content, and a dictionary entry is read-only. Journal entries are excluded — a
 * shared video is reference material, not a diary moment.
 */

const PICKER_LIMIT = 8;

function DestinationRow({ icon: Icon, title, description, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="flex items-start gap-3 p-4">
        <Icon size={18} style={{ color: C.pen, marginTop: 2, flexShrink: 0 }} />
        <div className="min-w-0">
          <div style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>{title}</div>
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: C.mut }}>
            {description}
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function ShareArrivalSheet({ share, items = [], onAttach, onCreate, onClose }) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");

  const candidates = useMemo(
    () => items.filter((item) => !isJournalEntry(item)),
    [items]
  );
  const rows = useMemo(
    () => pickerMatches(candidates, query, { limit: PICKER_LIMIT }),
    [candidates, query]
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: C.scrim }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-arrival-title"
        className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-2 max-h-[88vh] overflow-y-auto"
        style={{ background: C.paper }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="min-w-0">
            <div
              id="share-arrival-title"
              className="font-semibold"
              style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}
            >
              Compartido — ¿dónde lo guardas?
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-1 min-w-0" style={{ color: C.mut }}>
              <Link2 size={12} className="shrink-0" />
              <span className="truncate">{share.title || share.url}</span>
            </div>
            {share.title && (
              <div className="text-xs truncate" style={{ color: C.mut }}>
                {share.url}
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close share destinations" className="p-1">
            <X size={18} style={{ color: C.mut }} />
          </button>
        </div>

        {!picking && (
          <>
            <DestinationRow
              icon={FileText}
              title="Add to an existing page or word"
              description="Attach the link to something you already have — it becomes a Media link there."
              onClick={() => setPicking(true)}
            />
            <DestinationRow
              icon={Sigma}
              title="New Grammar guide"
              description="This video is a new grammar topic. Start a guide with the video attached."
              onClick={() => onCreate(grammarShareStarter(share))}
            />
            <DestinationRow
              icon={BookOpen}
              title="New Source notebook"
              description="A work you will keep returning to, with captures and its own vocabulary."
              onClick={() => onCreate(sourceShareStarter(share))}
            />
          </>
        )}

        {picking && (
          <>
            <div
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 border"
              style={{ borderColor: C.line }}
            >
              <Search size={14} style={{ color: C.mut }} />
              <input
                autoFocus
                aria-label="Search destinations"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a page, word or phrase…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: C.ink }}
              />
              <button
                onClick={() => {
                  setPicking(false);
                  setQuery("");
                }}
                aria-label="Back to destinations"
              >
                <X size={14} style={{ color: C.mut }} />
              </button>
            </div>
            <div className="space-y-1">
              {rows.length === 0 && (
                <div className="text-xs py-2" style={{ color: C.mut }}>
                  {query.trim() ? "Nothing matches that yet." : "Nothing in the cuaderno yet."}
                </div>
              )}
              {rows.map(({ item }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAttach(item)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{ background: C.card }}
                >
                  {item.type === "page" ? (
                    <FileText size={13} className="shrink-0" style={{ color: C.mut }} />
                  ) : (
                    <Type size={13} className="shrink-0" style={{ color: C.mut }} />
                  )}
                  <span className="min-w-0 truncate" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 600 }}>
                    {item.type === "page" ? item.title || "Untitled page" : item.term}
                  </span>
                  {item.type !== "page" && (
                    <span className="italic text-xs shrink-0" style={{ color: C.mut }}>
                      {personalHeadingSuffix(item)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
