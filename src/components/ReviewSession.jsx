import { useState } from "react";
import { ChevronLeft, Check, X, Eye, Highlighter, RotateCcw, ArrowLeftRight } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, Card, Button } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { logReview } from "../db/events.js";
import LexicalAnswer, { MeaningRow } from "./LexicalAnswer.jsx";
import SpeakButton from "./SpeakButton.jsx";

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
 *
 * Each card arrives with its direction already decided (Phase 7a, cardDirection in
 * src/lib/review.js). Forward shows the term and hides the meanings; reverse shows the
 * glosses and hides everything Spanish — the term, its suffix, and the usage cues, which
 * are Spanish and routinely contain the term itself. The grade is logged with the
 * direction and face it was earned on, because that history cannot be reconstructed.
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
    await logReview(item.id, passed, {
      direction: item.direction === "reverse" ? "reverse" : "forward",
      face: item.face === "cloze" ? "cloze" : "plain",
    });
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
  // A card with no written gloss has no reverse question side; cardDirection already
  // forces those forward, and this guard keeps a hand-built card from rendering blank.
  const reverse = item.direction === "reverse" && item.meanings?.length > 0;
  // Cloze belongs to the forward face only: a reverse card asks for the term, and a
  // sentence built around it would hand the answer over.
  const cloze = !reverse && item.cloze?.answer ? item.cloze : null;

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
          {reverse ? (
            /*
              The question side of a reverse card. Glosses and their labels only: the term,
              its suffix and every usage cue stay hidden until reveal, because each of them
              is or contains the Spanish being asked for.
            */
            <div className="space-y-2 text-left">
              {item.meanings.map((meaning, meaningIndex) => (
                <MeaningRow key={meaning.id} meaning={meaning} index={meaningIndex} showCue={false} />
              ))}
            </div>
          ) : cloze && !revealed ? (
            /*
              A cloze asks the word in the place it gets used. The English side is withheld
              here — it would translate the missing word — and appears on reveal.
            */
            <div className="text-left text-xl leading-relaxed" style={{ fontFamily: SERIF, color: C.ink }}>
              {cloze.before}
              {/*
                A real gap, not the answer painted invisible: hiding it with a colour would
                still leave the word in the DOM for a screen reader — and for anyone who
                selects the text. The width is fixed so it gives no hint of the length.
              */}
              <span
                aria-label="missing word"
                className="mx-1 inline-block rounded align-baseline"
                style={{ background: C.penPale, width: "4.5rem", height: "1.1em" }}
              />
              {cloze.after}
            </div>
          ) : (
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
              {/* Only where the term is already on screen. On a hidden face, speaking it
                  would read the answer out before it has been asked for. */}
              <SpeakButton text={item.term} className="align-middle ml-1" size={16} />
            </div>
          )}
          <div className="mt-1.5 text-xs inline-flex items-center gap-2" style={{ fontFamily: MONO, color: C.mut }}>
            <span>caja {item.box}</span>
            {reverse && (
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight size={11} /> en→es
              </span>
            )}
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
            {reverse || cloze ? "Tap to see the word" : "Tap to see the meaning"}
          </button>
        ) : (
          <>
            {/* Reverse hides the term in its heading slot, so the answer is shown here. */}
            {reverse && (
              <div className="mt-5 text-center text-3xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
                <Hi on={item.tricky}>{item.term}</Hi>
                {personalHeadingSuffix(item) && (
                  <>
                    {" "}
                    <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                      {personalHeadingSuffix(item)}
                    </span>
                  </>
                )}
                <SpeakButton text={item.term} className="align-middle ml-1" size={16} />
              </div>
            )}
            {/* The sentence again, filled in, so the word is seen back in its context. */}
            {cloze && (
              <div className="mt-4 text-left text-base leading-relaxed" style={{ fontFamily: SERIF, color: C.ink }}>
                {cloze.before}
                <span className="rounded px-1" style={{ background: C.penPale, color: C.penDark, fontWeight: 700 }}>
                  {cloze.answer}
                </span>
                {cloze.after}
                <SpeakButton text={cloze.es} label={`Play the sentence`} className="align-middle" />
                {cloze.en && (
                  <div className="mt-1 text-xs" style={{ color: C.mut }}>
                    {cloze.en}
                  </div>
                )}
              </div>
            )}
            <LexicalAnswer
              item={item}
              showContext={showContext}
              onToggleContext={() => setShowContext((shown) => !shown)}
              onOpen={onOpen}
            />
          </>
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
