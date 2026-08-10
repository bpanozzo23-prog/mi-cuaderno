import { useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Button, C, Card, MONO, SERIF, dotGrid } from "../theme.jsx";
import { shufflePracticeItems } from "../lib/practice.js";
import { PracticeCard, SelfAssessmentStrip, usePracticeCardState } from "./PracticeCard.jsx";

/** One or more in-memory passes through a free-practice deck. No event writer is imported. */
export default function PracticeSession({ cards, onFinish, onOpen, random = Math.random }) {
  const [round, setRound] = useState(cards);
  const [roundNumber, setRoundNumber] = useState(1);
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState([]);
  const cardState = usePracticeCardState();

  const item = round[index] || null;
  const done = index >= round.length;

  function answer(gotIt) {
    if (!item) return;
    if (!gotIt) setMissed((current) => [...current, item]);
    cardState.reset();
    setIndex((current) => current + 1);
  }

  function repeatMissed() {
    setRound(shufflePracticeItems(missed, random));
    setRoundNumber((current) => current + 1);
    setIndex(0);
    setMissed([]);
    cardState.reset();
  }

  if (done) {
    const gotIt = round.length - missed.length;
    return (
      <>
        <PracticeHeader onFinish={onFinish} label={`Round ${roundNumber}`} />
        <main className="px-4 py-6 pb-28" style={dotGrid}>
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
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {missed.length > 0 && (
                <Button className="min-h-11" onClick={repeatMissed}>
                  <RotateCcw size={15} /> Practice {missed.length} again
                </Button>
              )}
              <Button className="min-h-11" tone={missed.length > 0 ? "quiet" : "primary"} onClick={onFinish}>
                Back to words &amp; phrases
              </Button>
            </div>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <PracticeHeader onFinish={onFinish} label={`${index + 1} / ${round.length}`} />
      <main className="px-4 py-5 pb-28" style={dotGrid}>
        <div className="mb-3 text-center text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.1em" }}>
          Free practice · round {roundNumber}
        </div>
        <PracticeCard
          item={item}
          revealed={cardState.revealed}
          onReveal={cardState.reveal}
          showContext={cardState.showContext}
          onToggleContext={cardState.toggleContext}
          onOpen={onOpen}
          revealLabel="Reveal meanings"
          revealIcon
        />

        {cardState.revealed && (
          <SelfAssessmentStrip onAnswer={answer} />
        )}
      </main>
    </>
  );
}

function PracticeHeader({ onFinish, label }) {
  return (
    <header className="sticky top-0 z-20 border-b px-3 py-3" style={{ background: C.card, borderColor: C.line }}>
      <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button type="button" onClick={onFinish} className="inline-flex min-h-11 items-center justify-self-start text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={18} /> Finish
        </button>
        <div className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>Practice</div>
        <span className="justify-self-end text-xs" style={{ fontFamily: MONO, color: C.mut }}>{label}</span>
      </div>
    </header>
  );
}
