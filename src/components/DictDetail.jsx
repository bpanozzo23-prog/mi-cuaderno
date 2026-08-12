import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, BookMarked, Plus, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { C, SERIF, MONO, dotGrid, SectionTitle, Card, Button } from "../theme.jsx";
import { grammarAbbreviations } from "../lib/partOfSpeech.js";
import { ItemLinkCard } from "./LinkCard.jsx";
import ConjugationNotices from "./ConjugationNotices.jsx";
import {
  getEntryWithConjugation,
  getConjugationPatternFamilies,
  installedMeta,
  exampleAttribution,
} from "../db/ref/entries.js";
import { resolveLinkedKeys } from "../db/linkedEntries.js";
import { createItem, newLexicalFromEntry, displayTitle } from "../db/items.js";
import { logView } from "../db/events.js";
import { groupConnections, normalizeRelationship, relationshipLabel } from "../lib/relationships.js";
import { connectionsFromResolvedEntryLinks } from "../lib/resolvedConnections.js";
import { SLOTS, COLLAPSED_SLOTS, SIMPLE_TENSES, PERFECT_TENSES, tenseHeading } from "../lib/conjugation.js";
import { analyzeConjugationPatterns } from "../lib/conjugationPatterns.js";

/**
 * A dictionary entry. Read-only by definition (§5) — the one action is "add to my
 * cuaderno", which creates a personal item attached to this entry rather than editing it.
 *
 * Conjugation tables are shown ustedes-first with vosotros collapsed (§3), and the perfect
 * tenses are folded away by default: eighteen tenses at once is a wall, and a learner
 * wants the present before the future perfect subjunctive.
 */

const TENSE_GROUPS = [
  { title: "Indicative", tenses: ["Indicative/Present", "Indicative/Preterite", "Indicative/Imperfect", "Indicative/Future", "Indicative/Conditional"] },
  { title: "Subjunctive", tenses: ["Subjunctive/Present", "Subjunctive/Imperfect", "Subjunctive/Imperfect (-se)", "Subjunctive/Future"] },
  { title: "Imperative", tenses: ["Imperative Affirmative/Present", "Imperative Negative/Present"] },
];
const PERFECT_GROUP = { title: "Perfect tenses", tenses: Object.keys(PERFECT_TENSES) };

