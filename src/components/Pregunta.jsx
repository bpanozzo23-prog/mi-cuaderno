import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookmarkPlus, Loader2, Paperclip, RotateCcw, Send, Square, X } from "lucide-react";
import { C, MONO, SERIF, Button, Card, Segmented } from "../theme.jsx";
import MarkdownText from "./MarkdownText.jsx";
import KeepReview from "./KeepReview.jsx";
import { getPref } from "../db/db.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { MAX_QUESTION_CHARS, MAX_TURNS, questionProblem, requestAskTurn } from "../lib/aiAsk.js";
import { formatCost } from "../lib/aiRequest.js";
import { MAX_PASTE_CHARS } from "../lib/aiKeep.js";
import { MAX_ATTACHMENTS, starterQuestions } from "../lib/askContext.js";
import {
  GROUP_DETAIL,
  MAX_CONVERSATION_GROUP_CHARS,
  conversationGroupChars,
  groupSummaryText,
  resolveAttachments,
} from "../lib/askGroups.js";
import { allPersonalExamples } from "../lib/meanings.js";

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
 *
 * "Ask about this" attachments arrive from App (`attachments`, counted by `arrival`), which holds
 * them so Repaso can queue one without leaving its session. Their text is built from the latest
 * notebook when Ask is tapped and frozen into the turn as `userContent`; from then on the
 * disclosure says notebook entries are part of this conversation.
 *
 * A group (a collection page's vocabulary, or a list from Words & phrases or Cuaderno) travels in
 * a short form whose detail the owner picks in the tray. `resolveAttachments` builds the preview,
 * the sent blocks and the turn record from the same reading, so the three always agree.
 */

let turnSequence = 0;
const nextTurnId = () => `turn-${++turnSequence}`;

export default function Pregunta({
  notebook,
  onSelect,
  attachments = [],
  arrival = 0,
  onRemoveAttachments = () => {},
  onSetAttachmentDetail = () => {},
}) {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState(null);
  /** What the question in flight carries, for its bubble. */
  const [pendingSent, setPendingSent] = useState([]);
  const [error, setError] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const [mode, setMode] = useState("ask");
  const [pasted, setPasted] = useState("");
  /** The conversation or pasted text Keep is working on, frozen when Keep opens. */
  const [keepSource, setKeepSource] = useState(null);
  /** How many turns the last applied Keep covered; a later answer makes the conversation unkept. */
  const [keptThrough, setKeptThrough] = useState(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);
  const lastAnswerRef = useRef(null);
  const composerRef = useRef(null);
  /** The last `arrival` acted on; the effect below must act once per arrival, StrictMode or not. */
  const handledArrivalRef = useRef(0);
  const notebookItems = notebook?.items;
  const itemsById = useMemo(() => new Map((notebookItems || []).map((item) => [item.id, item])), [notebookItems]);
  /** The tray's view of the queue: exactly what Ask would send right now. */
  const resolved = useMemo(() => resolveAttachments(attachments, notebookItems || []), [attachments, notebookItems]);

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
  const kept = turns.length > 0 && keptThrough === turns.length;
  const full = turns.length >= MAX_TURNS;
  const sharesNotebook = attachments.length > 0 || turns.some((turn) => turn.attachments?.length > 0);

  /*
   * New attachments: open the ask view, and start fresh if the conversation is empty or already
   * kept — never discarding an unkept one. Only while idle: a late answer must not land in a
   * conversation reset under it, and an open Keep review is left alone until it closes.
   */
  useEffect(() => {
    if (arrival === handledArrivalRef.current || asking || keepSource) return;
    handledArrivalRef.current = arrival;
    setMode("ask");
    if (turns.length === 0 || kept) {
      setTurns([]);
      setKeptThrough(null);
      setConfirmNew(false);
      setError("");
    }
  }, [arrival, asking, keepSource, turns.length, kept]);

  async function ask() {
    if (asking) return;
    const question = draft.trim();
    // Built now, from the notebook as it is, so an edit made after attaching is what is sent.
    const queued = attachments;
    const sending = resolveAttachments(queued, notebookItems || []);
    const gone = sending.gone;
    if (gone.length > 0) {
      onRemoveAttachments(gone);
      setError(gone.length === 1
        ? "An attached entry is no longer in your cuaderno, so it was removed. Nothing was sent."
        : `${gone.length} attached entries are no longer in your cuaderno, so they were removed. Nothing was sent.`);
      return;
    }
    const snapshots = sending.snapshots;
    const problem = questionProblem(question, turns, snapshots);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setConfirmNew(false);
    setPendingQuestion(question);
    setPendingSent(sending.sent);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const apiKey = await getPref(AI_API_KEY_PREF);
      const result = await requestAskTurn({
        history: turns,
        question,
        attachments: snapshots,
        apiKey,
        signal: controller.signal,
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      setTurns((current) => [...current, { id: nextTurnId(), question, ...result, attachments: sending.sent }]);
      // Only what was sent: anything queued while Claude was answering stays for the next question.
      if (queued.length > 0) onRemoveAttachments(queued.map((attachment) => attachment.key));
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
    setKeptThrough(null);
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
    if (keepSource?.kind === "paste") setPasted("");
    else if (keepSource?.kind === "ask") setKeptThrough(keepSource.turns.length);
  }

  function applyStarter(text) {
    setDraft(text);
    const composer = composerRef.current;
    if (!composer) return;
    composer.focus();
    // Leave the cursor at the end, so "How is it different from " can be finished.
    globalThis.requestAnimationFrame?.(() => composer.setSelectionRange?.(text.length, text.length));
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
            <QuestionBubble text={turn.question} attachments={turn.attachments} itemsById={itemsById} onSelect={onSelect} />
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
            <QuestionBubble text={pendingQuestion} attachments={pendingSent} itemsById={itemsById} onSelect={onSelect} />
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
        {attachments.length > 0 && !asking && (
          <AttachmentTray
            attachments={attachments}
            resolved={resolved}
            overBudget={resolved.groupChars > 0
              && conversationGroupChars(turns) + resolved.groupChars > MAX_CONVERSATION_GROUP_CHARS}
            joinsConversation={turns.length > 0}
            onRemove={(key) => onRemoveAttachments([key])}
            onSetDetail={onSetAttachmentDetail}
            starters={draft.trim() === "" ? starterQuestions(attachments.map((attachment) => {
              const item = itemsById.get(attachment.itemId);
              return {
                kind: itemKind(item),
                origin: attachment.origin,
                review: attachment.review,
                hasExamples: allPersonalExamples(item).length > 0,
                group: (resolved.chips[attachment.key]?.group?.sent || 0) > 0,
              };
            })) : []}
            onStarter={applyStarter}
          />
        )}
        <label className="sr-only" htmlFor="pregunta-composer">
          {turns.length > 0 ? "Follow-up question" : "Your question"}
        </label>
        <textarea
          ref={composerRef}
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
          {sharesNotebook ? (
            <>
              Tapping Ask sends your question, this conversation so far, and the attached entries
              (meanings, examples, notes and the names of linked entries; for a group, its name and
              each entry's meanings, plus examples if you choose) to Anthropic (Claude). Nothing
              else from your notebook is included, and the conversation is not saved.
            </>
          ) : (
            <>
              Tapping Ask sends your question and this conversation so far to Anthropic (Claude).
              Nothing from your notebook is included, and the conversation is not saved.
            </>
          )}
        </p>
      </div>
      )}
    </div>
  );
}

const itemKind = (item) => (item?.type === "page" ? "page" : item?.form === "phrase" ? "phrase" : "word");

/** "· 24 entries" after a group's chip; nothing for a single entry. */
const groupCount = (record) => {
  const count = record?.group?.memberIds?.length;
  return count ? ` · ${count} ${count === 1 ? "entry" : "entries"}` : "";
};

function QuestionBubble({ text, attachments = [], itemsById, onSelect }) {
  const chipStyle = { background: C.paper, color: C.mut, border: `1px solid ${C.line}` };
  return (
    <div className="flex flex-col items-end gap-1">
      {attachments?.length > 0 && (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1">
          {attachments.map((attachment, index) => (
            attachment.itemId && itemsById?.has(attachment.itemId) && onSelect ? (
              <button
                key={`${attachment.itemId}-${index}`}
                type="button"
                onClick={() => onSelect(attachment.itemId)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] underline-offset-2 hover:underline"
                style={chipStyle}
              >
                <Paperclip size={10} /> About: {attachment.label}{groupCount(attachment)}
              </button>
            ) : (
              <span
                key={`${attachment.itemId || attachment.label}-${index}`}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                style={chipStyle}
              >
                <Paperclip size={10} /> About: {attachment.label}{groupCount(attachment)}
              </span>
            )
          ))}
        </div>
      )}
      <div
        className="max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words"
        style={{ background: C.penPale, color: C.penDark }}
      >
        {text}
      </div>
    </div>
  );
}

const DETAIL_OPTIONS = [
  { value: GROUP_DETAIL.meanings, label: "Meanings" },
  { value: GROUP_DETAIL.examples, label: "+ Examples" },
];

/**
 * What will go with the next question: removable chips, a detail switch per group, the exact
 * text, and starter questions. Everything shown comes from `resolved`, which is what Ask sends.
 */
function AttachmentTray({ attachments, resolved, overBudget, joinsConversation, onRemove, onSetDetail, starters, onStarter }) {
  const chipFor = (attachment) => resolved.chips[attachment.key] || null;
  const groups = attachments.filter((attachment) => chipFor(attachment)?.group);
  return (
    <div className="mb-3 space-y-2" aria-label="Attached to your next question">
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((attachment) => {
          const chip = chipFor(attachment);
          const label = chip?.label || "(removed entry)";
          return (
            <span
              key={attachment.key}
              className="inline-flex max-w-full items-center gap-1 rounded-full border pl-2.5 text-xs"
              style={{ background: C.card, borderColor: C.line, color: C.ink }}
            >
              <Paperclip size={11} style={{ color: C.mut }} />
              <span className="truncate">About: {label}</span>
              {chip?.group && (
                <span className="shrink-0" style={{ color: C.mut, fontFamily: MONO }}>· {chip.group.total}</span>
              )}
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={() => onRemove(attachment.key)}
                className="inline-flex h-8 w-8 items-center justify-center"
              >
                <X size={13} style={{ color: C.mut }} />
              </button>
            </span>
          );
        })}
      </div>
      {groups.map((attachment) => {
        const chip = chipFor(attachment);
        return (
          <div key={attachment.key} className="space-y-1">
            <div className="text-xs" style={{ color: C.mut }}>
              <span style={{ color: C.ink }}>{chip.label}</span>: {groupSummaryText(chip.group)}
            </div>
            <Segmented
              label={`How much of each entry to send for ${chip.label}`}
              value={chip.group.detail}
              options={DETAIL_OPTIONS}
              onChange={(detail) => onSetDetail(attachment.key, detail)}
            />
          </div>
        );
      })}
      <details className="text-xs" style={{ color: C.mut }}>
        <summary className="cursor-pointer">What's sent with your question</summary>
        <div className="mt-1 space-y-2">
          {attachments.map((attachment) => {
            const chip = chipFor(attachment);
            return (
              <pre
                key={attachment.key}
                aria-label={`Sent for ${chip?.label || "a removed entry"}`}
                className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg p-2 text-[11px]"
                style={{ background: C.paper, color: C.ink, border: `1px solid ${C.line}`, fontFamily: MONO }}
              >
                {!chip
                  ? "This entry is no longer in your cuaderno; it will be removed."
                  : chip.preview || `Nothing from this group is sent: ${groupSummaryText(chip.group)}.`}
              </pre>
            );
          })}
        </div>
      </details>
      {attachments.length >= MAX_ATTACHMENTS && (
        <div className="text-xs" style={{ color: C.mut }}>
          {MAX_ATTACHMENTS} attachments is the most for one question.
        </div>
      )}
      {resolved.groupCount > 2 && (
        <div className="text-xs" style={{ color: C.red }}>
          Two groups is the most for one question. Remove one before asking.
        </div>
      )}
      {overBudget && (
        <div className="text-xs" style={{ color: C.red }}>
          This conversation already carries a lot of notebook text. Remove a group, or start a new
          question (attachments stay).
        </div>
      )}
      {joinsConversation && (
        <div className="text-xs" style={{ color: C.mut }}>
          This joins your current conversation — New question starts fresh (attachments stay).
        </div>
      )}
      {starters.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Starter questions">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => onStarter(starter)}
              className="min-h-8 rounded-full px-2.5 py-1 text-xs"
              style={{ background: C.penPale, color: C.penDark }}
            >
              {starter.trimEnd()}{starter.endsWith(" ") ? "…" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerMeta({ turn }) {
  const parts = [];
  const cost = formatCost(turn.cost);
  if (cost) parts.push(cost);
  // Prompt caching at work: earlier turns were re-read at a fraction of the price.
  if (turn.usage?.cache_read_input_tokens > 0) parts.push("partly from cache");
  if (turn.fallback) parts.push("answered by a fallback model");
  if (parts.length === 0) return null;
  return (
    <div className="mt-2 text-[11px]" style={{ fontFamily: MONO, color: C.mut }}>
      {parts.join(" · ")}
    </div>
  );
}
