import { useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button } from "../theme.jsx";
import { tenseHeading } from "../lib/conjugation.js";

/**
 * A pass through a deck of conjugation prompts (Phase 7c).
 *
 * Deliberately ungraded, and it writes nothing at all — no review events, and no view
 * events either, because drilling a verb is not opening its detail screen and must not
 * inflate the lookup counts that decide what Repaso enrolls. Brief §14 defers practice
 * history, grading and scheduling; storing nothing is how this stays on the right side
 * of that line.
 *
 * The deck is built once by the caller, so nothing re-derives underneath the owner. There
 * is no pass/fail button by design: the answer is either recalled or read, and the next
 * card is the only thing that happens either way.
 */
export default function ConjugationDrill({ deck, onFinish, onOpen }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const card = deck[index] || null;
  const done = index >= deck.length;

  function next() {
    setRevealed(false);
    setIndex((current) => current + 1);
  }

  if (done) {
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {deck.length === 0 ? "Nothing to drill" : "¡Ya está!"}
          </div>
          {deck.length > 0 && (
            <div className="mt-1 text-sm" style={{ color: C.mut }}>
              {deck.length} {deck.length === 1 ? "form" : "forms"} practised. Nothing was recorded.
            </div>
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
            <div className="text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.penDark }}>
              {card.answer}
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

      {/* "Done" rather than "Finish": the header already owns that word, and two
          controls with one name is a poor thing to hand a screen reader. */}
      {revealed && (
        <Button className="mt-4 w-full justify-center" onClick={next}>
          {index + 1 === deck.length ? "Done" : "Next"}
        </Button>
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
        Practice only — nothing here is recorded.
      </div>
    </div>
  );
}
