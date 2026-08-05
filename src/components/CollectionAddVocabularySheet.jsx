import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check, Plus, Search, Type, X } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { pickerMatches } from "../lib/links.js";
import { mergeResults } from "../lib/search.js";
import { searchDictionary } from "../db/ref/search.js";
import { installedMeta } from "../db/ref/entries.js";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { meaningGlossText, newMeaning } from "../lib/meanings.js";
import { findPersonalHeadingDuplicates } from "../lib/duplicateGuard.js";
import DuplicateWarning from "./DuplicateWarning.jsx";

const SEARCH_DEBOUNCE_MS = 140;
const LIMIT = 12;

const flatten = (value) => String(value || "").replace(/\s+/g, " ").trim();

function candidateKey(candidate) {
  if (candidate.kind === "personal") return candidate.itemId;
  if (candidate.kind === "dictionary") return candidate.entry.id;
  return candidate.tempId;
}

function candidateLabel(candidate) {
  if (candidate.kind === "personal") return candidate.item.term;
  if (candidate.kind === "dictionary") return candidate.entry.lemma;
  return candidate.term;
}

function ResultRow({ row, assignedTo, selected, onToggle }) {
  const isEntry = row.kind === "entry";
  const item = row.item;
  const heading = isEntry ? row.entry.lemma : item.term;
  const suffix = isEntry ? row.entry.pos : personalHeadingSuffix(item);
  const context = isEntry ? row.entry.senses?.[0]?.gloss : meaningGlossText(item, " · ");
  const disabled = Boolean(assignedTo);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={selected}
      className="w-full rounded-lg px-2 py-2 text-left flex items-start gap-2"
      style={{ background: selected ? C.penPale : C.paper, opacity: disabled ? 0.55 : 1 }}
    >
      {isEntry ? <BookMarked size={14} className="mt-0.5 shrink-0" style={{ color: C.mut }} /> : <Type size={14} className="mt-0.5 shrink-0" style={{ color: C.mut }} />}
      <span className="min-w-0 flex-1">
        <span style={{ fontFamily: SERIF, color: C.ink, fontWeight: 600 }}>{heading}</span>
        {suffix && <span className="ml-1.5 text-xs italic" style={{ color: C.mut }}>{suffix}</span>}
        {context && <span className="block text-xs truncate" style={{ color: C.mut }}>{flatten(context)}</span>}
        {row.reason && <span className="block text-xs italic truncate" style={{ color: C.mut }}>{row.reason}</span>}
        {assignedTo && (
          <span className="block text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
            already in {assignedTo}
          </span>
        )}
      </span>
      {selected && !disabled && <Check size={15} className="shrink-0" style={{ color: C.pen }} />}
    </button>
  );
}

/**
 * Collection-specific multi-select picker. Unlike LinkPicker, every candidate is staged
 * locally and nothing is written until the final Add action succeeds.
 */
