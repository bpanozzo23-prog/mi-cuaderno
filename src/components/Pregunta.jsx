import { useEffect, useRef, useState } from "react";
import { AlertTriangle, BookmarkPlus, Loader2, RotateCcw, Send, Square } from "lucide-react";
import { C, MONO, SERIF, Button, Card, Segmented } from "../theme.jsx";
import MarkdownText from "./MarkdownText.jsx";
import KeepReview from "./KeepReview.jsx";
import { getPref } from "../db/db.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { MAX_QUESTION_CHARS, MAX_TURNS, questionProblem, requestAskTurn } from "../lib/aiAsk.js";
import { formatCost } from "../lib/aiRequest.js";
import { MAX_PASTE_CHARS } from "../lib/aiKeep.js";

/**
 * Pregunta: a conversation with Claude about Spanish, held only in this screen's memory.
 *
 * App keeps the tab mounted behind `hidden`, so switching tabs loses nothing; a reload or New
 * question does, by design — the notebook is where anything worth keeping goes. Turning AI off
 * unmounts the screen, which cancels a request in flight.
 *
 * Each Ask is the deliberate act, so the disclosure is a standing line under the composer rather
 * than a confirmation per message: the owner types this text in order to send it, and nothing
 * from the notebook is attached. Keep does send notebook data, so it confirms first (KeepReview).
 *
 * Paste mode skips asking altogether: a conversation from another app goes straight to Keep.
 */

let turnSequence = 0;
const nextTurnId = () => `turn-${++turnSequence}`;

