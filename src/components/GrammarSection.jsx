import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Languages,
  ListTree,
  Link2,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { Button, C, Card, MONO, SERIF } from "../theme.jsx";
import {
  canonicalGrammarSections,
  grammarSectionBreadcrumb,
  grammarSectionHierarchy,
  newGrammarSection,
  pageStructureNameKey,
} from "../lib/pageKinds.js";
import {
  outlineNamesValid,
} from "../lib/oneLevelOutline.js";
import {
  deleteGrammarExample,
  deleteGrammarSection,
  saveGrammarDetails,
  saveGrammarExample,
  saveGrammarOrganization,
  saveGrammarSection,
} from "../db/pageStructures.js";
import CollectionAddVocabularySheet from "./CollectionAddVocabularySheet.jsx";
import MarkdownText from "./MarkdownText.jsx";
import MarkdownTextarea from "./MarkdownTextarea.jsx";
import PageSectionDisclosure, { SectionSpineNode } from "./PageSectionDisclosure.jsx";
import MentionedHere from "./MentionedHere.jsx";
import { sectionFamily } from "./pageRoleMeta.js";
import OutlineOrganizerFields from "./OutlineOrganizerFields.jsx";

const GRAMMAR_FAMILY = sectionFamily("grammar");

/**
 * The key idea's handle in the same collapsed-set the guide sections use, now that it folds like
 * one. Safe as a bare word for the same reason the Notes overview's is: every other member is a
 * `grammar-section:<uuid>` from `newGrammarSectionKey` (`src/lib/ids.js`, brief §6).
 */
const KEY_IDEA_COLLAPSE_KEY = "key-idea";

const fieldStyle = { background: C.card, borderColor: C.line, color: C.ink };

const problemMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

function EditorDeleteAction({
  label,
  description,
  onDelete,
  fallback,
  confirmLabel = "Confirm delete",
  workingLabel = "Deleting…",
}) {
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState("");

  if (!onDelete) return null;

  return (
    <>
      <Button
        type="button"
        tone="danger"
        disabled={deleting}
        onClick={() => {
          setProblem("");
          setArmed(true);
        }}
      >
        {label}
      </Button>
      {armed && (
        <div role="alertdialog" aria-label={`Confirm ${label.toLowerCase()}`} className="basis-full rounded-lg border p-3" style={{ borderColor: C.dangerBorder, background: C.paper }}>
          <div className="text-sm" style={{ color: C.ink }}>{description}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              tone="dangerArmed"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setProblem("");
                try {
                  await onDelete();
                } catch (error) {
                  setProblem(problemMessage(error, fallback));
                  setDeleting(false);
                }
              }}
            >
              {deleting ? workingLabel : confirmLabel}
            </Button>
            <Button type="button" tone="quiet" disabled={deleting} onClick={() => setArmed(false)}>Keep</Button>
          </div>
          {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
        </div>
      )}
    </>
  );
}

const shortText = (value, length = 54) => {
  const flat = String(value || "").replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
};

const grammarSectionHasContent = (section) => Boolean(
  section?.explanation?.trim()
  || section?.pattern?.trim()
  || (section?.examples || []).length
);

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

/**
 * The key idea, wearing the same card as a guide section (owner-requested 2026-08-28).
 *
 * It used to sit above the guide's own vertical rule with every section hanging off that rule,
 * which said on screen that the sections were inside the key idea. They are siblings: one states
 * the rule, the others explain it. So this now renders as the first member of the same list, with
 * the same chevron, and the guide's second spine is gone — only a real subsection is indented.
 *
 * `editing` belongs to the parent because the card does not render at all until there is a key
 * idea; the "+ Key idea" offer that replaces it lives outside this component.
 */
