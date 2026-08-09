import { useMemo, useState } from "react";
import { ChevronLeft, RotateCcw, Check, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { diagnoseTypedAnswer } from "../lib/drill.js";
import { verbKeyForLemma } from "../lib/conjugationGym.js";
import { logDrill } from "../db/events.js";
import SpeakButton from "./SpeakButton.jsx";

const DIAGNOSIS_TEXT = {
  exact: "Exactly right.",
  accents: "Right form — mind the accent.",
  missing_no: "This negative command needs no.",
  missing_reflexive: "The reflexive pronoun is missing.",
  wrong_person: "That form belongs to another person.",
  wrong_tense: "That form belongs to another tense.",
  other_form: "That is a real form, but not this prompt.",
  wrong: "Not this time.",
};

const fallbackSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `gym-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function weakest(outcomes, field) {
  const rows = new Map();
  for (const outcome of outcomes) {
    const key = outcome[field];
    if (!key) continue;
    const row = rows.get(key) || { key, attempts: 0, passed: 0 };
    row.attempts += 1;
    if (outcome.passed) row.passed += 1;
    rows.set(key, row);
  }
  return [...rows.values()]
    .filter((row) => row.passed < row.attempts)
    .sort((a, b) => a.passed / a.attempts - b.passed / b.attempts || b.attempts - a.attempts)[0] || null;
}

/**
 * One immutable Gym deck. Every attempt is an event, but only initial typed attempts feed
 * the session score. A first miss gets one immediate retry and is still offered once in an
 * optional missed round, so recovery cannot erase the evidence that selected the form.
 */
export default function ConjugationDrill({ deck, mode = "reveal", onFinish, onOpen, onGraded }) {
  const [round, setRound] = useState("initial");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState(null);
  const [awaitingRetry, setAwaitingRetry] = useState(false);
  const [openArmed, setOpenArmed] = useState(false);
  const [missedCards, setMissedCards] = useState([]);
  const [componentSessionId] = useState(() => deck[0]?.sessionId || fallbackSessionId());
  const [tally, setTally] = useState({
    answered: 0,
    passed: 0,
    exact: 0,
    accents: 0,
    recovered: 0,
    outcomes: [],
  });

  const activeDeck = round === "missed" ? missedCards : deck;
  const card = activeDeck[index] || null;
  const done = index >= activeDeck.length;
  const isTyped = mode === "typed";
  const weakTense = useMemo(() => weakest(tally.outcomes, "tense"), [tally.outcomes]);
  const weakSlot = useMemo(() => weakest(tally.outcomes, "slot"), [tally.outcomes]);

  function resetPrompt() {
    setRevealed(false);
    setTyped("");
    setResult(null);
    setAwaitingRetry(false);
    setOpenArmed(false);
  }

  function advance() {
    resetPrompt();
    setIndex((current) => current + 1);
  }

  function recordInitial(passed, verdict) {
    setTally((current) => ({
      ...current,
      answered: current.answered + 1,
      passed: current.passed + (passed ? 1 : 0),
      exact: current.exact + (verdict === "exact" ? 1 : 0),
      accents: current.accents + (verdict === "accents" ? 1 : 0),
      outcomes: [...current.outcomes, { tense: card.tense, slot: card.slot, passed }],
    }));
    if (!passed) setMissedCards((current) => [...current, card]);
  }

  async function persist(passed, verdict, diagnosis, stage) {
    const lemma = card.lemma || card.term;
    await logDrill(card.itemKey ?? card.itemId ?? null, passed, {
      sessionId: card.sessionId || componentSessionId,
      promptId: card.promptId || `${componentSessionId}:${card.cardIndex || index + 1}`,
      sessionKind: card.sessionKind || "quick",
      source: card.source || "saved",
      curriculum: card.curriculum || null,
      verbKey: card.verbKey || verbKeyForLemma(lemma),
      lemma,
      dictKey: card.dictKey || null,
      tense: card.tense,
      slot: card.slot,
      mode,
      verdict,
      diagnosis,
      stage,
      cardIndex: card.cardIndex || index + 1,
      deckSize: card.deckSize || deck.length,
    });
    onGraded?.();
  }

  async function submitTyped(event) {
    event?.preventDefault?.();
    if (busy || !card || !typed.trim() || (revealed && result)) return;
    const stage = round === "missed" ? "missed" : awaitingRetry ? "retry" : "initial";
    const diagnosed = diagnoseTypedAnswer(typed, card, card.forms || []);
    setBusy(true);
    try {
      await persist(diagnosed.passed, diagnosed.verdict, diagnosed.diagnosis, stage);

      if (stage === "initial") {
        recordInitial(diagnosed.passed, diagnosed.verdict);
        if (!diagnosed.passed) {
          setResult({ ...diagnosed, stage });
          setAwaitingRetry(true);
          setTyped("");
          setRevealed(false);
          return;
        }
      } else if (stage === "retry" && diagnosed.passed) {
        setTally((current) => ({ ...current, recovered: current.recovered + 1 }));
      }

      setResult({ ...diagnosed, stage, typed: typed.trim() });
      setAwaitingRetry(false);
      setRevealed(true);
    } finally {
      setBusy(false);
    }
  }

  async function gradeReveal(passed) {
    if (busy || !card) return;
    const stage = round === "missed" ? "missed" : "initial";
    setBusy(true);
    try {
      await persist(passed, "self", null, stage);
      if (stage === "initial") recordInitial(passed, "self");
      advance();
    } finally {
      setBusy(false);
    }
  }

  function startMissedRound() {
    setRound("missed");
    setIndex(0);
    resetPrompt();
  }

  function openEntry() {
    const target = card?.openKey || card?.itemId || card?.dictKey;
    if (!target || !onOpen) return;
    if (!openArmed) {
      setOpenArmed(true);
      return;
    }
    setOpenArmed(false);
    onOpen(target);
  }

  if (done) {
    const hasAnswers = tally.answered > 0;
    const initialComplete = round === "initial";
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {deck.length === 0 ? "Nothing to drill" : initialComplete ? "Session complete" : "Missed round complete"}
          </div>
          {hasAnswers && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {tally.passed}/{tally.answered}
              </div>
              {isTyped && (
                <div className="mt-1 text-sm" style={{ color: C.mut }}>
                  {tally.exact} exact · {tally.accents} accent {tally.accents === 1 ? "slip" : "slips"}
                  {tally.recovered > 0 && ` · ${tally.recovered} immediate ${tally.recovered === 1 ? "recovery" : "recoveries"}`}
                </div>
              )}
              {(weakTense || weakSlot) && (
                <div className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ background: C.penPale, color: C.penDark }}>
                  Needs work: {[weakTense && qualifiedTenseLabel(weakTense.key), weakSlot?.key].filter(Boolean).join(" · ")}
                </div>
              )}
            </>
          )}

          {initialComplete && missedCards.length > 0 ? (
            <div className="mt-4 space-y-2">
              <Button className="w-full" onClick={startMissedRound}>
                <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "form" : "forms"}
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
        <div className="text-center">
          <div className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            {qualifiedTenseLabel(card.tense)} · {card.slot}
          </div>
          <div className="mt-2 text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {card.term}
          </div>
        </div>

        {!revealed && isTyped ? (
          <form onSubmit={submitTyped} className="mt-5">
            {awaitingRetry && result && (
              <div className="mb-3 text-center">
                <div className="text-sm" style={{ color: C.red }}>{DIAGNOSIS_TEXT[result.diagnosis]}</div>
                <div className="mt-1 text-sm font-semibold" style={{ color: C.ink }}>Try once more.</div>
              </div>
            )}
            <input
              autoFocus
              lang="es"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label={awaitingRetry ? "Try the form again" : "Type the form"}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={awaitingRetry ? "try again…" : "the form…"}
              className="w-full rounded-xl border px-3 py-3 text-center text-2xl outline-none"
              style={{ fontFamily: SERIF, color: C.ink, borderColor: C.line, background: C.paper }}
            />
            <Button type="submit" className="mt-3 w-full" disabled={busy || !typed.trim()}>
              {awaitingRetry ? "Check retry" : "Check"}
            </Button>
          </form>
        ) : !revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="mt-5 w-full rounded-xl border border-dashed py-6 text-sm"
            style={{ borderColor: C.line, color: C.mut, background: C.paper }}
          >
            Tap to see the form
          </button>
        ) : (
          <div className="mt-4 space-y-3 border-t pt-4 text-center" style={{ borderColor: C.line }}>
            {result && (
              <div className="text-sm" style={{ color: result.passed ? C.green : C.red }}>
                {DIAGNOSIS_TEXT[result.diagnosis]}
              </div>
            )}
            {result && result.verdict !== "exact" && result.typed && (
              <div className="text-sm line-through" style={{ fontFamily: SERIF, color: C.mut }}>
                {result.typed}
              </div>
            )}
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.penDark }}>
                {card.answer}
              </span>
              <SpeakButton text={card.answer} size={16} />
            </div>
            {onOpen && (card.openKey || card.itemId || card.dictKey) && (
              <div className="space-y-2">
                {openArmed && (
                  <div className="text-xs" role="alert" style={{ color: C.red }}>
                    Opening this entry ends the session. {activeDeck.length - index} {activeDeck.length - index === 1 ? "prompt remains" : "prompts remain"}.
                  </div>
                )}
                <button
                  type="button"
                  onClick={openEntry}
                  className="text-xs underline underline-offset-2"
                  style={{ color: openArmed ? C.red : C.pen }}
                >
                  {card.source === "core" && !card.itemKey
                    ? openArmed ? "Open dictionary entry and end session" : "Open dictionary entry"
                    : openArmed ? "Open saved entry and end session" : "Open saved entry"}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {revealed && isTyped && result && (
        <Button className="mt-4 w-full" disabled={busy} onClick={advance}>
          {index + 1 === activeDeck.length ? "Done" : "Next"}
        </Button>
      )}

      {revealed && !isTyped && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button tone="danger" disabled={busy} onClick={() => gradeReveal(false)}>
            <X size={16} /> Missed it
          </Button>
          <Button disabled={busy} onClick={() => gradeReveal(true)}>
            <Check size={16} /> Got it
          </Button>
        </div>
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="mr-1 -mt-0.5 inline" />
        {activeDeck.length - index === 1 ? "Last one" : `${activeDeck.length - index} left`}
      </div>
    </div>
  );
}