export default function Pregunta({ notebook, onSelect }) {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [error, setError] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const [mode, setMode] = useState("ask");
  const [pasted, setPasted] = useState("");
  /** The conversation or pasted text Keep is working on, frozen when Keep opens. */
  const [keepSource, setKeepSource] = useState(null);
  /** True once this conversation's proposals were applied, so starting over loses nothing. */
  const [kept, setKept] = useState(false);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const lastAnswerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (turns.length > 0) lastAnswerRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [turns.length]);

  const asking = pendingQuestion !== null;
  const full = turns.length >= MAX_TURNS;

  async function ask() {
    if (asking) return;
    const question = draft.trim();
    const problem = questionProblem(question, turns);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setConfirmNew(false);
    setPendingQuestion(question);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const apiKey = await getPref(AI_API_KEY_PREF);
      const result = await requestAskTurn({ history: turns, question, apiKey, signal: controller.signal });
      if (!mountedRef.current || controller.signal.aborted) return;
      setTurns((current) => [...current, { id: nextTurnId(), question, ...result }]);
      setDraft("");
    } catch (err) {
      // A Stop is the owner's own doing: the question simply stays in the composer.
      if (mountedRef.current && err?.name !== "AbortError") {
        setError(err?.message || "Something went wrong talking to Anthropic.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (mountedRef.current) setPendingQuestion(null);
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function startNewQuestion() {
    if (asking) return;
    // A conversation cost money and exists nowhere else, so discarding it takes a second tap —
    // unless what was worth keeping has already been kept.
    if (turns.length > 0 && !kept && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    setTurns([]);
    setDraft("");
    setError("");
    setConfirmNew(false);
    setKept(false);
    setKeepSource(null);
  }

  function openKeep() {
    setError("");
    setConfirmNew(false);
    setKeepSource(mode === "paste" ? { kind: "paste", text: pasted } : { kind: "ask", turns });
  }

  function closeKeep() {
    setKeepSource(null);
  }

  function keepApplied() {
    setKept(true);
    if (keepSource?.kind === "paste") setPasted("");
  }

  function onComposerKeyDown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      ask();
    }
  }

  return (
    <div className="px-4 pt-4 pb-28">
      <h1 className="text-2xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
        Pregunta
      </h1>
      {turns.length === 0 && !asking && (
        <p className="mt-1 text-sm leading-relaxed" style={{ color: C.mut }}>
          Ask Claude how to say something, other ways to say it, whether an English expression has
          a Spanish equivalent, or what a phrase you heard means.
        </p>
      )}

      {!keepSource && !asking && (
        <div className="mt-3">
          <Segmented
            label="How to start"
            value={mode}
            onChange={setMode}
            options={[
              { value: "ask", label: "Ask Claude" },
              { value: "paste", label: "Paste a conversation" },
            ]}
          />
        </div>
      )}

      {mode === "ask" && (
      <div className="mt-4 space-y-4" aria-live="polite">
        {turns.map((turn, index) => (
          <div key={turn.id} className="space-y-2">
            <QuestionBubble text={turn.question} />
            <Card ref={index === turns.length - 1 ? lastAnswerRef : null} aria-label="Claude's answer">
              <MarkdownText remoteImages={false} className="text-sm">
                {turn.text}
              </MarkdownText>
              <AnswerMeta turn={turn} />
            </Card>
          </div>
        ))}
        {asking && (
          <div className="space-y-2">
            <QuestionBubble text={pendingQuestion} />
            <div className="flex items-center gap-2 text-sm" style={{ color: C.mut }}>
              <Loader2 size={16} className="animate-spin" /> Claude is thinking…
              <Button tone="quiet" onClick={stop} className="ml-auto">
                <Square size={13} /> Stop
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 text-xs rounded-lg p-2.5 flex items-start gap-1.5"
          style={{ background: C.redPale, color: C.red }}
        >
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {keepSource && (
        <KeepReview
          key={keepSource.kind === "paste" ? "paste" : `ask-${turns.length}`}
          source={keepSource}
          notebook={notebook}
          onSelect={onSelect}
          onClose={closeKeep}
          onApplied={keepApplied}
        />
      )}

      {!keepSource && mode === "paste" && (
        <div className="mt-4">
          <label className="text-sm" style={{ color: C.ink }} htmlFor="pregunta-paste">
            Paste a conversation from another app
          </label>
          <textarea
            id="pregunta-paste"
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={8}
            maxLength={MAX_PASTE_CHARS}
            placeholder="Paste the whole conversation — Keep picks out what's worth saving."
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm leading-relaxed"
            style={{ color: C.ink, background: C.card, border: `1px solid ${C.line}` }}
          />
          <div className="mt-1 text-[11px]" style={{ fontFamily: MONO, color: C.mut }}>
            {pasted.length.toLocaleString("en-US")} / {MAX_PASTE_CHARS.toLocaleString("en-US")}
          </div>
          <div className="mt-2">
            <Button onClick={openKeep} disabled={pasted.trim() === ""}>
              <BookmarkPlus size={15} /> Keep
            </Button>
          </div>
        </div>
      )}

      {!keepSource && mode === "ask" && (
      <div className="mt-4">
        <label className="sr-only" htmlFor="pregunta-composer">
          {turns.length > 0 ? "Follow-up question" : "Your question"}
        </label>
        <textarea
          id="pregunta-composer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onComposerKeyDown}
          disabled={asking || full}
          rows={3}
          maxLength={MAX_QUESTION_CHARS}
          placeholder={full
            ? "This conversation is full. Start a new question."
            : turns.length > 0 ? "Ask a follow-up…" : "How do you say…? / ¿Qué significa…?"}
          className="w-full rounded-lg px-3 py-2 text-sm leading-relaxed"
          style={{ color: C.ink, background: C.card, border: `1px solid ${C.line}` }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button onClick={ask} disabled={asking || full || draft.trim() === ""}>
            <Send size={15} /> Ask
          </Button>
          {turns.length > 0 && !asking && (
            <Button tone="quiet" onClick={openKeep}>
              <BookmarkPlus size={15} /> {kept ? "Keep again" : "Keep"}
            </Button>
          )}
          {(turns.length > 0 || draft) && (
            <Button
              tone={confirmNew ? "dangerArmed" : "quiet"}
              onClick={startNewQuestion}
              disabled={asking}
            >
              <RotateCcw size={14} /> {confirmNew ? "Tap again to discard" : "New question"}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
          Tapping Ask sends your question and this conversation so far to Anthropic (Claude).
          Nothing from your notebook is included, and the conversation is not saved.
        </p>
      </div>
      )}
    </div>
  );
}

function QuestionBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words"
        style={{ background: C.penPale, color: C.penDark }}
      >
        {text}
      </div>
    </div>
  );
}

function AnswerMeta({ turn }) {
  const parts = [];
  const cost = formatCost(turn.cost);
  if (cost) parts.push(cost);
  if (turn.fallback) parts.push("answered by a fallback model");
  if (parts.length === 0) return null;
  return (
    <div className="mt-2 text-[11px]" style={{ fontFamily: MONO, color: C.mut }}>
      {parts.join(" · ")}
    </div>
  );
}
