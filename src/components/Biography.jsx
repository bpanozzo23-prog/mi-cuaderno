import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  BookMarked,
  ChevronLeft,
  FileText,
  Link2,
  MapPin,
  MessageSquareText,
  Route,
} from "lucide-react";
import { C, Card, MONO, SERIF, SectionTitle, dotGrid } from "../theme.jsx";
import { deriveBiographyMilestones } from "../lib/biography.js";
import { getCollectionPlacements } from "../lib/collections.js";
import { normalize } from "../lib/normalize.js";
import { activePageContextsForLexical } from "../lib/pageReferences.js";
import { preparePhraseContainment } from "../lib/phraseContainment.js";
import { prepareProseContainment } from "../lib/proseContainment.js";
import { groupConnections } from "../lib/relationships.js";

const datePart = (at) => String(at || "").slice(0, 10);
const headingForConnection = (row) => row.item?.type === "page"
  ? row.item.title || "Untitled page"
  : row.item?.term || row.entry?.lemma || "Dictionary entry";

function ContextRows({ rows, onOpen, renderHeading, renderMeta, renderSnippet }) {
  return (
    <div className="space-y-1.5">
      {rows.map((row, index) => (
        <button
          type="button"
          key={row.key || `${row.pageId || row.item?.id}:${row.source || row.kind}:${row.label || index}:${index}`}
          onClick={() => onOpen(row.key || row.pageId || row.item?.id)}
          className="min-h-11 w-full rounded-xl border px-3 py-2 text-left"
          style={{ background: C.card, borderColor: C.line }}
        >
          <div className="break-words text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            {renderHeading(row)}
          </div>
          {renderMeta?.(row) && (
            <div className="mt-0.5 break-words text-xs" style={{ color: C.mut }}>
              {renderMeta(row)}
            </div>
          )}
          {renderSnippet?.(row) && (
            <div className="mt-1 break-words text-sm leading-relaxed" style={{ color: C.ink }}>
              {renderSnippet(row)}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function HabitatSection({ title, icon: Icon, children }) {
  return (
    <section>
      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <Icon size={14} aria-hidden="true" /> {title}
        </span>
      </SectionTitle>
      {children}
    </section>
  );
}

function milestoneCopy(milestone) {
  if (milestone.kind === "saved") return "Saved to your cuaderno";
  if (milestone.kind === "first_review") return "First review";
  if (milestone.kind === "box") return `Reached box ${milestone.box}`;
  if (milestone.kind === "retired") return "Retired from review";
  if (milestone.kind === "tricky") {
    return milestone.open ? "Highlighted as tricky" : "A tricky stretch";
  }
  return "Milestone";
}

function Story({ milestones, state, reviewState }) {
  const current = reviewState.graduated
    ? "Retired"
    : reviewState.enrolled
      ? `Box ${reviewState.box}`
      : "Not in review";
  return (
    <>
      <SectionTitle>Learning story</SectionTitle>
      <Card className="p-4">
        <ol className="space-y-3">
          {milestones.map((milestone, index) => (
            <li key={`${milestone.kind}:${milestone.at}:${milestone.box || index}`} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: C.pen }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: C.ink }}>
                  {milestoneCopy(milestone)}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
                  {datePart(milestone.at)}
                  {milestone.kind === "tricky" && milestone.endedAt
                    ? ` → ${datePart(milestone.endedAt)}`
                    : ""}
                  {milestone.kind === "tricky" && milestone.open ? " · still highlighted" : ""}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 border-t pt-3" style={{ borderColor: C.line }}>
          <div className="text-[11px] font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.06em" }}>
            Current state
          </div>
          <div className="mt-1 text-sm font-semibold" style={{ color: C.ink }}>{current}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: C.mut }}>
            {state.tricky && <span>Highlighted as tricky</span>}
            {reviewState.lastReviewedAt && <span>Last reviewed {datePart(reviewState.lastReviewedAt)}</span>}
            {reviewState.enrolled && !reviewState.graduated && reviewState.dueDate && (
              <span>Next due {reviewState.dueDate}</span>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

/** One lexical item's derived history and habitat. This component imports no database writer. */
export default function Biography({
  item,
  items = [],
  events = [],
  state = {},
  reviewState = {},
  connections = [],
  onOpen,
  onClose,
  preparePhrases = preparePhraseContainment,
  prepareProse = prepareProseContainment,
}) {
  const [phrases, setPhrases] = useState([]);
  const [prose, setProse] = useState([]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const milestones = useMemo(
    () => deriveBiographyMilestones(item, events),
    [item, events]
  );
  const collections = useMemo(
    () => getCollectionPlacements(item.id, items),
    [item.id, items]
  );
  const pageContexts = useMemo(
    () => activePageContextsForLexical(item.id, items).filter((context) => context.kind !== "vocabulary"),
    [item.id, items]
  );
  const connectionGroups = useMemo(
    () => groupConnections(connections),
    [connections]
  );

  useEffect(() => {
    let alive = true;
    setPhrases([]);
    preparePhrases(item, items)
      .then((rows) => {
        if (alive) setPhrases(rows);
      })
      .catch(() => {
        if (alive) setPhrases([]);
      });
    return () => {
      alive = false;
    };
  }, [item, items, preparePhrases]);

  useEffect(() => {
    let alive = true;
    setProse([]);
    prepareProse(item, items)
      .then((rows) => {
        if (alive) setProse(rows);
      })
      .catch(() => {
        if (alive) setProse([]);
      });
    return () => {
      alive = false;
    };
  }, [item, items, prepareProse]);

  const prosePages = prose.filter((row) => !row.journal);
  const journal = prose.filter((row) => row.journal);
  const habitatCount = collections.length + pageContexts.length + phrases.length
    + connections.length + prose.length;

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button
        type="button"
        onClick={onClose}
        className="mb-3 flex min-h-11 items-center gap-1 text-sm"
        style={{ color: C.pen }}
      >
        <ChevronLeft size={16} /> {item.term}
      </button>

      <div className="mb-1 text-xs font-semibold uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
        Historia
      </div>
      <h1 className="break-words text-2xl font-bold" style={{ color: C.ink, fontFamily: SERIF }}>
        {item.term}
      </h1>

      <Story milestones={milestones} state={state} reviewState={reviewState} />

      <div className="mt-7 flex items-center gap-2">
        <Route size={17} style={{ color: C.pen }} aria-hidden="true" />
        <h2 className="text-lg font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Habitat</h2>
      </div>

      {collections.length > 0 && (
        <HabitatSection title="Collections" icon={BookMarked}>
          <ContextRows
            rows={collections}
            onOpen={onOpen}
            renderHeading={(row) => row.pageTitle}
            renderMeta={(row) => row.groupName}
          />
        </HabitatSection>
      )}

      {pageContexts.length > 0 && (
        <HabitatSection title="Used in pages" icon={MapPin}>
          <ContextRows
            rows={pageContexts}
            onOpen={onOpen}
            renderHeading={(row) => row.pageTitle}
            renderMeta={(row) => `${row.label}${row.detail ? ` · ${row.detail}` : ""}`}
          />
        </HabitatSection>
      )}

      {phrases.length > 0 && (
        <HabitatSection title="Phrases" icon={MessageSquareText}>
          <ContextRows
            rows={phrases}
            onOpen={onOpen}
            renderHeading={(row) => row.item.type === "lexical" ? row.item.term : ""}
            renderMeta={(row) => normalize(row.surface).trim() !== normalize(row.item.term).trim()
              ? `Matched as ${row.surface}`
              : ""}
          />
        </HabitatSection>
      )}

      {connectionGroups.length > 0 && (
        <HabitatSection title="Connections" icon={Link2}>
          <div className="space-y-3">
            {connectionGroups.map((group) => (
              <div key={group.key}>
                <div className="mb-1 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
                  {group.label}
                </div>
                <ContextRows
                  rows={group.rows}
                  onOpen={onOpen}
                  renderHeading={headingForConnection}
                  renderMeta={(row) => row.note}
                />
              </div>
            ))}
          </div>
        </HabitatSection>
      )}

      {prosePages.length > 0 && (
        <HabitatSection title="In your pages" icon={FileText}>
          <ContextRows
            rows={prosePages}
            onOpen={onOpen}
            renderHeading={(row) => row.page.title || "Untitled page"}
            renderMeta={(row) => row.label}
            renderSnippet={(row) => row.snippet}
          />
        </HabitatSection>
      )}

      {journal.length > 0 && (
        <HabitatSection title="En tu Diario" icon={FileText}>
          <ContextRows
            rows={journal}
            onOpen={onOpen}
            renderHeading={(row) => row.page.title || row.page.pageDate || "Diario entry"}
            renderMeta={(row) => row.page.pageDate}
            renderSnippet={(row) => row.snippet}
          />
        </HabitatSection>
      )}

      {habitatCount === 0 && (
        <Card className="mt-3 text-sm" style={{ color: C.mut }}>
          No other contexts found yet.
        </Card>
      )}
    </div>
  );
}
