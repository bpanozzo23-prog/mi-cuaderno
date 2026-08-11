import { C, MONO, SERIF } from "../theme.jsx";

/**
 * Pure rendering of one stored review — verdict badge, summary and margin notes — shared by the
 * reader's feedback panel and the journal editor's read-only view, so the two can never drift.
 * No behavior, no database access.
 */

export const VERDICT_LABELS = {
  clear: "Clear",
  mostly_clear: "Mostly clear",
  hard_to_follow: "Hard to follow",
};

const verdictStyle = (verdict) => {
  if (verdict === "clear") return { background: C.greenPale, color: C.green };
  if (verdict === "hard_to_follow") return { background: C.redPale, color: C.red };
  return { background: C.penPale, color: C.penDark };
};

/** One label and colour per category, so a margin note reads at a glance without a legend. */
const CATEGORY_LABELS = {
  error: { label: "Error", color: C.red },
  naturalness: { label: "More natural", color: C.penDark },
  unclear: { label: "Unclear", color: C.mut },
  praise: { label: "Well done", color: C.green },
};

export default function FeedbackReview({ review, staleNote }) {
  return (
    <>
      <div>
        <span
          className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
          style={verdictStyle(review.verdict)}
        >
          {VERDICT_LABELS[review.verdict]}
        </span>
        {staleNote && (
          <div className="mt-1.5 text-xs" style={{ color: C.mut }}>{staleNote}</div>
        )}
        <div className="mt-2 text-sm leading-relaxed break-words" style={{ color: C.ink }}>
          {review.summary}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-[11px] font-semibold uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
          Margin notes
        </h3>
        {review.items.length === 0 ? (
          <div className="mt-1.5 text-sm" style={{ color: C.mut }}>
            Nothing to flag — this entry reads well.
          </div>
        ) : (
          <div className="mt-1.5 space-y-2.5">
            {review.items.map((item, index) => {
              const category = CATEGORY_LABELS[item.category];
              return (
                <div
                  key={`${item.quote}-${index}`}
                  className="rounded-lg border p-2.5"
                  style={{ background: C.paper, borderColor: C.line }}
                >
                  <div className="text-[10px] font-semibold uppercase" style={{ color: category.color, fontFamily: MONO, letterSpacing: "0.08em" }}>
                    {category.label}
                  </div>
                  <div className="mt-1 text-sm italic break-words" style={{ color: C.ink, fontFamily: SERIF }}>
                    {item.quote}
                  </div>
                  {item.corrected !== null && item.corrected !== item.quote && (
                    <div className="mt-1 text-sm break-words" style={{ color: C.green, fontFamily: SERIF }}>
                      → {item.corrected}
                    </div>
                  )}
                  <div className="mt-1 text-xs leading-relaxed break-words" style={{ color: C.mut }}>
                    {item.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
