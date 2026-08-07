import { useState } from "react";
import { ChevronLeft, RotateCcw, Check, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button } from "../theme.jsx";
import { tenseHeading } from "../lib/conjugation.js";
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
export default function ConjugationDrill({ deck, mode = "reveal", onFinish, onOpen }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tally, setTally] = useState({ passed: 0, failed: 0, accents: 0 });

  const card = deck[index] || null;
  const done = index >= deck.length;

  /**
   * Records one answer and advances. Disabled between the tap and the advance, so a
   * double-tap cannot grade the next card — ReviewSession's guard, for its reason.
   */
  async function grade(passed, verdict) {
    if (busy || !card) return;
    setBusy(true);
    await logDrill(card.itemId, passed, {
      tense: card.tense,
      slot: card.slot,
      mode,
      verdict,
    });
    setTally((current) => ({
      passed: current.passed + (passed ? 1 : 0),
      failed: current.failed + (passed ? 0 : 1),
      accents: current.accents + (verdict === "accents" ? 1 : 0),
    }));
    setRevealed(false);
    setIndex((current) => current + 1);
    setBusy(false);
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
            {tenseHeading(card.tense)} · {card.slot}
          </div>
          <div className="mt-2 text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {card.term}
          </div>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full mt-5 py-6 rounded-xl border border-dashed text-sm"
            style={{ borderColor: C.line, color: C.mut, background: C.paper }}
          >
            Tap to see the form
          </button>
        ) : (
          <div className="mt-4 pt-4 border-t text-center space-y-3" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.penDark }}>
                {card.answer}
              </span>
              <SpeakButton text={card.answer} size={16} />
            </div>
            {onOpen && (
              <button
                type="button"
                onClick={() => onOpen(card.itemId)}
                className="text-xs underline underline-offset-2"
                style={{ color: C.pen }}
              >
                Open the full entry
              </button>
            )}
          </div>
        )}
      </Card>

      {revealed && (
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
