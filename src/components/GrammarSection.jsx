import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  FilePenLine,
  Languages,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button, C, Card, MONO, SERIF } from "../theme.jsx";
import { newGrammarSection, pageStructureNameKey } from "../lib/pageKinds.js";
import {
  deleteGrammarExample,
  deleteGrammarSection,
  saveGrammarDetails,
  saveGrammarExample,
  saveGrammarOrganization,
  saveGrammarSection,
} from "../db/pageStructures.js";
import CollectionAddVocabularySheet from "./CollectionAddVocabularySheet.jsx";

const fieldStyle = { background: C.card, borderColor: C.line, color: C.ink };

const problemMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

const shortText = (value, length = 54) => {
  const flat = String(value || "").replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
};

const moveAt = (rows, index, offset) => {
  const target = index + offset;
  if (target < 0 || target >= rows.length) return rows;
  const next = [...rows];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

const refValue = (ref) => ref ? `${ref.pageId}|${ref.captureId}` : "";

const refFromValue = (value) => {
  if (!value) return null;
  const divider = value.indexOf("|");
  if (divider < 1) return null;
  return { pageId: value.slice(0, divider), captureId: value.slice(divider + 1) };
};

const sourceCaptureType = (type) => ({
  passage: "Passage",
  reflection: "Reflection",
  language_note: "Language note",
  question: "Question",
}[type] || "Capture");

function sourceCaptureLabel(sourcePage, capture) {
  const identity = capture.location || shortText(capture.text) || sourceCaptureType(capture.type);
  return `${sourcePage.title || "Untitled page"} — ${identity}`;
}

function sourceCaptureOptions(page, items) {
  const byId = new Map();
  for (const candidate of items || []) {
    if (candidate?.type === "page") byId.set(candidate.id, candidate);
  }
  if (page?.type === "page") byId.set(page.id, page);

  return [...byId.values()].flatMap((sourcePage) => {
    if (!sourcePage.source?.enabled) return [];
    return (sourcePage.source.captures || []).map((capture) => ({
      value: refValue({ pageId: sourcePage.id, captureId: capture.id }),
      ref: { pageId: sourcePage.id, captureId: capture.id },
      page: sourcePage,
      capture,
      label: sourceCaptureLabel(sourcePage, capture),
    }));
  });
}

function sourceReferenceStatus(ref, page, items) {
  if (!ref) return null;
  const sourcePage = ref.pageId === page.id
    ? page
    : (items || []).find((candidate) => candidate.id === ref.pageId);
  if (!sourcePage || sourcePage.type !== "page") {
    return { page: null, capture: null, text: "Related Source capture is unavailable", hidden: true };
  }
  if (!sourcePage.source?.enabled) {
    return {
      page: sourcePage,
      capture: null,
      text: `${sourcePage.title || "Untitled page"} · Source notebook hidden`,
      hidden: true,
    };
  }
  const capture = (sourcePage.source.captures || []).find((candidate) => candidate.id === ref.captureId);
  if (!capture) {
    return {
      page: sourcePage,
      capture: null,
      text: `${sourcePage.title || "Untitled page"} · Capture unavailable`,
      hidden: true,
    };
  }
  return {
    page: sourcePage,
    capture,
    text: sourceCaptureLabel(sourcePage, capture),
    hidden: false,
  };
}

function KeyIdeaCard({ keyIdea, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(keyIdea || "");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  function openEditor() {
    setDraft(keyIdea || "");
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
              setProblem(problemMessage(error, "The key idea could not be saved."));
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block text-xs" style={{ color: C.mut }}>
            Key idea
            <textarea
              autoFocus
              aria-label="Grammar key idea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="What is the central idea of this guide?"
              className="mt-1 min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
              style={fieldStyle}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save key idea"}</Button>
            <Button
              type="button"
              tone="quiet"
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
            <Languages size={15} style={{ color: C.pen }} /> Key idea
          </div>
          <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: keyIdea ? C.ink : C.mut }}>
            {keyIdea || "Summarize the main rule, contrast, or construction."}
          </div>
        </div>
        <button
          type="button"
          onClick={openEditor}
          aria-label="Edit grammar key idea"
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border px-2 text-xs"
          style={{ ...fieldStyle, color: C.pen }}
        >
          <Pencil size={13} /> Edit
        </button>
      </div>
    </Card>
  );
}

