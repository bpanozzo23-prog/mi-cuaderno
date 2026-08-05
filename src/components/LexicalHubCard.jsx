import { Bookmark, BookmarkCheck } from "lucide-react";
import { C, Hi, MONO, SERIF, hubTitleSize } from "../theme.jsx";
import { emptyReviewState } from "../lib/review.js";
import { firstMeaningGloss } from "../lib/meanings.js";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import PageContextSummary from "./PageContextSummary.jsx";
import TagChip from "./TagChip.jsx";

/**
 * A browsing card carries no review state. The queue's verdict — box, due, retired — is only
 * useful where it can be acted on, which is Repaso and the entry itself (§12); on a scanning
 * surface it was a chip on nearly every card saying something the owner could do nothing about.
 * The tricky highlighter on the headword stays, because that one is the owner's own mark.
 */
export default function LexicalHubCard({
  item,
  review = emptyReviewState,
  contexts = [],
  pinned = false,
  reason = null,
  onOpen,
  onPinnedChange,
}) {
  const suffix = personalHeadingSuffix(item);
  const gloss = firstMeaningGloss(item);

  return (
    <div
      role="group"
      aria-label={item.term}
      className="relative w-full rounded-2xl border"
      style={{ background: C.card, borderColor: C.line }}
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={item.term}
        className="w-full text-left px-4 py-3 pr-14 active:opacity-80"
      >
        <div
          className={`min-w-0 leading-tight ${hubTitleSize(item.term)}`}
          style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}
        >
          <Hi on={review.tricky}>{item.term}</Hi>
          {suffix && (
            <>
              {" "}
              <span className="ml-1 text-sm font-normal italic" style={{ color: C.mut }}>
                {suffix}
              </span>
            </>
          )}
        </div>

        {gloss && (
          <div className="mt-1.5 line-clamp-2 text-sm leading-relaxed" style={{ color: C.ink }}>
            — {gloss}
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        )}

        {reason && (
          <div className="mt-2 text-xs italic" style={{ color: C.mut }}>
            {reason}
          </div>
        )}
      </button>

      {/*
        Outside the card button on purpose: each row opens its own page, and a button inside a
        button is invalid HTML.
      */}
      {contexts.length > 0 && (
        <div className="-mt-2 px-4 pb-3">
          <PageContextSummary
            contexts={contexts}
            onOpenPage={onOpen}
            onOpenMore={() => onOpen(item.id)}
          />
        </div>
      )}

      <button
        type="button"
        aria-label={`${pinned ? "Unpin" : "Pin"} ${item.term}`}
        aria-pressed={pinned}
        onClick={() => onPinnedChange(item.id, !pinned)}
        className="absolute right-1.5 top-1.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-70"
        style={{ color: pinned ? C.pen : C.mut, fontFamily: MONO }}
      >
        {pinned ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
      </button>
    </div>
  );
}