function KeyIdeaCard({ keyIdea, onSaved, editing, onEditingChange, collapsed, onToggle }) {
  const [draft, setDraft] = useState(keyIdea || "");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const contentId = "grammar-key-idea-content";

  if (editing) {
    return (
      <Card style={{ borderColor: C.pen }}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setProblem("");
            try {
              await onSaved(draft.trim());
              onEditingChange(false);
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
            <Button type="submit" disabled={saving || !draft.trim()}>{saving ? "Saving…" : "Save key idea"}</Button>
            <Button
              type="button"
              tone="quiet"
              disabled={saving}
              onClick={() => {
                onEditingChange(false);
                setProblem("");
              }}
            >
              Cancel
            </Button>
            {Boolean(keyIdea?.trim()) && (
              <EditorDeleteAction
                label="Remove key idea"
                description="Remove the Key idea from this Grammar guide? You can add it again later."
                confirmLabel="Confirm remove"
                workingLabel="Removing…"
                fallback="The key idea could not be removed."
                onDelete={() => onSaved("")}
              />
            )}
          </div>
          {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          aria-label={`${collapsed ? "Expand" : "Collapse"} grammar Key idea`}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={onToggle}
          className="-ml-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left flex items-center gap-2"
        >
          {collapsed
            ? <ChevronRight size={16} className="shrink-0" style={{ color: C.mut }} />
            : <ChevronDown size={16} className="shrink-0" style={{ color: C.mut }} />}
          <span className="flex min-w-0 items-center gap-2">
            <Languages size={15} className="shrink-0" style={{ color: C.pen }} />
            <h3 className="min-w-0 break-words text-base font-bold leading-snug" style={{ color: C.ink, fontFamily: SERIF }}>Key idea</h3>
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(keyIdea || "");
            setProblem("");
            onEditingChange(true);
          }}
          aria-label="Edit grammar key idea"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
        >
          <Pencil size={15} style={{ color: C.pen }} />
        </button>
      </div>
      <div id={contentId} hidden={collapsed}>
        <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ color: C.ink }}>
          {keyIdea}
        </div>
      </div>
    </Card>
  );
}