function DictionaryAliasConflictCard({ item, conflict, onOpen }) {
  return (
    <Card className="mb-3" style={{ borderColor: C.dangerBorder }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>
        Connection needs resolution
      </div>
      <div className="mt-1 text-xs" style={{ color: C.mut }}>
        A dictionary update found different descriptions from {displayTitle(item)}. Both remain
        stored; resolve them from the personal item.
      </div>
      <div className="mt-2 grid min-w-0 gap-2">
        {conflict.candidates.map((candidate) => {
          const relationship = normalizeRelationship(candidate.relationship);
          return (
            <div
              key={candidate.rawKey}
              className="min-w-0 rounded-lg border p-2"
              style={{ background: C.paper, borderColor: C.line }}
            >
              <div className="text-sm font-medium" style={{ color: C.ink }}>
                {relationshipLabel(relationship, "target")}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap break-words text-xs" style={{ color: relationship.note ? C.penDark : C.mut }}>
                {relationship.note || "No shared note"}
              </div>
              <div className="mt-1 break-all text-[10px]" style={{ color: C.mut, fontFamily: MONO }}>
                {candidate.rawKey}
              </div>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        tone="quiet"
        className="mt-3 min-h-11 max-w-full whitespace-normal break-words text-left"
        onClick={() => onOpen(item.id)}
      >
        Open {displayTitle(item)} to resolve
      </Button>
    </Card>
  );
}

function TenseTable({ label, tense, showVosotros }) {
  const slots = SLOTS.filter((s) => showVosotros || !COLLAPSED_SLOTS.has(s));
  const filled = slots.filter((s) => tense[s]);
  if (!filled.length) return null;

  return (
    <div className="mt-2">
      <div className="text-xs font-semibold mb-1" style={{ color: C.mut }}>
        {tenseHeading(label)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {filled.map((slot) => (
          <div key={slot} className="flex items-baseline gap-1.5 text-sm min-w-0">
            <span className="text-xs shrink-0" style={{ color: C.mut, minWidth: 62 }}>
              {slot}
            </span>
            <span className="truncate" style={{ color: C.ink, fontFamily: SERIF }}>
              {tense[slot]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Conjugation({ entry, conjugation, analysis, familyRows, items, previousIds, onOpen }) {
  const [showVosotros, setShowVosotros] = useState(false);
  const [showPerfect, setShowPerfect] = useState(false);

  const groups = useMemo(
    () =>
      [...TENSE_GROUPS, ...(showPerfect ? [PERFECT_GROUP] : [])]
        .map((g) => ({ ...g, tenses: g.tenses.filter((t) => conjugation.tenses[t]) }))
        .filter((g) => g.tenses.length),
    [conjugation, showPerfect]
  );

  return (
    <>
      <SectionTitle>Conjugation</SectionTitle>
      <Card>
        <ConjugationNotices
          key={entry.id}
          entry={entry}
          analysis={analysis}
          familyRows={familyRows}
          items={items}
          previousIds={previousIds}
          onOpen={onOpen}
        />
        <div className="text-xs mb-1" style={{ fontFamily: MONO, color: C.mut }}>
          {conjugation.gerund && `gerundio ${conjugation.gerund}`}
          {conjugation.gerund && conjugation.pastParticiple && " · "}
          {conjugation.pastParticiple && `participio ${conjugation.pastParticiple}`}
        </div>

        {groups.map((group) => (
          <div key={group.title} className="mt-3 first:mt-1">
            <div className="text-xs font-semibold uppercase" style={{ color: C.penDark, letterSpacing: "0.06em" }}>
              {group.title}
            </div>
            {group.tenses.map((label) => (
              <TenseTable key={label} label={label} tense={conjugation.tenses[label]} showVosotros={showVosotros} />
            ))}
          </div>
        ))}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button tone="quiet" onClick={() => setShowPerfect((v) => !v)}>
            {showPerfect ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showPerfect ? "Hide" : "Show"} perfect tenses
          </Button>
          <Button tone="quiet" onClick={() => setShowVosotros((v) => !v)}>
            {showVosotros ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {showVosotros ? "Hide" : "Show"} vosotros
          </Button>
        </div>
      </Card>
    </>
  );
}

export default function DictDetail({
  entryId,
  items,
  onBack,
  backLabel = "Todo el cuaderno",
  onOpen,
  onChanged,
}) {
  const [entry, setEntry] = useState(null);
  const [meta, setMeta] = useState(null);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [patternFamilies, setPatternFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvedPersonalLinks, setResolvedPersonalLinks] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [found, installed] = await Promise.all([getEntryWithConjugation(entryId), installedMeta()]);
      const analysis = found?.conjugation
        ? analyzeConjugationPatterns({ lemma: found.lemma, conjugation: found.conjugation })
        : null;
      const familyRows = analysis?.patternIds.length
        ? await getConjugationPatternFamilies(analysis.patternIds)
        : [];
      if (!alive) return;
      setEntry(found);
      setMeta(installed);
      setPatternAnalysis(analysis);
      setPatternFamilies(familyRows);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [entryId]);

  // A dictionary lookup is a lookup: it feeds the same history and the same session
  // window as opening one of the owner's own words (§7).
  useEffect(() => {
    logView(entryId).then((logged) => {
      if (logged) onChanged?.();
    });
  }, [entryId]);

  // A reversible dictKey attachment says "this is my copy of this dictionary entry"; it is
  // deliberately separate from an ordinary connection. Include an old key when the installed
  // dataset's alias map says it now names this entry.
  const attachments = useMemo(
    () => items.filter((item) =>
      item.dictKey === entryId || meta?.previousIds?.[item.dictKey] === entryId
    ),
    [entryId, items, meta]
  );
  const attachedIds = useMemo(
    () => new Set(attachments.map((item) => item.id)),
    [attachments]
  );

  const subjectKeys = useMemo(
    () => [
      entryId,
      ...Object.entries(meta?.previousIds || {})
        .filter(([, canonicalKey]) => canonicalKey === entryId)
        .map(([oldKey]) => oldKey),
    ],
    [entryId, meta]
  );

  // Run every relevant personal row through the same alias seam as its editable detail screen.
  // Safe aliases rewrite key + annotation atomically; conflicts return read-only candidate data
  // and do not mutate either raw edge.
  useEffect(() => {
    let alive = true;
    const relevantKeys = new Set(subjectKeys);
    const relevantItems = items.filter((item) =>
      (item.linkedKeys || []).some((key) => relevantKeys.has(key))
    );
    if (!meta || !relevantItems.length) {
      setResolvedPersonalLinks([]);
      return () => { alive = false; };
    }

    Promise.all(relevantItems.map(async (item) => ({
      item,
      result: await resolveLinkedKeys(item),
    }))).then((rows) => {
      if (!alive) return;
      const scoped = rows.map(({ item, result }) => ({
        item,
        entryLinks: result.entryLinks.filter((link) => link.canonicalKey === entryId),
        conflicts: result.conflicts.filter((conflict) => conflict.canonicalKey === entryId),
      })).filter((row) => row.entryLinks.length || row.conflicts.length);
      setResolvedPersonalLinks(scoped);
      if (rows.some(({ result }) => result.rewritten)) onChanged?.();
    });
    return () => { alive = false; };
  }, [entryId, items, meta, subjectKeys]);

  const connections = useMemo(
    () => resolvedPersonalLinks.flatMap(({ item, entryLinks }) =>
      connectionsFromResolvedEntryLinks(item, entryLinks, { perspective: "target" })
    ),
    [resolvedPersonalLinks]
  );
  const aliasConflicts = useMemo(
    () => resolvedPersonalLinks.flatMap(({ item, conflicts }) =>
      conflicts.map((conflict) => ({ item, conflict }))
    ),
    [resolvedPersonalLinks]
  );
  const groups = useMemo(() => groupConnections(connections), [connections]);

  async function addToCuaderno() {
    const created = await createItem(newLexicalFromEntry(entry));
    onChanged?.();
    onOpen(created.id);
  }

  if (loading) {
    return (
      <div className="px-4 py-4" style={dotGrid}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> {backLabel}
        </button>
        <div className="py-12 text-center text-sm" style={{ color: C.mut }}>
          Looking that up…
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="px-4 py-4" style={dotGrid}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> {backLabel}
        </button>
        <Card>
          <div className="text-sm" style={{ color: C.ink }}>
            That dictionary entry is not in the installed dataset.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> {backLabel}
      </button>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
              {entry.lemma}
              <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                {grammarAbbreviations(entry.pos, entry.gender)}
              </span>
            </div>
            <div className="mt-1 text-xs inline-flex items-center gap-1.5" style={{ fontFamily: MONO, color: C.mut }}>
              <BookMarked size={12} /> dictionary
              {entry.freqRank && <span>· #{entry.freqRank} most common</span>}
            </div>
          </div>
        </div>

        <div className="mt-3">
          {attachments.length > 0 ? (
            <div className="text-xs" style={{ color: C.mut }}>
              In your cuaderno as{" "}
              {attachments.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <button onClick={() => onOpen(r.id)} className="underline underline-offset-2" style={{ color: C.pen }}>
                    {displayTitle(r)}
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <Button onClick={addToCuaderno}>
              <Plus size={15} /> Add to my cuaderno
            </Button>
          )}
        </div>
      </Card>

      <SectionTitle>Meanings</SectionTitle>
      <Card>
        <ol className="space-y-2">
          {entry.senses.map((sense, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
                {i + 1}.
              </span>
              <span style={{ color: C.ink }}>
                {sense.regionLabels?.map((label) => (
                  <span
                    key={label}
                    className="text-xs px-1.5 py-0.5 rounded mr-1.5 align-middle"
                    style={{ background: C.penPale, color: C.penDark }}
                  >
                    {label}
                  </span>
                ))}
                {sense.labels?.map((label) => (
                  <span key={label} className="text-xs italic mr-1.5" style={{ color: C.mut }}>
                    {label}
                  </span>
                ))}
                {sense.gloss}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {entry.conjugation && (
        <Conjugation
          entry={entry}
          conjugation={entry.conjugation}
          analysis={patternAnalysis}
          familyRows={patternFamilies}
          items={items}
          previousIds={meta?.previousIds || {}}
          onOpen={onOpen}
        />
      )}

      {entry.examples?.length > 0 && (
        <>
          <SectionTitle>Examples</SectionTitle>
          <div className="space-y-2">
            {entry.examples.map((raw, i) => {
              const x = exampleAttribution(raw, meta);
              return (
                <Card key={i}>
                  <div style={{ fontFamily: SERIF, color: C.ink }}>{x.es}</div>
                  <div className="text-sm mt-0.5" style={{ color: C.mut }}>
                    {x.en}
                  </div>
                  {/*
                    Brief §4 requires per-sentence attribution, and both sides of a pair are
                    separate contributions by separate people — so both are credited.
                  */}
                  <div className="mt-1.5 text-[11px] leading-relaxed" style={{ color: C.mut }}>
                    <a
                      href={x.spanish.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                      style={{ color: C.mut }}
                    >
                      {x.spanish.sourceId}
                    </a>
                    {x.spanish.contributor && ` · ${x.spanish.contributor}`}
                    {" · en "}
                    <a
                      href={x.english.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                      style={{ color: C.mut }}
                    >
                      {x.english.sourceId}
                    </a>
                    {x.english.contributor && ` · ${x.english.contributor}`}
                    {x.license && ` · ${x.license}`}
                    <ExternalLink size={9} className="inline ml-1 -mt-0.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {(groups.length > 0 || aliasConflicts.length > 0) && (
        <>
          <SectionTitle>Connections</SectionTitle>
          {aliasConflicts.map(({ item, conflict }) => (
            <DictionaryAliasConflictCard
              key={`${item.id}:${conflict.canonicalKey}`}
              item={item}
              conflict={conflict}
              onOpen={onOpen}
            />
          ))}
          {groups.map((group) => (
            <div key={group.key} className="mb-3">
              <div
                className="text-[11px] uppercase mb-1.5"
                style={{ fontFamily: MONO, color: C.mut, letterSpacing: "0.08em" }}
              >
                {group.label}
              </div>
              <div className="space-y-1.5">
                {group.rows.map((connection) => (
                  <ItemLinkCard
                    key={connection.key}
                    item={connection.item}
                    attached={attachedIds.has(connection.item.id)}
                    connection={connection}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <div className="mt-6 text-xs leading-relaxed" style={{ color: C.mut }}>
        Dictionary entries are read-only. Add this word to your cuaderno to take notes on it.
      </div>
    </div>
  );
}
