import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button, C, Card, Hi, SERIF } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import LexicalAnswer, { MeaningRow } from "./LexicalAnswer.jsx";
import MediaImage from "./MediaImage.jsx";
import SpeakButton from "./SpeakButton.jsx";
import { checkTypedAnswer } from "../lib/drill.js";

/** Visit-local reveal and answer-context state shared by both practice shells. */
export function usePracticeCardState() {
  const [revealed, setRevealed] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [typedResult, setTypedResult] = useState(null);

  return {
    revealed,
    showContext,
    typedValue,
    typedResult,
    reveal: () => setRevealed(true),
    toggleContext: () => setShowContext((shown) => !shown),
    setTypedValue,
    markTyped: (result) => {
      setTypedResult(result);
      setRevealed(true);
    },
    reset: () => {
      setRevealed(false);
      setShowContext(false);
      setTypedValue("");
      setTypedResult(null);
    },
  };
}

/** The deterministic answer a typed card can mark; plain forward meanings remain subjective. */
export function deterministicCardAnswer(item) {
  const reverse = item?.direction === "reverse" && item?.meanings?.length > 0;
  if (reverse) return item.term || "";
  if (item?.face === "image" && item?.image?.url) return item.term || "";
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
  showContext,
  onToggleContext,
  onOpen,
  onExit,
  metadata = null,
  speak = false,
  mode = "reveal",
  busy = false,
  formId = "practice-card-answer",
  typedValue = "",
  onTypedValueChange,
  typedResult = null,
  onTypedResult,
}) {
  // A card with no written gloss has no reverse question side. `cardDirection` normally
  // prevents that shape; the guard also keeps fixtures and legacy callers honest.
  const reverse = item.direction === "reverse" && item.meanings?.length > 0;
  const image = !reverse && item.face === "image" && item.image?.url ? item.image : null;
  // A reverse prompt cannot also be cloze: its sentence would contain the answer.
  const cloze = !reverse && !image && item.cloze?.answer ? item.cloze : null;
  const typedAnswer = deterministicCardAnswer(item);
  const canType = mode === "typed" && Boolean(typedAnswer);

  function submitTyped(event) {
    event.preventDefault();
    if (busy || !typedValue.trim() || !typedAnswer) return;
    // Vocabulary recall deliberately uses only the pure exact/accent-aware checker.
    // Do not add the Gym's paradigm-collision diagnosis here: that requires a full forms
    // table and answers a tense-identity question this card is not asking (Phase 16 §2).
    const verdict = checkTypedAnswer(typedValue, typedAnswer);
    onTypedResult?.({ attempt: typedValue, answer: typedAnswer, verdict });
  }

  return (
    <Card className="p-5">
      {metadata && <div className="mb-4 flex justify-center">{metadata}</div>}
      <div className="text-center">
        {reverse ? (
          <div className="space-y-2 text-left">
            {item.meanings.map((meaning, meaningIndex) => (
              <MeaningRow key={meaning.id} meaning={meaning} index={meaningIndex} showCue={false} />
            ))}
          </div>
        ) : image ? (
          // The picture stays put through the flip; the word joins it on the answer side.
          // Neutral alt and no caption: the link label is usually the term. A failed load
          // degrades to the plain term front — but not after reveal, where the answer side
          // already shows the term.
          <div className="practice-image">
            <MediaImage
              src={image.url}
              alt="Imagen"
              caption={false}
              link={false}
              fallback={revealed ? null : <TermHeading item={item} speak={speak} />}
            />
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
      </div>

      {!revealed && canType ? (
        <form id={formId} className="mt-5" onSubmit={submitTyped}>
          <label className="block text-left text-xs font-semibold" style={{ color: C.mut }}>
            {reverse || image ? "Type the Spanish word" : "Type the missing word"}
            <input
              autoFocus
              autoComplete="off"
              spellCheck="false"
              value={typedValue}
              onChange={(event) => onTypedValueChange?.(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border px-3 py-2 text-base outline-none"
              style={{ background: C.paper, borderColor: C.line, color: C.ink }}
            />
          </label>
        </form>
      ) : revealed ? (
        <>
          {(reverse || image) && (
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
          {typedResult && (
            <div
              role="status"
              className="mt-4 rounded-lg border p-3 text-left"
              style={{
                background: typedResult.verdict === "wrong" ? C.redPale : C.greenPale,
                borderColor: typedResult.verdict === "wrong" ? C.dangerBorder : C.green,
              }}
            >
              <div className="text-sm font-semibold" style={{ color: typedResult.verdict === "wrong" ? C.red : C.ink }}>
                {typedResult.verdict === "exact"
                  ? "Exact answer"
                  : typedResult.verdict === "accents"
                    ? "Correct · accent slip"
                    : "Not yet"}
              </div>
              <div className="mt-1 text-sm break-words" style={{ color: C.ink }}>
                You typed “{typedResult.attempt}” · Answer “{typedResult.answer}”
              </div>
            </div>
          )}
          <LexicalAnswer
            item={item}
            showContext={showContext}
            onToggleContext={onToggleContext}
            onOpen={onOpen}
            onExit={onExit}
          />
        </>
      ) : null}
    </Card>
  );
}

/** Four scheduled grades; the shell decides what each one writes and advances. */
export function ReviewGradeStrip({ busy = false, grades, onGrade, includeAgain = true }) {
  return (
    <div className={includeAgain ? "grid grid-cols-4 gap-1.5" : "grid grid-cols-3 gap-2"} aria-label="Review grade">
      {includeAgain && (
        <Button className="min-h-11 min-w-0 px-1" tone="gradeAgain" disabled={busy} onClick={() => onGrade(grades.again)}>
          Again
        </Button>
      )}
      <Button className="min-h-11 min-w-0 px-1" tone="gradeHard" disabled={busy} onClick={() => onGrade(grades.hard)}>
        Hard
      </Button>
      <Button className="min-h-11 min-w-0 px-1" tone="gradeGood" disabled={busy} onClick={() => onGrade(grades.good)}>
        Good
      </Button>
      <Button className="min-h-11 min-w-0 px-1" tone="gradeEasy" disabled={busy} onClick={() => onGrade(grades.easy)}>
        Easy
      </Button>
    </div>
  );
}

/** Two history-free outcomes used by free practice and recovery rounds. */
export function SelfAssessmentStrip({ busy = false, onAnswer }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button className="min-h-11" tone="gradeAgain" disabled={busy} onClick={() => onAnswer(false)}>
        <X size={16} /> Again
      </Button>
      <Button className="min-h-11" tone="gradeEasy" disabled={busy} onClick={() => onAnswer(true)}>
        <Check size={16} /> Got it
      </Button>
    </div>
  );
}