function SectionEditor({ section, childCount = 0, onCancel, onSaved, onDelete }) {
  const [draft, setDraft] = useState(() => ({
    ...(section?.id ? { id: section.id } : {}),
    ...(Object.prototype.hasOwnProperty.call(section || {}, "parentId")
      ? { parentId: section.parentId }
      : {}),
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
          {section?.id ? "Edit guide section" : section?.parentId ? "New subsection" : "New guide section"}
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
            Overview
            <MarkdownTextarea
              aria-label="Grammar section overview"
              blankLines
              calloutBlockquotes
              quoteLabel="Note callout"
              value={draft.explanation}
              onChange={(explanation) => setDraft((current) => ({ ...current, explanation }))}
              placeholder="Explain the rule or contrast in your own words."
              className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
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
          {section?.id && (
            <EditorDeleteAction
              label="Delete section"
              description={childCount
                ? "This section has subsections. Promote or move them before deleting the section."
                : (section.examples || []).length
                ? "This section has examples. Move or delete them before deleting the section."
                : `Delete the “${section.name}” section?`}
              onDelete={onDelete}
              fallback="This section could not be deleted."
            />
          )}
        </div>
        {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
      </form>
    </Card>
  );
}

function ExampleEditor({ example, sourceOptions, onCancel, onSaved, onDelete }) {
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
          {example?.id && (
            <EditorDeleteAction
              label="Delete example"
              description="Delete this example? Its vocabulary stays on the page."
              onDelete={onDelete}
              fallback="This example could not be deleted."
            />
          )}
        </div>
        {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
      </form>
    </Card>
  );
}

function GrammarOrganizer({ sections, onCancel, onSaved }) {
  const initial = useMemo(() => canonicalGrammarSections(sections).map((section) => ({
    id: section.id,
    parentId: section.parentId ?? null,
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
  const namesValid = outlineNamesValid(draft, pageStructureNameKey);

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
    setDraft((current) => [...current, {
      id: section.id,
      parentId: null,
      name: "",
      examples: [],
    }]);
  }

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>Organize Grammar guide</div>
      <div className="mt-0.5 text-xs" style={{ color: C.mut }}>
        Rename and reorder siblings, promote or reparent subsections, add sections, or move examples.
        Nothing changes until Save.
      </div>

      <div className="mt-3 space-y-3">
        {draft.map((section, sectionIndex) => (
          <div
            key={section.id}
            className={`rounded-lg border p-2 ${section.parentId ? "ml-4" : ""}`}
            style={{ background: C.paper, borderColor: C.line }}
          >
            <OutlineOrganizerFields
              rows={draft}
              row={section}
              index={sectionIndex}
              onChange={setDraft}
            />

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
                          <option key={target.id} value={target.id}>
                            Move to {grammarSectionBreadcrumb(target, draft) || "Unnamed section"}
                          </option>
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
        <Plus size={14} /> Section
      </Button>

      {!namesValid && (
        <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>
          Section names must be nonblank and unique among siblings.
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
                parentId: section.parentId ?? null,
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
            {onDetach && (
              <button
                type="button"
                disabled={detachingKey === id}
                onClick={() => onDetach(id)}
                aria-label={`Detach vocabulary ${label} from this example`}
                className="flex min-h-11 min-w-11 items-center justify-center border-l disabled:opacity-50"
                style={{ borderColor: C.chipBorder, color: C.red }}
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
  addingVocabulary,
  onBeginVocabulary,
  onCancelVocabulary,
  onCommitVocabulary,
  onDetachVocabulary,
  onAddMention,
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

      <MentionedHere
        items={items}
        contextId={`${page.id}:grammar:${section.id}:example:${example.id}`}
        onOpen={onOpen}
        onAdd={onAddMention}
      />

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
          aria-label="Add vocabulary"
          onClick={onBeginVocabulary}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
          style={{ background: C.card, borderColor: C.line, color: C.mut }}
        >
          <Plus size={12} /> Vocabulary
        </button>
      )}

      {addingVocabulary && (
        <CollectionAddVocabularySheet
          items={items}
          memberLocations={memberLocations}
          targetLabel={`${grammarSectionBreadcrumb(section, page.grammar?.sections)} example`}
          creationContext="this grammar example"
          onCancel={onCancelVocabulary}
          onCommit={onCommitVocabulary}
        />
      )}

      {vocabularyProblem && (
        <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{vocabularyProblem}</div>
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
  onAddMention,
}) {
  const grammar = page?.grammar;
  const sections = grammar?.sections || [];
  const [sectionDraft, setSectionDraft] = useState(null);
  const [exampleDraft, setExampleDraft] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set(
    sections.filter((section) => !grammarSectionHasContent(section)).map((section) => section.id)
  ));
  const [vocabularyTarget, setVocabularyTarget] = useState(null);
  const [keyIdeaEditing, setKeyIdeaEditing] = useState(false);
  const hasKeyIdea = Boolean(grammar?.keyIdea?.trim());
  const itemsById = useMemo(() => new Map((items || []).map((item) => [item.id, item])), [items]);
  const captureOptions = useMemo(() => sourceCaptureOptions(page, items), [page, items]);
  const hierarchy = useMemo(() => grammarSectionHierarchy(sections), [sections]);
  const hasContent = Boolean(grammar?.keyIdea?.trim()) || sections.some(grammarSectionHasContent);

  useEffect(() => {
    setKeyIdeaEditing(false);
    setCollapsedSections(new Set(
      sections.filter((section) => !grammarSectionHasContent(section)).map((section) => section.id)
    ));
  }, [page.id]);

  if (!page || page.type !== "page" || !grammar?.enabled) return null;

  async function changed() {
    await onChanged?.();
  }

  function openSectionEditor(section) {
    setSectionDraft(section);
    setExampleDraft(null);
    setVocabularyTarget(null);
    setCollapsedSections((current) => {
      if (!current.has(section.id) && (!section.parentId || !current.has(section.parentId))) return current;
      const next = new Set(current);
      next.delete(section.id);
      if (section.parentId) next.delete(section.parentId);
      return next;
    });
  }

  function toggleSection(sectionId) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
  }

  function renderSectionOwnContent(section, isSubsection) {
    return (
      <>
        {section.explanation && (
          <MarkdownText
            blankLines
            compact
            calloutBlockquotes
            className="mt-3 break-words text-sm leading-relaxed"
            style={{ color: C.ink }}
          >
            {section.explanation}
          </MarkdownText>
        )}
        <MentionedHere
          items={items}
          contextId={`${page.id}:grammar:${section.id}:overview`}
          onOpen={onOpen}
          onAdd={onAddMention}
        />
        {section.pattern && (
          <div className="mt-3 overflow-x-auto rounded-lg border px-3 py-2 text-sm" style={{ background: C.paper, borderColor: C.line, color: C.penDark, fontFamily: MONO }}>
            {section.pattern}
          </div>
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
              addingVocabulary={vocabularyTarget?.sectionId === section.id && vocabularyTarget?.exampleId === example.id}
              onEdit={() => {
                setExampleDraft({ sectionId: section.id, example });
                setSectionDraft(null);
                setVocabularyTarget(null);
              }}
              onBeginVocabulary={typeof onAddVocabulary === "function" ? () => {
                setVocabularyTarget((current) => (
                  current?.sectionId === section.id && current?.exampleId === example.id
                    ? null
                    : { sectionId: section.id, exampleId: example.id }
                ));
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
              onAddMention={onAddMention}
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
            onDelete={exampleDraft.example?.id ? async () => {
              await deleteGrammarExample(page.id, section.id, exampleDraft.example.id);
              setExampleDraft(null);
              await changed();
            } : null}
          />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-label="Add example"
            onClick={() => {
              setExampleDraft({ sectionId: section.id, example: null });
              setSectionDraft(null);
              setVocabularyTarget(null);
            }}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
            style={{ background: C.card, borderColor: C.line, color: C.mut }}
          >
            <Plus size={12} /> Example
          </button>
          {!isSubsection && (
            <button
              type="button"
              aria-label={`Add subsection to ${section.name}`}
              onClick={() => {
                setSectionDraft({ parentId: section.id });
                setExampleDraft(null);
                setVocabularyTarget(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
              style={{ background: C.card, borderColor: C.line, color: C.mut }}
            >
              <Plus size={12} /> Subsection
            </button>
          )}
        </div>
      </>
    );
  }

  function renderSectionNode(section, isSubsection = false) {
    const collapsed = collapsedSections.has(section.id);
    const contentId = `grammar-section-content-${section.id}`;
    const children = isSubsection ? [] : (hierarchy.childrenByParent.get(section.id) || []);
    const Heading = isSubsection ? "h4" : "h3";
    const node = (
      <>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            aria-label={`${collapsed ? "Expand" : "Collapse"} grammar ${isSubsection ? "subsection" : "section"} ${section.name}`}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={() => toggleSection(section.id)}
            className="-ml-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left flex items-center gap-2"
          >
            {collapsed
              ? <ChevronRight size={16} className="shrink-0" style={{ color: C.mut }} />
              : <ChevronDown size={16} className="shrink-0" style={{ color: C.mut }} />}
            <Heading
              className={`min-w-0 break-words font-bold leading-snug ${isSubsection ? "text-sm" : "text-base"}`}
              style={{ color: C.ink, fontFamily: SERIF }}
            >
              {section.name}
            </Heading>
          </button>
          <button
            type="button"
            aria-label={`Edit section ${section.name}`}
            onClick={() => openSectionEditor(section)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            <Pencil size={15} style={{ color: C.pen }} />
          </button>
        </div>

        <div id={contentId} hidden={collapsed}>
          {renderSectionOwnContent(section, isSubsection)}
          {children.length > 0 && (
            <div className="grammar-guide-subsections" aria-label={`${section.name} subsections`}>
              {children.map((child) => renderSectionNode(child, true))}
            </div>
          )}
        </div>
      </>
    );

    if (isSubsection) {
      return <div key={section.id} className="grammar-guide-subsection">{node}</div>;
    }
    return (
      <div key={section.id} className="relative">
        <SectionSpineNode className="top-[24px]" family="grammar" />
        <Card>{node}</Card>
      </div>
    );
  }

  return (
    <PageSectionDisclosure
      id="page-grammar"
      family="grammar"
      title="Grammar guide"
      defaultCollapsed={!hasContent}
      resetKey={page.id}
      actions={({ collapsed }) => !organizing && (
        <>
          {!collapsed && sections.length > 0 && (
            <button
              type="button"
              aria-label="Organize"
              onClick={() => {
                setOrganizing(true);
                setSectionDraft(null);
                setExampleDraft(null);
                setVocabularyTarget(null);
              }}
              className="inline-flex items-center justify-center rounded-lg border p-2"
              style={{ background: GRAMMAR_FAMILY.band, borderColor: GRAMMAR_FAMILY.line, color: GRAMMAR_FAMILY.ink }}
            >
              <ListTree size={15} />
            </button>
          )}
          {(!collapsed || !hasContent) && (
            <button
              type="button"
              aria-label="Add grammar section"
              onClick={() => {
                setSectionDraft({ parentId: null });
                setExampleDraft(null);
                setVocabularyTarget(null);
              }}
              className="inline-flex items-center justify-center rounded-lg border p-2"
              style={{ background: GRAMMAR_FAMILY.band, borderColor: GRAMMAR_FAMILY.line, color: GRAMMAR_FAMILY.ink }}
            >
              <Plus size={15} />
            </button>
          )}
        </>
      )}
    >

      {sectionDraft && (
        <SectionEditor
          key={sectionDraft.id || `new-section:${sectionDraft.parentId || "root"}`}
          section={sectionDraft}
          childCount={sections.filter((section) => section.parentId === sectionDraft.id).length}
          onCancel={() => setSectionDraft(null)}
          onSaved={async (draft) => {
            await saveGrammarSection(page.id, draft);
            setSectionDraft(null);
            await changed();
          }}
          onDelete={sectionDraft.id ? async () => {
            await deleteGrammarSection(page.id, sectionDraft.id);
            setSectionDraft(null);
            await changed();
          } : null}
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
          {(hasKeyIdea || keyIdeaEditing) && (
            <div className="relative">
              <SectionSpineNode className="top-[24px]" family="grammar" />
              <KeyIdeaCard
                key={`${page.id}:${grammar.keyIdea}`}
                keyIdea={grammar.keyIdea}
                editing={keyIdeaEditing}
                onEditingChange={setKeyIdeaEditing}
                collapsed={collapsedSections.has(KEY_IDEA_COLLAPSE_KEY)}
                onToggle={() => toggleSection(KEY_IDEA_COLLAPSE_KEY)}
                onSaved={async (keyIdea) => {
                  await saveGrammarDetails(page.id, { keyIdea });
                  await changed();
                }}
              />
            </div>
          )}
          {hierarchy.roots.map((section) => renderSectionNode(section))}
        </div>
      )}

      {!hasKeyIdea && !keyIdeaEditing && !organizing && (
        <Button tone="quiet" className="mt-3 min-h-11" onClick={() => setKeyIdeaEditing(true)}>
          <Plus size={14} /> Key idea
        </Button>
      )}

      {sections.length === 0 && !sectionDraft && !organizing && (
        <div className="mt-4 text-xs" style={{ color: C.mut }}>
          Add an explanation, a pattern, and flexible example pairs.
        </div>
      )}
    </PageSectionDisclosure>
  );
}
