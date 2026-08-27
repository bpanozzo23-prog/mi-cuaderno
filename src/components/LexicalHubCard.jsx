import { Bookmark, BookmarkCheck } from "lucide-react";
import { C, Hi, MONO, SERIF, useHubTitleSize } from "../theme.jsx";
import { emptyReviewState } from "../lib/review.js";
import { firstMeaningGloss } from "../lib/meanings.js";
import { PosSuffix, personalHeadingSuffix } from "./ItemCard.jsx";
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
  meaningMatch = null,
  onOpen,
  onPinnedChange,
}) {
  const suffix = personalHeadingSuffix(item);
  const gloss = meaningMatch?.meaning?.gloss || firstMeaningGloss(item);
  const matchSummary = meaningMatch?.criteria
    ?.map(({ label, value }) => `${label}: ${value}`)
    .join(" · ");
  const additionalMatchSummary = meaningMatch?.additionalCount > 0
    ? `+${meaningMatch.additionalCount} matching ${meaningMatch.additionalCount === 1 ? "meaning" : "meanings"}`
    : "";
  /* The chip row is a sibling of the button, so the button's own bottom padding is the gap above
     it. When chips follow, that padding gives way to their row; with nothing below, the button
     keeps its full padding as the card's own bottom edge. */
  const hasChipRow = contexts.length > 0 || item.tags.length > 0;
  const [titleRef, titlePx] = useHubTitleSize(item.term);
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
        className={`w-full text-left px-4 pt-3 ${hasChipRow ? "pb-1" : "pb-3"} pr-14 active:opacity-80`}
      >
        <div
          ref={titleRef}
          className="min-w-0 leading-tight"
          style={{
            fontFamily: SERIF,
            color: C.ink,
            fontWeight: 700,
            fontStyle: "normal",
            fontSize: titlePx,
          }}
        >
          <Hi on={review.tricky}>{item.term}</Hi>
          {suffix && (
            <>
              {" "}
              <PosSuffix className="text-sm ml-2">{suffix}</PosSuffix>
            </>
          )}
        </div>

        {gloss && (
          <div
            className="mt-2 pl-[26px] -indent-[16px] line-clamp-2 text-[15px] leading-relaxed"
            style={{ fontFamily: SERIF, color: C.entryMeaning }}
          >
            <span style={{ color: C.entryMeaningDash }}>—</span> {gloss}
          </div>
        )}

        {matchSummary && (
          <div
            className="mt-1.5 break-words text-xs leading-relaxed"
            style={{ fontFamily: MONO, color: C.penDark }}
          >
            {matchSummary}{additionalMatchSummary && ` · ${additionalMatchSummary}`}
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
      {hasChipRow && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 pb-2">
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
