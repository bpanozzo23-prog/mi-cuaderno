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
      style={{
        background: C.card,
        borderColor: C.line,
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        aria-label={item.term}
        className="w-full text-left px-4 py-3 pr-14 active:opacity-80"
      >
        <div
          className={`min-w-0 leading-tight ${hubTitleSize(item.term)}`}
          style={{
            fontFamily: SERIF,
            color: C.ink,
            fontWeight: 700,
            fontStyle: "normal",
          }}
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
          <div
            className="mt-2 pl-[26px] -indent-[16px] line-clamp-2 text-[13px] leading-relaxed"
            style={{ color: C.entryMeaning }}
          >
            <span style={{ color: C.entryMeaningDash }}>—</span> {gloss}
          </div>
        )}

        {reason && (
          <div className="mt-2 text-xs italic" style={{ color: C.mut }}>
            {reason}
          </div>
        )}
      </button>

      {/*
        Outside the card button on purpose: each page row opens its own page, and a button inside a
        button is invalid HTML. The tags moved out with it so the placement chip and the tag chips
        share one line — two half-empty rows of chips was the card's widest wasted space.
      */}
      {(contexts.length > 0 || item.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 pb-3">
          {contexts.length > 0 && (
            <PageContextSummary
              className="min-w-0 flex-1 basis-1/2"
              contexts={contexts}
              onOpenPage={onOpen}
              onOpenMore={() => onOpen(item.id)}
            />
          )}
          {item.tags.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
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
