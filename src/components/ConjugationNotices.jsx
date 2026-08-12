import { useMemo, useState } from "react";
import { BookMarked, ChevronDown, ChevronRight } from "lucide-react";
import { C, MONO, SERIF } from "../theme.jsx";
import { buildConjugationTeachingView } from "../lib/conjugationPatterns.js";

const INITIAL_NOTICE_COUNT = 2;
const INITIAL_FAMILY_COUNT = 4;

function EmphasizedForm({ evidence }) {
  const ranges = [...(evidence.emphasis || [])].sort((a, b) => a[0] - b[0]);
  const pieces = [];
  let cursor = 0;

  ranges.forEach(([start, end], index) => {
    if (start > cursor) pieces.push(evidence.form.slice(cursor, start));
    pieces.push(
      <strong
        key={`${start}:${end}:${index}`}
        data-emphasis="true"
        className="font-bold underline decoration-2 underline-offset-2"
        style={{ color: C.penDark, textDecorationColor: C.pen }}
      >
        {evidence.form.slice(start, end)}
      </strong>
    );
    cursor = Math.max(cursor, end);
  });
  if (cursor < evidence.form.length) pieces.push(evidence.form.slice(cursor));

  return <span style={{ fontFamily: SERIF, color: C.ink }}>{pieces}</span>;
}

function EvidenceStrip({ rows }) {
  return (
    <div className="mt-2 flex flex-wrap items-stretch gap-1.5" aria-label="Pattern examples">
      {rows.map((row, index) => (
        <div
          key={`${row.source}:${row.tense || "principal"}:${row.slot || row.label}:${index}`}
          className="min-w-0 rounded-lg border px-2 py-1.5"
          style={{ background: C.paper, borderColor: C.line }}
        >
          <span className="mr-1.5 text-[10px]" style={{ color: C.mut, fontFamily: MONO }}>
            {row.label}
          </span>
          <EmphasizedForm evidence={row} />
        </div>
      ))}
    </div>
  );
}

function FamilyMembers({ notice, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  if (!notice.members.length) return null;

  const visible = expanded ? notice.members : notice.members.slice(0, INITIAL_FAMILY_COUNT);
  const expandable = notice.members.length > INITIAL_FAMILY_COUNT;
  const regionId = `conjugation-family-${notice.id.replace(/[^a-z0-9]+/gi, "-")}`;

  return (
    <div className="mt-3">
      <div className="text-[11px] font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.06em" }}>
        Shares this pattern
      </div>
      <div id={regionId} className="mt-1.5 flex flex-wrap gap-1.5">
        {visible.map(({ entry, familiar }) => (
          <button
            key={entry.id}
            type="button"
            className="conjugation-family-member min-h-11 max-w-full rounded-lg border px-3 py-2 text-left text-sm leading-tight break-words"
            style={{ background: C.card, borderColor: familiar ? C.pen : C.chipBorder, color: C.ink }}
            onClick={() => onOpen(entry.id)}
          >
            <span style={{ fontFamily: SERIF }}>{entry.lemma}</span>
            {familiar && (
              <span
                className="ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 align-middle text-[10px]"
                style={{ background: C.greenPale, color: C.green, fontFamily: MONO }}
              >
                <BookMarked size={10} aria-hidden="true" /> In your cuaderno
              </span>
            )}
          </button>
        ))}
      </div>
      {expandable && (
        <button
          type="button"
          className="mt-1.5 inline-flex min-h-11 items-center gap-1 text-xs"
          style={{ color: C.pen }}
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? "Show fewer" : "Show more"}
        </button>
      )}
      {expanded && notice.remainderCount > 0 && (
        <div className="mt-1 text-xs" style={{ color: C.mut }}>
          {notice.remainderCount} more {notice.remainderCount === 1 ? "verb" : "verbs"} in this family.
        </div>
      )}
    </div>
  );
}

function Notice({ notice, onOpen }) {
  return (
    <article className="rounded-xl border p-3" style={{ background: C.hiPale, borderColor: C.hiBorder }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>
        {notice.title}
      </div>
      <div className="mt-0.5 text-xs leading-relaxed" style={{ color: C.mut }}>
        {notice.explanation}
      </div>
      <EvidenceStrip rows={notice.evidence} />
      <FamilyMembers notice={notice} onOpen={onOpen} />
    </article>
  );
}

export default function ConjugationNotices({
  entry,
  analysis,
  familyRows,
  items,
  previousIds,
  onOpen,
}) {
  const [showAll, setShowAll] = useState(false);
  const teaching = useMemo(
    () => buildConjugationTeachingView({
      analysis,
      familyRows,
      currentEntry: entry,
      items,
      previousIds,
    }),
    [analysis, entry, familyRows, items, previousIds]
  );

  if (!teaching.regular && !teaching.notices.length) return null;
  const visibleNotices = showAll ? teaching.notices : teaching.notices.slice(0, INITIAL_NOTICE_COUNT);
  const hiddenCount = teaching.notices.length - INITIAL_NOTICE_COUNT;

  return (
    <div className="mb-3 border-b pb-3" style={{ borderColor: C.line }}>
      <div className="mb-2 text-xs font-semibold uppercase" style={{ color: C.penDark, letterSpacing: "0.06em" }}>
        What to notice
      </div>
      {teaching.regular ? (
        <div className="rounded-lg px-2.5 py-2 text-sm" style={{ background: C.paper, color: C.mut }}>
          Regular <span style={{ fontFamily: MONO }}>-{teaching.regular.class}</span> pattern; follows{" "}
          <em style={{ fontFamily: SERIF }}>{teaching.regular.anchor}</em>.
        </div>
      ) : (
        <div className="space-y-2">
          {visibleNotices.map((notice) => (
            <Notice key={notice.id} notice={notice} onOpen={onOpen} />
          ))}
        </div>
      )}
      {!teaching.regular && hiddenCount > 0 && (
        <button
          type="button"
          className="mt-1.5 inline-flex min-h-11 items-center gap-1 text-xs"
          style={{ color: C.pen }}
          aria-expanded={showAll}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {showAll ? "Show fewer notices" : `Show ${hiddenCount} more ${hiddenCount === 1 ? "notice" : "notices"}`}
        </button>
      )}
    </div>
  );
}
