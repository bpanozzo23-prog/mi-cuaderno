import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react";
import { C, MONO, SERIF, dotGrid } from "../theme.jsx";
import { linkItems, setLinkRelationship, unlinkItems } from "../db/items.js";
import { logView } from "../db/events.js";
import { mergeLinkedEntryIntoTwin, resolveLinkedKeys } from "../db/linkedEntries.js";
import { installedMeta } from "../db/ref/entries.js";
import { derivePersonalTwinMerges } from "../lib/personalTwins.js";
import { localDate } from "../lib/dates.js";
import TagChip from "./TagChip.jsx";
import { isJournalEntry, sortJournalEntries } from "../lib/journal.js";
import {
  connectionsFor,
  groupConnections,
  relationshipForTarget,
  relationshipLabel,
} from "../lib/relationships.js";
import { connectionsFromResolvedEntryLinks } from "../lib/resolvedConnections.js";
import { emptyItemState } from "../useNotebook.js";
import { EntryLinkCard, ItemLinkCard } from "./LinkCard.jsx";
import JournalLinkPicker from "./JournalLinkPicker.jsx";
import JournalMore from "./JournalMore.jsx";
import DiarioFeedback from "./DiarioFeedback.jsx";
import { aiFeedbackReady } from "../lib/aiPrefs.js";
import { journalDateLabel } from "./JournalHome.jsx";
import MarkdownText from "./MarkdownText.jsx";
import { plainTextFromMarkdown } from "../lib/noteMarkdown.js";

