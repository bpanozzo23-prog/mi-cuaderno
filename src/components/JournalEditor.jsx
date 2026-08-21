import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Hammer, Lightbulb, Shuffle, X } from "lucide-react";
import { Button, C, Card, SERIF, dotGrid } from "../theme.jsx";
import { createItem, newPage, updateItem } from "../db/items.js";
import { logPracticeWrite, logView } from "../db/events.js";
import { localDate } from "../lib/dates.js";
import { isFeedbackStale } from "../lib/diarioReview.js";
import { JOURNAL_PROMPT_CATEGORIES } from "../lib/journalPrompts.js";
import { bodyWithIncludedPrompt, drawTema, promptHasTiers, promptTextForTier } from "../lib/taller.js";
import PromptLibrary from "./PromptLibrary.jsx";
import MarkdownTextarea from "./MarkdownTextarea.jsx";
import FeedbackReview from "./FeedbackReview.jsx";
import TallerScaffold from "./TallerScaffold.jsx";

export const JOURNAL_AUTOSAVE_MS = 650;

const cleanDraft = ({ title, body, pageDate, apuntes }) => ({
  title: String(title || "").trim(),
  body: String(body || ""),
  pageDate: String(pageDate || ""),
  apuntes: String(apuntes || ""),
});

const sameDraft = (a, b) =>
  a.title === b.title && a.body === b.body && a.pageDate === b.pageDate && a.apuntes === b.apuntes;

/**
 * Body or Apuntes creates the entry — pasted outside feedback must never be silently lost to the
 * body-only gate — while a title alone still creates nothing.
 */
const draftHasContent = (draft) => Boolean(draft.body.trim() || draft.apuntes.trim());

/** Whitespace-only Apuntes persists as null, the schema-v9 "no notes" state. */
const storedApuntes = (draft) => (draft.apuntes.trim() ? draft.apuntes : null);

function initialPrompt(seed) {
  if (!seed?.prompt) return null;
  if (typeof seed.prompt === "object") return seed.prompt;
  return { id: "visit-prompt", es: String(seed.prompt), en: "" };
}

