import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  GitMerge,
  ListRestart,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import DictMeaningImport from "./DictMeaningImport.jsx";
import MeaningEditor from "./MeaningEditor.jsx";
import SpeakButton from "./SpeakButton.jsx";
import ExamplePhraseAction from "./ExamplePhraseAction.jsx";
import {
  cleanMeanings,
  cloneMeanings,
  meaningHasContext,
  meaningLabels,
  newMeaning,
} from "../lib/meanings.js";

const unique = (values) => [...new Set(values.filter(Boolean))];

function mergedMeaning(upper, lower) {
  return newMeaning({
    id: upper.id,
    gloss: [upper.gloss, lower.gloss].filter(Boolean).join("; "),
    usageCue: [upper.usageCue, lower.usageCue].filter(Boolean).join(" / "),
    regions: unique([...(upper.regions || []), ...(lower.regions || [])]),
    usageLabels: unique([...(upper.usageLabels || []), ...(lower.usageLabels || [])]),
    posOverride: upper.posOverride || lower.posOverride || "",
    verbBehavior: unique([...(upper.verbBehavior || []), ...(lower.verbBehavior || [])]),
    note: [upper.note, lower.note].filter(Boolean).join("\n\n"),
    examples: [...(upper.examples || []), ...(lower.examples || [])],
  });
}