export default function CollectionAddVocabularySheet({
  items,
  memberLocations = new Map(),
  targetLabel,
  creationContext = "this collection",
  onCancel,
  onCommit,
}) {
  const [query, setQuery] = useState("");
  const [dictResults, setDictResults] = useState([]);
  const [dictionaryMeta, setDictionaryMeta] = useState(null);
  const [selected, setSelected] = useState(() => new Map());
  const [creating, setCreating] = useState(false);
  const [quick, setQuick] = useState({ term: "", gloss: "", form: "word" });
  const [formTouched, setFormTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const typed = query.trim();
  const lexicalItems = useMemo(() => items.filter((item) => item.type === "lexical"), [items]);

  const personal = useMemo(
    () => pickerMatches(lexicalItems, query, { limit: LIMIT }),
    [lexicalItems, query]
  );

  useEffect(() => {
    let alive = true;
    installedMeta().then((meta) => {
      if (alive) setDictionaryMeta(meta);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      const found = await searchDictionary(query, { limit: LIMIT });
      if (alive) setDictResults(found);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  const rows = useMemo(
    () => mergeResults(personal, dictResults, lexicalItems, {
      previousIds: dictionaryMeta?.previousIds,
    }).slice(0, LIMIT),
    [personal, dictResults, lexicalItems, dictionaryMeta]
  );
  const duplicates = useMemo(
    () => findPersonalHeadingDuplicates(lexicalItems, "lexical", quick.term),
    [lexicalItems, quick.term]
  );

  function toggleRow(row) {
    const candidate = row.kind === "entry"
      ? { kind: "dictionary", entry: row.entry }
      : { kind: "personal", itemId: row.item.id, item: row.item };
    const key = candidateKey(candidate);
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else next.set(key, candidate);
      return next;
    });
  }

  function openQuickCreate() {
    const inferred = typed.includes(" ") ? "phrase" : "word";
    setQuick({ term: typed, gloss: "", form: inferred });
    setFormTouched(false);
    setCreating(true);
  }

  function stageQuickCreate() {
    const term = quick.term.trim();
    if (!term) return;
    const tempId = `new:${crypto.randomUUID()}`;
    const candidate = {
      kind: "new",
      tempId,
      term,
      form: quick.form,
      meanings: quick.gloss.trim() ? [newMeaning({ gloss: quick.gloss.trim() })] : [],
    };
    setSelected((current) => new Map(current).set(tempId, candidate));
    setCreating(false);
    setQuick({ term: "", gloss: "", form: "word" });
  }

  const selectedRows = [...selected.values()];

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold" style={{ color: C.ink }}>Add vocabulary</div>
          <div className="text-xs" style={{ color: C.mut }}>Adding to {targetLabel}</div>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancel adding vocabulary" className="p-1">
          <X size={16} style={{ color: C.mut }} />
        </button>
      </div>

      {selectedRows.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Selected vocabulary">
          {selectedRows.map((candidate) => {
            const key = candidateKey(candidate);
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelected((current) => {
                  const next = new Map(current);
                  next.delete(key);
                  return next;
                })}
                className="max-w-full inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
                style={{ background: C.penPale, borderColor: C.line, color: C.penDark }}
              >
                <span className="truncate">{candidateLabel(candidate)}</span><X size={11} className="shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-lg border px-2 py-2" style={{ borderColor: C.line }}>
        <Search size={14} style={{ color: C.mut }} />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search words, phrases, or the dictionary…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: C.ink }}
        />
      </div>

      <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {rows.map((row) => {
          const key = row.kind === "entry" ? row.entry.id : row.item.id;
          return (
            <ResultRow
              key={key}
              row={row}
              assignedTo={memberLocations.get(key)}
              selected={selected.has(key)}
              onToggle={() => toggleRow(row)}
            />
          );
        })}
        {rows.length === 0 && (
          <div className="py-2 text-xs" style={{ color: C.mut }}>
            {typed ? "Nothing matches that yet." : "Start typing, or choose a recently used entry."}
          </div>
        )}
      </div>

      {typed && !creating && (
        <button
          type="button"
          onClick={openQuickCreate}
          className="mt-2 w-full rounded-lg px-2 py-2 text-left text-sm inline-flex items-center gap-2"
          style={{ background: C.penPale, color: C.penDark }}
        >
          <Plus size={14} /> Create “{typed}” for {creationContext}
        </button>
      )}

      {creating && (
        <div className="mt-3 space-y-2 rounded-lg border p-3" style={{ borderColor: C.line }}>
          <input
            aria-label="New vocabulary term"
            value={quick.term}
            onChange={(event) => {
              const term = event.target.value;
              setQuick((current) => ({
                ...current,
                term,
                form: formTouched ? current.form : term.trim().includes(" ") ? "phrase" : "word",
              }));
            }}
            placeholder="Spanish word or phrase"
            className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={{ background: C.card, borderColor: C.line, color: C.ink }}
          />
          <input
            aria-label="First meaning optional"
            value={quick.gloss}
            onChange={(event) => setQuick((current) => ({ ...current, gloss: event.target.value }))}
            placeholder="First English meaning (optional)"
            className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
            style={{ background: C.card, borderColor: C.line, color: C.ink }}
          />
          <div className="flex rounded-lg border overflow-hidden w-fit" style={{ borderColor: C.line }}>
            {["word", "phrase"].map((form) => (
              <button
                type="button"
                key={form}
                onClick={() => {
                  setFormTouched(true);
                  setQuick((current) => ({ ...current, form }));
                }}
                className="px-3 py-1.5 text-xs"
                style={quick.form === form ? { background: C.pen, color: "#fff" } : { background: C.card, color: C.mut }}
              >
                {form}
              </button>
            ))}
          </div>
          {duplicates.length > 0 && <DuplicateWarning kind="lexical" />}
          <div className="flex gap-2">
            <Button onClick={stageQuickCreate} disabled={!quick.term.trim()}>Add to selection</Button>
            <Button tone="quiet" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: C.line }}>
        <Button
          disabled={selectedRows.length === 0 || saving}
          onClick={async () => {
            setSaving(true);
            setProblem("");
            try {
              await onCommit(selectedRows.map(({ item, tempId, ...candidate }) => candidate));
            } catch (error) {
              setProblem(error instanceof Error ? error.message : "Vocabulary could not be added.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Adding…" : `Add ${selectedRows.length || ""}`.trim()}
        </Button>
        <Button tone="quiet" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
      {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
    </Card>
  );
}