function SectionEditor({ section, onCancel, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    ...(section?.id ? { id: section.id } : {}),
    name: section?.name || "",
    explanation: section?.explanation || "",
    pattern: section?.pattern || "",
  }));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.name.trim()) return;
          setSaving(true);
          setProblem("");
          try {
            await onSaved({ ...draft, name: draft.name.trim() });
          } catch (error) {
            setProblem(problemMessage(error, "This section could not be saved."));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="text-sm font-semibold" style={{ color: C.ink }}>
          {section?.id ? "Edit guide section" : "New guide section"}
        </div>
        <div className="mt-3 space-y-3">
          <label className="block text-xs" style={{ color: C.mut }}>
            Section name
            <input
              autoFocus
              required
              aria-label="Grammar section name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="When to use it"
              className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={fieldStyle}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Explanation
            <textarea
              aria-label="Grammar section explanation"
              value={draft.explanation}
              onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))}
              placeholder="Explain the rule or contrast in your own words."
              className="mt-1 min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
              style={fieldStyle}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Pattern
            <input
              aria-label="Grammar section pattern"
              value={draft.pattern}
              onChange={(event) => setDraft((current) => ({ ...current, pattern: event.target.value }))}
              placeholder="si + imperfect subjunctive + conditional"
              className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ ...fieldStyle, fontFamily: MONO }}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
          <Button type="submit" disabled={!draft.name.trim() || saving}>{saving ? "Saving…" : "Save section"}</Button>
          <Button type="button" tone="quiet" disabled={saving} onClick={onCancel}>Cancel</Button>
        </div>
        {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
      </form>
    </Card>
  );
}

function ExampleEditor({ example, sourceOptions, onCancel, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    ...(example?.id ? { id: example.id } : {}),
    es: example?.es || "",
    en: example?.en || "",
    note: example?.note || "",
    itemKeys: [...(example?.itemKeys || [])],
    sourceCaptureRef: example?.sourceCaptureRef ? { ...example.sourceCaptureRef } : null,
  }));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const selectedRefValue = refValue(draft.sourceCaptureRef);
  const selectedRefAvailable = !selectedRefValue
    || sourceOptions.some((option) => option.value === selectedRefValue);

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.es.trim()) return;
          setSaving(true);
          setProblem("");
          try {
            await onSaved({ ...draft, es: draft.es.trim() });
          } catch (error) {
            setProblem(problemMessage(error, "This example could not be saved."));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="text-sm font-semibold" style={{ color: C.ink }}>
          {example?.id ? "Edit example pair" : "New example pair"}
        </div>
        <div className="mt-3 space-y-3">
          <label className="block text-xs" style={{ color: C.mut }}>
            Spanish
            <textarea
              autoFocus
              required
              aria-label="Spanish example"
              value={draft.es}
              onChange={(event) => setDraft((current) => ({ ...current, es: event.target.value }))}
              placeholder="Escribe un ejemplo en español."
              className="mt-1 min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-base leading-relaxed outline-none"
              style={{ ...fieldStyle, fontFamily: SERIF }}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            English (optional)
            <textarea
              aria-label="English example"
              value={draft.en}
              onChange={(event) => setDraft((current) => ({ ...current, en: event.target.value }))}
              placeholder="English translation"
              className="mt-1 min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
              style={fieldStyle}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Explanation or note (optional)
            <textarea
              aria-label="Example explanation"
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              placeholder="What this example demonstrates"
              className="mt-1 min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
              style={fieldStyle}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Related Source capture (optional)
            <select
              aria-label="Related Source capture"
              value={selectedRefValue}
              onChange={(event) => setDraft((current) => ({
                ...current,
                sourceCaptureRef: refFromValue(event.target.value),
              }))}
              className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={fieldStyle}
            >
              <option value="">No exact Source capture</option>
              {!selectedRefAvailable && (
                <option value={selectedRefValue}>Current Source capture is hidden or unavailable</option>
              )}
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
          <Button type="submit" disabled={!draft.es.trim() || saving}>{saving ? "Saving…" : "Save example"}</Button>
          <Button type="button" tone="quiet" disabled={saving} onClick={onCancel}>Cancel</Button>
        </div>
        {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
      </form>
    </Card>
  );
}

