import { useState } from "react";
import { ChevronLeft, Eye, Highlighter, RotateCcw, ArrowLeftRight } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button } from "../theme.jsx";
import { logReview } from "../db/events.js";
import { GRADES } from "../lib/review.js";
import { shufflePracticeItems } from "../lib/practice.js";
import {
  PracticeCard,
  ReviewGradeStrip,
  SelfAssessmentStrip,
  usePracticeCardState,
} from "./PracticeCard.jsx";

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
export default function ReviewSession({
  cards,
  mode = "reveal",
  onFinish,
  onOpen,
  onGraded,
  random = Math.random,
}) {
  const [stage, setStage] = useState("primary");
  const [roundCards, setRoundCards] = useState(cards);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wrongRecorded, setWrongRecorded] = useState(false);
  const [tally, setTally] = useState({ passed: 0, failed: 0 });
  const [missedCards, setMissedCards] = useState([]);
  const [recovered, setRecovered] = useState(0);
  const cardState = usePracticeCardState();

  const recovery = stage === "recovery";
  const item = roundCards[index] || null;
  const done = index >= roundCards.length;

  const eventDetails = (extra = null) => ({
    direction: item.direction === "reverse" ? "reverse" : "forward",
    face: item.face === "cloze" ? "cloze" : "plain",
    ...(extra || {}),
  });

  function countGrade(reviewGrade) {
    const passed = reviewGrade !== GRADES.again;
    setTally((t) => ({
      passed: t.passed + (passed ? 1 : 0),
      failed: t.failed + (passed ? 0 : 1),
    }));
    if (!passed) setMissedCards((current) => [...current, item]);
  }

  function advance() {
    cardState.reset();
    setWrongRecorded(false);
    setIndex((i) => i + 1);
  }

  async function grade(reviewGrade) {
    if (busy || !item) return;
    setBusy(true);
    const typed = cardState.typedResult;
    await logReview(item.id, reviewGrade, eventDetails(typed ? {
      mode: "typed",
      verdict: typed.verdict,
    } : null));
    countGrade(reviewGrade);
    advance();
    setBusy(false);
    onGraded?.();
  }

  async function markTyped(result) {
    if (busy || !item) return;
    cardState.markTyped(result);
    if (result.verdict !== "wrong") return;

    if (recovery) {
      setWrongRecorded(true);
      return;
    }

    setBusy(true);
    await logReview(item.id, GRADES.again, eventDetails({ mode: "typed", verdict: "wrong" }));
    countGrade(GRADES.again);
    setWrongRecorded(true);
    setBusy(false);
    onGraded?.();
  }

  function answerRecovery(gotIt) {
    if (!item) return;
    if (gotIt) setRecovered((current) => current + 1);
    advance();
  }

  function beginRecovery() {
    setRoundCards(shufflePracticeItems(missedCards, random));
    setStage("recovery");
    setIndex(0);
    setRecovered(0);
    setWrongRecorded(false);
    cardState.reset();
  }

  if (done) {
    if (recovery) {
      return (
        <div className="px-4 py-4 pb-28" style={dotGrid}>
          <Card className="p-5 text-center">
            <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
              Recovery complete
            </div>
            <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
              {recovered}/{roundCards.length}
            </div>
            <div className="mt-1 text-sm" style={{ color: C.mut }}>
              {recovered === roundCards.length
                ? "Every missed card came back this round."
                : `${roundCards.length - recovered} still worth another look tomorrow.`}
            </div>
            <Button className="mt-4" onClick={onFinish}>
              Back to Repaso
            </Button>
          </Card>
        </div>
      );
    }

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
          <div className="mt-4 flex flex-col gap-2">
            {missedCards.length > 0 && (
              <Button className="min-h-11" onClick={beginRecovery}>
                <RotateCcw size={15} /> Practice {missedCards.length} missed again
              </Button>
            )}
            <Button className="min-h-11" tone={missedCards.length > 0 ? "quiet" : "primary"} onClick={onFinish}>
              Back to Repaso
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const remaining = roundCards.length - index;
  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onFinish} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Finish
        </button>
        <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          {index + 1} / {roundCards.length}
        </span>
      </div>

      {recovery && (
        <div className="mb-3 text-center text-[11px] font-semibold uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.1em" }}>
          Missed round
        </div>
      )}

      <PracticeCard
        item={item}
        revealed={cardState.revealed}
        onReveal={cardState.reveal}
        showContext={cardState.showContext}
        onToggleContext={cardState.toggleContext}
        onOpen={onOpen}
        speak
        mode={mode}
        busy={busy}
        typedValue={cardState.typedValue}
        onTypedValueChange={cardState.setTypedValue}
        typedResult={cardState.typedResult}
        onTypedResult={markTyped}
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

      {cardState.revealed && cardState.typedResult?.verdict === "wrong" ? (
        <Button
          className="mt-4 min-h-11 w-full"
          disabled={busy || !wrongRecorded}
          onClick={() => recovery ? answerRecovery(false) : advance()}
        >
          Continue
        </Button>
      ) : recovery && cardState.revealed ? (
        <SelfAssessmentStrip onAnswer={answerRecovery} />
      ) : cardState.revealed && (
        <ReviewGradeStrip
          busy={busy}
          grades={GRADES}
          onGrade={grade}
          includeAgain={!cardState.typedResult}
        />
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
        {remaining === 1 ? "Last one" : `${remaining} left ${recovery ? "in this round" : "today"}`}
      </div>
    </div>
  );
}
