import { FileText, CalendarDays, Library, Pin } from "lucide-react";
import { C, SERIF, MONO, Hi } from "../theme.jsx";
import { emptyItemState } from "../useNotebook.js";
import { meaningGlossText } from "../lib/meanings.js";
import { PAGE_KINDS, effectivePageKind } from "../lib/pageProfiles.js";
import { deriveCollection } from "../lib/collections.js";

export const POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "other"];
export const POS_ABBR = { noun: "s.", verb: "v.", adjective: "adj.", adverb: "adv.", other: "" };

/** Personal `form` terminology. Dictionary part-of-speech labels remain separate. */
export const personalLexicalForm = (item) => (item?.form === "phrase" ? "phrase" : "word");
export const personalHeadingSuffix = (item) =>
  personalLexicalForm(item) === "phrase" ? "phrase" : POS_ABBR[item?.pos] || "";

const amount = (count, singular) => `${count} ${count === 1 ? singular : `${singular}s`}`;

export default function ItemCard({
  item,
  state = emptyItemState,
  onOpen,
  reason,
  items = [],
  pinned = false,
  onPinnedChange,
}) {
  const isPage = item.type === "page";
  const pageKind = isPage ? effectivePageKind(item) : null;
  const isCollection = pageKind === PAGE_KINDS.collection;
  const collection = isCollection ? deriveCollection(item, items) : null;
  const headingSuffix = isPage ? "" : personalHeadingSuffix(item);
  const glosses = isPage ? "" : meaningGlossText(item);
  const title = isPage ? item.title || "Untitled page" : item.term;
  const PageIcon = isCollection ? Library : FileText;

  return (
    <div
      className="relative w-full rounded-xl border"
      style={{ background: C.card, borderColor: C.line }}
    >
      <button
        onClick={() => onOpen(item.id)}
        className={`w-full text-left px-4 py-3 active:opacity-80 ${
          isPage && onPinnedChange ? "pr-14" : ""
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
            {isPage && <PageIcon size={14} className="inline mr-1.5 -mt-0.5" style={{ color: C.mut }} />}
            <Hi on={state.tricky}>{title}</Hi>
            {headingSuffix && (
              <>
                {" "}
                <span className="italic font-normal text-sm ml-2" style={{ color: C.mut }}>
                  {headingSuffix}
                </span>
              </>
            )}
          </div>
          {state.views > 0 && (
            <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
              ×{state.views}
            </span>
          )}
        </div>

        {/* Clamped: a meaning with several lines must not stretch a row in a long list. */}
        {!isPage && glosses && (
          <div className="text-sm mt-0.5 whitespace-pre-wrap line-clamp-2" style={{ color: C.ink }}>
            — {glosses}
          </div>
        )}
        {isCollection && (
          <div className="text-xs mt-1" style={{ fontFamily: MONO, color: C.mut }}>
            Collection · {amount(collection.itemCount, "item")} · {amount(collection.groupCount, "group")}
          </div>
        )}
        {pageKind === PAGE_KINDS.journal && item.pageDate && (
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

      {isPage && onPinnedChange && (
        <button
          type="button"
          aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`}
          aria-pressed={pinned}
          onClick={() => onPinnedChange(!pinned)}
          className="absolute top-1.5 right-1.5 min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg active:opacity-70"
          style={{ color: pinned ? C.pen : C.mut }}
        >
          <Pin size={17} fill={pinned ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}