function momentHeading(moment) {
  if (moment.title?.trim()) return moment.title.trim();
  return plainTextFromMarkdown(moment.body).split(/\r?\n/).find((line) => line.trim())?.trim().slice(0, 64)
    || "Untitled moment";
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
  const [aiReady, setAiReady] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [dictionaryEntryLinks, setDictionaryEntryLinks] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);
  const [aliasConflicts, setAliasConflicts] = useState([]);
  const connections = useMemo(
    () => [
      ...connectionsFor(entry, items),
      ...connectionsFromResolvedEntryLinks(entry, dictionaryEntryLinks),
    ],
    [entry, items, dictionaryEntryLinks]
  );
  const orphanConnections = useMemo(
    () => orphanKeys.map((key) => {
      const relationship = relationshipForTarget(entry, key);
      return {
        kind: "orphan",
        key,
        relationship,
        ...relationship,
        label: relationshipLabel(relationship),
      };
    }),
    [entry, orphanKeys]
  );
  const vocabularyConnections = useMemo(
    () => connections.filter((connection) =>
      connection.kind === "entry" || connection.item?.type === "lexical"
    ),
    [connections]
  );
  const relatedMomentConnections = useMemo(() => {
    const candidates = connections.filter((connection) =>
      connection.kind === "item" && isJournalEntry(connection.item)
    );
    const byId = new Map(candidates.map((connection) => [connection.item.id, connection]));
    return sortJournalEntries(candidates.map((connection) => connection.item))
      .map((moment) => byId.get(moment.id));
  }, [connections]);
  const pageConnections = useMemo(
    () => connections.filter((connection) =>
      connection.kind === "item" && connection.item?.type === "page" && !isJournalEntry(connection.item)
    ),
    [connections]
  );
  const dictionaryConnections = useMemo(
    () => [
      ...connections.filter((connection) => connection.kind === "entry"),
      ...orphanConnections,
    ],
    [connections, orphanConnections]
  );
  const vocabularyGroups = useMemo(
    () => groupConnections(vocabularyConnections),
    [vocabularyConnections]
  );
  const momentGroups = useMemo(
    () => groupConnections(relatedMomentConnections),
    [relatedMomentConnections]
  );
  const linkedIds = useMemo(
    () => new Set([
      ...connections.filter((connection) => connection.kind === "item").map((connection) => connection.key),
      ...(entry.linkedKeys || []),
    ]),
    [connections, entry.linkedKeys]
  );

  // The button only exists once the feature is on and a key is present, so it can never be a
  // control whose only outcome is an error.
  useEffect(() => {
    let current = true;
    aiFeedbackReady().then((ready) => {
      if (current) setAiReady(ready);
    });
    return () => {
      current = false;
    };
  }, []);

  // A review belongs to the entry it was asked about; moving to another closes the panel rather
  // than carrying one entry's feedback over the next one's text.
  useEffect(() => {
    setShowFeedback(false);
  }, [entry.id]);

  useEffect(() => {
    let current = true;
    resolveLinkedKeys(entry).then(({ entryLinks, orphans, conflicts, rewritten }) => {
      if (!current) return;
      setDictionaryEntryLinks(entryLinks);
      setOrphanKeys(orphans);
      setAliasConflicts(conflicts);
      if (rewritten) onChanged();
    });
    return () => {
      current = false;
    };
  }, [entry.id, entry.linkedKeys, entry.linkAnnotations]);

  useEffect(() => {
    logView(entry.id).then((logged) => {
      if (logged) onChanged();
    });
  }, [entry.id]);

  async function removeLink(key) {
    await unlinkItems(entry.id, key);
    onChanged();
  }

  async function saveRelationship(key, relationship) {
    await setLinkRelationship(entry.id, key, relationship);
    await onChanged();
  }

  // Personal-twin merge offers for Más's dictionary links; the reader body stays read-only.
  const [dictionaryMeta, setDictionaryMeta] = useState(null);
  useEffect(() => {
    let alive = true;
    installedMeta().then((meta) => {
      if (alive) setDictionaryMeta(meta);
    });
    return () => { alive = false; };
  }, [entry.id]);
  const twinMerges = useMemo(
    () => derivePersonalTwinMerges(entry, dictionaryEntryLinks, items, dictionaryMeta?.previousIds || {}),
    [entry, dictionaryEntryLinks, items, dictionaryMeta]
  );
  async function mergeTwin(canonicalKey, twinId, relationship) {
    const result = await mergeLinkedEntryIntoTwin(entry.id, canonicalKey, twinId, relationship);
    if (result?.merged) await onChanged();
    return result;
  }

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

      {entry.body?.trim() ? (
        <MarkdownText
          blankLines
          className="mt-6 text-[17px] leading-8"
          style={{ color: C.ink, fontFamily: SERIF }}
        >
          {entry.body}
        </MarkdownText>
      ) : (
        <div className="mt-6 text-[17px] italic leading-8" style={{ color: C.mut, fontFamily: SERIF }}>
          This moment is empty.
        </div>
      )}

      {entry.tags?.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <TagChip key={tag} tag={tag} className="px-2.5 py-1" />
          ))}
        </div>
      )}

      {/* A stored review stays readable even when the AI feature is off or the key is gone; only
          the request actions inside the panel need `aiReady`, so the button can never open a
          panel whose only outcome is an error. */}
      {(aiReady || entry.feedback) && (
        <div className="mt-4">
          {!showFeedback && (
            <button
              type="button"
              onClick={() => setShowFeedback(true)}
              aria-expanded={showFeedback}
              className="inline-flex min-h-11 items-center gap-1 text-xs"
              style={{ color: C.pen }}
            >
              <Sparkles size={13} /> Feedback
            </button>
          )}
          {showFeedback && (
            <DiarioFeedback
              key={entry.id}
              entry={entry}
              canAsk={aiReady}
              onChanged={onChanged}
              onClose={() => setShowFeedback(false)}
            />
          )}
        </div>
      )}

      <section aria-label="Journal vocabulary" className="mt-8">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Words & phrases</h2>
          {!pickingVocabulary && (
            <button type="button" aria-label="Add vocabulary" onClick={() => setPickingVocabulary(true)} className="inline-flex min-h-11 items-center gap-1 text-xs" style={{ color: C.pen }}>
              <Plus size={13} /> Vocabulary
            </button>
          )}
        </div>
        {vocabularyGroups.map((group) => (
          <div key={group.key} className="mb-3">
            <div className="mb-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
              {group.label}
            </div>
            <div className="space-y-2">
              {group.rows.map((connection) => connection.kind === "entry" ? (
                <EntryLinkCard
                  key={connection.key}
                  entry={connection.entry}
                  connection={connection}
                  onOpen={onOpen}
                  onSaveRelationship={(relationship) => saveRelationship(connection.key, relationship)}
                  onRemove={() => removeLink(connection.key)}
                />
              ) : (
                <ItemLinkCard
                  key={connection.key}
                  item={connection.item}
                  attached={Boolean(connection.item.dictKey)}
                  connection={connection}
                  onOpen={onOpen}
                  onSaveRelationship={(relationship) => saveRelationship(connection.key, relationship)}
                  onRemove={() => removeLink(connection.key)}
                />
              ))}
            </div>
          </div>
        ))}
        {aliasConflicts.length > 0 && (
          <div className="mb-2 text-xs" style={{ color: C.mut }}>
            {aliasConflicts.length === 1
              ? "1 dictionary connection needs resolution in Más."
              : `${aliasConflicts.length} dictionary connections need resolution in Más.`}
          </div>
        )}
        {vocabularyConnections.length === 0 && aliasConflicts.length === 0 && (
          <div className="text-xs" style={{ color: C.mut }}>No vocabulary connected yet.</div>
        )}
        {pickingVocabulary && (
          <JournalLinkPicker
            mode="vocabulary"
            item={entry}
            items={items}
            linkedIds={linkedIds}
            connections={connections}
            onClose={() => setPickingVocabulary(false)}
            onPick={async (key, relationship) => {
              await linkItems(entry.id, key, relationship);
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
        {relatedMomentConnections.length > 0 ? (
          momentGroups.map((group) => (
            <div key={group.key} className="mb-3">
              <div className="mb-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
                {group.label}
              </div>
              <div className="space-y-2">
                {group.rows.map((connection) => {
                  const heading = momentHeading(connection.item);
                  const date = journalDateLabel(connection.item.pageDate);
                  return (
                    <ItemLinkCard
                      key={connection.key}
                      item={connection.item}
                      connection={connection}
                      onOpen={onOpen}
                      onSaveRelationship={(relationship) => saveRelationship(connection.key, relationship)}
                      onRemove={() => removeLink(connection.key)}
                      displayHeading={heading}
                      displayMeta={date}
                      suppressPreview
                      editLabel={`Edit connection to ${heading} from ${date}`}
                    />
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs" style={{ color: C.mut }}>A reflection becomes a separate, linked moment.</div>
        )}
      </section>

      {showMore && (
        <JournalMore
          entry={entry}
          state={state}
          items={items}
          pageConnections={pageConnections}
          linkedIds={linkedIds}
          connections={connections}
          dictionaryConnections={dictionaryConnections}
          aliasConflicts={aliasConflicts}
          twinMerges={twinMerges}
          onMergeTwin={mergeTwin}
          onOpen={onOpen}
          onChanged={onChanged}
          onBack={onBack}
          onClose={() => setShowMore(false)}
        />
      )}
    </article>
  );
}
