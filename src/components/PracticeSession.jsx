import { useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { Button, C, Card, MONO, SERIF } from "../theme.jsx";
import { shufflePracticeItems } from "../lib/practice.js";
import {
  deterministicCardAnswer,
  PracticeCard,
  SelfAssessmentStrip,
  usePracticeCardState,
} from "./PracticeCard.jsx";
import StudySessionFrame from "./StudySessionFrame.jsx";

/** One or more in-memory passes through a free-practice deck. No event writer is imported. */
export default function PracticeSession({
  cards,
  onFinish,
  onOpen,
  random = Math.random,
  mode = "reveal",
  backLabel = "Back to words & phrases",
  sessionLabel = "Free practice",
}) {
  const [round, setRound] = useState(cards);
  const [roundNumber, setRoundNumber] = useState(1);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState([]);
  const [typedWrong, setTypedWrong] = useState(false);
  const cardState = usePracticeCardState();

  const item = round[index] || null;
  const done = index >= round.length;
  const formId = "free-practice-answer";

  function answer(gotIt) {
    if (!item) return;
    if (!gotIt) setMissed((current) => [...current, item]);
    cardState.reset();
    setTypedWrong(false);
    setIndex((current) => current + 1);
  }

  function markTyped(result) {
    cardState.markTyped(result);
    setTypedWrong(result.verdict === "wrong");
  }

  function repeatMissed() {
    setRound(shufflePracticeItems(missed, random));
    setRoundNumber((current) => current + 1);
    setIndex(0);
    setMissed([]);
    cardState.reset();
    setTypedWrong(false);
  }

  if (done) {
    const gotIt = round.length - missed.length;
    const summaryActions = (
      <div className="flex flex-col gap-2">
        {missed.length > 0 && (
          <Button className="min-h-11 w-full" onClick={repeatMissed}>
            <RotateCcw size={15} /> Practice {missed.length} again
          </Button>
        )}
        <Button className="min-h-11 w-full" tone={missed.length > 0 ? "quiet" : "primary"} onClick={onFinish}>
          {backLabel}
        </Button>
      </div>
    );
    return (
      <StudySessionFrame
        title="Practice"
        stageLabel={`Round ${roundNumber}`}
        current={round.length}
        total={round.length}
        summary
        actions={summaryActions}
      >
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {round.length === 0 ? "Nothing to practice" : "Round complete"}
          </div>
          {round.length > 0 && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {gotIt}/{round.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {missed.length === 0
                  ? "All of them felt familiar this round."
                  : `${missed.length} ${missed.length === 1 ? "card" : "cards"} marked Again.`}
              </div>
            </>
          )}
        </Card>
      </StudySessionFrame>
    );
  }

  const canType = mode === "typed" && Boolean(deterministicCardAnswer(item));
  const revealLabel = item.direction !== "reverse" && !item.cloze?.answer
    ? "Reveal meanings"
    : "Tap to see the word";
  const actions = !cardState.revealed ? (
    canType ? (
      <Button type="submit" form={formId} className="min-h-11 w-full" disabled={!cardState.typedValue.trim()}>
        Check answer
      </Button>
    ) : (
      <Button className="min-h-11 w-full" onClick={cardState.reveal}>
        {item.direction !== "reverse" && !item.cloze?.answer && <Eye size={15} />}
        {revealLabel}
      </Button>
    )
  ) : typedWrong ? (
    <Button className="min-h-11 w-full" onClick={() => answer(false)}>
      Continue
    </Button>
  ) : (
    <SelfAssessmentStrip onAnswer={answer} />
  );

  return (
    <StudySessionFrame
      title="Practice"
      stageLabel={`${sessionLabel} · round ${roundNumber}`}
      current={index + 1}
      total={round.length}
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
        mode={mode}
        formId={formId}
        typedValue={cardState.typedValue}
        onTypedValueChange={cardState.setTypedValue}
        typedResult={cardState.typedResult}
        onTypedResult={markTyped}
      />
    </StudySessionFrame>
  );
}
