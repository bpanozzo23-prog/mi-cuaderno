import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, BookMarked, Plus, ExternalLink, ChevronDown, ChevronRight, Link2, FileText } from "lucide-react";
import { C, SERIF, MONO, dotGrid, SectionTitle, Card, Chip, Button } from "../theme.jsx";
import { POS_LABEL } from "./DictCard.jsx";
import { getEntryWithConjugation, installedMeta, exampleAttribution } from "../db/ref/entries.js";
import { createItem, newLexicalFromEntry, displayTitle } from "../db/items.js";
import { logView } from "../db/events.js";
import { SLOTS, COLLAPSED_SLOTS, SIMPLE_TENSES, PERFECT_TENSES } from "../lib/conjugation.js";

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

/**
 * Tables are keyed "Mood/Tense", so the tense alone is the useful heading under a mood
 * grouping. The imperative is the exception: both its tables are "Present", and what
 * actually distinguishes them lives in the mood — affirmative versus negative.
 */
function tenseHeading(label) {
  const [mood, tense] = label.split("/");
  if (mood.startsWith("Imperative")) return mood.replace("Imperative", "").trim() || tense;
  return tense || label;
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

function Conjugation({ conjugation }) {
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

export default function DictDetail({ entryId, items, onBack, onOpen, onChanged }) {
  const [entry, setEntry] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [found, installed] = await Promise.all([getEntryWithConjugation(entryId), installedMeta()]);
      if (!alive) return;
      setEntry(found);
      setMeta(installed);
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

  // Personal items already attached to this entry, and anything linking to it.
  const related = useMemo(
    () => items.filter((i) => i.dictKey === entryId || i.linkedKeys.includes(entryId)),
    [items, entryId]
  );

  async function addToCuaderno() {
    const created = await createItem(newLexicalFromEntry(entry));
    onChanged?.();
    onOpen(created.id);
  }

  if (loading) {
    return (
      <div className="px-4 py-16 text-center text-sm" style={{ color: C.mut }}>
        Looking that up…
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="px-4 py-4" style={dotGrid}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Todo el cuaderno
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
        <ChevronLeft size={16} /> Todo el cuaderno
      </button>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
              {entry.lemma}
              <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                {POS_LABEL[entry.pos] || entry.pos}
                {entry.gender ? ` ${entry.gender}` : ""}
              </span>
            </div>
            <div className="mt-1 text-xs inline-flex items-center gap-1.5" style={{ fontFamily: MONO, color: C.mut }}>
              <BookMarked size={12} /> dictionary
              {entry.freqRank && <span>· #{entry.freqRank} most common</span>}
            </div>
          </div>
        </div>

        <div className="mt-3">
          {related.length > 0 ? (
            <div className="text-xs" style={{ color: C.mut }}>
              In your cuaderno as{" "}
              {related.map((r, i) => (
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

      {entry.conjugation && <Conjugation conjugation={entry.conjugation} />}

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

      {related.length > 0 && (
        <>
          <SectionTitle>Linked</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => (
              <Chip key={r.id} onClick={() => onOpen(r.id)}>
                {r.type === "page" ? <FileText size={11} /> : <Link2 size={11} />} {displayTitle(r)}
              </Chip>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 text-xs leading-relaxed" style={{ color: C.mut }}>
        Dictionary entries are read-only. Add this word to your cuaderno to take notes on it.
      </div>
    </div>
  );
}
