import { useState } from "react";
import { ChevronLeft, RotateCcw, Check, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { checkTypedAnswer } from "../lib/drill.js";
import { logDrill } from "../db/events.js";
import SpeakButton from "./SpeakButton.jsx";

/**
 * A pass through a deck of conjugation prompts (Phase 10c, graded since Phase 13).
 *
 * Each answer is graded and recorded. Phase 10c deliberately stored nothing; the owner
 * reversed that once the drill had been used, so the weak tenses could be found instead of
 * merely felt. The events are `drill_pass`/`drill_fail` and are read by nothing that
 * schedules: a missed conjugation is not a missed meaning, so it moves no Leitner box and
 * inflates no lookup count. Still no `view` event either — drilling a verb is not opening
 * its detail screen (the Phase 10c rule that survives).
 *
 * The deck is built once by the caller, so nothing re-derives underneath the owner.
 */
export default function ConjugationDrill({ deck, mode = "reveal", onFinish, onOpen, onGraded }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ passed: 0, failed: 0, accents: 0 });

  // Typed mode only: what has been typed, and the verdict once it is submitted. A null
  // verdict is "still answering" — distinct from a wrong one, which is why the check runs
  // on submit rather than on every keystroke.
  const [typed, setTyped] = useState("");
  const [verdict, setVerdict] = useState(null);

  const card = deck[index] || null;
  const done = index >= deck.length;
  const isTyped = mode === "typed";

  /**
   * Records one answer and advances. Disabled between the tap and the advance, so a
   * double-tap cannot grade the next card — ReviewSession's guard, for its reason.
   */
  async function grade(passed, answerVerdict) {
    if (busy || !card) return;
    setBusy(true);
    await logDrill(card.itemId, passed, {
      tense: card.tense,
      slot: card.slot,
      mode,
      verdict: answerVerdict,
    });
    setTally((current) => ({
      passed: current.passed + (passed ? 1 : 0),
      failed: current.failed + (passed ? 0 : 1),
      accents: current.accents + (answerVerdict === "accents" ? 1 : 0),
    }));
    setRevealed(false);
    setTyped("");
    setVerdict(null);
    setIndex((current) => current + 1);
    setBusy(false);
    onGraded?.();
  }

  /**
   * Typed mode marks the answer, shows it, and waits — the verdict is worth reading before
   * the next card arrives, and an accent slip in particular is the whole reason to look.
   * Grading is deferred to the Next tap so one submit cannot both judge and advance.
   */
  function submitTyped(event) {
    event?.preventDefault?.();
    if (verdict || busy || !card) return;
    setVerdict(checkTypedAnswer(typed, card.answer));
    setRevealed(true);
  }

  if (done) {
    const answered = tally.passed + tally.failed;
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {deck.length === 0 ? "Nothing to drill" : "¡Ya está!"}
          </div>
          {answered > 0 && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {tally.passed}/{answered}
              </div>
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {tally.accents > 0
                  ? `${tally.accents} ${tally.accents === 1 ? "accent slip" : "accent slips"}.`
                  : tally.failed === 0
                    ? "Every one of them."
                    : `${tally.failed} to come back to.`}
              </div>
            </>
          )}
          <Button className="mt-4" onClick={onFinish}>
            Back to Repaso
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onFinish} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Finish
        </button>
        <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          {index + 1} / {deck.length}
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
            <input
              autoFocus
              // Spanish, and none of the phone's helpfulness: an autocorrected or
              // capitalised answer would be marked on what the keyboard decided rather
              // than on what the owner recalled.
              lang="es"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label="Type the form"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="the form…"
              className="w-full rounded-xl border px-3 py-3 text-center text-2xl outline-none"
              style={{ fontFamily: SERIF, color: C.ink, borderColor: C.line, background: C.paper }}
            />
            <Button type="submit" className="mt-3 w-full justify-center" disabled={!typed.trim()}>
              Check
            </Button>
          </form>
        ) : !revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full mt-5 py-6 rounded-xl border border-dashed text-sm"
            style={{ borderColor: C.line, color: C.mut, background: C.paper }}
          >
            Tap to see the form
          </button>
        ) : (
          <div className="mt-4 pt-4 border-t text-center space-y-3" style={{ borderColor: C.line }}>
            {verdict && (
              <div className="text-sm" style={{ color: verdict === "wrong" ? C.red : C.green }}>
                {verdict === "exact"
                  ? "Exactly right."
                  : verdict === "accents"
                    ? "Right form — mind the accent."
                    : "Not this time."}
              </div>
            )}
            {/* The typed attempt stays on screen beside the answer when they differ: seeing
                the two together is what makes an accent slip legible as a slip. */}
            {verdict && verdict !== "exact" && typed.trim() && (
              <div className="text-sm line-through" style={{ fontFamily: SERIF, color: C.mut }}>
                {typed.trim()}
              </div>
            )}
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.penDark }}>
                {card.answer}
              </span>
              <SpeakButton text={card.answer} size={16} />
            </div>
            {onOpen && (
              <button
                type="button"
                onClick={() => onOpen(card.openKey || card.itemId || card.dictKey)}
                className="text-xs underline underline-offset-2"
                style={{ color: C.pen }}
              >
                {card.source === "core" && !card.itemKey ? "Open dictionary entry" : "Open saved entry"}
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Typed mode has already been marked, so it advances rather than asking again —
          offering "Got it" over a verdict would invite overruling the check. */}
      {revealed && isTyped && verdict && (
        <Button
          className="mt-4 w-full justify-center"
          disabled={busy}
          onClick={() => grade(verdict !== "wrong", verdict)}
        >
          {index + 1 === deck.length ? "Done" : "Next"}
        </Button>
      )}

      {revealed && !isTyped && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button tone="danger" disabled={busy} onClick={() => grade(false, "self")}>
            <X size={16} /> Missed it
          </Button>
          <button
            disabled={busy}
            onClick={() => grade(true, "self")}
            className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium"
            style={{ background: busy ? "#B9C2D8" : C.green, color: "#fff", borderColor: "transparent" }}
          >
            <Check size={16} /> Got it
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
        {deck.length - index === 1 ? "Last one" : `${deck.length - index} left`}
      </div>
    </div>
  );
}