function GrammarOrganizer({ sections, onCancel, onSaved }) {
  const initial = useMemo(() => sections.map((section) => ({
    id: section.id,
    name: section.name,
    examples: (section.examples || []).map((example) => ({ id: example.id, es: example.es })),
  })), [sections]);
  const [draft, setDraft] = useState(() => initial.map((section) => ({
    ...section,
    examples: section.examples.map((example) => ({ ...example })),
  })));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const names = draft.map((section) => pageStructureNameKey(section.name));
  const namesValid = names.every(Boolean) && new Set(names).size === names.length;

  function moveExample(sectionIndex, exampleIndex, offset) {
    setDraft((current) => current.map((section, index) => index === sectionIndex
      ? { ...section, examples: moveAt(section.examples, exampleIndex, offset) }
      : section));
  }

  function moveExampleTo(sectionIndex, exampleIndex, targetId) {
    if (draft[sectionIndex]?.id === targetId) return;
    setDraft((current) => {
      const next = current.map((section) => ({ ...section, examples: [...section.examples] }));
      const [moved] = next[sectionIndex].examples.splice(exampleIndex, 1);
      const targetIndex = next.findIndex((section) => section.id === targetId);
      if (!moved || targetIndex < 0) return current;
      next[targetIndex].examples.push(moved);
      return next;
    });
  }

  function addSection() {
    const section = newGrammarSection();
    setDraft((current) => [...current, { id: section.id, name: "", examples: [] }]);
  }

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>Organize Grammar guide</div>
      <div className="mt-0.5 text-xs" style={{ color: C.mut }}>
        Rename, add, and reorder sections, or move examples. Nothing changes until Save.
      </div>

      <div className="mt-3 space-y-3">
        {draft.map((section, sectionIndex) => (
          <div key={section.id} className="rounded-lg border p-2" style={{ background: C.paper, borderColor: C.line }}>
            <div className="flex items-center gap-1">
              <input
                aria-label={`Section ${sectionIndex + 1} name`}
                value={section.name}
                onChange={(event) => setDraft((current) => current.map((candidate, index) => (
                  index === sectionIndex ? { ...candidate, name: event.target.value } : candidate
                )))}
                className="min-h-11 min-w-0 flex-1 rounded-lg border px-2 text-sm outline-none"
                style={fieldStyle}
              />
              <button
                type="button"
                aria-label={`Move section ${section.name || sectionIndex + 1} up`}
                disabled={sectionIndex === 0}
                onClick={() => setDraft((current) => moveAt(current, sectionIndex, -1))}
                className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
              >
                <ArrowUp size={15} style={{ color: C.mut }} />
              </button>
              <button
                type="button"
                aria-label={`Move section ${section.name || sectionIndex + 1} down`}
                disabled={sectionIndex === draft.length - 1}
                onClick={() => setDraft((current) => moveAt(current, sectionIndex, 1))}
                className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
              >
                <ArrowDown size={15} style={{ color: C.mut }} />
              </button>
            </div>

            {(section.examples || []).length > 0 && (
              <div className="mt-2 space-y-2">
                {section.examples.map((example, exampleIndex) => (
                  <div key={example.id} className="rounded-lg border p-2" style={{ background: C.card, borderColor: C.line }}>
                    <div className="truncate text-sm" style={{ color: C.ink, fontFamily: SERIF }}>{example.es}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${example.es} up`}
                        disabled={exampleIndex === 0}
                        onClick={() => moveExample(sectionIndex, exampleIndex, -1)}
                        className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
                      >
                        <ArrowUp size={14} style={{ color: C.mut }} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${example.es} down`}
                        disabled={exampleIndex === section.examples.length - 1}
                        onClick={() => moveExample(sectionIndex, exampleIndex, 1)}
                        className="flex min-h-11 min-w-11 items-center justify-center disabled:opacity-30"
                      >
                        <ArrowDown size={14} style={{ color: C.mut }} />
                      </button>
                      <select
                        aria-label={`Move ${example.es} to section`}
                        value={section.id}
                        onChange={(event) => moveExampleTo(sectionIndex, exampleIndex, event.target.value)}
                        className="min-h-11 min-w-0 flex-1 rounded-lg border px-2 text-xs"
                        style={fieldStyle}
                      >
                        {draft.map((target) => (
                          <option key={target.id} value={target.id}>Move to {target.name || "Unnamed section"}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        tone="quiet"
        className="mt-3 min-h-11"
        aria-label="Add section to organizer"
        disabled={saving}
        onClick={addSection}
      >
        <Plus size={14} /> Add section
      </Button>

      {!namesValid && (
        <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>
          Section names must be nonblank and unique.
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
        <Button
          disabled={!changed || !namesValid || saving}
          onClick={async () => {
            setSaving(true);
            setProblem("");
            try {
              await onSaved(draft.map((section) => ({
                id: section.id,
                name: section.name.trim(),
                examples: section.examples.map(({ id }) => ({ id })),
              })));
            } catch (error) {
              setProblem(problemMessage(error, "Grammar organization could not be saved."));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save organization"}
        </Button>
        <Button tone="quiet" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
      {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
    </Card>
  );
}

function VocabularyChips({ itemKeys, itemsById, onOpen, onDetach, detachingKey }) {
  if (!(itemKeys || []).length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Example vocabulary">
      {(itemKeys || []).map((id) => {
        const item = itemsById.get(id);
        const label = item?.term || "missing vocabulary";
        return (
          <span
            key={id}
            className="inline-flex min-h-11 max-w-full overflow-hidden rounded-full border"
            style={{ background: C.penPale, borderColor: "#D9E1F2", color: C.penDark }}
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
            {onDetach && (
              <button
                type="button"
                disabled={detachingKey === id}
                onClick={() => onDetach(id)}
                aria-label={`Detach vocabulary ${label} from this example`}
                className="flex min-h-11 min-w-11 items-center justify-center border-l disabled:opacity-50"
                style={{ borderColor: "#D9E1F2", color: C.red }}
              >
                <X size={14} />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}

function ExampleCard({
  page,
  section,
  example,
  items,
  itemsById,
  onOpen,
  onEdit,
  deleting,
  onArmDelete,
  onCancelDelete,
  onDelete,
  addingVocabulary,
  onBeginVocabulary,
  onCancelVocabulary,
  onCommitVocabulary,
  onDetachVocabulary,
}) {
  const [detachingKey, setDetachingKey] = useState(null);
  const [vocabularyProblem, setVocabularyProblem] = useState("");
  const sourceStatus = sourceReferenceStatus(example.sourceCaptureRef, page, items);
  const memberLocations = useMemo(() => {
    const result = new Map();
    for (const id of example.itemKeys || []) {
      result.set(id, "this example");
      const dictKey = itemsById.get(id)?.dictKey;
      if (dictKey) result.set(dictKey, "this example");
    }
    return result;
  }, [example.itemKeys, itemsById]);

  return (
    <div className="rounded-lg border p-3" style={{ background: C.card, borderColor: C.line }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="whitespace-pre-wrap break-words text-base leading-relaxed" style={{ color: C.ink, fontFamily: SERIF }}>
            {example.es}
          </div>
          {example.en && <div className="mt-1 whitespace-pre-wrap break-words text-sm" style={{ color: C.mut }}>{example.en}</div>}
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label={`Edit example ${example.es}`}
            onClick={onEdit}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            <Pencil size={15} style={{ color: C.pen }} />
          </button>
          <button
            type="button"
            aria-label={`Delete example ${example.es}`}
            onClick={onArmDelete}
            className="flex min-h-11 min-w-11 items-center justify-center"
          >
            <Trash2 size={15} style={{ color: C.red }} />
          </button>
        </div>
      </div>

      {example.note && (
        <div className="mt-2 whitespace-pre-wrap break-words rounded-lg p-2 text-sm" style={{ background: C.paper, color: C.mut }}>
          {example.note}
        </div>
      )}

      {sourceStatus && (
        <button
          type="button"
          disabled={!sourceStatus.page || !onOpen}
          onClick={() => sourceStatus.page && onOpen?.(sourceStatus.page.id)}
          className="mt-2 flex min-h-11 max-w-full items-center gap-2 text-left text-xs disabled:opacity-70"
          style={{ color: sourceStatus.hidden ? C.mut : C.pen }}
        >
          {sourceStatus.hidden ? <Link2 size={14} className="shrink-0" /> : <BookOpen size={14} className="shrink-0" />}
          <span className="truncate">{sourceStatus.text}</span>
        </button>
      )}

      <VocabularyChips
        itemKeys={example.itemKeys}
        itemsById={itemsById}
        onOpen={onOpen}
        detachingKey={detachingKey}
        onDetach={onDetachVocabulary ? async (itemId) => {
          setDetachingKey(itemId);
          setVocabularyProblem("");
          try {
            await onDetachVocabulary(itemId);
          } catch (error) {
            setVocabularyProblem(problemMessage(error, "This vocabulary could not be detached."));
          } finally {
            setDetachingKey(null);
          }
        } : null}
      />
      {onBeginVocabulary && (
        <button
          type="button"
          aria-expanded={addingVocabulary}
          onClick={onBeginVocabulary}
          className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border px-2 text-xs"
          style={{ ...fieldStyle, color: C.pen }}
        >
          <Plus size={13} /> Add vocabulary
        </button>
      )}

      {addingVocabulary && (
        <CollectionAddVocabularySheet
          items={items}
          memberLocations={memberLocations}
          targetLabel={`${section.name} example`}
          creationContext="this grammar example"
          onCancel={onCancelVocabulary}
          onCommit={onCommitVocabulary}
        />
      )}

      {vocabularyProblem && (
        <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{vocabularyProblem}</div>
      )}

      {deleting && (
        <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "#E5C4BC", background: C.paper }}>
          <div className="text-sm" style={{ color: C.ink }}>
            Delete this example? Its vocabulary stays on the page.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button tone="dangerArmed" onClick={onDelete}>Confirm delete</Button>
            <Button tone="quiet" onClick={onCancelDelete}>Keep example</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Controlled Grammar-guide capability. The current page snapshot is owned by the parent; after
 * each explicit save this component asks the parent to reload it through onChanged.
 */
export default function GrammarSection({
  page,
  items = [],
  onOpen,
  onChanged,
  onAddVocabulary,
}) {
  const grammar = page?.grammar;
  const sections = grammar?.sections || [];
  const [sectionDraft, setSectionDraft] = useState(null);
  const [exampleDraft, setExampleDraft] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [deleteSectionId, setDeleteSectionId] = useState(null);
  const [deleteExample, setDeleteExample] = useState(null);
  const [deleteProblem, setDeleteProblem] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [vocabularyTarget, setVocabularyTarget] = useState(null);
  const itemsById = useMemo(() => new Map((items || []).map((item) => [item.id, item])), [items]);
  const captureOptions = useMemo(() => sourceCaptureOptions(page, items), [page, items]);
  const exampleCount = sections.reduce((total, section) => total + (section.examples || []).length, 0);

  if (!page || page.type !== "page" || !grammar?.enabled) return null;

  async function changed() {
    await onChanged?.();
  }

  return (
    <section aria-labelledby="grammar-guide-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="grammar-guide-heading" className="text-lg font-bold" style={{ color: C.ink, fontFamily: SERIF }}>
            Grammar guide
          </h2>
          <div className="mt-0.5 text-xs" style={{ color: C.mut }}>
            {sections.length} {sections.length === 1 ? "section" : "sections"} · {exampleCount} {exampleCount === 1 ? "example" : "examples"}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {sections.length > 0 && !organizing && (
            <Button
              tone="quiet"
              onClick={() => {
                setOrganizing(true);
                setSectionDraft(null);
                setExampleDraft(null);
              }}
            >
              <FilePenLine size={14} /> Organize
            </Button>
          )}
          {!organizing && (
            <Button
              onClick={() => {
                setSectionDraft({});
                setExampleDraft(null);
              }}
            >
              <Plus size={14} /> Section
            </Button>
          )}
        </div>
      </div>

      <KeyIdeaCard
        key={`${page.id}:${grammar.keyIdea}`}
        keyIdea={grammar.keyIdea}
        onSaved={async (keyIdea) => {
          await saveGrammarDetails(page.id, { keyIdea });
          await changed();
        }}
      />

      {sectionDraft && (
        <SectionEditor
          key={sectionDraft.id || "new-section"}
          section={sectionDraft}
          onCancel={() => setSectionDraft(null)}
          onSaved={async (draft) => {
            await saveGrammarSection(page.id, draft);
            setSectionDraft(null);
            await changed();
          }}
        />
      )}

      {organizing && (
        <GrammarOrganizer
          sections={sections}
          onCancel={() => setOrganizing(false)}
          onSaved={async (draft) => {
            await saveGrammarOrganization(page.id, draft);
            setOrganizing(false);
            await changed();
          }}
        />
      )}

      {!organizing && (
        <div className="mt-4 space-y-4">
          {sections.map((section, sectionIndex) => (
            <Card key={section.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold" style={{ color: C.ink, fontFamily: SERIF }}>{section.name}</h3>
                  <div className="mt-0.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO }}>
                    Section {sectionIndex + 1} · {(section.examples || []).length} {(section.examples || []).length === 1 ? "example" : "examples"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    aria-label={`Edit section ${section.name}`}
                    onClick={() => {
                      setSectionDraft(section);
                      setExampleDraft(null);
                      setDeleteSectionId(null);
                    }}
                    className="flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <Pencil size={15} style={{ color: C.pen }} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete section ${section.name}`}
                    onClick={() => {
                      setDeleteProblem("");
                      setDeleteSectionId(section.id);
                    }}
                    className="flex min-h-11 min-w-11 items-center justify-center"
                  >
                    <Trash2 size={15} style={{ color: C.red }} />
                  </button>
                </div>
              </div>

              {section.explanation && (
                <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: C.ink }}>
                  {section.explanation}
                </div>
              )}
              {section.pattern && (
                <div className="mt-3 overflow-x-auto rounded-lg border px-3 py-2 text-sm" style={{ background: C.paper, borderColor: C.line, color: C.penDark, fontFamily: MONO }}>
                  {section.pattern}
                </div>
              )}

              {deleteSectionId === section.id && (
                <div className="mt-3 rounded-lg border p-3" style={{ borderColor: "#E5C4BC", background: C.paper }}>
                  <div className="text-sm" style={{ color: C.ink }}>
                    {(section.examples || []).length
                      ? "This section has examples. The guide will require you to move or delete them first."
                      : `Delete the “${section.name}” section?`}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      tone="dangerArmed"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        setDeleteProblem("");
                        try {
                          await deleteGrammarSection(page.id, section.id);
                          setDeleteSectionId(null);
                          await changed();
                        } catch (error) {
                          setDeleteProblem(problemMessage(error, "This section could not be deleted."));
                        } finally {
                          setDeleting(false);
                        }
                      }}
                    >
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </Button>
                    <Button tone="quiet" disabled={deleting} onClick={() => setDeleteSectionId(null)}>Keep section</Button>
                  </div>
                </div>
              )}

              {deleteProblem && deleteSectionId === section.id && (
                <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{deleteProblem}</div>
              )}

              <div className="mt-4 space-y-3">
                {(section.examples || []).map((example) => (
                  <ExampleCard
                    key={example.id}
                    page={page}
                    section={section}
                    example={example}
                    items={items}
                    itemsById={itemsById}
                    onOpen={onOpen}
                    deleting={deleteExample?.sectionId === section.id && deleteExample?.exampleId === example.id}
                    addingVocabulary={vocabularyTarget?.sectionId === section.id && vocabularyTarget?.exampleId === example.id}
                    onEdit={() => {
                      setExampleDraft({ sectionId: section.id, example });
                      setSectionDraft(null);
                      setDeleteExample(null);
                      setVocabularyTarget(null);
                    }}
                    onArmDelete={() => {
                      setDeleteProblem("");
                      setDeleteExample({ sectionId: section.id, exampleId: example.id });
                      setVocabularyTarget(null);
                    }}
                    onCancelDelete={() => setDeleteExample(null)}
                    onDelete={async () => {
                      setDeleting(true);
                      setDeleteProblem("");
                      try {
                        await deleteGrammarExample(page.id, section.id, example.id);
                        setDeleteExample(null);
                        await changed();
                      } catch (error) {
                        setDeleteProblem(problemMessage(error, "This example could not be deleted."));
                      } finally {
                        setDeleting(false);
                      }
                    }}
                    onBeginVocabulary={typeof onAddVocabulary === "function" ? () => {
                      setVocabularyTarget((current) => (
                        current?.sectionId === section.id && current?.exampleId === example.id
                          ? null
                          : { sectionId: section.id, exampleId: example.id }
                      ));
                      setDeleteExample(null);
                    } : null}
                    onCancelVocabulary={() => setVocabularyTarget(null)}
                    onCommitVocabulary={async (candidates) => {
                      await onAddVocabulary(section.id, example.id, candidates);
                      setVocabularyTarget(null);
                      await changed();
                    }}
                    onDetachVocabulary={async (itemId) => {
                      await saveGrammarExample(page.id, section.id, {
                        ...example,
                        itemKeys: (example.itemKeys || []).filter((key) => key !== itemId),
                      });
                      await changed();
                    }}
                  />
                ))}
              </div>

              {exampleDraft?.sectionId === section.id && (
                <ExampleEditor
                  key={exampleDraft.example?.id || `new-example:${section.id}`}
                  example={exampleDraft.example}
                  sourceOptions={captureOptions}
                  onCancel={() => setExampleDraft(null)}
                  onSaved={async (draft) => {
                    await saveGrammarExample(page.id, section.id, draft);
                    setExampleDraft(null);
                    await changed();
                  }}
                />
              )}

              <Button
                tone="quiet"
                className="mt-3"
                onClick={() => {
                  setExampleDraft({ sectionId: section.id, example: null });
                  setSectionDraft(null);
                  setDeleteExample(null);
                  setVocabularyTarget(null);
                }}
              >
                <Plus size={14} /> Add example
              </Button>

              {deleteProblem && deleteExample?.sectionId === section.id && (
                <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{deleteProblem}</div>
              )}
            </Card>
          ))}
        </div>
      )}

      {sections.length === 0 && !sectionDraft && !organizing && (
        <Card className="mt-4 text-center">
          <div className="text-sm font-semibold" style={{ color: C.ink }}>Build the guide one section at a time</div>
          <div className="mt-1 text-xs" style={{ color: C.mut }}>
            Add an explanation, a pattern, and flexible example pairs.
          </div>
          <Button className="mt-3" onClick={() => setSectionDraft({})}><Plus size={14} /> Add first section</Button>
        </Card>
      )}
    </section>
  );
}
