import { FileText, CalendarDays } from "lucide-react";
import { C, SERIF, MONO, Hi } from "../theme.jsx";
import { emptyItemState } from "../useNotebook.js";

export const POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "other"];
export const POS_ABBR = { noun: "s.", verb: "v.", adjective: "adj.", adverb: "adv.", other: "" };

export default function ItemCard({ item, state = emptyItemState, onOpen, reason }) {
  const isPage = item.type === "page";
  return (
    <button
      onClick={() => onOpen(item.id)}
      className="w-full text-left rounded-xl border px-4 py-3 active:opacity-80"
      style={{ background: C.card, borderColor: C.line }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-lg min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
          {isPage && <FileText size={14} className="inline mr-1.5 -mt-0.5" style={{ color: C.mut }} />}
          <Hi on={state.tricky}>{isPage ? item.title || "Untitled page" : item.term}</Hi>
          {!isPage && item.form === "phrase" && (
            <span className="italic font-normal text-sm ml-2" style={{ color: C.mut }}>
              loc.
            </span>
          )}
          {!isPage && item.form !== "phrase" && POS_ABBR[item.pos] && (
            <span className="italic font-normal text-sm ml-2" style={{ color: C.mut }}>
              {POS_ABBR[item.pos]}
            </span>
          )}
        </div>
        {state.views > 0 && (
          <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
            ×{state.views}
          </span>
        )}
      </div>

      {/* Clamped: a meaning with several lines must not stretch a row in a long list. */}
      {!isPage && item.translation && (
        <div className="text-sm mt-0.5 whitespace-pre-wrap line-clamp-2" style={{ color: C.ink }}>
          — {item.translation}
        </div>
      )}
      {isPage && item.pageDate && (
        <div className="text-xs mt-1 inline-flex items-center gap-1" style={{ fontFamily: MONO, color: C.mut }}>
          <CalendarDays size={11} /> {item.pageDate}
        </div>
      )}
      {isPage && item.body && (
        <div className="text-sm mt-1 line-clamp-2" style={{ color: C.mut }}>
          {item.body.slice(0, 120)}
          {item.body.length > 120 ? "…" : ""}
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {item.tags.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: C.penPale, color: C.penDark }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {reason && (
        <div className="mt-1.5 text-xs italic" style={{ color: C.mut }}>
          {reason}
        </div>
      )}
    </button>
  );
}
