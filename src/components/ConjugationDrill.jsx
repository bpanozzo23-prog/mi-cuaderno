import { useMemo, useState } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { diagnoseTypedAnswer } from "../lib/drill.js";
import { verbKeyForLemma } from "../lib/conjugationGym.js";
import { formCellFor } from "../lib/formChoices.js";
import { rebuildMissedRecognitionDeck } from "../lib/recognitionDeck.js";
import { logDrill } from "../db/events.js";
import SpeakButton from "./SpeakButton.jsx";
import StudySessionFrame, { StudyCardEyebrow } from "./StudySessionFrame.jsx";

const DIAGNOSIS_TEXT = {
  exact: "Exactly right.",
  accents: "Right form — mind the accent.",
  accent_collision: "The accent decides the tense here — without it this is a different form.",
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
export default function ConjugationDrill({ deck, mode = "reveal", onFinish, onOpen, onGraded, rng = Math.random }) {
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
  const isChoice = mode === "choice";
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

  async function persist(passed, verdict, diagnosis, stage, extra = {}) {
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
      ...extra,
    });
    onGraded?.();
  }

  /**
   * Choose: one tap on one of four forms of this verb. Objective like typed, diagnosed by the
   * same ladder (a tapped «fuiste» for él is wrong person), no immediate retry because the
   * feedback names the answer. The tapped form is a dictionary form, never owner text.
   */
  async function chooseForm(chosen) {
    if (busy || !card || result) return;
    const stage = round === "missed" ? "missed" : "initial";
    const passed = chosen === card.answer;
    const diagnosed = passed ? { passed, verdict: "exact", diagnosis: null } : diagnoseTypedAnswer(chosen, card, card.forms || []);
    setBusy(true);
    try {
      await persist(passed, diagnosed.verdict, diagnosed.diagnosis, stage, passed ? {} : { chosen });
      if (stage === "initial") recordInitial(passed, diagnosed.verdict);
      setResult({ ...diagnosed, passed, stage, chosen });
      setRevealed(true);
    } finally {
      setBusy(false);
    }
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
    if (isChoice) setMissedCards((current) => rebuildMissedRecognitionDeck(current, { rng }));
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
    onFinish?.();
    onOpen(target);
  }

  if (done) {
    const hasAnswers = tally.answered > 0;
    const initialComplete = round === "initial";
    const summaryActions = initialComplete && missedCards.length > 0 ? (
      <div className="flex flex-col gap-2">
        <Button className="min-h-11 w-full" onClick={startMissedRound}>
          <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "form" : "forms"}
        </Button>
        <Button tone="quiet" className="min-h-11 w-full" onClick={onFinish}>Finish session</Button>
      </div>
    ) : (
      <Button className="min-h-11 w-full" onClick={onFinish}>Back to Gym</Button>
    );
    return (
      <StudySessionFrame
        title="Forms"
        stageLabel={initialComplete ? "" : "Missed round"}
        current={activeDeck.length}
        total={activeDeck.length}
        summary
        actions={summaryActions}
      >
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

        </Card>
      </StudySessionFrame>
    );
  }

  const formId = "conjugation-drill-answer";
  const actions = isChoice ? (
    result ? (
      <Button className="min-h-11 w-full" disabled={busy} onClick={advance}>
        {index + 1 === activeDeck.length ? "Done" : "Next"}
      </Button>
    ) : null
  ) : isTyped ? (
    !revealed ? (
      <Button
        type="submit"
        form={formId}
        className="min-h-11 w-full"
        disabled={busy || !typed.trim()}
      >
        {awaitingRetry ? "Check retry" : "Check"}
      </Button>
    ) : result ? (
      <Button className="min-h-11 w-full" disabled={busy} onClick={advance}>
        {index + 1 === activeDeck.length ? "Done" : "Next"}
      </Button>
    ) : null
  ) : !revealed ? (
    <Button className="min-h-11 w-full" onClick={() => setRevealed(true)}>
      Tap to see the form
    </Button>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <Button tone="gradeAgain" className="min-h-11" disabled={busy} onClick={() => gradeReveal(false)}>
        <X size={16} /> Missed it
      </Button>
      <Button tone="gradeEasy" className="min-h-11" disabled={busy} onClick={() => gradeReveal(true)}>
        <Check size={16} /> Got it
      </Button>
    </div>
  );

  return (
    <StudySessionFrame
      title="Forms"
      stageLabel={round === "missed" ? "Missed round" : ""}
      current={index + 1}
      total={activeDeck.length}
      onFinish={onFinish}
      actions={actions}
    >
      <Card className="p-5">
        <div className="text-center">
          <StudyCardEyebrow>
            {qualifiedTenseLabel(card.tense)} · {card.slot}
          </StudyCardEyebrow>
          <div className="mt-2 text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {card.term}
          </div>
        </div>

        {isChoice && (
          <div className="mt-5 grid gap-2" aria-label="Form choices">
            {(card.options || []).map((option) => {
              const chosen = result?.chosen === option;
              const correct = result && option === card.answer;
              const wrong = chosen && !result.passed;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={busy || Boolean(result)}
                  onClick={() => chooseForm(option)}
                  className="min-h-11 rounded-full border px-3 py-2 text-base disabled:opacity-100"
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    color: correct ? C.green : wrong ? C.red : C.ink,
                    borderColor: correct ? C.green : wrong ? C.red : C.line,
                    background: correct ? C.greenPale : wrong ? C.redPale : C.paper,
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {!revealed && isTyped ? (
          <form id={formId} onSubmit={submitTyped} className="mt-5">
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
          </form>
        ) : revealed ? (
          <div className="mt-4 space-y-3 border-t pt-4 text-center" style={{ borderColor: C.line }}>
            {result && isChoice && !result.passed && (
              <div className="text-sm" style={{ color: C.red }}>
                {(() => {
                  const cell = formCellFor(result.chosen, card, card.forms || []);
                  const where = cell ? ` — ${cell.slot}, ${qualifiedTenseLabel(cell.tense).toLowerCase()}` : "";
                  return `That’s «${result.chosen}»${where}. ${DIAGNOSIS_TEXT[result.diagnosis] || DIAGNOSIS_TEXT.wrong}`;
                })()}
              </div>
            )}
            {result && !(isChoice && !result.passed) && (
              <div className="text-sm" style={{ color: result.passed ? C.green : C.red }}>
                {isChoice ? `Right — «${card.answer}».` : DIAGNOSIS_TEXT[result.diagnosis]}
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
        ) : null}
      </Card>
    </StudySessionFrame>
  );
}
