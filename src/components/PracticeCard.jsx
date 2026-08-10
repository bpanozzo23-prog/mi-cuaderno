import { useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { Button, C, Card, Hi, SERIF } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import LexicalAnswer, { MeaningRow } from "./LexicalAnswer.jsx";
import SpeakButton from "./SpeakButton.jsx";

/** Visit-local reveal and answer-context state shared by both practice shells. */
export function usePracticeCardState() {
  const [revealed, setRevealed] = useState(false);
  const [showContext, setShowContext] = useState(false);

  return {
    revealed,
    showContext,
    reveal: () => setRevealed(true),
    toggleContext: () => setShowContext((shown) => !shown),
    reset: () => {
      setRevealed(false);
      setShowContext(false);
    },
  };
}

/** The deterministic answer a typed card can mark; plain forward meanings remain subjective. */
export function deterministicCardAnswer(item) {
  const reverse = item?.direction === "reverse" && item?.meanings?.length > 0;
  if (reverse) return item.term || "";
  return item?.cloze?.answer || "";
}

function TermHeading({ item, speak }) {
  const suffix = personalHeadingSuffix(item);
  return (
    <div className="text-3xl break-words" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
      <Hi on={item.tricky}>{item.term}</Hi>
      {suffix && (
        <>
          {" "}
          <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
            {suffix}
          </span>
        </>
      )}
      {speak && <SpeakButton text={item.term} className="align-middle ml-1" size={16} />}
    </div>
  );
}

/**
 * The shared vocabulary card between scheduled review and history-free practice.
 * Session policy stays outside: this component owns only the three question faces,
 * reveal, and the common personal answer.
 */
export function PracticeCard({
  item,
  revealed,
  onReveal,
  showContext,
  onToggleContext,
  onOpen,
  metadata = null,
  revealLabel = null,
  revealIcon = false,
  speak = false,
}) {
  // A card with no written gloss has no reverse question side. `cardDirection` normally
  // prevents that shape; the guard also keeps fixtures and legacy callers honest.
  const reverse = item.direction === "reverse" && item.meanings?.length > 0;
  // A reverse prompt cannot also be cloze: its sentence would contain the answer.
  const cloze = !reverse && item.cloze?.answer ? item.cloze : null;
  const resolvedRevealLabel = revealLabel
    || (reverse || cloze ? "Tap to see the word" : "Tap to see the meaning");

  return (
    <Card className="p-5">
      <div className="text-center">
        {reverse ? (
          <div className="space-y-2 text-left">
            {item.meanings.map((meaning, meaningIndex) => (
              <MeaningRow key={meaning.id} meaning={meaning} index={meaningIndex} showCue={false} />
            ))}
          </div>
        ) : cloze && !revealed ? (
          <div className="text-left text-xl leading-relaxed" style={{ fontFamily: SERIF, color: C.ink }}>
            {cloze.before}
            <span
              aria-label="missing word"
              className="mx-1 inline-block rounded align-baseline"
              style={{ background: C.penPale, width: "4.5rem", height: "1.1em" }}
            />
            {cloze.after}
          </div>
        ) : (
          <TermHeading item={item} speak={speak} />
        )}
        {metadata}
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="w-full mt-5 py-6 rounded-xl border border-dashed text-sm"
          style={{ borderColor: C.line, color: C.mut, background: C.paper }}
        >
          {revealIcon && <Eye size={15} className="inline mr-1.5 -mt-0.5" />}
          {resolvedRevealLabel}
        </button>
      ) : (
        <>
          {reverse && (
            <div className="mt-5 text-center">
              <TermHeading item={item} speak={speak} />
            </div>
          )}
          {cloze && (
            <div className="mt-4 text-left text-base leading-relaxed" style={{ fontFamily: SERIF, color: C.ink }}>
              {cloze.before}
              <span className="rounded px-1" style={{ background: C.penPale, color: C.penDark, fontWeight: 700 }}>
                {cloze.answer}
              </span>
              {cloze.after}
              {speak && <SpeakButton text={cloze.es} label="Play the sentence" className="align-middle" />}
              {cloze.en && (
                <div className="mt-1 text-xs" style={{ color: C.mut }}>
                  {cloze.en}
                </div>
              )}
            </div>
          )}
          <LexicalAnswer
            item={item}
            showContext={showContext}
            onToggleContext={onToggleContext}
            onOpen={onOpen}
          />
        </>
      )}
    </Card>
  );
}

/** Four scheduled grades; the shell decides what each one writes and advances. */
export function ReviewGradeStrip({ busy = false, grades, onGrade }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Review grade">
      <Button className="min-h-11" tone="danger" disabled={busy} onClick={() => onGrade(grades.again)}>
        <X size={16} /> Again
      </Button>
      <Button className="min-h-11" tone="quiet" disabled={busy} onClick={() => onGrade(grades.hard)}>
        Hard
      </Button>
      <Button className="min-h-11" disabled={busy} onClick={() => onGrade(grades.good)}>
        <Check size={16} /> Good
      </Button>
      <Button className="min-h-11" disabled={busy} onClick={() => onGrade(grades.easy)}>
        Easy
      </Button>
    </div>
  );
}

/** Two history-free outcomes used by free practice and recovery rounds. */
export function SelfAssessmentStrip({ busy = false, onAnswer }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button className="min-h-11" tone="danger" disabled={busy} onClick={() => onAnswer(false)}>
        <X size={16} /> Again
      </Button>
      <Button className="min-h-11" tone="success" disabled={busy} onClick={() => onAnswer(true)}>
        <Check size={16} /> Got it
      </Button>
    </div>
  );
}
