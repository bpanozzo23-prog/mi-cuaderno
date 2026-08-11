import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Lightbulb, X } from "lucide-react";
import { Button, C, Card, SERIF, dotGrid } from "../theme.jsx";
import { createItem, newPage, updateItem } from "../db/items.js";
import { logView } from "../db/events.js";
import { localDate } from "../lib/dates.js";
import PromptLibrary from "./PromptLibrary.jsx";
import MarkdownTextarea from "./MarkdownTextarea.jsx";

export const JOURNAL_AUTOSAVE_MS = 650;

const cleanDraft = ({ title, body, pageDate }) => ({
  title: String(title || "").trim(),
  body: String(body || ""),
  pageDate: String(pageDate || ""),
});

const sameDraft = (a, b) =>
  a.title === b.title && a.body === b.body && a.pageDate === b.pageDate;

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
  autosaveMs = JOURNAL_AUTOSAVE_MS,
}) {
  const initial = cleanDraft({
    title: entry?.title,
    body: entry?.body,
    pageDate: entry?.pageDate || seed?.date || localDate(),
  });
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [date, setDate] = useState(initial.pageDate);
  const [status, setStatus] = useState(entry ? "Saved" : "Start writing to create this moment");
  const [prompt, setPrompt] = useState(() => initialPrompt(seed));
  const [choosingPrompt, setChoosingPrompt] = useState(false);

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

  const draft = cleanDraft({ title, body, pageDate: date });
  latestDraftRef.current = draft;

  async function persistDraft(requestedDraft, version, { quiet = false } = {}) {
    const currentId = materializedIdRef.current;
    if (!requestedDraft.pageDate) return null;
    if (!currentId && !requestedDraft.body.trim()) return null;
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

  useEffect(() => {
    const openedId = entry?.id;
    if (!openedId) return undefined;
    logView(openedId).then((logged) => {
      if (logged) onChanged();
    });
    return undefined;
  }, []);

  useEffect(() => {
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
    if (!materializedIdRef.current && !requested.body.trim()) {
      setStatus("Start writing to create this moment");
      return undefined;
    }

    const version = ++versionRef.current;
    setStatus("Saving…");
    timerRef.current = setTimeout(() => {
      enqueueSave(requested, version);
    }, autosaveMs);
    return () => clearTimeout(timerRef.current);
  }, [title, body, date, autosaveMs]);

  useEffect(() => {
    // React StrictMode intentionally runs setup → cleanup → setup in development. Restore the
    // live flag in setup so the second pass can publish Saved and materialize the active route.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      const requested = latestDraftRef.current;
      // The tab bar can replace this route without calling leaveEditor. Preserve writing with the
      // latest date the owner selected rather than letting a temporarily blank required field drop it.
      const flushDraft = requested.pageDate
        ? requested
        : { ...requested, pageDate: lastValidDateRef.current };
      if (
        flushDraft.pageDate &&
        (materializedIdRef.current || flushDraft.body.trim()) &&
        !sameDraft(flushDraft, lastSavedRef.current)
      ) {
        const version = ++versionRef.current;
        enqueueSave(flushDraft, version, { quiet: true });
      }
    };
  }, []);

  async function leaveEditor() {
    const requested = latestDraftRef.current;
    if (!requested.pageDate && !sameDraft(requested, lastSavedRef.current)) {
      setStatus("Choose a date before leaving");
      return;
    }
    clearTimeout(timerRef.current);
    if (
      (materializedIdRef.current || requested.body.trim()) &&
      !sameDraft(requested, lastSavedRef.current)
    ) {
      const version = ++versionRef.current;
      setStatus("Saving…");
      const savedId = await enqueueSave(requested, version);
      if (!savedId) return;
    }
    onBack();
  }

  function choosePrompt(next) {
    setPrompt(next);
    setChoosingPrompt(false);
    requestAnimationFrame(() => bodyRef.current?.focus());
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
        <span role="status" className="text-xs text-right" style={{ color: status === "Saved" ? C.green : C.mut }}>
          {status}
        </span>
      </div>

      <div className="space-y-3">
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
        <input
          aria-label="Journal title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-transparent text-xl font-semibold outline-none"
          style={{ color: C.ink, fontFamily: SERIF }}
        />

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
          aria-describedby={prompt ? "active-journal-prompt" : undefined}
          value={body}
          onChange={setBody}
          placeholder="What do you want to remember? Write in Spanish, English, or both."
          className="w-full min-h-80 resize-y rounded-xl border p-3 text-base leading-relaxed outline-none"
          style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
        />

        <Button tone="quiet" onClick={() => setChoosingPrompt((open) => !open)} aria-expanded={choosingPrompt}>
          <Lightbulb size={15} /> {prompt ? "Change prompt" : "Need a prompt?"}
        </Button>
        {choosingPrompt && (
          <PromptLibrary onSelect={choosePrompt} onClose={() => setChoosingPrompt(false)} />
        )}
      </div>
    </div>
  );
}
