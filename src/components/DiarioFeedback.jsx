import { useEffect, useRef, useState } from "react";
import { Sparkles, X, AlertTriangle, RotateCcw } from "lucide-react";
import { C, MONO, SERIF, Card, Button } from "../theme.jsx";
import { getPref } from "../db/db.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { requestDiarioFeedback } from "../lib/aiFeedback.js";
import { plainTextFromMarkdown } from "../lib/noteMarkdown.js";

/**
 * A reader for one entry, asked for on purpose and never kept (brief §9).
 *
 * The result lives in component state and nowhere else: leaving the entry unmounts this and the
 * review is gone. That is deliberate — storing it would either need a schema change or a third
 * content type, which §7 forbids, and asking again costs a few cents. It logs no event either:
 * requesting feedback is not opening the entry, and must not move the lookup counts that decide
 * what Repaso enrolls.
 *
 * Nothing is sent until the owner confirms the disclosure, which names exactly what leaves the
 * device.
 */

const VERDICT_LABELS = {
  clear: "Clear",
  mostly_clear: "Mostly clear",
  hard_to_follow: "Hard to follow",
};

const verdictStyle = (verdict) => {
  if (verdict === "clear") return { background: C.greenPale, color: C.green };
  if (verdict === "hard_to_follow") return { background: C.redPale, color: C.red };
  return { background: C.penPale, color: C.penDark };
};

/** One label and colour per category, so a margin note reads at a glance without a legend. */
const CATEGORY_LABELS = {
  error: { label: "Error", color: C.red },
  naturalness: { label: "More natural", color: C.penDark },
  unclear: { label: "Unclear", color: C.mut },
  praise: { label: "Well done", color: C.green },
};

export default function DiarioFeedback({ entry, onClose }) {
  const [phase, setPhase] = useState("confirm");
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const abort = useRef(null);

  // Navigating away mid-request cancels it rather than leaving it to finish unseen.
  useEffect(() => () => abort.current?.abort(), []);

  async function ask() {
    setPhase("loading");
    setError("");
    abort.current = new AbortController();
    try {
      const apiKey = await getPref(AI_API_KEY_PREF);
      const result = await requestDiarioFeedback({
        title: entry.title,
        body: plainTextFromMarkdown(entry.body),
        apiKey,
        signal: abort.current.signal,
      });
      setReview(result);
      setPhase("done");
    } catch (err) {
      if (err?.name === "AbortError") {
        setPhase("confirm");
        return;
      }
      setError(err?.message || "Something went wrong asking for feedback.");
      setPhase("error");
    } finally {
      abort.current = null;
    }
  }

  return (
    <section aria-label="Feedback on this entry">
    <Card className="mt-3 p-3" style={{ borderColor: C.chipBorder }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Feedback on this entry</div>
          <div className="text-xs" style={{ color: C.mut }}>Nothing here is saved.</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close feedback" className="p-2 shrink-0">
          <X size={16} style={{ color: C.mut }} />
        </button>
      </div>

      {phase === "confirm" && (
        <>
          <div className="mt-3 text-sm leading-relaxed" style={{ color: C.ink }}>
            This entry's title and text — nothing else from your notebook — will be sent to
            Anthropic to be read by Claude.
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={ask}>
              <Sparkles size={15} /> Send and review
            </Button>
            <Button tone="quiet" onClick={onClose}>Cancel</Button>
          </div>
        </>
      )}

      {phase === "loading" && (
        <>
          <div className="mt-3 text-sm" style={{ color: C.ink }}>Claude is reading this entry…</div>
          <div className="mt-3">
            <Button tone="quiet" onClick={() => abort.current?.abort()}>
              <X size={15} /> Stop
            </Button>
          </div>
        </>
      )}

      {phase === "done" && review && (
        <>
          <div className="mt-3">
            <span
              className="inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
              style={verdictStyle(review.verdict)}
            >
              {VERDICT_LABELS[review.verdict]}
            </span>
            <div className="mt-2 text-sm leading-relaxed break-words" style={{ color: C.ink }}>
              {review.summary}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-[11px] font-semibold uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
              Margin notes
            </h3>
            {review.items.length === 0 ? (
              <div className="mt-1.5 text-sm" style={{ color: C.mut }}>
                Nothing to flag — this entry reads well.
              </div>
            ) : (
              <div className="mt-1.5 space-y-2.5">
                {review.items.map((item, index) => {
                  const category = CATEGORY_LABELS[item.category];
                  return (
                    <div
                      key={`${item.quote}-${index}`}
                      className="rounded-lg border p-2.5"
                      style={{ background: C.paper, borderColor: C.line }}
                    >
                      <div className="text-[10px] font-semibold uppercase" style={{ color: category.color, fontFamily: MONO, letterSpacing: "0.08em" }}>
                        {category.label}
                      </div>
                      <div className="mt-1 text-sm italic break-words" style={{ color: C.ink, fontFamily: SERIF }}>
                        {item.quote}
                      </div>
                      {item.corrected !== null && item.corrected !== item.quote && (
                        <div className="mt-1 text-sm break-words" style={{ color: C.green, fontFamily: SERIF }}>
                          → {item.corrected}
                        </div>
                      )}
                      <div className="mt-1 text-xs leading-relaxed break-words" style={{ color: C.mut }}>
                        {item.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button tone="quiet" onClick={ask}>
              <RotateCcw size={14} /> Ask again
            </Button>
          </div>
        </>
      )}

      {phase === "error" && (
        <>
          <div
            className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5 break-words"
            style={{ background: C.redPale, color: C.red }}
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
          <div className="mt-3">
            <Button tone="quiet" onClick={() => setPhase("confirm")}>
              <RotateCcw size={14} /> Try again
            </Button>
          </div>
        </>
      )}
    </Card>
    </section>
  );
}
