import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ExternalLink,
  Languages,
  ListFilter,
  ListTree,
  MessageSquareText,
  Pencil,
  Plus,
  Quote,
  Search,
  X,
} from "lucide-react";
import { Button, C, Card, IconButton, MONO, SERIF } from "../theme.jsx";
import { normalize } from "../lib/normalize.js";
import {
  deleteSourceCapture,
  saveSourceCapture,
  saveSourceCaptureOrder,
  saveSourceDetails,
} from "../db/pageStructures.js";
import CollectionAddVocabularySheet from "./CollectionAddVocabularySheet.jsx";
import PageSectionDisclosure from "./PageSectionDisclosure.jsx";

const CAPTURE_TYPES = [
  { value: "passage", label: "Passage", Icon: Quote },
  { value: "reflection", label: "Reflection", Icon: MessageSquareText },
  { value: "language_note", label: "Language note", Icon: Languages },
  { value: "question", label: "Question", Icon: CircleHelp },
];

const FORMAT_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "book", label: "Book or written work" },
  { value: "audio", label: "Podcast or audio" },
  { value: "video", label: "Film or video" },
  { value: "article_lesson", label: "Article or lesson" },
  { value: "other", label: "Other" },
];

const LONG_PASSAGE_LENGTH = 240;

const labelForType = (type) =>
  CAPTURE_TYPES.find((option) => option.value === type)?.label || "Capture";

const sourceDetailsDraft = (source) => ({
  format: source?.format || "",
  creator: source?.creator || "",
  scope: source?.scope || "",
  url: source?.url || "",
  context: source?.context || "",
});

const emptyCaptureDraft = (type) => ({
  type,
  text: "",
  location: "",
  reflection: "",
  itemKeys: [],
});

const normalizeLocalSearch = (value) => normalize(value).replace(/\s+/g, " ").trim();

const captureSearchText = (capture) => normalizeLocalSearch([
  labelForType(capture.type),
  capture.text,
  capture.location,
  capture.reflection,
].join(" "));

const problemMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

function moveAt(rows, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function SourceDetails({ source, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => sourceDetailsDraft(source));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const formatLabel = FORMAT_OPTIONS.find((option) => option.value === source.format)?.label;
  const hasDetails = Boolean(source.format || source.creator || source.scope || source.url || source.context);

  function openEditor() {
    setDraft(sourceDetailsDraft(source));
    setProblem("");
    setEditing(true);
  }

  if (editing) {
    return (
      <Card className="mt-3" style={{ borderColor: C.pen }}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setProblem("");
            try {
              await onSaved(draft);
              setEditing(false);
            } catch (error) {
              setProblem(problemMessage(error, "Source details could not be saved."));
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="text-sm font-semibold" style={{ color: C.ink }}>Source details</div>
          <div className="mt-3 space-y-3">
            <label className="block text-xs" style={{ color: C.mut }}>
              Format
              <select
                aria-label="Source format"
                value={draft.format}
                onChange={(event) => setDraft((current) => ({ ...current, format: event.target.value }))}
                className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              >
                {FORMAT_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs" style={{ color: C.mut }}>
              Creator
              <input
                aria-label="Source creator"
                value={draft.creator}
                onChange={(event) => setDraft((current) => ({ ...current, creator: event.target.value }))}
                placeholder="Author, host, teacher…"
                className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              />
            </label>
            <label className="block text-xs" style={{ color: C.mut }}>
              Scope
              <input
                aria-label="Source scope"
                value={draft.scope}
                onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value }))}
                placeholder="Whole work, chapter, episode…"
                className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              />
            </label>
            <label className="block text-xs" style={{ color: C.mut }}>
              URL
              <input
                type="url"
                aria-label="Source URL"
                value={draft.url}
                onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://…"
                className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              />
            </label>
            <label className="block text-xs" style={{ color: C.mut }}>
              Context
              <textarea
                aria-label="Source context"
                value={draft.context}
                onChange={(event) => setDraft((current) => ({ ...current, context: event.target.value }))}
                placeholder="Edition, course, why this source matters…"
                className="mt-1 min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
            <Button type="submit" className="min-h-11" disabled={saving}>{saving ? "Saving…" : "Save details"}</Button>
            <Button
              type="button"
              tone="quiet"
              className="min-h-11"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setProblem("");
              }}
            >
              Cancel
            </Button>
          </div>
          {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
        </form>
      </Card>
    );
  }

  return (
    <Card className="mt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}>
            <BookOpen size={15} style={{ color: C.pen }} /> Source details
          </div>
          {!hasDetails ? (
            <div className="mt-1 text-xs" style={{ color: C.mut }}>
              Add the format, creator, scope, link, or context when it helps.
            </div>
          ) : (
            <div className="mt-2 space-y-1 text-sm" style={{ color: C.ink }}>
              {source.format && <div><span className="text-xs" style={{ color: C.mut }}>Format · </span>{formatLabel}</div>}
              {source.creator && <div><span className="text-xs" style={{ color: C.mut }}>Creator · </span>{source.creator}</div>}
              {source.scope && <div><span className="text-xs" style={{ color: C.mut }}>Scope · </span>{source.scope}</div>}
              {source.context && <div className="whitespace-pre-wrap break-words" style={{ color: C.mut }}>{source.context}</div>}
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 underline underline-offset-2"
                  style={{ color: C.pen }}
                >
                  <ExternalLink size={13} className="shrink-0" />
                  <span className="truncate">Open source</span>
                </a>
              )}
            </div>
          )}
        </div>
        <IconButton
          onClick={openEditor}
          aria-label="Edit source details"
          style={{ color: C.pen }}
        >
          <Pencil size={15} />
        </IconButton>
      </div>
    </Card>
  );
}