export default function JournalEditor({
  entry = null,
  seed = null,
  onBack,
  backLabel = "Diario",
  onChanged,
  onMaterialized,
  onDrillKept = null,
  registerNavigationHandlers = null,
  autosaveMs = JOURNAL_AUTOSAVE_MS,
}) {
  // A Taller drill (docs/DIARIO-TALLER-DIRECTION.md): same writing surface, but keep-or-discard
  // replaces the save flow entirely — nothing below may persist or log until one is chosen.
  const drill = seed?.drill || null;
  const initial = cleanDraft({
    title: entry?.title,
    body: entry?.body,
    pageDate: entry?.pageDate || seed?.date || localDate(),
    apuntes: entry?.apuntes,
  });
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [date, setDate] = useState(initial.pageDate);
  const [apuntes, setApuntes] = useState(initial.apuntes);
  // Open when there is something to see, out of the way when there is not.
  const [showApuntes, setShowApuntes] = useState(Boolean(initial.apuntes.trim()));
  const apuntesPanelId = useId();
  const [status, setStatus] = useState(entry ? "Saved" : "Start writing to create this moment");
  const [prompt, setPrompt] = useState(() => initialPrompt(seed));
  const [choosingPrompt, setChoosingPrompt] = useState(false);
  const [tier, setTier] = useState("standard");
  const [tema, setTema] = useState(drill?.tema ?? null);
  const [includePrompt, setIncludePrompt] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [drillBusy, setDrillBusy] = useState(false);
  const drillDoneRef = useRef(false);

  const bodyRef = useRef(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const latestDraftRef = useRef(initial);
  const lastSavedRef = useRef(initial);
  const lastValidDateRef = useRef(initial.pageDate);
  const materializedIdRef = useRef(entry?.id || null);
  const createdThisVisitRef = useRef(false);
  const editLoggedRef = useRef(false);
  const saveChainRef = useRef(Promise.resolve());
  const versionRef = useRef(0);

  const draft = cleanDraft({ title, body, pageDate: date, apuntes });
  latestDraftRef.current = draft;

  // Live against the draft, so the note appears the moment an edit outdates the stored review.
  // Formatting-only changes correctly stay fresh: the hash covers the visible-text projection.
  const feedbackStale = useMemo(
    () => Boolean(entry?.feedback) && isFeedbackStale(entry.feedback, { title, body }),
    [entry, title, body]
  );

  async function persistDraft(requestedDraft, version, { quiet = false } = {}) {
    const currentId = materializedIdRef.current;
    if (!requestedDraft.pageDate) return null;
    if (!currentId && !draftHasContent(requestedDraft)) return null;
    if (currentId && sameDraft(requestedDraft, lastSavedRef.current)) {
      if (!quiet && mountedRef.current && version === versionRef.current) setStatus("Saved");
      return currentId;
    }

    try {
      let itemId = currentId;
      if (!itemId) {
        const created = await createItem(newPage({
          title: requestedDraft.title,
          body: requestedDraft.body,
          pageDate: requestedDraft.pageDate,
          apuntes: storedApuntes(requestedDraft),
          linkedKeys: seed?.linkedEntryId ? [seed.linkedEntryId] : [],
        }));
        itemId = created.id;
        materializedIdRef.current = itemId;
        createdThisVisitRef.current = true;
        // A late unmount flush must not rewrite whatever tab the owner has already chosen.
        if (!quiet && mountedRef.current) onMaterialized(itemId);
      } else {
        const logEdit = !createdThisVisitRef.current && !editLoggedRef.current;
        await updateItem(
          itemId,
          {
            title: requestedDraft.title,
            body: requestedDraft.body,
            pageDate: requestedDraft.pageDate,
            apuntes: storedApuntes(requestedDraft),
          },
          { logEdit }
        );
        if (logEdit) editLoggedRef.current = true;
      }

      lastSavedRef.current = requestedDraft;
      onChanged();
      if (!quiet && mountedRef.current) {
        setStatus(
          version === versionRef.current && sameDraft(latestDraftRef.current, requestedDraft)
            ? "Saved"
            : "Saving…"
        );
      }
      return itemId;
    } catch {
      if (!quiet && mountedRef.current) setStatus("Couldn’t save — try again");
      return null;
    }
  }

  function enqueueSave(requestedDraft, version, options) {
    const task = saveChainRef.current.then(() => persistDraft(requestedDraft, version, options));
    saveChainRef.current = task.catch(() => null);
    return task;
  }

  function flushForTabSwitch() {
    // Drill text is transient: hiding the editor writes nothing, and the still-mounted
    // component keeps the draft in memory for the owner's return.
    if (drill) return Promise.resolve(null);
    clearTimeout(timerRef.current);
    const requested = latestDraftRef.current;
    const flushDraft = requested.pageDate
      ? requested
      : { ...requested, pageDate: lastValidDateRef.current };
    if (
      flushDraft.pageDate &&
      (materializedIdRef.current || draftHasContent(flushDraft)) &&
      !sameDraft(flushDraft, lastSavedRef.current)
    ) {
      const version = ++versionRef.current;
      return enqueueSave(flushDraft, version, { quiet: true });
    }
    return Promise.resolve(materializedIdRef.current);
  }

  async function prepareToLeave() {
    if (drill) {
      // Writing happened, so leaving must pass through keep-or-discard; a blank drill
      // (or one already resolved) leaves silently and logs nothing.
      if (drillDoneRef.current || !latestDraftRef.current.body.trim()) return true;
      setConfirmingDiscard(true);
      return false;
    }
    const requested = latestDraftRef.current;
    if (!requested.pageDate && !sameDraft(requested, lastSavedRef.current)) {
      setStatus("Choose a date before leaving");
      return false;
    }
    clearTimeout(timerRef.current);
    if (
      (materializedIdRef.current || draftHasContent(requested)) &&
      !sameDraft(requested, lastSavedRef.current)
    ) {
      const version = ++versionRef.current;
      setStatus("Saving…");
      const savedId = await enqueueSave(requested, version);
      if (!savedId) return false;
    }
    return true;
  }

  useEffect(() => {
    if (!registerNavigationHandlers) return undefined;
    registerNavigationHandlers({ prepareToLeave, flushForTabSwitch });
    return () => registerNavigationHandlers(null);
  }, [registerNavigationHandlers, title, body, date, apuntes]);

  useEffect(() => {
    const openedId = entry?.id;
    if (!openedId) return undefined;
    logView(openedId).then((logged) => {
      if (logged) onChanged();
    });
    return undefined;
  }, []);

  useEffect(() => {
    if (drill) return undefined;
    clearTimeout(timerRef.current);
    const requested = latestDraftRef.current;
    if (sameDraft(requested, lastSavedRef.current)) {
      setStatus(materializedIdRef.current ? "Saved" : "Start writing to create this moment");
      return undefined;
    }
    if (!requested.pageDate) {
      setStatus("Choose a date to save");
      return undefined;
    }
    if (!materializedIdRef.current && !draftHasContent(requested)) {
      setStatus("Start writing to create this moment");
      return undefined;
    }

    const version = ++versionRef.current;
    setStatus("Saving…");
    timerRef.current = setTimeout(() => {
      enqueueSave(requested, version);
    }, autosaveMs);
    return () => clearTimeout(timerRef.current);
  }, [title, body, date, apuntes, autosaveMs]);

  useEffect(() => {
    // React StrictMode intentionally runs setup → cleanup → setup in development. Restore the
    // live flag in setup so the second pass can publish Saved and materialize the active route.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      // The tab bar can hide this editor without calling its guarded Back action. Preserve writing
      // with the latest valid date rather than letting a temporarily blank required field drop it.
      flushForTabSwitch();
    };
  }, []);

  async function leaveEditor() {
    if (await prepareToLeave()) onBack({ editorPrepared: true });
  }

  function choosePrompt(next) {
    setPrompt(next);
    setChoosingPrompt(false);
    requestAnimationFrame(() => bodyRef.current?.focus());
  }

  const drillPromptText = drill ? promptTextForTier(drill.prompt, tier) : null;
  const drillSkillLabel = drill
    ? (JOURNAL_PROMPT_CATEGORIES.find((category) => category.id === drill.skill)?.label || drill.skill)
    : null;

  const drillEventDetails = () => ({
    skill: drill.skill,
    promptId: drill.prompt.id,
    tier,
    offeredWordIds: (drill.offeredWords || []).map((word) => word.id),
    tema: tema ?? null,
  });

  async function keepDrill() {
    const requested = latestDraftRef.current;
    if (drillBusy || drillDoneRef.current || !requested.body.trim()) return;
    setDrillBusy(true);
    try {
      const body = includePrompt
        ? bodyWithIncludedPrompt(drillPromptText.es, requested.body)
        : requested.body;
      const created = await createItem(newPage({
        title: requested.title,
        body,
        pageDate: requested.pageDate || localDate(),
      }));
      await logPracticeWrite(created.id, { ...drillEventDetails(), kept: true });
      drillDoneRef.current = true;
      onChanged();
      onDrillKept?.(created.id);
    } catch {
      if (mountedRef.current) setDrillBusy(false);
    }
  }

  async function discardDrill() {
    if (drillBusy || drillDoneRef.current) return;
    setDrillBusy(true);
    try {
      await logPracticeWrite(null, { ...drillEventDetails(), kept: false });
      drillDoneRef.current = true;
      onChanged();
      onBack({ editorPrepared: true });
    } catch {
      if (mountedRef.current) setDrillBusy(false);
    }
  }

  function requestDiscard() {
    // No writing yet means nothing to lose and nothing to record — just leave.
    if (!latestDraftRef.current.body.trim()) {
      drillDoneRef.current = true;
      onBack({ editorPrepared: true });
      return;
    }
    setConfirmingDiscard(true);
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={leaveEditor}
          aria-label={`Back to ${backLabel}`}
          className="flex min-h-11 items-center gap-1 text-sm"
          style={{ color: C.pen }}
        >
          <ChevronLeft size={16} /> {backLabel}
        </button>
        <span role="status" className="text-xs text-right" style={{ color: !drill && status === "Saved" ? C.green : C.mut }}>
          {drill ? "Nada se guarda hasta que decidas" : status}
        </span>
      </div>

      <div className="space-y-3">
        {!drill && (
          <input
            type="date"
            required
            aria-label="Journal date"
            value={date}
            onChange={(event) => {
              const nextDate = event.target.value;
              if (nextDate) lastValidDateRef.current = nextDate;
              setDate(nextDate);
            }}
            className="w-full min-h-11 rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: C.card, borderColor: C.line, color: C.ink }}
          />
        )}
        <input
          aria-label="Journal title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-transparent text-xl font-semibold outline-none"
          style={{ color: C.ink, fontFamily: SERIF }}
        />

        {drill && (
          <Card id="taller-drill-prompt" style={{ background: C.diarioPale, borderColor: C.diarioBorder }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase" style={{ color: C.diarioInk, letterSpacing: "0.08em" }}>
              <Hammer size={13} /> Taller · {drillSkillLabel}
            </div>
            <div className="mt-2 text-sm" style={{ color: C.ink, fontFamily: SERIF }}>{drillPromptText.es}</div>
            {drillPromptText.en && <div className="mt-1 text-xs" style={{ color: C.mut }}>{drillPromptText.en}</div>}
            {tema && (
              <div className="mt-2 flex items-center gap-1.5" aria-label="Tema">
                <span
                  className="rounded-full border px-2.5 py-1 text-xs"
                  style={{ background: C.paper, borderColor: C.chipBorder, color: C.ink, fontFamily: SERIF }}
                >
                  Tema: {tema}
                </span>
                {(drill.temas || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTema(drawTema(drill.temas, { exclude: tema }))}
                    aria-label="Shuffle tema"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <Shuffle size={14} style={{ color: C.mut }} />
                  </button>
                )}
              </div>
            )}
            {promptHasTiers(drill.prompt) && (
              <div className="mt-2.5 flex gap-1.5">
                {drill.prompt.easier && (
                  <button
                    type="button"
                    onClick={() => setTier((current) => (current === "easier" ? "standard" : "easier"))}
                    aria-pressed={tier === "easier"}
                    className="min-h-11 rounded-full border px-3 py-1 text-xs"
                    style={tier === "easier"
                      ? { background: C.pen, borderColor: C.pen, color: C.onAccent }
                      : { background: C.card, borderColor: C.chipBorder, color: C.penDark }}
                  >
                    Más fácil
                  </button>
                )}
                {drill.prompt.harder && (
                  <button
                    type="button"
                    onClick={() => setTier((current) => (current === "harder" ? "standard" : "harder"))}
                    aria-pressed={tier === "harder"}
                    className="min-h-11 rounded-full border px-3 py-1 text-xs"
                    style={tier === "harder"
                      ? { background: C.pen, borderColor: C.pen, color: C.onAccent }
                      : { background: C.card, borderColor: C.chipBorder, color: C.penDark }}
                  >
                    Más difícil
                  </button>
                )}
              </div>
            )}
            {drill.offeredWords?.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
                  Si te sirven
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Offered words">
                  {drill.offeredWords.map((word) => (
                    <span
                      key={word.id}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={{ background: C.paper, borderColor: C.chipBorder, color: C.ink, fontFamily: SERIF }}
                    >
                      {word.term}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <TallerScaffold prompt={drill.prompt} />
          </Card>
        )}

        {prompt && (
          <Card id="active-journal-prompt" className="relative pr-10" style={{ background: C.diarioPale, borderColor: C.diarioBorder }}>
            <button
              type="button"
              onClick={() => setPrompt(null)}
              aria-label="Remove prompt"
              className="absolute right-1.5 top-1.5 p-2"
            >
              <X size={14} style={{ color: C.mut }} />
            </button>
            <div className="text-sm" style={{ color: C.ink, fontFamily: SERIF }}>{prompt.es}</div>
            {prompt.en && <div className="mt-1 text-xs" style={{ color: C.mut }}>{prompt.en}</div>}
          </Card>
        )}

        <MarkdownTextarea
          textareaRef={bodyRef}
          autoFocus
          blankLines
          aria-label="Journal body"
          aria-describedby={drill ? "taller-drill-prompt" : prompt ? "active-journal-prompt" : undefined}
          value={body}
          onChange={setBody}
          placeholder="What do you want to remember? Write in Spanish, English, or both."
          className="w-full min-h-80 rounded-xl border p-3 text-base leading-relaxed outline-none"
          style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
        />

        {drill && (
          <section aria-label="Keep or discard this practice" className="space-y-3">
            <button
              type="button"
              onClick={() => setIncludePrompt((current) => !current)}
              aria-pressed={includePrompt}
              className="flex min-h-11 items-center gap-2 text-sm"
              style={{ color: C.ink }}
            >
              <span
                aria-hidden="true"
                className="inline-flex h-5 w-5 items-center justify-center rounded border"
                style={includePrompt
                  ? { background: C.pen, borderColor: C.pen, color: C.onAccent }
                  : { background: C.card, borderColor: C.line }}
              >
                {includePrompt && <Check size={13} />}
              </span>
              Incluir la pregunta al guardar
            </button>
            {confirmingDiscard ? (
              <Card className="p-3" style={{ borderColor: C.dangerBorder }}>
                <div className="text-sm" style={{ color: C.ink }}>
                  ¿Descartar esta práctica? El texto se pierde.
                </div>
                <div className="mt-3 flex gap-2">
                  <Button tone="dangerArmed" onClick={discardDrill} disabled={drillBusy}>
                    Descartar
                  </Button>
                  <Button tone="quiet" onClick={() => setConfirmingDiscard(false)} disabled={drillBusy}>
                    Seguir escribiendo
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex gap-2">
                <Button onClick={keepDrill} disabled={drillBusy || !draft.body.trim()}>
                  Guardar en el Diario
                </Button>
                <Button tone="quiet" onClick={requestDiscard} disabled={drillBusy}>
                  Descartar
                </Button>
              </div>
            )}
          </section>
        )}

        {!drill && (
        <section aria-label="Apuntes for this entry">
          <button
            type="button"
            onClick={() => setShowApuntes((open) => !open)}
            aria-expanded={showApuntes}
            aria-controls={apuntesPanelId}
            className="inline-flex min-h-11 items-center gap-1 text-xs"
            style={{ color: C.pen }}
          >
            <ChevronDown size={13} /> Apuntes
          </button>
          {/* `hidden`, not unmount: collapsing must not discard the textarea's caret or scroll. */}
          <div id={apuntesPanelId} hidden={!showApuntes}>
            <MarkdownTextarea
              blankLines
              aria-label="Apuntes"
              value={apuntes}
              onChange={setApuntes}
              placeholder="Outside feedback, notes to self…"
              className="w-full min-h-28 rounded-xl border p-3 text-sm leading-relaxed outline-none"
              style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
            />
            <div className="mt-1 text-xs" style={{ color: C.mut }}>
              Kept beside this entry, never sent for review.
            </div>
          </div>
        </section>
        )}

        {entry?.feedback && (
          <section aria-label="Feedback on this entry">
            <Card className="p-3" style={{ borderColor: C.chipBorder }}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Feedback</div>
                <div className="text-xs shrink-0" style={{ color: C.mut }}>
                  {new Date(entry.feedback.reviewedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-3">
                <FeedbackReview
                  review={entry.feedback}
                  staleNote={feedbackStale
                    ? "From before your last edit — the text has changed since this review."
                    : undefined}
                />
              </div>
            </Card>
          </section>
        )}

        {!drill && (
          <>
            <Button tone="quiet" onClick={() => setChoosingPrompt((open) => !open)} aria-expanded={choosingPrompt}>
              <Lightbulb size={15} /> {prompt ? "Change prompt" : "Need a prompt?"}
            </Button>
            {choosingPrompt && (
              <PromptLibrary onSelect={choosePrompt} onClose={() => setChoosingPrompt(false)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
