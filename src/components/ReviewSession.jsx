import { useState } from "react";
import { Eye, Highlighter, RotateCcw, ArrowLeftRight, Image as ImageIcon, MessageCircleQuestion } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { logReview } from "../db/events.js";
import { GRADES } from "../lib/review.js";
import { shufflePracticeItems } from "../lib/practice.js";
import {
  PracticeCard,
  deterministicCardAnswer,
  ReviewGradeStrip,
  SelfAssessmentStrip,
  usePracticeCardState,
} from "./PracticeCard.jsx";
import StudySessionFrame from "./StudySessionFrame.jsx";
import { reviewContextFor } from "../lib/askContext.js";

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
  remainingDueCount = 0,
  chunkSize = cards.length,
  onStartNext = null,
  startingNext = false,
  onAskAbout = null,
  onAskLater = null,
  onOpenPregunta = null,
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
  /* "Ask Claude later" per card: "saved" or "full". The session is a full-screen overlay that
     owns a history entry, so asking never navigates mid-session — it queues for Pregunta. */
  const [askLaterStatus, setAskLaterStatus] = useState({});
  const savedForPregunta = Object.values(askLaterStatus).filter((status) => status === "saved").length;

  const recovery = stage === "recovery";
  const item = roundCards[index] || null;
  const done = index >= roundCards.length;
  const formId = "scheduled-review-answer";

  const eventDetails = (extra = null) => ({
    direction: item.direction === "reverse" ? "reverse" : "forward",
    face: item.face === "cloze" ? "cloze" : item.face === "image" ? "image" : "plain",
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
    await onGraded?.();
    advance();
    setBusy(false);
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
    await onGraded?.();
    setWrongRecorded(true);
    setBusy(false);
  }

  /* What the card showed and what was typed, frozen now: the card moves on. */
  const askAboutCard = () => ({ origin: "review", review: reviewContextFor(item, cardState.typedResult) });

  function askLaterAboutCard() {
    if (!item || !onAskLater) return;
    const result = onAskLater(item.id, askAboutCard());
    setAskLaterStatus((current) => ({ ...current, [item.id]: result === "full" ? "full" : "saved" }));
  }

  function askNowAboutCard() {
    if (!item || !onAskAbout) return;
    const options = askAboutCard();
    // The same order as "Open the full entry": end the session, then leave for Pregunta.
    onFinish?.();
    onAskAbout(item.id, options);
  }

  function goToPregunta() {
    onFinish?.();
    onOpenPregunta?.();
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

  function preguntaButton() {
    if (!onOpenPregunta || savedForPregunta === 0) return null;
    return (
      <Button className="min-h-11 w-full" tone="quiet" onClick={goToPregunta}>
        <MessageCircleQuestion size={15} /> Go to Pregunta ({savedForPregunta} saved)
      </Button>
    );
  }

  if (done) {
    const nextCount = Math.min(remainingDueCount, Math.max(1, Number(chunkSize) || 20));
    if (recovery) {
      const recoveryActions = (
        <div className="flex flex-col gap-2">
          {nextCount > 0 && onStartNext && (
            <Button className="min-h-11 w-full" disabled={startingNext} onClick={onStartNext}>
              Start next {nextCount}
            </Button>
          )}
          {preguntaButton()}
          <Button className="min-h-11 w-full" tone={nextCount > 0 ? "quiet" : "primary"} onClick={onFinish}>
            Back to Repaso
          </Button>
        </div>
      );
      return (
        <StudySessionFrame
          title="Review"
          current={roundCards.length}
          total={roundCards.length}
          summary
          actions={recoveryActions}
        >
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
          </Card>
        </StudySessionFrame>
      );
    }

    const total = tally.passed + tally.failed;
    const summaryActions = (
      <div className="flex flex-col gap-2">
        {missedCards.length > 0 && (
          <Button className="min-h-11 w-full" onClick={beginRecovery}>
            <RotateCcw size={15} /> Practice {missedCards.length} missed again
          </Button>
        )}
        {nextCount > 0 && onStartNext && (
          <Button className="min-h-11 w-full" disabled={startingNext} onClick={onStartNext}>
            Start next {nextCount}
          </Button>
        )}
        {preguntaButton()}
        <Button
          className="min-h-11 w-full"
          tone={missedCards.length > 0 || nextCount > 0 ? "quiet" : "primary"}
          onClick={onFinish}
        >
          Back to Repaso
        </Button>
      </div>
    );
    return (
      <StudySessionFrame
        title="Review"
        stageLabel="Session complete"
        current={roundCards.length}
        total={roundCards.length}
        summary
        actions={summaryActions}
      >
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
        </Card>
      </StudySessionFrame>
    );
  }

  const reverse = item.direction === "reverse" && item.meanings?.length > 0;
  const imageFace = !reverse && item.face === "image" && Boolean(item.image?.url);
  const canType = mode === "typed" && Boolean(deterministicCardAnswer(item));
  const revealLabel = reverse || imageFace || (!reverse && item.cloze?.answer)
    ? "Tap to see the word"
    : "Tap to see the meaning";
  const actions = !cardState.revealed ? (
    canType ? (
      <Button
        type="submit"
        form={formId}
        className="min-h-11 w-full"
        disabled={busy || !cardState.typedValue.trim()}
      >
        Check answer
      </Button>
    ) : (
      <Button className="min-h-11 w-full" disabled={busy} onClick={cardState.reveal}>
        {revealLabel}
      </Button>
    )
  ) : cardState.typedResult?.verdict === "wrong" ? (
    <Button
      className="min-h-11 w-full"
      disabled={busy || !wrongRecorded}
      onClick={() => recovery ? answerRecovery(false) : advance()}
    >
      Continue
    </Button>
  ) : recovery ? (
    <SelfAssessmentStrip busy={busy} onAnswer={answerRecovery} />
  ) : (
    <ReviewGradeStrip
      busy={busy}
      grades={GRADES}
      onGrade={grade}
      includeAgain={!cardState.typedResult}
    />
  );

  return (
    <StudySessionFrame
      title="Review"
      stageLabel={recovery ? "Missed round" : ""}
      current={index + 1}
      total={roundCards.length}
      onFinish={onFinish}
      actions={actions}
    >
      <PracticeCard
        item={item}
        revealed={cardState.revealed}
        showContext={cardState.showContext}
        onToggleContext={cardState.toggleContext}
        onOpen={onOpen}
        onExit={onFinish}
        speak
        mode={mode}
        busy={busy}
        formId={formId}
        typedValue={cardState.typedValue}
        onTypedValueChange={cardState.setTypedValue}
        typedResult={cardState.typedResult}
        onTypedResult={markTyped}
        onAskLater={onAskLater ? askLaterAboutCard : null}
        onAskNow={onAskAbout ? askNowAboutCard : null}
        askLaterStatus={askLaterStatus[item.id] || null}
        metadata={(
          <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            <span>caja {item.box}</span>
            {item.direction === "reverse" && item.meanings?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight size={11} /> en→es
              </span>
            )}
            {imageFace && (
              <span className="inline-flex items-center gap-1">
                <ImageIcon size={11} /> imagen
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
    </StudySessionFrame>
  );
}
