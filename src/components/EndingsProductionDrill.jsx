import { useState } from "react";
import { Check, ChevronLeft, LockKeyhole, RotateCcw, X } from "lucide-react";
import { C, MONO, SERIF, Button, Card, dotGrid } from "../theme.jsx";
import { logDrill } from "../db/events.js";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { GYM_SLOTS } from "../lib/conjugationGym.js";
import { gradeEndingRow, rebuildMissedEndingsProductionDeck } from "../lib/endingsProduction.js";
import EndingsReveal from "./EndingsReveal.jsx";

const fallbackSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `endings-production-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const blankValues = () => Object.fromEntries(GYM_SLOTS.map((slot) => [slot, ""]));

const FIELD_FEEDBACK = {
  exact: "Locked · exact",
  accents: "Locked · accent slip accepted",
  accent_collision: "Accent collision — that spelling is another ending.",
  wrong: "Try this ending again.",
  required: "This ending is required.",
};

function PromptCue({ card }) {
  if (card.attachment === "participle") {
    return <p className="mt-2 text-center text-sm" style={{ color: C.mut }}>Type the five tense-specific forms of <em>haber</em>.</p>;
  }
  if (card.attachment === "infinitive") {
    return <p className="mt-2 text-center text-sm" style={{ color: C.mut }}>Add each ending to the whole infinitive.</p>;
  }
  return <p className="mt-2 text-center text-sm" style={{ color: C.mut }}>Type the five endings for this class.</p>;
}

function CompletePattern({ card, result, library }) {
  return (
    <div className="mt-5 border-t pt-4" style={{ borderColor: C.line }}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
        Complete pattern
      </div>
      <div className="mt-2 space-y-1.5">
        {GYM_SLOTS.map((slot, index) => (
          <div key={slot} className="flex items-baseline justify-between gap-3 text-sm">
            <span style={{ fontFamily: MONO, color: C.mut }}>{slot}</span>
            <span lang="es" className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.penDark }}>
              {card.endings[index]}
              {result?.slotVerdicts?.[slot] === "accents" && (
                <span className="ml-2 text-[10px] font-normal" style={{ fontFamily: MONO, color: C.green }}>accent slip accepted</span>
              )}
            </span>
          </div>
        ))}
      </div>
      {card.attachment === "participle" && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ background: C.penPale, color: C.penDark }}>
          Shared participle rule: add <strong>-ado</strong> to regular -ar stems and <strong>-ido</strong> to regular -er/-ir stems; irregular participles keep their own form.
        </div>
      )}
      <EndingsReveal card={card} library={library} />
    </div>
  );
}

export default function EndingsProductionDrill({ deck, library, onFinish, onGraded, rng = Math.random }) {
  const [round, setRound] = useState("initial");
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState(blankValues);
  const [locked, setLocked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [awaitingRetry, setAwaitingRetry] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [missedCards, setMissedCards] = useState([]);
  const [missedDeck, setMissedDeck] = useState([]);
  const [initialTally, setInitialTally] = useState({ answered: 0, passed: 0, exact: 0, accents: 0, recovered: 0 });
  const [missedTally, setMissedTally] = useState({ answered: 0, passed: 0 });
  const [componentSessionId] = useState(() => deck[0]?.sessionId || fallbackSessionId());

  const activeDeck = round === "missed" ? missedDeck : deck;
  const card = activeDeck[index] || null;
  const done = index >= activeDeck.length;
  const complete = GYM_SLOTS.every((slot) => values[slot].trim());

  function resetPrompt() {
    setValues(blankValues());
    setLocked([]);
    setResult(null);
    setAwaitingRetry(false);
    setRevealed(false);
  }

  function advance() {
    setIndex((current) => current + 1);
    resetPrompt();
  }

  async function persist(graded, stage) {
    await logDrill(null, graded.passed, {
      skill: "endings",
      cardId: card.id,
      tense: card.answer,
      mode: "typed",
      verdict: graded.verdict,
      slotVerdicts: graded.slotVerdicts,
      sessionId: card.sessionId || componentSessionId,
      promptId: card.promptId || `${componentSessionId}:${card.cardIndex || index + 1}`,
      sessionKind: "recognition",
      stage,
      cardIndex: card.cardIndex || index + 1,
      deckSize: card.deckSize || deck.length,
    });
    onGraded?.();
  }

  async function submit(event) {
    event?.preventDefault?.();
    if (!card || busy || revealed || !complete) return;
    const stage = round === "missed" ? "missed" : awaitingRetry ? "retry" : "initial";
    const graded = gradeEndingRow(values, card);
    setBusy(true);
    try {
      await persist(graded, stage);
      if (stage === "initial") {
        setInitialTally((current) => ({
          ...current,
          answered: current.answered + 1,
          passed: current.passed + (graded.passed ? 1 : 0),
          exact: current.exact + (graded.verdict === "exact" ? 1 : 0),
          accents: current.accents + (graded.verdict === "accents" ? 1 : 0),
        }));
        if (!graded.passed) {
          setMissedCards((current) => current.some((missed) => missed.id === card.id) ? current : [...current, card]);
          const passingSlots = GYM_SLOTS.filter((slot) => ["exact", "accents"].includes(graded.slotVerdicts[slot]));
          setLocked(passingSlots);
          setValues((current) => Object.fromEntries(GYM_SLOTS.map((slot) => [
            slot,
            passingSlots.includes(slot) ? current[slot] : "",
          ])));
          setResult(graded);
          setAwaitingRetry(true);
          return;
        }
      } else if (stage === "retry" && graded.passed) {
        setInitialTally((current) => ({ ...current, recovered: current.recovered + 1 }));
      } else if (stage === "missed") {
        setMissedTally((current) => ({
          answered: current.answered + 1,
          passed: current.passed + (graded.passed ? 1 : 0),
        }));
      }
      setResult(graded);
      setAwaitingRetry(false);
      setRevealed(true);
    } finally {
      setBusy(false);
    }
  }

  function startMissedRound() {
    setMissedDeck(rebuildMissedEndingsProductionDeck(missedCards, { rng }));
    setRound("missed");
    setIndex(0);
    resetPrompt();
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
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {initialTally.exact} exact · {initialTally.accents} accent-assisted
                {initialTally.recovered > 0 && ` · ${initialTally.recovered} immediate ${initialTally.recovered === 1 ? "recovery" : "recoveries"}`}
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
                <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "row" : "rows"}
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
          Endings · Production
        </div>
        <div className="mt-3 text-center text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
          {qualifiedTenseLabel(card.answer)}
        </div>
        <div className="mt-1 text-center text-sm font-semibold" style={{ color: C.penDark }}>{card.verbClass}</div>
        <PromptCue card={card} />

        {!revealed && (
          <form className="mt-5" onSubmit={submit}>
            {awaitingRetry && (
              <div className="mb-3 rounded-lg px-3 py-2 text-center text-sm" style={{ background: C.redPale, color: C.red }}>
                Keep the passing endings. Try the failed endings once more.
              </div>
            )}
            <div className="space-y-3">
              {GYM_SLOTS.map((slot) => {
                const isLocked = locked.includes(slot);
                const verdict = result?.slotVerdicts?.[slot];
                return (
                  <label key={slot} className="block">
                    <span className="mb-1 flex items-center justify-between gap-2 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
                      <span>{slot}</span>
                      {isLocked && <span className="flex items-center gap-1" style={{ color: C.green }}><LockKeyhole size={11} /> locked</span>}
                    </span>
                    <input
                      lang="es"
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      disabled={busy || isLocked}
                      aria-label={`${slot} ending`}
                      value={values[slot]}
                      onChange={(event) => setValues((current) => ({ ...current, [slot]: event.target.value }))}
                      className="w-full rounded-xl border px-3 py-2 text-center text-xl outline-none disabled:opacity-100"
                      style={{
                        fontFamily: SERIF,
                        color: C.ink,
                        borderColor: isLocked ? C.green : verdict && !["exact", "accents"].includes(verdict) ? C.red : C.line,
                        background: isLocked ? C.greenPale : C.paper,
                      }}
                    />
                    {awaitingRetry && verdict && (
                      <span className="mt-1 block text-xs" style={{ color: isLocked ? C.green : C.red }}>
                        {FIELD_FEEDBACK[verdict]}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={busy || !complete}>
              {awaitingRetry ? "Check retry" : "Check endings"}
            </Button>
          </form>
        )}

        {revealed && (
          <>
            <div className="mt-4 flex items-start gap-2 text-sm" style={{ color: result.passed ? C.green : C.red }}>
              {result.passed ? <Check size={17} className="mt-0.5 shrink-0" /> : <X size={17} className="mt-0.5 shrink-0" />}
              <span>
                {result.verdict === "exact"
                  ? "Every ending is exact."
                  : result.verdict === "accents"
                    ? "Correct — accent slip accepted."
                    : "That row is not complete yet; compare every ending below."}
              </span>
            </div>
            <CompletePattern card={card} result={result} library={library} />
          </>
        )}
      </Card>

      {revealed && (
        <Button className="mt-4 w-full" onClick={advance}>
          {index + 1 === activeDeck.length ? "Done" : "Next"}
        </Button>
      )}
    </div>
  );
}
