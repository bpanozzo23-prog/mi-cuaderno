import { useState } from "react";
import { ChevronLeft, Check, X, Eye, Highlighter, RotateCcw } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, Card, Button } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { logReview } from "../db/events.js";
import LexicalAnswer from "./LexicalAnswer.jsx";

/**
 * One pass through today's due words (brief section 12).
 *
 * The card list is snapshotted when the session starts. Grading reloads the notebook so
 * the counts behind this screen stay true, and the reload re-derives every due date —
 * so without the snapshot the card under the owner's thumb would vanish mid-session.
 *
 * The two buttons write through logReview and nothing else, which is what guarantees
 * section 12's "every review event carries a grade": there is no other way to log one.
 * They are disabled between the tap and the advance, so a double-tap cannot grade the
 * next word — the same hazard the session window solved for view events in Phase 1d,
 * met here in a click handler rather than an effect.
 */
export default function ReviewSession({ cards, onFinish, onOpen, onGraded }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [tally, setTally] = useState({ passed: 0, failed: 0 });

  const item = cards[index] || null;
  const done = index >= cards.length;

  async function grade(passed) {
    if (busy || !item) return;
    setBusy(true);
    await logReview(item.id, passed);
    setTally((t) => ({
      passed: t.passed + (passed ? 1 : 0),
      failed: t.failed + (passed ? 0 : 1),
    }));
    setRevealed(false);
    setShowContext(false);
    setIndex((i) => i + 1);
    setBusy(false);
    onGraded?.();
  }

  if (done) {
    const total = tally.passed + tally.failed;
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <Card className="p-5 text-center">
          <div className="text-xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            {total === 0 ? "Nothing to review" : "¡Ya está!"}
          </div>
          {total > 0 && (
            <>
              <div className="mt-2 text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
                {tally.passed}/{total}
              </div>
              <div className="mt-1 text-sm" style={{ color: C.mut }}>
                {tally.failed === 0
                  ? "All of them. They come back later now."
                  : `${tally.failed} to see again tomorrow.`}
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

  const remaining = cards.length - index;

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={onFinish} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Finish
        </button>
        <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          {index + 1} / {cards.length}
        </span>
      </div>

      <Card className="p-5">
        <div className="text-center">
          <div className="text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
            <Hi on={item.tricky}>{item.term}</Hi>
            {personalHeadingSuffix(item) && (
              <>
                {" "}
                <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                  {personalHeadingSuffix(item)}
                </span>
              </>
            )}
          </div>
          <div className="mt-1.5 text-xs inline-flex items-center gap-2" style={{ fontFamily: MONO, color: C.mut }}>
            <span>caja {item.box}</span>
            {item.reason === "tricky" && (
              <span className="inline-flex items-center gap-1">
                <Highlighter size={11} /> tricky
              </span>
            )}
            {item.reason === "lookups" && (
              <span className="inline-flex items-center gap-1">
                <Eye size={11} /> looked up {item.lookupDays}×
              </span>
            )}
          </div>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full mt-5 py-6 rounded-xl border border-dashed text-sm"
            style={{ borderColor: C.line, color: C.mut, background: C.paper }}
          >
            Tap to see the meaning
          </button>
        ) : (
          <LexicalAnswer
            item={item}
            showContext={showContext}
            onToggleContext={() => setShowContext((shown) => !shown)}
            onOpen={onOpen}
          />
        )}
      </Card>

      {revealed && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button tone="danger" disabled={busy} onClick={() => grade(false)}>
            <X size={16} /> Missed it
          </Button>
          <button
            disabled={busy}
            onClick={() => grade(true)}
            className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium"
            style={{ background: busy ? C.disabled : C.green, color: "#fff", borderColor: "transparent" }}
          >
            <Check size={16} /> Got it
          </button>
        </div>
      )}

      <div className="mt-6 text-center text-xs" style={{ color: C.mut }}>
        <RotateCcw size={11} className="inline mr-1 -mt-0.5" />
        {remaining === 1 ? "Last one" : `${remaining} left today`}
      </div>
    </div>
  );
}
