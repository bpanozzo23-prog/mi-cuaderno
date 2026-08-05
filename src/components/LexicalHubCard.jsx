import { Bookmark, BookmarkCheck } from "lucide-react";
import { C, Hi, MONO, SERIF } from "../theme.jsx";
import { emptyItemState } from "../useNotebook.js";
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
 */
export function learningBadge(review) {
  if (review?.graduated) return { label: "Retired", background: C.greenPale, color: C.green };
  if (!review?.enrolled) return null;
  if (review.due) return { label: "Due today", background: "#F7E9E5", color: C.red };
  return { label: `Box ${review.box}`, background: C.penPale, color: C.penDark };
}

export default function LexicalHubCard({
  item,
  state = emptyItemState,
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
      className="relative w-full rounded-2xl border"
      style={{ background: C.card, borderColor: C.line }}
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={item.term}
        className="w-full text-left px-4 py-4 pr-14 active:opacity-80"
      >
        <div className="flex items-baseline justify-between gap-3">
          <div
            className="min-w-0 text-[22px] leading-tight"
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
          {state.views > 0 && (
            <span className="shrink-0 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              ×{state.views}
            </span>
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

        {badge && (
          <div className="mt-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-xs"
              style={{ background: badge.background, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
        )}

        <PageContextSummary contexts={contexts} />

        {item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ background: C.penPale, color: C.penDark }}
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
