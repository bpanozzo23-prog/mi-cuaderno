import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  Link2,
  Route,
  Shuffle,
} from "lucide-react";
import { C, Card, MONO, SERIF, SectionTitle, dotGrid } from "../theme.jsx";
import {
  getConjugationPatternFamilies,
  getConjugations,
  installedMeta,
  isDictKey,
  resolveEntry,
} from "../db/ref/entries.js";
import { firstMeaningGloss } from "../lib/meanings.js";
import { prepareProseContainment } from "../lib/proseContainment.js";
import { deriveWanderConnections, sampleWanderNext } from "../lib/wander.js";
import { prepareSavedConjugationFamily } from "../lib/wordFamilies.js";
import ConjugationFamilyRows from "./ConjugationFamilyRows.jsx";

const headingFor = (item) => item?.type === "page"
  ? item.title || "Untitled page"
  : item?.term || "Untitled entry";

function ConnectionRow({ row, onHop, onOpen }) {
  const dictionaryExit = row.kind === "entry";
  const target = dictionaryExit ? row.entry : row.item;
  return (
    <button
      type="button"
      onClick={() => dictionaryExit ? onOpen(row.key) : onHop(row.key)}
      className="min-h-11 w-full rounded-xl border px-3 py-2 text-left"
      style={{ background: C.card, borderColor: C.line }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            {dictionaryExit ? target?.lemma : headingFor(target)}
          </div>
          <div className="mt-0.5 break-words text-xs" style={{ color: C.mut }}>
            {row.label}{row.note ? ` · ${row.note}` : ""}
          </div>
        </div>
        {dictionaryExit ? (
          <ExternalLink size={15} className="mt-0.5 shrink-0" style={{ color: C.pen }} aria-label="Dictionary exit" />
        ) : (
          <ArrowRight size={15} className="mt-0.5 shrink-0" style={{ color: C.mut }} aria-hidden="true" />
        )}
      </div>
    </button>
  );
}

/** One transient neighborhood. Every action either hops or leaves; none writes here. */
export default function Wander({
  item,
  items = [],
  onHop,
  onOpen,
  onBack,
  backLabel = "Todo el cuaderno",
  resolveReference = resolveEntry,
  loadConjugations = getConjugations,
  loadFamilies = getConjugationPatternFamilies,
  loadMeta = installedMeta,
  prepareJournal = prepareProseContainment,
  random = Math.random,
}) {
  const [resolvedEntries, setResolvedEntries] = useState([]);
  const [family, setFamily] = useState(null);
  const [journalCount, setJournalCount] = useState(0);
  const isLexical = item?.type === "lexical";

  useEffect(() => {
    let alive = true;
    const rawKeys = (item?.linkedKeys || []).filter(isDictKey);
    setResolvedEntries([]);
    if (!rawKeys.length) return () => {
      alive = false;
    };
    Promise.all(rawKeys.map(async (rawKey) => ({ rawKey, ...(await resolveReference(rawKey)) })))
      .then((rows) => {
        if (alive) setResolvedEntries(rows.filter((row) => row.entry));
      })
      .catch(() => {
        if (alive) setResolvedEntries([]);
      });
    return () => {
      alive = false;
    };
  }, [item?.id, item?.linkedKeys, item?.linkAnnotations, resolveReference]);

  useEffect(() => {
    let alive = true;
    setFamily(null);
    if (!isLexical || !item.dictKey) return () => {
      alive = false;
    };

    prepareSavedConjugationFamily(item, items, {
      resolveReference,
      loadConjugations,
      loadFamilies,
      loadMeta,
    }).then((result) => {
      if (alive) setFamily(result);
    }).catch(() => {
      if (alive) setFamily(null);
    });
    return () => {
      alive = false;
    };
  }, [isLexical, item, items, resolveReference, loadConjugations, loadFamilies, loadMeta]);

  useEffect(() => {
    let alive = true;
    setJournalCount(0);
    if (!isLexical) return () => {
      alive = false;
    };
    prepareJournal(item, items, { sources: ["journal"] })
      .then((rows) => {
        if (alive) setJournalCount(rows.filter((row) => row.journal).length);
      })
      .catch(() => {
        if (alive) setJournalCount(0);
      });
    return () => {
      alive = false;
    };
  }, [isLexical, item, items, prepareJournal]);

  const connections = useMemo(
    () => deriveWanderConnections(item, items, resolvedEntries),
    [item, items, resolvedEntries]
  );
  const gloss = isLexical ? firstMeaningGloss(item) : "";
  const canJumpRandom = items.some(
    (candidate) => candidate?.type === "lexical" && candidate.id !== item?.id
  );

  function jumpRandom() {
    const next = sampleWanderNext(items, item?.id, random);
    if (next) onHop(next.id);
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex min-h-11 items-center gap-1 text-sm"
        style={{ color: C.pen }}
      >
        <ChevronLeft size={16} /> {backLabel}
      </button>

      <div className="mb-3 flex items-center gap-2">
        <Route size={17} style={{ color: C.pen }} aria-hidden="true" />
        <div>
          <div className="text-[11px] font-semibold uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
            Paseo por tu cuaderno
          </div>
          <div className="text-xs" style={{ color: C.mut }}>One nearby thread at a time.</div>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-2xl font-bold break-words" style={{ color: C.ink, fontFamily: SERIF }}>
          {headingFor(item)}
        </div>
        {gloss && <div className="mt-1 text-sm break-words" style={{ color: C.mut }}>{gloss}</div>}
      </Card>

      {canJumpRandom && (
        <button
          type="button"
          onClick={jumpRandom}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold active:opacity-80"
          style={{
            background: C.roleSourcePale,
            borderColor: C.pageFolderSourceLine,
            color: C.roleSourceInk,
          }}
        >
          <Shuffle size={16} aria-hidden="true" /> Otra al azar
        </button>
      )}

      <SectionTitle>
        <span className="inline-flex items-center gap-1.5"><Link2 size={14} /> Connections</span>
      </SectionTitle>
      {connections.length > 0 ? (
        <div className="space-y-1.5">
          {connections.map((row) => (
            <ConnectionRow key={`${row.kind}:${row.key}`} row={row} onHop={onHop} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div className="text-sm" style={{ color: C.mut }}>No typed connections from here yet.</div>
      )}

      {isLexical && family && (
        <section aria-label="Conjugation family">
          <SectionTitle>Conjugation family</SectionTitle>
          <ConjugationFamilyRows
            family={family}
            onOpenSibling={onHop}
            onOpenDictionary={onOpen}
          />
        </section>
      )}

      {isLexical && journalCount > 0 && (
        <div className="mt-5">
          <span
            className="inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium"
            style={{ background: C.paper, borderColor: C.chipBorder, color: C.mut }}
          >
            En tu Diario · {journalCount}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"
        style={{ background: C.card, borderColor: C.pen, color: C.penDark }}
      >
        Open full entry <ExternalLink size={15} />
      </button>
    </div>
  );
}
