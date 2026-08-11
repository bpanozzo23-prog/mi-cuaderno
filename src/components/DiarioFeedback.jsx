import { useEffect, useRef, useState } from "react";
import { Sparkles, X, AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import { getPref } from "../db/db.js";
import { saveEntryFeedback } from "../db/items.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { requestDiarioFeedback } from "../lib/aiFeedback.js";
import { plainTextFromMarkdown } from "../lib/noteMarkdown.js";
import { isFeedbackStale, makeStoredFeedback } from "../lib/diarioReview.js";
import FeedbackReview from "./FeedbackReview.jsx";

/**
 * A reader for one entry, asked for on purpose; the latest review is kept with the entry
 * (schema v8's `feedback` field, amended brief §9). "Ask again" replaces it, Remove clears it,
 * and the stored review's own content hash — not any timestamp — says whether the entry has been
 * edited since. Saving a review bumps no `updatedAt` and logs no event: requesting feedback is
 * not opening or editing the entry, and must not move recency or the lookup counts that decide
 * what Repaso enrolls.
 *
 * Nothing is sent until the owner confirms the disclosure, which names exactly what leaves the
 * device. `canAsk` gates the request actions on the AI feature being usable, so a stored review
 * stays readable after the key is removed without offering a button that could only fail.
 */

const STALE_NOTE = "From before your last edit — the text has changed since this review.";

export default function DiarioFeedback({ entry, onClose, onChanged, canAsk = true }) {
  const [review, setReview] = useState(entry.feedback ?? null);
  const [phase, setPhase] = useState(entry.feedback ? "done" : "confirm");
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
      const stored = makeStoredFeedback(result, entry);
      try {
        await saveEntryFeedback(entry.id, stored);
        onChanged?.();
      } catch {
        // The owner paid for this review; a failed write must not discard it from the screen.
      }
      setReview(stored);
      setPhase("done");
    } catch (err) {
      if (err?.name === "AbortError") {
        setPhase(review ? "done" : "confirm");
        return;
      }
      setError(err?.message || "Something went wrong asking for feedback.");
      setPhase("error");
    } finally {
      abort.current = null;
    }
  }

  async function remove() {
    await saveEntryFeedback(entry.id, null);
    onChanged?.();
    setReview(null);
    setPhase("confirm");
  }

  return (
    <section aria-label="Feedback on this entry">
    <Card className="mt-3 p-3" style={{ borderColor: C.chipBorder }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Feedback on this entry</div>
          <div className="text-xs" style={{ color: C.mut }}>The latest review is kept with this entry.</div>
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
            {canAsk && (
              <Button onClick={ask}>
                <Sparkles size={15} /> Send and review
              </Button>
            )}
            <Button tone="quiet" onClick={() => (review ? setPhase("done") : onClose())}>Cancel</Button>
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
            <FeedbackReview
              review={review}
              staleNote={isFeedbackStale(review, entry) ? STALE_NOTE : undefined}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canAsk && (
              // Back through the disclosure, not straight to the network: a stored review can
              // mount into this phase in a session where the disclosure has not been shown yet.
              <Button tone="quiet" onClick={() => setPhase("confirm")}>
                <RotateCcw size={14} /> Ask again
              </Button>
            )}
            <Button tone="quiet" onClick={remove}>
              <Trash2 size={14} /> Remove
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
