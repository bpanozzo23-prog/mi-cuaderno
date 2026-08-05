import { Bookmark, BookmarkCheck } from "lucide-react";
import { C, Hi, MONO, SERIF, hubTitleSize } from "../theme.jsx";
import { emptyReviewState } from "../lib/review.js";
import { meaningGlossText } from "../lib/meanings.js";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import PageContextSummary from "./PageContextSummary.jsx";

/**
 * How a word is going, in one badge. Read-only: the hub shows the queue's verdict and never
 * changes it, because grading belongs to Repaso (§12).
 *
 * Retired is checked before enrolment on purpose. A word that graduated and is not highlighted or
 * being looked up is no longer enrolled, so asking about enrolment first would hide the very state
 * the owner most wants to see.
 *
 * An enrolled word that is not due gets no badge. Its Leitner box number is real, but it is
 * scheduler bookkeeping the owner cannot act on while browsing, it appears nowhere else in the app
 * — not Repaso, not the entry, not this hub's own Learning filter — and a badge on nearly every
 * card costs the scan more than it gives it.
 */
export function learningBadge(review) {
  if (review?.graduated) return { label: "Retired", background: C.greenPale, color: C.green };
  if (!review?.enrolled) return null;
  if (review.due) return { label: "Due today", background: "#F7E9E5", color: C.red };
  return null;
}

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
  const glosses = meaningGlossText(item);
  const badge = learningBadge(review);

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

        {glosses && (
          <div
            className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: C.ink }}
          >
            {glosses}
          </div>
        )}

        {/*
          One row for both kinds of chip, so a word with a review state and tags does not cost two.
          Filled always means a review state the queue decided; outlined always means a label the
          owner wrote.
        */}
        {(badge || item.tags.length > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {badge && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs"
                style={{ background: badge.background, color: badge.color }}
              >
                {badge.label}
              </span>
            )}
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                style={{ borderColor: C.line, background: "transparent", color: C.mut }}
              >
                {tag}
              </span>
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