function CaptureEditor({ capture, pageVocabulary, onCancel, onSaved, onDelete }) {
  const [draft, setDraft] = useState(() => ({
    ...capture,
    itemKeys: [...(capture.itemKeys || [])],
  }));
  const [choosingVocabulary, setChoosingVocabulary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState("");
  const typeLabel = labelForType(draft.type);
  const vocabularyById = new Map((pageVocabulary || []).map((item) => [item.id, item]));
  const selectedVocabulary = draft.itemKeys.map((id) => ({ id, item: vocabularyById.get(id) }));

  function toggleVocabulary(itemId) {
    setDraft((current) => ({
      ...current,
      itemKeys: current.itemKeys.includes(itemId)
        ? current.itemKeys.filter((id) => id !== itemId)
        : [...current.itemKeys, itemId],
    }));
  }

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.text.trim()) return;
          setSaving(true);
          setProblem("");
          try {
            await onSaved({
              ...draft,
              text: draft.text.trim(),
              location: draft.location,
              reflection: draft.reflection,
            });
          } catch (error) {
            setProblem(problemMessage(error, "This capture could not be saved."));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold" style={{ color: C.ink }}>
            {capture.id ? `Edit ${typeLabel.toLowerCase()}` : `New ${typeLabel.toLowerCase()}`}
          </div>
          <select
            aria-label="Capture type"
            value={draft.type}
            onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
            className="min-h-11 rounded-lg border px-2 text-xs"
            style={{ background: C.card, borderColor: C.line, color: C.ink }}
          >
            {CAPTURE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-xs" style={{ color: C.mut }}>
            {typeLabel}
            <textarea
              autoFocus
              required
              aria-label="Capture text"
              value={draft.text}
              onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
              placeholder={draft.type === "passage" ? "Paste or type the passage…" : "What do you want to remember?"}
              className="mt-1 min-h-32 w-full resize-y rounded-lg border px-3 py-2 text-base leading-relaxed outline-none"
              style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Location
            <input
              aria-label="Capture location"
              value={draft.location}
              onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              placeholder="Page, chapter, timestamp… (optional)"
              className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: C.card, borderColor: C.line, color: C.ink }}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Reflection or context
            <textarea
              aria-label="Capture reflection"
              value={draft.reflection}
              onChange={(event) => setDraft((current) => ({ ...current, reflection: event.target.value }))}
              placeholder="Why it stood out, what it shows… (optional)"
              className="mt-1 min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: C.card, borderColor: C.line, color: C.ink }}
            />
          </label>
          <div className="rounded-lg border p-3" style={{ borderColor: C.line, background: C.paper }}>
            <div className="text-xs font-semibold" style={{ color: C.ink }}>Vocabulary (optional)</div>
            <div className="mt-1 text-xs" style={{ color: C.mut }}>
              Attach vocabulary that already belongs to this page. New personal or dictionary
              vocabulary can still be added from the saved capture.
            </div>

            {selectedVocabulary.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Attached capture vocabulary">
                {selectedVocabulary.map(({ id, item }) => (
                  <div
                    key={id}
                    className="inline-flex min-h-11 max-w-full items-center rounded-full border"
                    style={{ background: C.penPale, borderColor: C.chipBorder, color: C.penDark }}
                  >
                    <span className="min-w-0 truncate pl-2 text-xs">{item?.term || "Missing entry"}</span>
                    <button
                      type="button"
                      aria-label={`Detach vocabulary ${item?.term || id} from this capture`}
                      onClick={() => toggleVocabulary(id)}
                      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(pageVocabulary || []).length > 0 ? (
              <>
                <button
                  type="button"
                  aria-expanded={choosingVocabulary}
                  onClick={() => setChoosingVocabulary((open) => !open)}
                  className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border px-2 text-xs"
                  style={{ background: C.card, borderColor: C.line, color: C.pen }}
                >
                  <Plus size={13} /> Choose page vocabulary
                </button>
                {choosingVocabulary && (
                  <div
                    className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border p-1"
                    style={{ borderColor: C.line, background: C.card }}
                    aria-label="Page vocabulary choices"
                  >
                    {pageVocabulary.map((item) => {
                      const attached = draft.itemKeys.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          aria-pressed={attached}
                          aria-label={`${attached ? "Detach" : "Attach"} vocabulary ${item.term} ${attached ? "from" : "to"} capture`}
                          onClick={() => toggleVocabulary(item.id)}
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm"
                          style={{ background: attached ? C.penPale : C.paper, color: C.ink }}
                        >
                          <span className="min-w-0 truncate">{item.term}</span>
                          <span className="shrink-0 text-[11px]" style={{ color: attached ? C.pen : C.mut }}>
                            {attached ? "Attached" : "Attach"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-2 text-xs" style={{ color: C.mut }}>
                This page does not have vocabulary to attach yet.
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
          <Button type="submit" className="min-h-11" disabled={!draft.text.trim() || saving}>{saving ? "Saving…" : "Save capture"}</Button>
          <Button type="button" tone="quiet" className="min-h-11" disabled={saving} onClick={onCancel}>Cancel</Button>
          {capture.id && onDelete && (
            <Button
              type="button"
              tone="danger"
              className="min-h-11"
              disabled={saving || deleting}
              onClick={() => {
                setProblem("");
                setDeleteArmed(true);
              }}
            >
              Delete capture
            </Button>
          )}
        </div>
        {deleteArmed && (
          <div role="alertdialog" aria-label={`Confirm deletion of ${typeLabel} capture`} className="mt-3 rounded-lg border p-3" style={{ borderColor: C.dangerBorder, background: C.paper }}>
            <div className="text-sm" style={{ color: C.ink }}>
              Delete this {typeLabel.toLowerCase()}? Its vocabulary stays on the page.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                tone="dangerArmed"
                className="min-h-11"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  setProblem("");
                  try {
                    await onDelete();
                  } catch (error) {
                    setProblem(problemMessage(error, "This capture could not be deleted."));
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button type="button" tone="quiet" className="min-h-11" disabled={deleting} onClick={() => setDeleteArmed(false)}>Keep capture</Button>
            </div>
          </div>
        )}
        {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
      </form>
    </Card>
  );
}

function CaptureOrganizer({ captures, onCancel, onSaved }) {
  const initialIds = captures.map((capture) => capture.id);
  const [ids, setIds] = useState(initialIds);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const changed = ids.some((id, index) => id !== initialIds[index]);

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>Organize captures</div>
      <div className="mt-0.5 text-xs" style={{ color: C.mut }}>Nothing changes until Save.</div>
      <div className="mt-3 space-y-2">
        {ids.map((id, index) => {
          const capture = byId.get(id);
          const label = labelForType(capture?.type);
          return (
            <div
              key={id}
              className="flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1.5"
              style={{ background: C.paper, borderColor: C.line }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase" style={{ color: C.mut, fontFamily: MONO }}>{label}</div>
                <div className="truncate text-sm" style={{ color: C.ink }}>{capture?.text || "Missing capture"}</div>
              </div>
              <button
                type="button"
                aria-label={`Move ${label} capture ${index + 1} up`}
                disabled={index === 0}
                onClick={() => setIds((current) => moveAt(current, index, -1))}
                className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
              >
                <ArrowUp size={15} style={{ color: C.mut }} />
              </button>
              <button
                type="button"
                aria-label={`Move ${label} capture ${index + 1} down`}
                disabled={index === ids.length - 1}
                onClick={() => setIds((current) => moveAt(current, index, 1))}
                className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
              >
                <ArrowDown size={15} style={{ color: C.mut }} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
        <Button
          className="min-h-11"
          disabled={!changed || saving}
          onClick={async () => {
            setSaving(true);
            setProblem("");
            try {
              await onSaved(ids);
            } catch (error) {
              setProblem(problemMessage(error, "Capture order could not be saved."));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save organization"}
        </Button>
        <Button tone="quiet" className="min-h-11" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
      {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
    </Card>
  );
}

function CaptureCard({
  capture,
  itemsById,
  expanded,
  addingVocabulary,
  detachingVocabularyId,
  items,
  onOpen,
  onToggleExpanded,
  onEdit,
  onBeginVocabulary,
  onCancelVocabulary,
  onCommitVocabulary,
  onDetachVocabulary,
}) {
  const type = CAPTURE_TYPES.find((option) => option.value === capture.type) || CAPTURE_TYPES[0];
  const TypeIcon = type.Icon;
  const longPassage = capture.type === "passage"
    && (capture.text.length > LONG_PASSAGE_LENGTH || capture.text.split("\n").length > 4);
  const vocabulary = (capture.itemKeys || []).map((id) => ({ id, item: itemsById.get(id) }));

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase"
              style={{ background: C.penPale, borderColor: C.chipBorder, color: C.penDark, fontFamily: MONO }}
            >
              <TypeIcon size={12} /> {type.label}
            </span>
            {capture.location && <span className="text-xs" style={{ color: C.mut }}>{capture.location}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label={`Edit ${type.label} capture`}
            onClick={onEdit}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            <Pencil size={15} style={{ color: C.pen }} />
          </button>
        </div>
      </div>

      <div
        className={`mt-2 whitespace-pre-wrap break-words text-base leading-relaxed ${longPassage && !expanded ? "line-clamp-4" : ""}`}
        style={{ color: C.ink, fontFamily: capture.type === "passage" ? SERIF : undefined }}
      >
        {capture.text}
      </div>
      {longPassage && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggleExpanded}
          className="mt-1 flex min-h-11 items-center gap-1 text-xs"
          style={{ color: C.pen }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Show less" : "Show full passage"}
        </button>
      )}

      {capture.reflection && (
        <div className="mt-3 rounded-lg p-2 text-sm whitespace-pre-wrap break-words" style={{ background: C.paper, color: C.mut }}>
          <span className="mr-1 text-[11px] font-semibold uppercase" style={{ fontFamily: MONO }}>Reflection</span>
          {capture.reflection}
        </div>
      )}

      <div className="mt-3 border-t pt-3" style={{ borderColor: C.line }}>
        <div className="flex flex-wrap items-center gap-1.5">
          {vocabulary.map(({ id, item }) => (
            <div
              key={id}
              className="inline-flex min-h-11 max-w-full items-center rounded-full border"
              style={{ background: C.penPale, borderColor: C.chipBorder, color: C.penDark }}
            >
              <button
                type="button"
                disabled={!item}
                onClick={() => item && onOpen?.(id)}
                aria-label={item ? `Open vocabulary ${item.term}` : "Missing vocabulary entry"}
                className="min-h-11 min-w-0 max-w-full px-2 text-xs disabled:opacity-60"
              >
                <span className="block truncate">{item?.term || "Missing entry"}</span>
              </button>
              <button
                type="button"
                disabled={detachingVocabularyId === id}
                onClick={() => onDetachVocabulary?.(id)}
                aria-label={`Detach vocabulary ${item?.term || id} from ${type.label} capture`}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border-l disabled:opacity-60"
                style={{ borderColor: C.chipBorder }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {onBeginVocabulary && (
            <button
              type="button"
              aria-expanded={addingVocabulary}
              aria-label="Add vocabulary"
              onClick={onBeginVocabulary}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-2 text-xs"
              style={{ background: C.card, borderColor: C.line, color: C.pen }}
            >
              <Plus size={13} /> Vocabulary
            </button>
          )}
        </div>

        {addingVocabulary && (
          <CollectionAddVocabularySheet
            items={items}
            memberLocations={new Map((capture.itemKeys || []).map((id) => [id, "this capture"]))}
            targetLabel={`${type.label} capture`}
            creationContext="this source capture"
            onCancel={onCancelVocabulary}
            onCommit={onCommitVocabulary}
          />
        )}
      </div>

    </Card>
  );
}

/**
 * Controlled Source-notebook capability. The parent owns the current page snapshot and reloads it
 * through onChanged after each explicit save. All editors and organizers remain visit-local drafts.
 */
export default function SourceSection({
  page,
  items = [],
  onOpen,
  onChanged,
  onAddVocabulary,
  onJumpToVocabulary,
}) {
  const source = page?.source;
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [captureDraft, setCaptureDraft] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState(() => new Set());
  const [vocabularyCaptureId, setVocabularyCaptureId] = useState(null);
  const [vocabularyDetachKey, setVocabularyDetachKey] = useState(null);
  const [vocabularyProblem, setVocabularyProblem] = useState("");
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  // An unsaved capture has no stable ID for commitPageVocabularyAdd. Keep its editor fully
  // visit-local by offering only already-authoritative page vocabulary; dictionary/new candidates
  // remain available through the saved capture's shared picker.
  const pageVocabulary = useMemo(
    () => (page?.linkedKeys || [])
      .map((id) => itemsById.get(id))
      .filter((item) => item?.type === "lexical"),
    [itemsById, page?.linkedKeys]
  );

  const captures = source?.captures || [];
  const hasDetails = Boolean(source?.format || source?.creator || source?.scope || source?.url || source?.context);
  const empty = captures.length === 0 && !hasDetails;
  const normalizedQuery = normalizeLocalSearch(query);
  const visibleCaptures = useMemo(
    () => captures.filter((capture) => (
      (typeFilter === "all" || capture.type === typeFilter)
      && (!normalizedQuery || captureSearchText(capture).includes(normalizedQuery))
    )),
    [captures, normalizedQuery, typeFilter]
  );

  if (!page || page.type !== "page" || !source?.enabled) return null;

  async function changed() {
    await onChanged?.();
  }

  return (
    <PageSectionDisclosure
      id="page-source"
      title="Source notebook"
      summary={empty ? "Empty" : `${captures.length} ${captures.length === 1 ? "capture" : "captures"}`}
      defaultCollapsed={empty}
      resetKey={page.id}
      actions={({ collapsed }) => !organizing && !captureDraft && (
        <>
          {!collapsed && captures.length > 1 && !captureMenuOpen && (
            <IconButton tone="quiet" aria-label="Organize" onClick={() => setOrganizing(true)}>
              <ListTree size={17} />
            </IconButton>
          )}
          {(!collapsed || empty) && (
            <Button
              className="min-h-11"
              aria-expanded={captureMenuOpen}
              onClick={() => setCaptureMenuOpen((open) => !open)}
            >
              <Plus size={14} /> Capture
            </Button>
          )}
        </>
      )}
    >

      <SourceDetails
        key={`${page.id}:${source.format}:${source.creator}:${source.scope}:${source.url}:${source.context}`}
        source={source}
        onSaved={async (draft) => {
          await saveSourceDetails(page.id, draft);
          await changed();
        }}
      />

      {captureMenuOpen && !captureDraft && (
        <Card className="mt-3" style={{ borderColor: C.pen }}>
          <div className="text-sm font-semibold" style={{ color: C.ink }}>What are you capturing?</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CAPTURE_TYPES.map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                onClick={() => {
                  setCaptureDraft(emptyCaptureDraft(value));
                  setCaptureMenuOpen(false);
                }}
                className="flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              >
                <Icon size={16} className="shrink-0" style={{ color: C.pen }} /> {label}
              </button>
            ))}
          </div>
          <Button tone="quiet" className="mt-3 min-h-11" onClick={() => setCaptureMenuOpen(false)}>Cancel</Button>
        </Card>
      )}

      {captureDraft && (
        <CaptureEditor
          key={captureDraft.id || `new:${captureDraft.type}`}
          capture={captureDraft}
          pageVocabulary={pageVocabulary}
          onCancel={() => setCaptureDraft(null)}
          onSaved={async (draft) => {
            await saveSourceCapture(page.id, draft);
            setCaptureDraft(null);
            await changed();
          }}
          onDelete={captureDraft.id ? async () => {
            await deleteSourceCapture(page.id, captureDraft.id);
            setCaptureDraft(null);
            await changed();
          } : null}
        />
      )}

      {organizing && (
        <CaptureOrganizer
          captures={captures}
          onCancel={() => setOrganizing(false)}
          onSaved={async (ids) => {
            await saveSourceCaptureOrder(page.id, ids);
            setOrganizing(false);
            await changed();
          }}
        />
      )}

      {captures.length > 0 && !organizing && !captureDraft && !captureMenuOpen && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border px-2 py-2" style={{ borderColor: C.line, background: C.card }}>
            <Search size={14} className="shrink-0" style={{ color: C.mut }} />
            <input
              aria-label="Search source captures"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search captures…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: C.ink }}
            />
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: C.mut }}>
            <ListFilter size={14} />
            <span className="shrink-0">Show</span>
            <select
              aria-label="Capture type filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-lg border px-2 text-sm"
              style={{ background: C.card, borderColor: C.line, color: C.ink }}
            >
              <option value="all">All capture types</option>
              {CAPTURE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          {visibleCaptures.map((capture) => (
            <CaptureCard
              key={capture.id}
              capture={capture}
              itemsById={itemsById}
              items={items}
              onOpen={onOpen}
              expanded={expanded.has(capture.id)}
              addingVocabulary={vocabularyCaptureId === capture.id}
              detachingVocabularyId={vocabularyDetachKey?.captureId === capture.id
                ? vocabularyDetachKey.itemId
                : null}
              onToggleExpanded={() => setExpanded((current) => {
                const next = new Set(current);
                if (next.has(capture.id)) next.delete(capture.id); else next.add(capture.id);
                return next;
              })}
              onEdit={() => {
                setCaptureDraft({ ...capture, itemKeys: [...(capture.itemKeys || [])] });
                setVocabularyCaptureId(null);
              }}
              onBeginVocabulary={typeof onAddVocabulary === "function" ? () => {
                setVocabularyProblem("");
                setVocabularyCaptureId((current) => current === capture.id ? null : capture.id);
              } : null}
              onCancelVocabulary={() => setVocabularyCaptureId(null)}
              onCommitVocabulary={async (candidates) => {
                await onAddVocabulary(capture.id, candidates);
                setVocabularyCaptureId(null);
                await changed();
              }}
              onDetachVocabulary={async (itemId) => {
                setVocabularyDetachKey({ captureId: capture.id, itemId });
                setVocabularyProblem("");
                try {
                  await saveSourceCapture(page.id, {
                    ...capture,
                    itemKeys: (capture.itemKeys || []).filter((id) => id !== itemId),
                  });
                  await changed();
                } catch (error) {
                  setVocabularyProblem(problemMessage(error, "Vocabulary could not be detached from this capture."));
                } finally {
                  setVocabularyDetachKey(null);
                }
              }}
            />
          ))}

          {visibleCaptures.length === 0 && (
            <Card className="text-center">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>No captures match</div>
              <div className="mt-1 text-xs" style={{ color: C.mut }}>Try another search or capture type.</div>
            </Card>
          )}
          {vocabularyProblem && <div role="alert" className="text-xs" style={{ color: C.red }}>{vocabularyProblem}</div>}
        </div>
      )}

      {page.collection?.enabled && typeof onJumpToVocabulary === "function" && (
        <Button tone="quiet" className="mt-4 min-h-11" onClick={onJumpToVocabulary}>
          <ArrowDown size={14} /> Jump to page vocabulary
        </Button>
      )}
    </PageSectionDisclosure>
  );
}
