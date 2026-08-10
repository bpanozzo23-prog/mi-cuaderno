import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { C, MONO, SERIF, Button, Card } from "../theme.jsx";
import { logDrill } from "../db/events.js";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { grammarGuidesForTense } from "../lib/recognitionGuides.js";
import { rebuildMissedUsageRecallDeck } from "../lib/recognitionDeck.js";
import StudySessionFrame, { StudyCardEyebrow } from "./StudySessionFrame.jsx";

const fallbackSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `usage-recall-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function AlternativeNote({ use }) {
  if (!use.alsoAcceptable?.length) return null;
  const mexican = use.alsoAcceptable.includes("Indicative/Preterite");
  return (
    <div className="mt-1 text-xs" style={{ color: C.penDark }}>
      <span className="font-semibold">{mexican ? "Mexican Spanish nuance:" : "Also natural:"}</span>{" "}
      {use.alsoAcceptable.map(qualifiedTenseLabel).join(" or ")} can also express this use.
    </div>
  );
}

function RecallBack({ card, items, controls }) {
  const guides = grammarGuidesForTense(items, card.answer);
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: C.line }}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
        Curated uses
      </div>
      <ol className="mt-2 space-y-3 pl-5 text-sm leading-relaxed" style={{ color: C.ink }}>
        {card.uses.map((use) => (
          <li key={use.id} className="list-decimal">
            {use.prompt}
            <AlternativeNote use={use} />
          </li>
        ))}
      </ol>

      {card.contrasts.length > 0 && (
        <div className="mt-4 rounded-lg border px-3 py-2" style={{ borderColor: C.chipBorder, background: C.penPale }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
            Contrast guidance
          </div>
          <ul className="mt-1 space-y-1 text-xs leading-relaxed" style={{ color: C.penDark }}>
            {card.contrasts.map((contrast) => <li key={contrast}>• {contrast}</li>)}
          </ul>
        </div>
      )}

      {guides.length > 0 && controls && (
        <div className="mt-4 space-y-1.5">
          {controls.openArmed && (
            <div role="alert" className="text-xs" style={{ color: C.red }}>
              Opening this guide ends the session. {controls.remaining} {controls.remaining === 1 ? "prompt remains" : "prompts remain"}.
            </div>
          )}
          {guides.map((guide) => {
            const armed = controls.openArmed === guide.id;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => controls.requestOpen(guide.id)}
                className="block text-left text-xs underline underline-offset-2"
                style={{ color: armed ? C.red : C.pen }}
              >
                {armed ? `Open ${guide.title} and end session` : `Open your guide · ${guide.title}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UsageRecallDrill({
  deck,
  items = [],
  onFinish,
  onGraded,
  onOpen,
  rng = Math.random,
}) {
  const [round, setRound] = useState("initial");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
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

  async function grade(passed) {
    if (!card || !revealed || result || busy) return;
    const stage = round === "missed" ? "missed" : "initial";
    setBusy(true);
    try {
      await logDrill(null, passed, {
        skill: "usage",
        cardId: card.id,
        tense: card.answer,
        mode: "recall",
        verdict: "self",
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
        if (!passed) {
          setMissedCards((current) => current.some((missed) => missed.answer === card.answer)
            ? current
            : [...current, card]);
        }
      } else {
        setMissedTally((current) => ({
          answered: current.answered + 1,
          passed: current.passed + (passed ? 1 : 0),
        }));
      }
      setResult({ passed });
      onGraded?.();
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    setIndex((current) => current + 1);
    setRevealed(false);
    setResult(null);
    setOpenArmed(null);
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
    setMissedDeck(rebuildMissedUsageRecallDeck(missedCards, { rng }));
    setRound("missed");
    setIndex(0);
    setRevealed(false);
    setResult(null);
    setOpenArmed(null);
  }

  if (done) {
    const initialComplete = round === "initial";
    const summaryActions = initialComplete && missedCards.length > 0 ? (
      <div className="flex flex-col gap-2">
        <Button className="min-h-11 w-full" onClick={startMissedRound}>
          <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "tense" : "tenses"}
        </Button>
        <Button tone="quiet" className="min-h-11 w-full" onClick={onFinish}>Finish session</Button>
      </div>
    ) : (
      <Button className="min-h-11 w-full" onClick={onFinish}>Back to Gym</Button>
    );
    return (
      <StudySessionFrame
        title="Tense usage"
        stageLabel={initialComplete ? "Recall" : "Missed round · recall"}
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

  const actions = !revealed ? (
    <Button className="min-h-11 w-full" onClick={() => setRevealed(true)}>Show uses</Button>
  ) : !result ? (
    <div className="grid grid-cols-2 gap-2" aria-label="Recall grade">
      <Button tone="gradeAgain" className="min-h-11" disabled={busy} onClick={() => grade(false)}>
        <X size={16} /> Couldn’t recall
      </Button>
      <Button tone="gradeEasy" className="min-h-11" disabled={busy} onClick={() => grade(true)}>
        <Check size={16} /> Recalled one
      </Button>
    </div>
  ) : (
    <Button className="min-h-11 w-full" onClick={advance}>
      {index + 1 === activeDeck.length ? "Done" : "Next"}
    </Button>
  );

  return (
    <StudySessionFrame
      title="Tense usage"
      stageLabel={round === "missed" ? "Missed round · recall" : "Recall"}
      current={index + 1}
      total={activeDeck.length}
      onFinish={onFinish}
      actions={actions}
    >
      <Card className="p-5">
        <StudyCardEyebrow>Tense usage · Recall</StudyCardEyebrow>
        <div className="mt-3 text-center text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
          {qualifiedTenseLabel(card.answer)}
        </div>
        <p className="mt-2 text-center text-sm" style={{ color: C.mut }}>
          Recall at least one valid use.
        </p>

        {revealed && (
          <>
            <RecallBack
              card={card}
              items={items}
              controls={{ requestOpen, openArmed, remaining: activeDeck.length - index }}
            />
            {result && (
              <div className="mt-5 flex items-center gap-2 text-sm" style={{ color: result.passed ? C.green : C.red }}>
                {result.passed ? <Check size={17} /> : <X size={17} />}
                {result.passed ? "Marked recalled." : "Marked for the optional missed round."}
              </div>
            )}
          </>
        )}
      </Card>
    </StudySessionFrame>
  );
}
