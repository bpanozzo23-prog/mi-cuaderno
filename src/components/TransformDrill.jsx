import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { C, MONO, SERIF, Button, Card } from "../theme.jsx";
import { logDrill } from "../db/events.js";
import { GYM_SLOTS } from "../lib/conjugationGym.js";
import { conjugationForms, diagnoseTypedAnswer } from "../lib/drill.js";
import { rebuildMissedTypedDeck } from "../lib/endingsProduction.js";
import { grammarGuidesForTerms } from "../lib/recognitionGuides.js";
import { TRANSFORM_FAMILIES, TRANSFORM_GUIDE_TERMS } from "../lib/transformContent.js";
import StudySessionFrame, { StudyCardEyebrow } from "./StudySessionFrame.jsx";

const fallbackSessionId = () =>
  globalThis.crypto?.randomUUID?.() || `transform-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const DIAGNOSIS_TEXT = {
  exact: "Exactly right.",
  accents: "Right form — mind the accent.",
  accent_collision: "The accent decides the mood here — without it this is a different form.",
  missing_no: "This form needs no.",
  missing_reflexive: "The reflexive pronoun is missing.",
  wrong_person: "That is the subjunctive of another person.",
  wrong_tense: "That form belongs to another tense — the trigger asks for the subjunctive.",
  other_form: "That is a real form of this verb, but not the one the trigger asks for.",
  wrong: "Not this time.",
};

/** The verb's table from the Gym library, when the dictionary is installed. */
function tableFor(card, library) {
  const verbs = [...(library?.saved || []), ...(library?.core || [])];
  return verbs.find((verb) => verb.lemma === card.lemma)?.conjugation || null;
}

function Paradigm({ card, table }) {
  const row = table?.tenses?.["Subjunctive/Present"];
  if (!row || !GYM_SLOTS.every((slot) => row[slot])) return null;
  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
        {card.lemma} · present subjunctive
      </div>
      <div className="mt-1 space-y-1">
        {GYM_SLOTS.map((slot) => (
          <div key={slot} className="flex items-baseline justify-between gap-3 text-sm">
            <span style={{ fontFamily: MONO, color: C.mut }}>{slot}</span>
            <span lang="es" style={{ fontFamily: SERIF, fontWeight: slot === card.slot ? 700 : 400, color: slot === card.slot ? C.penDark : C.ink }}>
              {row[slot]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Transform: one indicative sentence, one subjunctive trigger with a blank, one typed form.
 * Typed-production rules carried over from Endings: exact-first accent policy, one unrevealed
 * retry, a de-duplicated missed round, and no typed string ever persisted.
 */
export default function TransformDrill({ deck, library, items = [], onFinish, onGraded, onOpen, rng = Math.random }) {
  const [round, setRound] = useState("initial");
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [awaitingRetry, setAwaitingRetry] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [openArmed, setOpenArmed] = useState(null);
  const [missedCards, setMissedCards] = useState([]);
  const [missedDeck, setMissedDeck] = useState([]);
  const [initialTally, setInitialTally] = useState({ answered: 0, passed: 0, exact: 0, accents: 0, recovered: 0 });
  const [missedTally, setMissedTally] = useState({ answered: 0, passed: 0 });
  const [componentSessionId] = useState(() => deck[0]?.sessionId || fallbackSessionId());

  const activeDeck = round === "missed" ? missedDeck : deck;
  const card = activeDeck[index] || null;
  const done = index >= activeDeck.length;
  const table = card ? tableFor(card, library) : null;
  const guides = card ? grammarGuidesForTerms(items, TRANSFORM_GUIDE_TERMS) : [];

  function resetPrompt() {
    setTyped("");
    setResult(null);
    setAwaitingRetry(false);
    setRevealed(false);
    setOpenArmed(null);
  }

  function advance() {
    setIndex((current) => current + 1);
    resetPrompt();
  }

  async function persist(graded, stage) {
    await logDrill(null, graded.passed, {
      skill: "transform",
      cardId: card.id,
      tense: card.tense,
      mode: "typed",
      verdict: graded.verdict,
      diagnosis: graded.diagnosis,
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
    if (!card || busy || revealed || !typed.trim()) return;
    const stage = round === "missed" ? "missed" : awaitingRetry ? "retry" : "initial";
    const graded = diagnoseTypedAnswer(typed, card, table ? conjugationForms(table) : []);
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
          setResult(graded);
          setAwaitingRetry(true);
          setTyped("");
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
    setMissedDeck(rebuildMissedTypedDeck(missedCards, { rng, keyOf: (row) => row.family }));
    setRound("missed");
    setIndex(0);
    resetPrompt();
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

  if (done) {
    const initialComplete = round === "initial";
    const summaryActions = initialComplete && missedCards.length > 0 ? (
      <div className="flex flex-col gap-2">
        <Button className="min-h-11 w-full" onClick={startMissedRound}>
          <RotateCcw size={15} /> Practice {missedCards.length} missed {missedCards.length === 1 ? "frame" : "frames"}
        </Button>
        <Button tone="quiet" className="min-h-11 w-full" onClick={onFinish}>Finish session</Button>
      </div>
    ) : (
      <Button className="min-h-11 w-full" onClick={onFinish}>Back to Gym</Button>
    );
    return (
      <StudySessionFrame
        title="Transform"
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
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {initialTally.exact} exact · {initialTally.accents} accent {initialTally.accents === 1 ? "slip" : "slips"}
                {initialTally.recovered > 0 && ` · ${initialTally.recovered} immediate ${initialTally.recovered === 1 ? "recovery" : "recoveries"}`}
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

  const formId = "transform-answer";
  const actions = !revealed ? (
    <Button type="submit" form={formId} className="min-h-11 w-full" disabled={busy || !typed.trim()}>
      {awaitingRetry ? "Check retry" : "Check"}
    </Button>
  ) : (
    <Button className="min-h-11 w-full" onClick={advance}>
      {index + 1 === activeDeck.length ? "Done" : "Next"}
    </Button>
  );
  const [before, after] = card.frame.split("___");
  const remaining = activeDeck.length - index;

  return (
    <StudySessionFrame
      title="Transform"
      stageLabel={round === "missed" ? "Missed round" : ""}
      current={index + 1}
      total={activeDeck.length}
      onFinish={onFinish}
      actions={actions}
    >
      <Card className="p-5">
        <StudyCardEyebrow>Transform · {TRANSFORM_FAMILIES[card.family]?.label || card.family}</StudyCardEyebrow>
        <div lang="es" className="mt-3 text-center text-2xl leading-snug" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
          {card.base}
        </div>

        {!revealed ? (
          <form id={formId} className="mt-5" onSubmit={submit}>
            {awaitingRetry && result && (
              <div className="mb-3 rounded-lg px-3 py-2 text-center text-sm" style={{ background: C.redPale, color: C.red }}>
                {DIAGNOSIS_TEXT[result.diagnosis] || DIAGNOSIS_TEXT.wrong} Try once more.
              </div>
            )}
            <div lang="es" className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-2 text-lg" style={{ fontFamily: SERIF, color: C.ink }}>
              <span>{before.trim()}</span>
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
                className="w-40 rounded-xl border px-3 py-2 text-center text-xl outline-none"
                style={{ fontFamily: SERIF, color: C.ink, borderColor: awaitingRetry ? C.red : C.line, background: C.paper }}
              />
              {after.trim() && <span>{after.trim()}</span>}
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: C.line }}>
            <div className="flex items-start gap-2 text-sm" style={{ color: result.passed ? C.green : C.red }}>
              {result.passed ? <Check size={17} className="mt-0.5 shrink-0" /> : <X size={17} className="mt-0.5 shrink-0" />}
              <span>{DIAGNOSIS_TEXT[result.diagnosis] || DIAGNOSIS_TEXT.wrong}</span>
            </div>
            <div lang="es" className="text-center text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.penDark }}>
              {card.frame.replace("___", card.answer)}
            </div>
            <div className="text-center text-sm" style={{ fontStyle: "italic", color: C.mut }}>{card.gloss}</div>
            <div className="rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ background: C.penPale, color: C.penDark }}>
              {card.rule}
            </div>
            <Paradigm card={card} table={table} />
            {guides.length > 0 && onOpen && (
              <div className="space-y-1.5">
                {openArmed && (
                  <div role="alert" className="text-xs" style={{ color: C.red }}>
                    Opening this guide ends the session. {remaining} {remaining === 1 ? "prompt remains" : "prompts remain"}.
                  </div>
                )}
                {guides.map((guide) => {
                  const armed = openArmed === guide.id;
                  return (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() => requestOpen(guide.id)}
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
        )}
      </Card>
    </StudySessionFrame>
  );
}
