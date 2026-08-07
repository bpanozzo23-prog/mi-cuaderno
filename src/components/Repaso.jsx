import { useEffect, useMemo, useState } from "react";
import { Highlighter, SearchX, Play, CheckCircle2, Eye, ChevronRight } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, SectionTitle, Card, Button } from "../theme.jsx";
import ItemCard from "./ItemCard.jsx";
import ReviewSession from "./ReviewSession.jsx";
import ConjugationDrill from "./ConjugationDrill.jsx";
import Estadisticas from "./Estadisticas.jsx";
import { EVENT_TYPES } from "../db/events.js";
import { createItem, newLexicalFromEntry } from "../db/items.js";
import {
  dictionaryInstalled,
  getConjugation,
  getEntries,
  isDictKey,
  resolveEntry,
} from "../db/ref/entries.js";
import { emptyItemState } from "../useNotebook.js";
import { timeAgo } from "../lib/dates.js";
import { deriveReviewState, deriveDictSuggestions, cardDirection } from "../lib/review.js";
import { activityByDay, streakFrom, boxDistribution } from "../lib/stats.js";
import { pickCloze, verbForms } from "../lib/cloze.js";
import { buildDrillDeck } from "../lib/drill.js";

/**
 * Every number here is derived from the event log at render time — there are no
 * stored counters (brief section 7). Events belonging to deleted items are
 * excluded from the statistics but kept in the log.
 */
const ACTIVITY_LABEL = {
  [EVENT_TYPES.create]: "Added",
  [EVENT_TYPES.edit]: "Edited",
  [EVENT_TYPES.view]: "Opened",
  [EVENT_TYPES.delete]: "Deleted",
  [EVENT_TYPES.trickyOn]: "Highlighted",
  [EVENT_TYPES.trickyOff]: "Unhighlighted",
  [EVENT_TYPES.reviewPass]: "Reviewed",
  [EVENT_TYPES.reviewFail]: "Missed in review",
};

const KNOWN_ACTIVITY_TYPES = new Set([
  ...Object.keys(ACTIVITY_LABEL),
  EVENT_TYPES.searchMiss,
]);

/** Phase 10a. Labels name the direction in the owner's own terms, not the code's. */
const DIRECTION_OPTIONS = [
  { value: "forward", label: "es→en" },
  { value: "reverse", label: "en→es" },
  { value: "mixed", label: "mixed" },
];

/** Phase 13b. Reveal is first because it is the faster answer, and the older habit. */
const DRILL_MODE_OPTIONS = [
  { value: "reveal", label: "reveal" },
  { value: "typed", label: "type it" },
];

const itemHeading = (item) =>
  item.type === "page" ? item.title || "Untitled page" : item.term;

function Stat({ label, value }) {
  return (
    <Card className="text-center">
      <div className="text-xl font-semibold" style={{ fontFamily: MONO, color: C.ink }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: C.mut }}>
        {label}
      </div>
    </Card>
  );
}

/**
 * One rung of the Leitner ladder (Phase 11). The bar is scaled against the fullest rung
 * rather than against the notebook, so a ladder holding six words is as readable as one
 * holding six hundred — this answers "where is my review weight sitting", not "how much
 * have I done".
 */
