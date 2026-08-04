import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { C, MONO, SERIF, dotGrid } from "../theme.jsx";
import { linkItems, unlinkItems } from "../db/items.js";
import { logView } from "../db/events.js";
import { resolveLinkedKeys } from "../db/linkedEntries.js";
import { localDate } from "../lib/dates.js";
import { isJournalEntry, sortJournalEntries } from "../lib/journal.js";
import { relatedTo } from "../lib/links.js";
import { emptyItemState } from "../useNotebook.js";
import { EntryLinkCard, ItemLinkCard } from "./LinkCard.jsx";
import JournalLinkPicker from "./JournalLinkPicker.jsx";
import JournalMore from "./JournalMore.jsx";
import { journalDateLabel } from "./JournalHome.jsx";

function momentHeading(entry) {
  if (entry.title?.trim()) return entry.title.trim();
  return entry.body?.split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 64) || "Untitled moment";
}

export default function JournalReader({
  entry,
  state = emptyItemState,
  items,
  onBack,
  backLabel = "Diario",
  onOpen,
  onEdit,
  onStart,
  onChanged,
  now = new Date(),
}) {
  const [pickingVocabulary, setPickingVocabulary] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [dictionaryEntries, setDictionaryEntries] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);
  const related = useMemo(() => relatedTo(entry, items), [entry, items]);
  const vocabulary = useMemo(() => related.filter((item) => item.type === "lexical"), [related]);
  const relatedMoments = useMemo(() => sortJournalEntries(related), [related]);
  const pageRelations = useMemo(
    () => related.filter((item) => item.type === "page" && !isJournalEntry(item)),
    [related]
  );
  const linkedIds = useMemo(
    () => new Set([...related.map((item) => item.id), ...(entry.linkedKeys || [])]),
    [entry.linkedKeys, related]
  );

  useEffect(() => {
    let current = true;
    resolveLinkedKeys(entry).then(({ entries, orphans, rewritten }) => {
      if (!current) return;
      setDictionaryEntries(entries);
      setOrphanKeys(orphans);
      if (rewritten) onChanged();
    });
    return () => {
      current = false;
    };
  }, [entry.id, entry.linkedKeys]);

  useEffect(() => {
    logView(entry.id).then((logged) => {
      if (logged) onChanged();
    });
  }, [entry.id]);

  async function removeLink(key) {
    await unlinkItems(entry.id, key);
    onChanged();
  }

  const hasVocabulary = vocabulary.length > 0 || dictionaryEntries.length > 0;

  return (
    <article className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="mb-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={`Back to ${backLabel}`}
          className="flex min-h-11 items-center gap-1 text-sm"
          style={{ color: C.pen }}
        >
          <ChevronLeft size={16} /> {backLabel}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(entry.id)}
            aria-label="Edit journal entry"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg"
            style={{ color: C.mut }}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowMore((open) => !open)}
            aria-label="More journal tools"
            aria-expanded={showMore}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg"
            style={{ color: C.mut }}
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
      </div>

      <header>
        <div className="text-xs uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
          {journalDateLabel(entry.pageDate, { weekday: "long", month: "long" })}
        </div>
        {entry.title?.trim() ? (
          <h1 className="mt-2 text-3xl font-semibold leading-tight" style={{ color: C.ink, fontFamily: SERIF }}>
            {entry.title.trim()}
          </h1>
        ) : (
          <h1 className="sr-only">Journal entry</h1>
        )}
      </header>

      <div
        className={`mt-6 whitespace-pre-wrap break-words text-[17px] leading-8 ${entry.body?.trim() ? "" : "italic"}`}
        style={{ color: entry.body?.trim() ? C.ink : C.mut, fontFamily: SERIF }}
      >
        {entry.body?.trim() || "This moment is empty."}
      </div>

      {entry.tags?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-full px-2.5 py-1 text-xs" style={{ background: C.penPale, color: C.penDark }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <section aria-label="Journal vocabulary" className="mt-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Words & phrases</h2>
          {!pickingVocabulary && (
            <button type="button" onClick={() => setPickingVocabulary(true)} className="inline-flex min-h-11 items-center gap-1 text-xs" style={{ color: C.pen }}>
              <Plus size={13} /> Add vocabulary
            </button>
          )}
        </div>
        {hasVocabulary ? (
          <div className="space-y-2">
            {vocabulary.map((item) => (
              <ItemLinkCard
                key={item.id}
                item={item}
                attached={Boolean(item.dictKey)}
                onOpen={onOpen}
                onRemove={() => removeLink(item.id)}
              />
            ))}
            {dictionaryEntries.map((dictionaryEntry) => (
              <EntryLinkCard
                key={dictionaryEntry.id}
                entry={dictionaryEntry}
                onOpen={onOpen}
                onRemove={() => removeLink(dictionaryEntry.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: C.mut }}>No vocabulary connected yet.</div>
        )}
        {pickingVocabulary && (
          <JournalLinkPicker
            mode="vocabulary"
            item={entry}
            items={items}
            linkedIds={linkedIds}
            onClose={() => setPickingVocabulary(false)}
            onPick={async (key) => {
              await linkItems(entry.id, key);
              onChanged();
            }}
          />
        )}
      </section>

      <section aria-label="Related journal moments" className="mt-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Related moments</h2>
          <button
            type="button"
            onClick={() => onStart({
              date: localDate(now),
              linkedEntryId: entry.id,
              prompt: {
                id: "reflection",
                es: "Al mirar atrás, ¿qué notas ahora?",
                en: "Looking back, what do you notice now?",
              },
            })}
            className="inline-flex min-h-11 items-center gap-1 text-xs"
            style={{ color: C.pen }}
          >
            <RotateCcw size={13} /> Reflect
          </button>
        </div>
        {relatedMoments.length > 0 ? (
          <div className="space-y-2">
            {relatedMoments.map((moment) => (
              <div key={moment.id} className="rounded-xl border px-3 py-2 flex items-start gap-2" style={{ background: C.card, borderColor: C.line }}>
                <button type="button" onClick={() => onOpen(moment.id)} className="min-w-0 flex-1 text-left">
                  <div className="text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>{journalDateLabel(moment.pageDate)}</div>
                  <div className="mt-0.5 truncate text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>{momentHeading(moment)}</div>
                </button>
                <button type="button" onClick={() => removeLink(moment.id)} aria-label={`Unlink ${momentHeading(moment)}`} className="p-1">
                  <X size={13} style={{ color: C.mut }} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs" style={{ color: C.mut }}>A reflection becomes a separate, linked moment.</div>
        )}
      </section>

      {showMore && (
        <JournalMore
          entry={entry}
          state={state}
          items={items}
          pageRelations={pageRelations}
          linkedIds={linkedIds}
          dictionaryEntries={dictionaryEntries}
          orphanKeys={orphanKeys}
          onOpen={onOpen}
          onChanged={onChanged}
          onBack={onBack}
          onClose={() => setShowMore(false)}
        />
      )}
    </article>
  );
}