function Labels({ meaning }) {
  const labels = meaningLabels(meaning);
  if (!labels.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {labels.map((label) => (
        <span
          key={label}
          className="text-[11px] px-1.5 py-0.5 rounded-full"
          style={{ background: C.penPale, color: C.penDark }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export default function MeaningsSection({ item, onPatch, onAddPhraseFromExample }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftGeneral, setDraftGeneral] = useState([]);
  const [draftEditing, setDraftEditing] = useState(null);
  const [merge, setMerge] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [openExampleActions, setOpenExampleActions] = useState(null);
  const [editingExample, setEditingExample] = useState(null);
  const [error, setError] = useState("");

  const meanings = item.meanings || [];

  useEffect(() => {
    if (!openExampleActions || typeof document === "undefined") return undefined;

    function closeOnOutsidePress(event) {
      if (!event.target.closest("[data-example-actions-root]")) setOpenExampleActions(null);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpenExampleActions(null);
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openExampleActions]);

  function startEditing(meaning) {
    setEditingId(meaning.id);
    setEditDraft(newMeaning(meaning));
    setExpandedId(meaning.id);
    setError("");
  }

  async function saveMeaning() {
    try {
      const cleaned = cleanMeanings([editDraft]);
      if (!cleaned.length) throw new Error("A saved meaning needs an English gloss.");
      await onPatch({ meanings: meanings.map((meaning) => meaning.id === editingId ? cleaned[0] : meaning) });
      setEditingId(null);
      setEditDraft(null);
    } catch (problem) {
      setError(problem.message);
    }
  }

  function startOrganizer() {
    setDrafts(cloneMeanings(meanings));
    setDraftNotes(item.notes || "");
    setDraftGeneral((item.myExamples || []).map((example) => ({ ...example })));
    setDraftEditing(null);
    setMerge(null);
    setPendingDelete(null);
    setError("");
    setOrganizing(true);
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    [next[index], next[target]] = [next[target], next[index]];
    setDrafts(next);
    setDraftEditing(target);
  }

  function requestDelete(index) {
    if (meaningHasContext(drafts[index])) setPendingDelete(index);
    else setDrafts(drafts.filter((_, itemIndex) => itemIndex !== index));
  }

  function deleteDraft(index, preserve) {
    const removed = drafts[index];
    if (preserve) {
      if (removed.note.trim()) {
        const cue = removed.usageCue.trim() ? ` (${removed.usageCue.trim()})` : "";
        const preserved = `Meaning note — ${removed.gloss.trim()}${cue}\n${removed.note.trim()}`;
        setDraftNotes([draftNotes.trim(), preserved].filter(Boolean).join("\n\n"));
      }
      if (removed.examples.length) setDraftGeneral([...draftGeneral, ...removed.examples.map((example) => ({ ...example }))]);
    }
    setDrafts(drafts.filter((_, itemIndex) => itemIndex !== index));
    setPendingDelete(null);
    setDraftEditing(null);
  }

  function beginMerge(index) {
    const upper = drafts[index];
    const lower = drafts[index + 1];
    setMerge({
      index,
      draft: mergedMeaning(upper, lower),
      posConflict: Boolean(upper.posOverride && lower.posOverride && upper.posOverride !== lower.posOverride),
    });
  }

  function acceptMerge() {
    try {
      const [cleaned] = cleanMeanings([merge.draft]);
      if (!cleaned) throw new Error("The merged meaning needs an English gloss.");
      const next = [...drafts];
      next.splice(merge.index, 2, cleaned);
      setDrafts(next);
      setDraftEditing(merge.index);
      setMerge(null);
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  }

  async function saveOrganizer() {
    try {
      const cleaned = cleanMeanings(drafts);
      await onPatch({ meanings: cleaned, notes: draftNotes, myExamples: draftGeneral });
      setOrganizing(false);
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  }

  /** Imported senses are appended: an existing meaning is never overwritten or reordered. */
  async function importMeanings(imported) {
    if (!imported.length) return;
    await onPatch({ meanings: [...meanings, ...imported] });
  }

  async function moveExample(fromMeaningId, exampleIndex, targetMeaningId) {
    const next = cloneMeanings(meanings);
    const source = next.find((meaning) => meaning.id === fromMeaningId);
    const [example] = source.examples.splice(exampleIndex, 1);
    if (targetMeaningId === "general") {
      await onPatch({ meanings: next, myExamples: [...(item.myExamples || []), example] });
    } else {
      next.find((meaning) => meaning.id === targetMeaningId).examples.push(example);
      await onPatch({ meanings: next });
    }
  }

  function startExampleEdit(meaningId, exampleIndex, example) {
    setOpenExampleActions(null);
    setEditingExample({
      meaningId,
      exampleIndex,
      es: example.es,
      en: example.en || "",
    });
    setError("");
  }

  async function saveExampleEdit(event) {
    event.preventDefault();
    const es = editingExample?.es.trim();
    if (!es) return;
    const next = cloneMeanings(meanings);
    const meaning = next.find((entry) => entry.id === editingExample.meaningId);
    if (!meaning?.examples?.[editingExample.exampleIndex]) return;
    meaning.examples[editingExample.exampleIndex] = {
      es,
      en: editingExample.en.trim(),
    };
    try {
      await onPatch({ meanings: next });
      setEditingExample(null);
      setError("");
    } catch (problem) {
      setError(problem.message);
    }
  }

  if (organizing) {
    if (merge) {
      return (
        <Card style={{ borderColor: C.pen }}>
          <div className="font-semibold" style={{ fontFamily: SERIF }}>Merge neighboring meanings</div>
          <div className="text-xs mt-1 mb-3" style={{ color: C.mut }}>
            Examples and labels are combined. Edit the result before accepting it.
          </div>
          {merge.posConflict && (
            <div className="text-xs rounded-lg p-2 mb-2" style={{ background: C.penPale, color: C.penDark }}>
              The meanings had different part-of-speech overrides. Check the selected override below.
            </div>
          )}
          <MeaningEditor
            meaning={merge.draft}
            onChange={(draft) => setMerge({ ...merge, draft })}
            initialDetails
          />
          {error && <div className="text-xs mt-2" style={{ color: C.red }}>{error}</div>}
          <div className="flex gap-2 mt-3">
            <Button onClick={acceptMerge}><GitMerge size={14} /> Accept merge</Button>
            <Button tone="quiet" onClick={() => setMerge(null)}>Cancel</Button>
          </div>
        </Card>
      );
    }

    return (
      <Card style={{ borderColor: C.pen }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold" style={{ fontFamily: SERIF }}>Organize meanings</div>
            <div className="text-xs mt-0.5" style={{ color: C.mut }}>Nothing changes until Save.</div>
          </div>
          <ListRestart size={17} style={{ color: C.pen }} />
        </div>

        <div className="mt-3 space-y-2">
          {drafts.map((meaning, index) => (
            <Card key={meaning.id} style={{ background: C.paper }}>
              <div className="flex items-start gap-2">
                <span className="text-xs shrink-0 pt-1" style={{ fontFamily: MONO, color: C.mut }}>{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ fontFamily: SERIF }}>{meaning.gloss || "New meaning"}</div>
                  {meaning.usageCue && <div className="text-xs" style={{ color: C.mut }}>{meaning.usageCue}</div>}
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <button aria-label="Move meaning up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} style={{ color: index === 0 ? C.line : C.mut }} /></button>
                  <button aria-label="Move meaning down" disabled={index === drafts.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} style={{ color: index === drafts.length - 1 ? C.line : C.mut }} /></button>
                  <button aria-label="Edit meaning" onClick={() => setDraftEditing(draftEditing === index ? null : index)}><Pencil size={14} style={{ color: C.mut }} /></button>
                  {index < drafts.length - 1 && <button aria-label="Merge with next meaning" onClick={() => beginMerge(index)}><GitMerge size={14} style={{ color: C.mut }} /></button>}
                  <button aria-label="Delete meaning" onClick={() => requestDelete(index)}><Trash2 size={14} style={{ color: C.red }} /></button>
                </div>
              </div>
              {draftEditing === index && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                  <MeaningEditor
                    meaning={meaning}
                    onChange={(changed) => setDrafts(drafts.map((entry, itemIndex) => itemIndex === index ? changed : entry))}
                    initialDetails
                  />
                </div>
              )}
              {pendingDelete === index && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: C.line }}>
                  <div className="text-xs mb-2" style={{ color: C.red }}>
                    This meaning has a note, labels, a cue or examples. Preserve its note/examples at entry level?
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button tone="quiet" onClick={() => deleteDraft(index, true)}>Preserve context</Button>
                    <Button tone="danger" onClick={() => deleteDraft(index, false)}>Delete everything</Button>
                    <Button tone="quiet" onClick={() => setPendingDelete(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        <Button
          tone="quiet"
          className="mt-2"
          aria-label="Add meaning"
          onClick={() => {
            setDrafts([...drafts, newMeaning()]);
            setDraftEditing(drafts.length);
          }}
        >
          <Plus size={14} /> Meaning
        </Button>
        {error && <div className="text-xs mt-2" style={{ color: C.red }}>{error}</div>}
        <div className="flex gap-2 mt-4 pt-3 border-t" style={{ borderColor: C.line }}>
          <Button onClick={saveOrganizer}>Save organization</Button>
          <Button tone="quiet" onClick={() => setOrganizing(false)}>Cancel</Button>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {meanings.length === 0 && (
        <Card>
          <div className="text-sm italic" style={{ color: C.mut }}>No meanings yet.</div>
        </Card>
      )}

      <div className="space-y-2">
        {meanings.map((meaning, index) => {
          const expanded = expandedId === meaning.id;
          const editing = editingId === meaning.id;
          if (editing) {
            return (
              <Card key={meaning.id} style={{ borderColor: C.pen }}>
                <MeaningEditor meaning={editDraft} onChange={setEditDraft} initialDetails />
                {error && <div className="text-xs mt-2" style={{ color: C.red }}>{error}</div>}
                <div className="flex gap-2 mt-3">
                  <Button onClick={saveMeaning}>Save meaning</Button>
                  <Button tone="quiet" onClick={() => { setEditingId(null); setEditDraft(null); setError(""); }}>Cancel</Button>
                </div>
              </Card>
            );
          }

          return (
            <Card key={meaning.id}>
              <div className="flex items-start gap-2">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpandedId(expanded ? null : meaning.id)}
                  aria-expanded={expanded}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>{index + 1}</span>
                    <span className="font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>{meaning.gloss}</span>
                  </div>
                  {meaning.usageCue && <div className="text-sm ml-5" style={{ color: C.mut }}>{meaning.usageCue}</div>}
                  <div className="ml-5"><Labels meaning={meaning} /></div>
                </button>
                <button aria-label={expanded ? "Collapse meaning" : "Expand meaning"} onClick={() => setExpandedId(expanded ? null : meaning.id)}>
                  {expanded ? <ChevronUp size={15} style={{ color: C.mut }} /> : <ChevronDown size={15} style={{ color: C.mut }} />}
                </button>
              </div>

              {expanded && (
                <div className="mt-3 ml-5 pt-3 border-t space-y-3" style={{ borderColor: C.line }}>
                  {meaning.note && <div className="text-sm whitespace-pre-wrap" style={{ color: C.ink }}>{meaning.note}</div>}
                  {meaning.examples.length > 0 && (
                    <div
                      role="group"
                      aria-label={`Examples for ${meaning.gloss}`}
                      className={`${meaning.note ? "border-t pt-3" : ""} space-y-4`}
                      style={{ borderColor: C.line }}
                    >
                      {meaning.examples.map((example, exampleIndex) => {
                        const actionsId = `${meaning.id}:${exampleIndex}`;
                        const actionsOpen = openExampleActions === actionsId;
                        const popoverId = `meaning-example-actions-${meaning.id}-${exampleIndex}`;
                        const editingThisExample = editingExample?.meaningId === meaning.id
                          && editingExample.exampleIndex === exampleIndex;
                        return (
                          <div key={exampleIndex} className="relative text-sm" data-example-actions-root>
                            {editingThisExample ? (
                              <form
                                aria-label={`Edit example “${example.es}”`}
                                onSubmit={saveExampleEdit}
                                className="space-y-2 rounded-lg border p-2"
                                style={{ borderColor: C.line, background: C.paper }}
                              >
                                <input
                                  autoFocus
                                  aria-label="Example in Spanish"
                                  value={editingExample.es}
                                  onChange={(event) => setEditingExample((current) => ({
                                    ...current,
                                    es: event.target.value,
                                  }))}
                                  className="min-h-11 w-full rounded-lg border px-2 text-sm outline-none"
                                  style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
                                />
                                <input
                                  aria-label="Example in English"
                                  value={editingExample.en}
                                  onChange={(event) => setEditingExample((current) => ({
                                    ...current,
                                    en: event.target.value,
                                  }))}
                                  className="min-h-11 w-full rounded-lg border px-2 text-sm outline-none"
                                  style={{ background: C.card, borderColor: C.line, color: C.ink }}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button type="submit" className="min-h-11" disabled={!editingExample.es.trim()}>
                                    Save example
                                  </Button>
                                  <Button
                                    type="button"
                                    tone="quiet"
                                    className="min-h-11"
                                    aria-label="Cancel example edit"
                                    onClick={() => {
                                      setEditingExample(null);
                                      setError("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-start gap-1">
                                  <div className="min-w-0 flex-1">
                                    <div style={{ fontFamily: SERIF }}>{example.es}</div>
                                    {example.en && <div className="mt-1 text-xs" style={{ color: C.mut }}>{example.en}</div>}
                                  </div>
                                  <div className="flex shrink-0 items-start">
                                    <SpeakButton text={example.es} label={`Play example for ${meaning.gloss}`} />
                                    <button
                                      type="button"
                                      aria-label={`Actions for “${example.es}”`}
                                      aria-haspopup="dialog"
                                      aria-expanded={actionsOpen}
                                      aria-controls={popoverId}
                                      onClick={() => setOpenExampleActions(actionsOpen ? null : actionsId)}
                                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                                      style={{ color: C.pen }}
                                    >
                                      <Ellipsis size={17} />
                                    </button>
                                  </div>
                                </div>

                                {actionsOpen && (
                                  <div
                                    id={popoverId}
                                    role="dialog"
                                    aria-label={`Actions for “${example.es}”`}
                                    className="absolute right-0 z-20 mt-1 w-56 max-w-full rounded-xl border p-1 shadow-lg"
                                    style={{ background: C.card, borderColor: C.line }}
                                  >
                                    <button
                                      type="button"
                                      aria-label={`Edit example “${example.es}”`}
                                      onClick={() => startExampleEdit(meaning.id, exampleIndex, example)}
                                      className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-xs"
                                      style={{ color: C.mut }}
                                    >
                                      <Pencil size={14} className="shrink-0" />
                                      Edit example…
                                    </button>
                                    <div className="border-t" style={{ borderColor: C.line }}>
                                      <div className="flex min-h-11 items-center gap-2 px-2">
                                        <MoveRight size={14} className="shrink-0" style={{ color: C.mut }} />
                                        <select
                                          aria-label={`Move example from ${meaning.gloss}`}
                                          defaultValue=""
                                          onChange={async (event) => {
                                            const targetMeaningId = event.target.value;
                                            if (!targetMeaningId) return;
                                            setOpenExampleActions(null);
                                            await moveExample(meaning.id, exampleIndex, targetMeaningId);
                                          }}
                                          className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none"
                                          style={{ color: C.mut }}
                                        >
                                          <option value="">Move example…</option>
                                          <option value="general">to General</option>
                                          {meanings.filter((entry) => entry.id !== meaning.id).map((entry) => (
                                            <option key={entry.id} value={entry.id}>to {entry.gloss}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="border-t" style={{ borderColor: C.line }}>
                                      <ExamplePhraseAction
                                        example={example}
                                        menu
                                        onAddPhraseFromExample={onAddPhraseFromExample
                                          ? (selectedExample) => {
                                            setOpenExampleActions(null);
                                            onAddPhraseFromExample(selectedExample);
                                          }
                                          : undefined}
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!meaning.note && !meaning.examples.length && <div className="text-xs italic" style={{ color: C.mut }}>No note or examples for this meaning.</div>}
                  <button
                    type="button"
                    aria-label={`Edit meaning ${meaning.gloss}`}
                    onClick={() => startEditing(meaning)}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                  >
                    <Pencil size={15} style={{ color: C.pen }} />
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button tone="quiet" className="mt-2" onClick={startOrganizer}>
          <ListRestart size={14} /> Organize
        </Button>
        <DictMeaningImport item={item} onImport={importMeanings} />
      </div>
    </div>
  );
}
