import { useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { Button, C, Card, MONO, SERIF } from "../theme.jsx";
import { meaningGlosses } from "../lib/meanings.js";
import { shufflePracticeItems } from "../lib/practice.js";
import { SelfAssessmentStrip } from "./PracticeCard.jsx";
import StudySessionFrame, { StudyCardEyebrow } from "./StudySessionFrame.jsx";

function AnswerRow({ item }) {
  const glosses = meaningGlosses(item);
  return (
    <div className="rounded-xl border p-3 text-left" style={{ background: C.paper, borderColor: C.line }}>
      <div className="break-words text-base font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
        {item.term}
      </div>
      {glosses.length > 0 && (
        <div className="mt-1 break-words text-sm" style={{ color: C.mut }}>
          {glosses.join(" · ")}
        </div>
      )}
    </div>
  );
}

/** Direct-confirmed-edge recall only. No database or event writer is imported. */
export default function SimilarMeaningRecallSession({
  prompts,
  onFinish,
  random = Math.random,
}) {
  const [round, setRound] = useState(prompts);
  const [phase, setPhase] = useState("initial");
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState([]);
  const [revealed, setRevealed] = useState(false);

  const prompt = round[index] || null;
  const done = index >= round.length;

  function answer(gotIt) {
    if (!prompt) return;
    if (!gotIt) setMissed((current) => [...current, prompt]);
    setRevealed(false);
    setIndex((current) => current + 1);
  }

  function repeatMissed() {
    setRound(shufflePracticeItems(missed, random));
    setPhase("missed");
    setIndex(0);
    setMissed([]);
    setRevealed(false);
  }

  if (done) {
    const gotIt = round.length - missed.length;
    const mayRepeat = phase === "initial" && missed.length > 0;
    const actions = (
      <div className="flex flex-col gap-2">
        {mayRepeat && (
          <Button className="min-h-11 w-full" onClick={repeatMissed}>
            <RotateCcw size={15} /> Practice {missed.length} missed {missed.length === 1 ? "prompt" : "prompts"}
          </Button>
        )}
        <Button className="min-h-11 w-full" tone={mayRepeat ? "quiet" : "primary"} onClick={onFinish}>
          Back to words &amp; phrases
        </Button>
      </div>
    );
    return (
      <StudySessionFrame
        title="Similar meanings"
        stageLabel={phase === "missed" ? "Missed round" : "Recall"}
        current={round.length}
        total={round.length}
        summary
        actions={actions}
      >
        <Card className="p-5 text-center">
          <div className="text-xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
            {round.length === 0 ? "Nothing to recall" : "Round complete"}
          </div>
          {round.length > 0 && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {gotIt}/{round.length}
              </div>
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {phase === "initial"
                  ? (missed.length === 0
                    ? "Every prompt felt familiar."
                    : `${missed.length} ${missed.length === 1 ? "prompt" : "prompts"} marked Again.`)
                  : (missed.length === 0
                    ? "Every missed prompt felt familiar this round."
                    : `${missed.length} ${missed.length === 1 ? "prompt" : "prompts"} still marked Again; no further round is added.`)}
              </div>
            </>
          )}
        </Card>
      </StudySessionFrame>
    );
  }

  const actions = revealed ? (
    <SelfAssessmentStrip onAnswer={answer} />
  ) : (
    <Button className="min-h-11 w-full" onClick={() => setRevealed(true)}>
      <Eye size={15} /> Reveal connected words
    </Button>
  );

  return (
    <StudySessionFrame
      title="Similar meanings"
      stageLabel={phase === "missed" ? "Missed round" : "Recall"}
      current={index + 1}
      total={round.length}
      onFinish={onFinish}
      actions={actions}
    >
      <Card className="p-5 text-center">
        <StudyCardEyebrow>Confirmed Similar meaning</StudyCardEyebrow>
        <div className="mt-3 text-sm leading-relaxed" style={{ color: C.mut }}>
          Name another saved word or phrase with a similar meaning to
        </div>
        <div className="mt-2 break-words text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
          {prompt.focal.term}
        </div>

        {revealed && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: C.line }}>
            <div className="mb-2 text-xs font-semibold uppercase" style={{ fontFamily: MONO, color: C.mut, letterSpacing: "0.08em" }}>
              Your confirmed connections
            </div>
            <div className="space-y-2">
              {prompt.neighbors.map((neighbor) => <AnswerRow key={neighbor.id} item={neighbor} />)}
            </div>
          </div>
        )}
      </Card>
    </StudySessionFrame>
  );
}
