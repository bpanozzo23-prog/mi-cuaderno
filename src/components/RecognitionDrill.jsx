import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { C, MONO, SERIF, Button, Card } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { CONTRAST_PAIRS, contrastOptions } from "../lib/contrastContent.js";
import { recognitionTenses } from "../lib/recognitionContent.js";
import { rebuildMissedRecognitionDeck } from "../lib/recognitionDeck.js";
import { logDrill } from "../db/events.js";
import StudySessionFrame, { StudyCardEyebrow } from "./StudySessionFrame.jsx";

const fallbackSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `recognition-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const isContrast = (card) => card?.skill === "contrast";

/** Tense keys render through the shared label; Contrasts options are forms shown verbatim. */
const optionLabel = (card, key) => (isContrast(card) ? key : qualifiedTenseLabel(key));
const feedbackLabel = (card, key) => (isContrast(card) ? `«${key}»` : qualifiedTenseLabel(key).toLowerCase());

/** The option vocabulary a missed-round rebuild may draw from, per lane. */
const laneScopeFor = (card) => (isContrast(card) ? contrastOptions("both") : recognitionTenses(card?.skill));

/** Recognition identity: tense lanes persist the canonical tense, Contrasts persist pair + answer and no tense. */
const answerMetadata = (card) => (
  isContrast(card) ? { pair: card.pair, answer: card.answer } : { tense: card.answer }
);

export default function RecognitionDrill({
  deck,
  title = "Tense usage",
  onFinish,
  onGraded,
  onOpen,
  rng = Math.random,
  renderReveal = null,
}) {
  const [round, setRound] = useState("initial");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [openArmed, setOpenArmed] = useState(null);
  const [missedCards, setMissedCards] = useState([]);
  const [missedDeck, setMissedDeck] = useState([]);
  const [initialTally, setInitialTally] = useState({ answered: 0, passed: 0 });
  const [missedTally, setMissedTally] = useState({ answered: 0, passed: 0 });
  const [componentSessionId] = useState(() => deck[0]?.sessionId || fallbackSessionId());

  const activeDeck = round === "missed" ? missedDeck : deck;
  const card = activeDeck[index] || null;
  const done = index >= activeDeck.length;
  const laneTenses = useMemo(() => laneScopeFor(deck[0]), [deck]);

  async function choose(chosen) {
    if (!card || result || busy) return;
    const passed = chosen === card.answer;
    const stage = round === "missed" ? "missed" : "initial";
    setBusy(true);
    try {
      await logDrill(null, passed, {
        skill: card.skill,
        cardId: card.id,
        ...answerMetadata(card),
        mode: "choice",
        ...(passed ? {} : { chosen }),
        sessionId: card.sessionId || componentSessionId,
        promptId: card.promptId || `${componentSessionId}:${card.cardIndex || index + 1}`,
        sessionKind: "recognition",
        stage,
        cardIndex: card.cardIndex || index + 1,
        deckSize: card.deckSize || deck.length,
      });
      if (stage === "initial") {
        setInitialTally((current) => ({
          answered: current.answered + 1,
          passed: current.passed + (passed ? 1 : 0),
        }));
        if (!passed) setMissedCards((current) => [...current, card]);
      } else {
        setMissedTally((current) => ({
          answered: current.answered + 1,
          passed: current.passed + (passed ? 1 : 0),
        }));
      }
      setResult({ chosen, passed });
      onGraded?.();
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    setResult(null);
    setOpenArmed(null);
    setIndex((current) => current + 1);
  }

  function requestOpen(target) {
    if (!target || !onOpen) return;
    if (openArmed !== target) {
      setOpenArmed(target);
      return;
    }
    setOpenArmed(null);
    onFinish?.();
    onOpen(target);
  }

  function startMissedRound() {
    setMissedDeck(rebuildMissedRecognitionDeck(missedCards, {
      tenseScope: laneTenses,
      allTenses: laneTenses,
      rng,
    }));
    setRound("missed");
    setIndex(0);
    setResult(null);
  }

  if (done) {
    const initialComplete = round === "initial";
    const summaryActions = initialComplete && missedCards.length > 0 ? (
      <div className="flex flex-col gap-2">
        <Button className="min-h-11 w-full" onClick={startMissedRound}>
          <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "card" : "cards"}
        </Button>
        <Button tone="quiet" className="min-h-11 w-full" onClick={onFinish}>Finish session</Button>
      </div>
    ) : (
      <Button className="min-h-11 w-full" onClick={onFinish}>Back to Gym</Button>
    );
    return (
      <StudySessionFrame
        title={title}
        stageLabel={initialComplete ? "" : "Missed round"}
        current={activeDeck.length}
        total={activeDeck.length}
        summary
        actions={summaryActions}
      >
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {deck.length === 0 ? "Nothing to practise" : initialComplete ? "Session complete" : "Missed round complete"}
          </div>
          {initialTally.answered > 0 && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {initialTally.passed}/{initialTally.answered}
              </div>
              {!initialComplete && (
                <div className="mt-1 text-sm" style={{ color: C.mut }}>
                  Missed round: {missedTally.passed}/{missedTally.answered}
                </div>
              )}
            </>
          )}
        </Card>
      </StudySessionFrame>
    );
  }

  return (
    <StudySessionFrame
      title={title}
      stageLabel={round === "missed" ? "Missed round" : ""}
      current={index + 1}
      total={activeDeck.length}
      onFinish={onFinish}
      actions={result ? (
        <Button className="min-h-11 w-full" onClick={advance}>
          {index + 1 === activeDeck.length ? "Done" : "Next"}
        </Button>
      ) : null}
    >
      <Card className="p-5">
        <StudyCardEyebrow>{isContrast(card) ? CONTRAST_PAIRS[card.pair]?.eyebrow || "Which one fits?" : "Which tense is this?"}</StudyCardEyebrow>
        <div className="mt-3 text-center text-lg leading-relaxed" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
          {card.prompt}
        </div>

        <div className="mt-5 grid gap-2" aria-label={isContrast(card) ? "Choices" : "Tense choices"}>
          {card.options.map((option) => {
            const chosen = result?.chosen === option;
            const correct = result && option === card.answer;
            const wrong = chosen && !result.passed;
            return (
              <button
                key={option}
                type="button"
                disabled={busy || Boolean(result)}
                onClick={() => choose(option)}
                className="min-h-11 rounded-full border px-3 py-2 text-sm font-semibold disabled:opacity-100"
                style={{
                  color: correct ? C.green : wrong ? C.red : C.ink,
                  borderColor: correct ? C.green : wrong ? C.red : C.line,
                  background: correct ? C.greenPale : wrong ? C.redPale : C.paper,
                }}
              >
                {optionLabel(card, option)}
              </button>
            );
          })}
        </div>

        {result && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: C.line }}>
            <div className="flex items-start gap-2 text-sm" style={{ color: result.passed ? C.green : C.red }}>
              {result.passed ? <Check size={17} className="mt-0.5 shrink-0" /> : <X size={17} className="mt-0.5 shrink-0" />}
              <span>
                {result.passed
                  ? `Right — ${isContrast(card) ? `«${card.answer}»` : qualifiedTenseLabel(card.answer)}.`
                  : `That’s ${feedbackLabel(card, result.chosen)}. ${card.contrast || `The answer is ${feedbackLabel(card, card.answer)}.`}`}
              </span>
            </div>
            {renderReveal?.(card, result, {
              requestOpen,
              openArmed,
              remaining: activeDeck.length - index,
            })}
          </div>
        )}
      </Card>
    </StudySessionFrame>
  );
}
