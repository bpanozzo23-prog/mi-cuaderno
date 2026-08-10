import { useState } from "react";
import { ChevronLeft, Eye, Highlighter, RotateCcw, ArrowLeftRight } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button } from "../theme.jsx";
import { logReview } from "../db/events.js";
import { GRADES } from "../lib/review.js";
import { PracticeCard, ReviewGradeStrip, usePracticeCardState } from "./PracticeCard.jsx";

/**
 * One pass through today's due words (brief section 12).
 *
 * The card list is snapshotted when the session starts. Grading reloads the notebook so
 * the counts behind this screen stay true, and the reload re-derives every due date —
 * so without the snapshot the card under the owner's thumb would vanish mid-session.
 *
 * The four grade buttons write through logReview and nothing else, which is what guarantees
 * section 12's "every review event carries a grade": there is no other way to log one.
 * They are disabled between the tap and the advance, so a double-tap cannot grade the
 * next word — the same hazard the session window solved for view events in Phase 1d,
 * met here in a click handler rather than an effect.
 *
 * Each card arrives with its direction already decided (Phase 10a, cardDirection in
 * src/lib/review.js). Forward shows the term and hides the meanings; reverse shows the
 * glosses and hides everything Spanish — the term, its suffix, and the usage cues, which
 * are Spanish and routinely contain the term itself. The grade is logged with the
 * direction and face it was earned on, because that history cannot be reconstructed.
 */
export default function ReviewSession({ cards, onFinish, onOpen, onGraded }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ passed: 0, failed: 0 });
  const cardState = usePracticeCardState();

  const item = cards[index] || null;
  const done = index >= cards.length;

  async function grade(reviewGrade) {
    if (busy || !item) return;
    setBusy(true);
    await logReview(item.id, reviewGrade, {
      direction: item.direction === "reverse" ? "reverse" : "forward",
      face: item.face === "cloze" ? "cloze" : "plain",
    });
    const passed = reviewGrade !== GRADES.again;
    setTally((t) => ({
      passed: t.passed + (passed ? 1 : 0),
      failed: t.failed + (passed ? 0 : 1),
    }));
    cardState.reset();
    setIndex((i) => i + 1);
    setBusy(false);
    onGraded?.();
  }

  if (done) {
    const total = tally.passed + tally.failed;
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {total === 0 ? "Nothing to review" : "¡Ya está!"}
          </div>
          {total > 0 && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {tally.passed}/{total}
              </div>
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {tally.failed === 0
                  ? "All of them. They come back later now."
                  : `${tally.failed} to see again tomorrow.`}
              </div>
            </>
          )}
          <Button className="mt-4" onClick={onFinish}>
            Back to Repaso
          </Button>
        </Card>
      </div>
    );
  }

  const remaining = cards.length - index;
  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onFinish} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Finish
        </button>
        <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          {index + 1} / {cards.length}
        </span>
      </div>

      <PracticeCard
        item={item}
        revealed={cardState.revealed}
        onReveal={cardState.reveal}
        showContext={cardState.showContext}
        onToggleContext={cardState.toggleContext}
        onOpen={onOpen}
        speak
        metadata={(
          <div className="mt-1.5 text-xs inline-flex items-center gap-2" style={{ fontFamily: MONO, color: C.mut }}>
            <span>caja {item.box}</span>
            {item.direction === "reverse" && item.meanings?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight size={11} /> en→es
              </span>
            )}
            {item.reason === "tricky" && (
              <span className="inline-flex items-center gap-1">
                <Highlighter size={11} /> tricky
              </span>
            )}
            {item.reason === "lookups" && (
              <span className="inline-flex items-center gap-1">
                <Eye size={11} /> looked up {item.lookupDays}×
              </span>
            )}
          </div>
        )}
      />

      {cardState.revealed && (
        <ReviewGradeStrip busy={busy} grades={GRADES} onGrade={grade} />
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
        {remaining === 1 ? "Last one" : `${remaining} left today`}
      </div>
    </div>
  );
}
