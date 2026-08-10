import { useMemo, useState } from "react";
import { ChevronLeft, Check, RotateCcw, X } from "lucide-react";
import { C, MONO, SERIF, Button, Card, dotGrid } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { recognitionTenses } from "../lib/recognitionContent.js";
import { rebuildMissedRecognitionDeck } from "../lib/recognitionDeck.js";
import { logDrill } from "../db/events.js";

const fallbackSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `recognition-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const lowerLabel = (tense) => qualifiedTenseLabel(tense).toLowerCase();

export default function RecognitionDrill({
  deck,
  onFinish,
  onGraded,
  rng = Math.random,
  renderReveal = null,
}) {
  const [round, setRound] = useState("initial");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [missedCards, setMissedCards] = useState([]);
  const [missedDeck, setMissedDeck] = useState([]);
  const [initialTally, setInitialTally] = useState({ answered: 0, passed: 0 });
  const [missedTally, setMissedTally] = useState({ answered: 0, passed: 0 });
  const [componentSessionId] = useState(() => deck[0]?.sessionId || fallbackSessionId());

  const activeDeck = round === "missed" ? missedDeck : deck;
  const card = activeDeck[index] || null;
  const done = index >= activeDeck.length;
  const laneTenses = useMemo(() => recognitionTenses(deck[0]?.skill), [deck]);

  async function choose(chosen) {
    if (!card || result || busy) return;
    const passed = chosen === card.answer;
    const stage = round === "missed" ? "missed" : "initial";
    setBusy(true);
    try {
      await logDrill(null, passed, {
        skill: card.skill,
        cardId: card.id,
        tense: card.answer,
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
    setIndex((current) => current + 1);
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
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
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
          {initialComplete && missedCards.length > 0 ? (
            <div className="mt-4 space-y-2">
              <Button className="w-full" onClick={startMissedRound}>
                <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "card" : "cards"}
              </Button>
              <Button tone="quiet" className="w-full" onClick={onFinish}>Finish session</Button>
            </div>
          ) : (
            <Button className="mt-4" onClick={onFinish}>Back to Gym</Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onFinish} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Finish
        </button>
        <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          {round === "missed" && "Missed · "}{index + 1} / {activeDeck.length}
        </span>
      </div>

      <Card className="p-5">
        <div className="text-center text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          Which tense is this?
        </div>
        <div className="mt-3 text-center text-lg leading-relaxed" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
          {card.prompt}
        </div>

        <div className="mt-5 grid gap-2" aria-label="Tense choices">
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
                {qualifiedTenseLabel(option)}
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
                  ? `Right — ${qualifiedTenseLabel(card.answer)}.`
                  : `That’s ${lowerLabel(result.chosen)}. ${card.contrast || `The answer is ${lowerLabel(card.answer)}.`}`}
              </span>
            </div>
            {renderReveal?.(card, result)}
          </div>
        )}
      </Card>

      {result && (
        <Button className="mt-4 w-full" onClick={advance}>
          {index + 1 === activeDeck.length ? "Done" : "Next"}
        </Button>
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="mr-1 -mt-0.5 inline" />
        {activeDeck.length - index === 1 ? "Last one" : `${activeDeck.length - index} left`}
      </div>
    </div>
  );
}
