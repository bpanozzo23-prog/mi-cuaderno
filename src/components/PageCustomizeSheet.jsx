import { useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import { grammarStructureCounts, PAGE_FOCUSES, isPageFocusEnabled } from "../lib/pageKinds.js";
import { savePageConfiguration } from "../db/pageStructures.js";

const focusChoices = [
  { id: PAGE_FOCUSES.notes, title: "Notes", description: "Flexible prose appears first." },
  { id: PAGE_FOCUSES.vocabulary, title: "Vocabulary", description: "Vocabulary groups lead." },
  { id: PAGE_FOCUSES.source, title: "Source notes", description: "Captured passages and notes lead." },
  { id: PAGE_FOCUSES.grammar, title: "Grammar guide", description: "Guide sections, subsections, and examples lead." },
];

const structureChoices = [
  { key: "source", title: "Source notebook" },
  { key: "collection", title: "Vocabulary groups" },
  { key: "grammar", title: "Grammar guide" },
];

const previewOrders = {
  [PAGE_FOCUSES.notes]: [
    { key: "notes", label: "Notes" },
    { key: "source", label: "Source" },
    { key: "grammar", label: "Grammar" },
    { key: "collection", label: "Vocabulary" },
  ],
  [PAGE_FOCUSES.source]: [
    { key: "source", label: "Source" },
    { key: "collection", label: "Vocabulary" },
    { key: "grammar", label: "Grammar" },
  ],
  [PAGE_FOCUSES.grammar]: [
    { key: "grammar", label: "Grammar" },
    { key: "collection", label: "Vocabulary" },
    { key: "source", label: "Source" },
  ],
  [PAGE_FOCUSES.vocabulary]: [
    { key: "collection", label: "Vocabulary" },
    { key: "source", label: "Source" },
    { key: "grammar", label: "Grammar" },
  ],
};

const amount = (count, singular) => `${count} ${count === 1 ? singular : `${singular}s`}`;

export default function PageCustomizeSheet({ page, items = [], onClose, onSaved, onCopyStructure }) {
  const [focus, setFocus] = useState(page.pageFocus || PAGE_FOCUSES.notes);
  const [enabled, setEnabled] = useState({
    collection: page.collection?.enabled === true,
    source: page.source?.enabled === true,
    grammar: page.grammar?.enabled === true,
  });
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");

  const preview = useMemo(() => ({
    pageFocus: focus,
    collection: { ...(page.collection || {}), enabled: enabled.collection },
    source: { ...(page.source || {}), enabled: enabled.source },
    grammar: { ...(page.grammar || {}), enabled: enabled.grammar },
  }), [enabled, focus, page.collection, page.grammar, page.source]);

  const lexicalIds = new Set(items.filter((item) => item?.type === "lexical").map((item) => item.id));
  const vocabularyCount = items.length
    ? (page.linkedKeys || []).filter((key) => lexicalIds.has(key)).length
    : (page.linkedKeys || []).length;
  const grammarCounts = grammarStructureCounts(page.grammar?.sections);
  const counts = {
    collection: `${amount(vocabularyCount, "linked item")} · ${amount(page.collection?.groups?.length || 0, "group")}`,
    source: amount(page.source?.captures?.length || 0, "capture"),
    grammar: [
      amount(grammarCounts.sections, "section"),
      ...(grammarCounts.subsections ? [amount(grammarCounts.subsections, "subsection")] : []),
      amount(grammarCounts.examples, "example"),
    ].join(" · "),
  };
  const movesToJournal = Boolean(page.pageDate) && !enabled.collection && !enabled.source && !enabled.grammar;
  const previewSectionOrder = (previewOrders[focus] || previewOrders[PAGE_FOCUSES.notes])
    .filter((section) => section.key === "notes" || enabled[section.key])
    .map((section) => section.label);

  function toggleStructure(key, checked) {
    const next = { ...enabled, [key]: checked };
    setEnabled(next);
    const candidate = {
      ...preview,
      collection: { ...preview.collection, enabled: next.collection },
      source: { ...preview.source, enabled: next.source },
      grammar: { ...preview.grammar, enabled: next.grammar },
    };
    if (!isPageFocusEnabled(focus, candidate)) setFocus(PAGE_FOCUSES.notes);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(33,42,61,0.35)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="customize-page-title" className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-4 pb-6" style={{ background: C.paper }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="customize-page-title" className="text-lg font-bold" style={{ fontFamily: SERIF, color: C.ink }}>Customize page</h2>
            <div className="mt-0.5 text-xs" style={{ color: C.mut }}>{page.title || "Untitled page"}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close page customization" className="min-h-11 min-w-11 inline-flex items-center justify-center"><X size={17} style={{ color: C.mut }} /></button>
        </div>

        <Card className="mt-3">
          <div className="text-[11px] uppercase" style={{ color: C.mut }}>Preview</div>
          <div className="mt-1 font-semibold" style={{ color: C.ink }}>{focusChoices.find((choice) => choice.id === focus)?.title} lead</div>
          <div aria-label="Preview section order" className="mt-1 text-xs" style={{ color: C.mut }}>
            {previewSectionOrder.join(" · ")}
          </div>
        </Card>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold" style={{ color: C.ink }}>Lead with</legend>
          <div className="mt-2 space-y-2">
            {focusChoices.map((choice) => {
              const available = isPageFocusEnabled(choice.id, preview);
              return (
                <label key={choice.id} className="flex min-h-11 items-start gap-3 rounded-lg border p-3" style={{ borderColor: C.line, opacity: available ? 1 : 0.55 }}>
                  <input aria-label={choice.title} type="radio" name="page-focus" value={choice.id} checked={focus === choice.id} disabled={!available} onChange={() => setFocus(choice.id)} />
                  <span><span className="block text-sm font-semibold" style={{ color: C.ink }}>{choice.title}</span><span className="block text-xs" style={{ color: C.mut }}>{choice.description}</span></span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold" style={{ color: C.ink }}>Included structure</legend>
          <div className="mt-2 space-y-2">
            {structureChoices.map((choice) => (
              <label key={choice.key} className="flex min-h-11 items-start gap-3 rounded-lg border p-3" style={{ borderColor: C.line }}>
                <input aria-label={choice.title} type="checkbox" checked={enabled[choice.key]} onChange={(event) => toggleStructure(choice.key, event.target.checked)} />
                <span><span className="block text-sm font-semibold" style={{ color: C.ink }}>{choice.title}</span><span className="block text-xs" style={{ color: C.mut }}>{counts[choice.key]}</span></span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs" style={{ color: C.mut }}>Turning off populated structure hides it without deleting its content.</p>
        </fieldset>

        {movesToJournal && (
          <div className="mt-4 rounded-lg border p-3 text-xs" style={{ borderColor: C.pen, background: C.penPale, color: C.penDark }}>
            This dated Notes-only page will move to Diario after saving.
          </div>
        )}
        {problem && <div role="alert" className="mt-3 text-xs" style={{ color: C.red }}>{problem}</div>}

        <div className="mt-5 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: C.line }}>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            setProblem("");
            try {
              const result = await savePageConfiguration(page.id, {
                pageFocus: focus,
                collectionEnabled: enabled.collection,
                sourceEnabled: enabled.source,
                grammarEnabled: enabled.grammar,
              });
              await onSaved(result);
            } catch (error) {
              setProblem(error instanceof Error ? error.message : "Page customization could not be saved.");
            } finally {
              setSaving(false);
            }
          }}>{saving ? "Saving…" : movesToJournal ? "Save and move to Diario" : "Save changes"}</Button>
          {onCopyStructure && <Button tone="quiet" onClick={onCopyStructure}><Copy size={14} /> Copy structure</Button>}
          <Button tone="quiet" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
