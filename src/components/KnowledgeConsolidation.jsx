import { useEffect, useMemo, useRef, useState } from "react";
import { C, Card, MONO, SectionTitle, SERIF } from "../theme.jsx";
import { normalize } from "../lib/normalize.js";
import {
  preparePhraseContainment,
  preparePhraseContainmentCandidates,
} from "../lib/phraseContainment.js";
import { deriveSimilarMeaningSuggestions } from "../lib/meaningSuggestions.js";

function ContainmentRows({ item, rows, onOpen }) {
  if (!rows.length) return null;
  const wordDetail = item.form === "word";
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold" style={{ color: C.ink }}>
        {wordDetail
          ? `Appears in ${rows.length} of your phrases`
          : "Built on words you know"}
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => {
          const heading = wordDetail ? row.phrase.term : row.word.term;
          const differentSurface = !wordDetail
            && normalize(row.surface).trim() !== normalize(row.word.term).trim();
          return (
            <button
              type="button"
              key={row.item.id}
              onClick={() => onOpen(row.item.id)}
              className="min-h-11 w-full rounded-xl border px-3 py-2 text-left"
              style={{ background: C.card, borderColor: C.line }}
            >
              <span className="break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                {heading}
              </span>
              {differentSurface && (
                <span className="ml-2 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
                  · {row.surface}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CandidateRows({ item, rows, onOpen, onAccept, confirmingId, error }) {
  if (!rows.length) return null;
  const wordDetail = item.form === "word";
  const linkLabel = wordDetail ? "Found in" : "Contains";
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold" style={{ color: C.ink }}>
        {wordDetail ? "Possibly appears in your phrases" : "Possibly built on"}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.item.id}
            className="rounded-xl border p-3"
            style={{ background: C.card, borderColor: C.line }}
          >
            <button
              type="button"
              aria-label={`Open ${row.item.term}`}
              onClick={() => onOpen(row.item.id)}
              className="min-h-11 w-full text-left"
            >
              <div className="break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                {row.item.term}
              </div>
              <div className="mt-0.5 break-words text-xs" style={{ color: C.mut }}>
                Matched as <span style={{ fontFamily: MONO }}>{row.surface}</span>
                {" · also a form of "}
                {row.competingLemmas.join(", ")}
              </div>
            </button>
            <button
              type="button"
              aria-label={`Link ${row.item.term} as ${linkLabel}`}
              disabled={Boolean(confirmingId)}
              onClick={() => onAccept(row.item.id)}
              className="mt-2 min-h-11 w-full rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ background: C.penPale, borderColor: C.pen, color: C.penDark }}
            >
              {confirmingId === row.item.id ? "Linking…" : `Link as ${linkLabel}`}
            </button>
          </div>
        ))}
      </div>
      {error && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{error}</div>}
    </div>
  );
}

function SuggestionRows({ rows, onOpen, onAccept, acceptingId, error }) {
  if (!rows.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold" style={{ color: C.ink }}>You also know…</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.item.id}
            className="rounded-xl border p-3"
            style={{ background: C.card, borderColor: C.line }}
          >
            <button
              type="button"
              aria-label={`Open ${row.item.term}`}
              onClick={() => onOpen(row.item.id)}
              className="min-h-11 w-full text-left"
            >
              <div className="break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                {row.item.term}
              </div>
              <div className="mt-0.5 break-words text-xs" style={{ color: C.mut }}>
                {row.evidence.candidateGloss}
              </div>
              <div className="mt-1 break-words text-xs" style={{ color: C.penDark }}>
                Shared meaning: {row.evidence.sharedTokens.join(", ")}
              </div>
            </button>
            <button
              type="button"
              aria-label={`Link ${row.item.term} as Similar meaning`}
              disabled={Boolean(acceptingId)}
              onClick={() => onAccept(row.item.id, row.evidence)}
              className="mt-2 min-h-11 w-full rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ background: C.penPale, borderColor: C.pen, color: C.penDark }}
            >
              {acceptingId === row.item.id ? "Linking…" : "Link as Similar meaning"}
            </button>
          </div>
        ))}
      </div>
      {error && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{error}</div>}
    </div>
  );
}

/** Render-time consolidation signals. Nothing in this component is connection authority. */
export default function KnowledgeConsolidation({
  item,
  items,
  onOpen,
  onAcceptSimilar,
  onAcceptContainment,
  prepareContainment = preparePhraseContainment,
  prepareCandidates = preparePhraseContainmentCandidates,
}) {
  const [containment, setContainment] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [suggestionError, setSuggestionError] = useState("");
  const [candidateError, setCandidateError] = useState("");
  const suggestions = useMemo(
    () => deriveSimilarMeaningSuggestions(item, items),
    [item, items]
  );

  useEffect(() => {
    let alive = true;
    setContainment([]);
    prepareContainment(item, items)
      .then((rows) => {
        if (alive) setContainment(rows);
      })
      .catch(() => {
        if (alive) setContainment([]);
      });
    return () => {
      alive = false;
    };
  }, [item, items, prepareContainment]);

  // Reset only when the entry itself changes: an items refresh (every onChanged reloads the
  // array) re-derives in place, so a rendered confirm action never unmounts mid-tap.
  const candidateSubject = useRef(null);
  useEffect(() => {
    let alive = true;
    if (candidateSubject.current !== item.id) {
      candidateSubject.current = item.id;
      setCandidates([]);
    }
    prepareCandidates(item, items)
      .then((rows) => {
        if (alive) setCandidates(rows);
      })
      .catch(() => {
        if (alive) setCandidates([]);
      });
    return () => {
      alive = false;
    };
  }, [item, items, prepareCandidates]);

  useEffect(() => {
    setAcceptingId(null);
    setConfirmingId(null);
    setSuggestionError("");
    setCandidateError("");
  }, [item.id]);

  async function acceptSimilar(targetId, evidence) {
    if (!onAcceptSimilar || acceptingId) return;
    setAcceptingId(targetId);
    setSuggestionError("");
    try {
      await onAcceptSimilar(targetId, evidence);
    } catch (caught) {
      setSuggestionError(caught?.message || "Could not create this connection.");
    } finally {
      setAcceptingId(null);
    }
  }

  async function acceptContainment(targetId) {
    if (!onAcceptContainment || confirmingId) return;
    setConfirmingId(targetId);
    setCandidateError("");
    try {
      await onAcceptContainment(targetId);
    } catch (caught) {
      setCandidateError(caught?.message || "Could not create this connection.");
    } finally {
      setConfirmingId(null);
    }
  }

  if (!containment.length && !candidates.length && !suggestions.length) return null;
  return (
    <section aria-label="From your cuaderno">
      <SectionTitle>From your cuaderno</SectionTitle>
      <Card style={{ background: C.paper }}>
        <ContainmentRows item={item} rows={containment} onOpen={onOpen} />
        {containment.length > 0 && candidates.length > 0 && (
          <div className="my-3 border-t" style={{ borderColor: C.line }} />
        )}
        <CandidateRows
          item={item}
          rows={candidates}
          onOpen={onOpen}
          onAccept={acceptContainment}
          confirmingId={confirmingId}
          error={candidateError}
        />
        {(containment.length > 0 || candidates.length > 0) && suggestions.length > 0 && (
          <div className="my-3 border-t" style={{ borderColor: C.line }} />
        )}
        <SuggestionRows
          rows={suggestions}
          onOpen={onOpen}
          onAccept={acceptSimilar}
          acceptingId={acceptingId}
          error={suggestionError}
        />
      </Card>
    </section>
  );
}