function BoxBar({ label, count, max, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.penPale }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${max > 0 ? (count / max) * 100 : 0}%`, background: tone }}
        />
      </div>
      <span className="w-6 shrink-0 text-right text-xs" style={{ fontFamily: MONO, color: C.mut }}>
        {count}
      </span>
    </div>
  );
}

export default function Repaso({ notebook, onSelect }) {
  const { items, events, itemState, reload } = notebook;
  const [inSession, setInSession] = useState(false);

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // The whole Leitner schedule, replayed from the log — the same derive-at-render-time
  // approach as itemState above (brief section 7). Recomputed on every notebook change,
  // so grading a card during a session updates this without any separate bookkeeping.
  const review = useMemo(() => deriveReviewState(items, events), [items, events]);

  // Phase 11. Both replay the same log the schedule above does; neither stores anything.
  const activity = useMemo(() => activityByDay(events), [events]);
  const streak = useMemo(() => streakFrom(activity), [activity]);
  const ladder = useMemo(() => boxDistribution(review.states), [review.states]);
  const ladderMax = useMemo(
    () => Math.max(ladder.graduated, ...ladder.boxes.map((b) => b.count)),
    [ladder]
  );

  // The session owns its own list once started, so re-deriving mid-session (a grade
  // changes what is due) cannot pull the card out from under the owner's thumb.
  const [sessionCards, setSessionCards] = useState([]);

  // Which way today's cards face. Deliberately not persisted (Phase 10a): the useful
  // default is the one you get by just tapping Start, and a remembered direction would
  // be a stored preference nobody asked for.
  const [direction, setDirection] = useState("forward");

  // Starting now reads the reference layer for cloze material, so the tap has to be
  // guarded against a second one landing before the first finishes.
  const [starting, setStarting] = useState(false);

  // The drill is a separate, ungraded pass; it owns its deck the same way a session owns
  // its cards, so nothing re-derives underneath the owner mid-drill.
  const [inDrill, setInDrill] = useState(false);
  const [drillDeck, setDrillDeck] = useState([]);

  // How the drill asks (Phase 13b). Not persisted, for the direction control's reason: the
  // useful default is the one you get by just tapping Drill.
  const [drillMode, setDrillMode] = useState("reveal");

  // The calendar and growth chart are worth an occasional look rather than a daily one, so
  // they swap in over Repaso the same way a session does — no route, tab or back-label.
  const [inStats, setInStats] = useState(false);

  /**
   * Dictionary entries the owner keeps opening but has not added — the counterpart to
   * the queue for words that never made it into the cuaderno (brief section 12). This
   * is the only door: reviewing a dict: key directly is not built (see DECISIONS.md,
   * Phase 3a) because a dataset rebuild can move or drop the key, and the owner's
   * review history should never depend on that surviving.
   *
   * Resolving each suggestion's entry is async (the reference layer lives in
   * IndexedDB), so this loads after the derived counts and quietly renders nothing for
   * a key the installed dataset can no longer resolve — the rail's version of
   * DictAttachment's orphan handling: a suggestion with nothing to act on just doesn't
   * show.
   */
  const dictCandidates = useMemo(() => deriveDictSuggestions(items, events), [items, events]);
  const [dictSuggestions, setDictSuggestions] = useState([]);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!dictCandidates.length) {
      setDictSuggestions([]);
      return;
    }
    getEntries(dictCandidates.map((c) => c.dictKey)).then((entries) => {
      if (!alive) return;
      const byId = new Map(entries.map((e) => [e.id, e]));
      setDictSuggestions(
        dictCandidates.map((c) => ({ ...c, entry: byId.get(c.dictKey) })).filter((c) => c.entry)
      );
    });
    return () => {
      alive = false;
    };
  }, [dictCandidates]);

  async function addSuggestion(suggestion) {
    setAdding(suggestion.dictKey);
    const created = await createItem(newLexicalFromEntry(suggestion.entry));
    setAdding(null);
    reload();
    onSelect(created.id);
  }

  /**
   * The owner's verbs that the installed dictionary can actually conjugate (Phase 10c).
   *
   * Resolution goes through resolveEntry, so a personal item whose dict: key moved in a
   * dataset rebuild keeps its drill instead of silently dropping out (§5). Nothing is
   * written back: a rewrite belongs to the screens that own the attachment, not to a
   * derived list. With no dictionary, a stale key or no conjugable verbs, this stays
   * empty and the drill card simply does not render — the same quiet absence the
   * dictionary suggestions use.
   */
  const attachedKeys = useMemo(
    () =>
      items
        .filter((item) => item.type === "lexical" && item.dictKey)
        .map((item) => ({ itemId: item.id, term: item.term, dictKey: item.dictKey })),
    [items]
  );
  const [drillVerbs, setDrillVerbs] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!attachedKeys.length) {
      setDrillVerbs([]);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        if (!(await dictionaryInstalled())) {
          if (alive) setDrillVerbs([]);
          return;
        }
        const resolved = await Promise.all(
          attachedKeys.map(async (row) => ({ ...row, entry: (await resolveEntry(row.dictKey)).entry }))
        );
        const conjugable = resolved.filter((row) => row.entry?.conjugationId);
        const tables = await Promise.all(
          conjugable.map((row) => getConjugation(row.entry.conjugationId))
        );
        if (!alive) return;
        setDrillVerbs(
          conjugable
            .map((row, index) => ({ itemId: row.itemId, term: row.term, conjugation: tables[index] }))
            .filter((row) => row.conjugation)
        );
      } catch {
        if (alive) setDrillVerbs([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [attachedKeys]);

  function startDrill() {
    setDrillDeck(buildDrillDeck(drillVerbs));
    setInDrill(true);
  }

  const tricky = useMemo(
    () => items.filter((i) => itemState.get(i.id)?.tricky),
    [items, itemState]
  );

  const mostOpened = useMemo(
    () =>
      items
        .map((item) => ({ item, views: itemState.get(item.id)?.views || 0 }))
        .filter((x) => x.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
    [items, itemState]
  );

  const totalOpens = useMemo(
    () => [...itemState.values()].reduce((sum, s) => sum + s.views, 0),
    [itemState]
  );

  const missedSearches = useMemo(() => {
    const seen = new Map();
    for (const event of events) {
      if (event.type !== EVENT_TYPES.searchMiss) continue;
      const query = event.metadata?.query;
      if (!query) continue;
      seen.set(query.toLowerCase(), { query, at: event.at });
    }
    return [...seen.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [events]);

  // Newest first. Unknown future event types are ignored before applying the limit,
  // as brief section 7 requires of every event consumer.
  const recent = useMemo(
    () => [...events].reverse().filter((event) => KNOWN_ACTIVITY_TYPES.has(event.type)).slice(0, 12),
    [events]
  );

  // Dictionary activity is not a missing personal item. Resolve it through the same
  // alias/orphan seam used by attachments and linked entries, but never rewrite an event:
  // the append-only log records the key that was actually opened at the time.
  const recentDictKeys = useMemo(
    () => [...new Set(recent.map((event) => event.itemKey).filter(isDictKey))],
    [recent]
  );
  const [activityEntries, setActivityEntries] = useState(new Map());

  useEffect(() => {
    let alive = true;
    setActivityEntries(new Map(recentDictKeys.map((key) => [key, { state: "loading" }])));

    if (!recentDictKeys.length) return () => {
      alive = false;
    };

    (async () => {
      if (!(await dictionaryInstalled())) {
        if (alive) {
          setActivityEntries(
            new Map(recentDictKeys.map((key) => [key, { state: "not-installed" }]))
          );
        }
        return;
      }

      const resolved = await Promise.all(
        recentDictKeys.map(async (key) => [key, await resolveEntry(key)])
      );
      if (!alive) return;
      setActivityEntries(
        new Map(
          resolved.map(([key, result]) => [
            key,
            result.entry
              ? { state: "resolved", entry: result.entry }
              : { state: "orphaned" },
          ])
        )
      );
    })();

    return () => {
      alive = false;
    };
  }, [recentDictKeys]);

  /**
   * Snapshots the due list, deciding each card's direction and question face once
   * (Phase 10a/10b). Deciding here rather than per render means a mixed session cannot flip
   * a card underneath the owner when the notebook reloads after a grade.
   *
   * Attached dictionary entries are resolved for their stock examples, and verbs for their
   * conjugations, so "Ayer saqué la basura" can be blanked for *sacar*. Every one of those
   * reads is optional: no dictionary, a stale key or a missing table simply means fewer
   * cloze cards, never a session that fails to start. Only forward cards get a cloze — a
   * reverse card asks for the term, and a sentence containing it would give it away.
   */
  async function startSession() {
    if (starting) return;
    setStarting(true);

    const cards = review.due.map((item) => ({
      ...item,
      ...review.states.get(item.id),
      direction: cardDirection(item, direction),
    }));

    let entries = new Map();
    let tables = new Map();
    try {
      const keys = [...new Set(cards.map((card) => card.dictKey).filter(Boolean))];
      if (keys.length) {
        const resolved = await Promise.all(
          keys.map(async (key) => [key, (await resolveEntry(key)).entry])
        );
        entries = new Map(resolved.filter(([, entry]) => entry));

        const conjugationIds = [
          ...new Set(resolved.map(([, entry]) => entry?.conjugationId).filter(Boolean)),
        ];
        const loaded = await Promise.all(conjugationIds.map((id) => getConjugation(id)));
        tables = new Map(conjugationIds.map((id, index) => [id, loaded[index]]).filter(([, table]) => table));
      }
    } catch {
      // The reference layer is optional (§11). A card without its entry is still a card.
    }

    setSessionCards(
      cards.map((card) => {
        if (card.direction === "reverse") return card;
        // The map is keyed by the attachment as stored on the card. resolveEntry may have
        // followed an alias to a differently named canonical entry behind that key.
        const entry = card.dictKey ? entries.get(card.dictKey) || null : null;
        const table = entry?.conjugationId ? tables.get(entry.conjugationId) : null;
        const cloze = pickCloze(card, entry, { forms: table ? verbForms(table) : null });
        return cloze ? { ...card, cloze, face: "cloze" } : card;
      })
    );
    setStarting(false);
    setInSession(true);
  }

  if (inStats) {
    // Nothing to reload on return: this screen only ever read.
    return <Estadisticas items={items} events={events} onBack={() => setInStats(false)} />;
  }

  if (inDrill) {
    // Each persisted answer reloads the app-level notebook snapshot. Repaso can be unmounted
    // through the persistent bottom navigation before Finish is tapped, so waiting until the
    // way out would leave streaks and statistics stale on the next screen.
    return (
      <ConjugationDrill
        deck={drillDeck}
        mode={drillMode}
        onFinish={() => setInDrill(false)}
        onOpen={onSelect}
        onGraded={reload}
      />
    );
  }

  if (inSession) {
    return (
      <ReviewSession
        cards={sessionCards}
        onFinish={() => {
          setInSession(false);
          reload();
        }}
        onOpen={onSelect}
        onGraded={reload}
      />
    );
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <SectionTitle>Para hoy</SectionTitle>
      <Card className="p-4">
        {review.due.length === 0 ? (
          <div className="flex items-start gap-2 text-sm" style={{ color: C.mut }}>
            <CheckCircle2 size={15} style={{ marginTop: 2, color: C.green }} />
            {review.enrolled.length === 0
              ? "Nothing in review yet. Highlighting a word or looking it up a few times puts it here."
              : review.reviewedToday > 0
                ? "Nothing left for today. Come back tomorrow."
                : "Nothing due today."}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-2xl" style={{ fontFamily: MONO, color: C.ink }}>
                  {review.due.length}
                </div>
                <div className="text-xs" style={{ color: C.mut }}>
                  {review.due.length === 1 ? "word due" : "words due"}
                  {review.reviewedToday > 0 && ` · ${review.reviewedToday} done today`}
                </div>
              </div>
              <Button onClick={startSession} disabled={starting}>
                <Play size={15} /> Start
              </Button>
            </div>

            <div
              role="radiogroup"
              aria-label="Which way to ask"
              className="mt-3 flex gap-1 rounded-lg border p-0.5"
              style={{ borderColor: C.line, background: C.paper }}
            >
              {DIRECTION_OPTIONS.map((option) => {
                const active = direction === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDirection(option.value)}
                    className="flex-1 rounded-md px-2 py-1.5 text-xs"
                    style={{
                      fontFamily: MONO,
                      background: active ? C.pen : "transparent",
                      color: active ? "#fff" : C.mut,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {dictSuggestions.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {dictSuggestions.map((s) => (
            <div
              key={s.dictKey}
              className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
              style={{ background: C.card, borderColor: C.line }}
            >
              <div className="min-w-0 flex items-center gap-1.5 text-sm">
                <Eye size={12} style={{ color: C.mut }} className="shrink-0" />
                <span className="truncate" style={{ color: C.ink }}>
                  You keep looking up{" "}
                  <button
                    onClick={() => onSelect(s.dictKey)}
                    style={{ fontFamily: SERIF, fontWeight: 700, color: C.pen }}
                  >
                    {s.entry.lemma}
                  </button>
                </span>
                <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
                  ×{s.views}
                </span>
              </div>
              <button
                onClick={() => addSuggestion(s)}
                disabled={adding === s.dictKey}
                className="text-xs px-2.5 py-1 rounded-full text-white shrink-0"
                style={{ background: C.pen, opacity: adding === s.dictKey ? 0.6 : 1 }}
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {drillVerbs.length > 0 && (
        <>
          <SectionTitle>Conjugations</SectionTitle>
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm" style={{ color: C.ink }}>
                  Practise the six everyday tenses.
                </div>
                <div className="text-xs" style={{ color: C.mut }}>
                  {drillVerbs.length} {drillVerbs.length === 1 ? "verb" : "verbs"}
                </div>
              </div>
              <Button tone="quiet" className="shrink-0" onClick={startDrill}>
                <Play size={15} /> Drill
              </Button>
            </div>

            <div
              role="radiogroup"
              aria-label="How to answer"
              className="mt-3 flex gap-1 rounded-lg border p-0.5"
              style={{ borderColor: C.line, background: C.paper }}
            >
              {DRILL_MODE_OPTIONS.map((option) => {
                const active = drillMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDrillMode(option.value)}
                    className="flex-1 rounded-md px-2 py-1.5 text-xs"
                    style={{
                      fontFamily: MONO,
                      background: active ? C.pen : "transparent",
                      color: active ? "#fff" : C.mut,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Two by two rather than four across: at 375px a fourth column leaves each tile
          too narrow for a four-figure open count to sit under its label. */}
      <div className="grid grid-cols-2 gap-2 mt-6">
        <Stat label="day streak" value={streak} />
        <Stat label="items" value={items.length} />
        <Stat label="opens" value={totalOpens} />
        <Stat label="tricky" value={tricky.length} />
      </div>

      <SectionTitle>Estadísticas</SectionTitle>
      {ladder.tracked > 0 && (
        <Card className="p-4 space-y-2">
          {ladder.boxes.map((b) => (
            <BoxBar key={b.box} label={`Box ${b.box}`} count={b.count} max={ladderMax} tone={C.pen} />
          ))}
          <BoxBar label="Retired" count={ladder.graduated} max={ladderMax} tone={C.green} />
        </Card>
      )}
      <button
        onClick={() => setInStats(true)}
        className="mt-2 w-full min-h-11 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left"
        style={{ background: C.card, borderColor: C.line }}
      >
        <span className="text-sm" style={{ color: C.ink }}>
          Actividad y crecimiento
        </span>
        <ChevronRight size={15} style={{ color: C.mut }} />
      </button>

      <SectionTitle>Highlighted items</SectionTitle>
      {tricky.length === 0 ? (
        <Card>
          <div className="text-sm flex items-start gap-2" style={{ color: C.mut }}>
            <Highlighter size={15} style={{ marginTop: 2 }} />
            Nothing highlighted yet. Use the highlighter on any item you want to revisit.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {tricky.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              items={items}
              state={itemState.get(item.id) || emptyItemState}
              onOpen={onSelect}
            />
          ))}
        </div>
      )}

      <SectionTitle>Most opened</SectionTitle>
      {mostOpened.length === 0 ? (
        <Card>
          <div className="text-sm" style={{ color: C.mut }}>
            Open counts appear as you use the cuaderno.
          </div>
        </Card>
      ) : (
        <div className="rounded-xl border divide-y" style={{ background: C.card, borderColor: C.line }}>
          {mostOpened.map(({ item, views }) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full flex justify-between items-center px-4 py-2.5 text-left gap-3"
            >
              <span className="min-w-0 truncate" style={{ fontFamily: SERIF, fontWeight: 600, color: C.ink }}>
                <Hi on={itemState.get(item.id)?.tricky}>
                  {item.type === "page" ? item.title : item.term}
                </Hi>
              </span>
              <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
                ×{views}
              </span>
            </button>
          ))}
        </div>
      )}

      {missedSearches.length > 0 && (
        <>
          <SectionTitle>Searched for, not found</SectionTitle>
          <Card>
            <div className="flex flex-wrap gap-1.5 items-center">
              <SearchX size={14} style={{ color: C.mut }} />
              {missedSearches.map(({ query }) => (
                <span
                  key={query}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: C.penPale, color: C.penDark }}
                >
                  {query}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      <SectionTitle>Recent activity</SectionTitle>
      <div className="rounded-xl border divide-y" style={{ background: C.card, borderColor: C.line }}>
        {recent.length === 0 && (
          <div className="px-4 py-3 text-sm" style={{ color: C.mut }}>
            No activity yet.
          </div>
        )}
        {recent.map((event) => {
          const item = event.itemKey ? byId.get(event.itemKey) : null;
          const dictionary = isDictKey(event.itemKey)
            ? activityEntries.get(event.itemKey)
            : null;
          const targetKey = item?.id || dictionary?.entry?.id || null;
          const label =
            event.type === EVENT_TYPES.searchMiss ? "Couldn't find" : ACTIVITY_LABEL[event.type];
          const what = event.type === EVENT_TYPES.searchMiss
            ? `“${event.metadata?.query ?? ""}”`
            : item
              ? itemHeading(item)
              : dictionary?.state === "resolved"
                ? dictionary.entry.lemma
                : isDictKey(event.itemKey)
                  ? dictionary?.state === "orphaned"
                    ? "(reference unavailable)"
                    : "(dictionary entry)"
                  : event.type === EVENT_TYPES.delete
                    ? "item"
                    : "(deleted item)";
          const content = (
            <>
              <span style={{ color: C.ink }} className="min-w-0 truncate">
                {label}{" "}
                <span style={{ fontFamily: SERIF, fontWeight: 600 }}>{what}</span>
              </span>
              <span
                className="text-xs shrink-0 inline-flex items-center gap-1"
                style={{ fontFamily: MONO, color: C.mut }}
              >
                {timeAgo(event.at)} {targetKey && <ChevronRight size={13} />}
              </span>
            </>
          );
          return targetKey ? (
            <button
              key={event.id}
              onClick={() => onSelect(targetKey)}
              className="w-full px-4 py-2.5 flex justify-between items-center gap-3 text-sm text-left"
            >
              {content}
            </button>
          ) : (
            <div
              key={event.id}
              className="px-4 py-2.5 flex justify-between items-center gap-3 text-sm"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
