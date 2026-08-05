import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Play, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button, C, Chip, MONO, SERIF } from "../theme.jsx";
import AddSheet from "./AddSheet.jsx";
import LexicalHubCard from "./LexicalHubCard.jsx";
import PracticeSession from "./PracticeSession.jsx";
import PracticeSetupSheet from "./PracticeSetupSheet.jsx";
import SearchBar from "./SearchBar.jsx";
import { emptyItemState } from "../useNotebook.js";
import { searchItems } from "../lib/search.js";
import { deriveReviewState, emptyReviewState } from "../lib/review.js";
import { FILTERS, matchesTypeFilter } from "../lib/filters.js";
import {
  BROWSE_ORDERS,
  MAINTENANCE_VIEWS,
  maintenanceItems,
  orderItems,
  tagCountsIn,
} from "../lib/organization.js";
import {
  groupByInitial,
  LEXICAL_CONTEXTS,
  LEXICAL_LEARNING,
  matchesContextFilter,
  matchesLearningFilter,
  pageContextIndex,
} from "../lib/lexicalViews.js";
import { buildPracticeDeck, isPracticeEligible } from "../lib/practice.js";

/**
 * The Words & phrases hub (Phase 8) — the lexical twin of the Pages hub.
 *
 * Everything it organizes by is derived at render from the notebook and the event log. The hub's
 * free-practice session is also transient: it snapshots the currently filtered personal entries
 * and never writes the scheduled-review events that remain exclusive to Repaso (§12).
 */

const FORM_OPTIONS = [
  { value: FILTERS.all, label: "All" },
  { value: FILTERS.word, label: "Words" },
  { value: FILTERS.phrase, label: "Phrases" },
];

/** `vocabulary` is the derived context kind; "Collection" is what the owner calls it. */
const CONTEXT_OPTIONS = [
  { value: LEXICAL_CONTEXTS.anywhere, label: "Anywhere" },
  { value: LEXICAL_CONTEXTS.vocabulary, label: "In a Collection" },
  { value: LEXICAL_CONTEXTS.source, label: "From a Source" },
  { value: LEXICAL_CONTEXTS.grammar, label: "In a Grammar guide" },
  { value: LEXICAL_CONTEXTS.none, label: "Not in any page yet" },
];

const LEARNING_OPTIONS = [
  { value: LEXICAL_LEARNING.any, label: "Any" },
  { value: LEXICAL_LEARNING.tricky, label: "Highlighted" },
  { value: LEXICAL_LEARNING.reviewing, label: "In review" },
  { value: LEXICAL_LEARNING.due, label: "Due today" },
  { value: LEXICAL_LEARNING.graduated, label: "Retired" },
];

const VIEW_OPTIONS = [
  { value: MAINTENANCE_VIEWS.all, label: "All items" },
  { value: MAINTENANCE_VIEWS.missingMeaning, label: "Missing meaning" },
  { value: MAINTENANCE_VIEWS.missingExamples, label: "Missing examples" },
  { value: MAINTENANCE_VIEWS.unlinked, label: "No connections" },
];

const BROWSE_OPTIONS = [
  { value: BROWSE_ORDERS.touched, label: "Recently touched" },
  { value: BROWSE_ORDERS.added, label: "Recently added" },
  { value: BROWSE_ORDERS.alphabetical, label: "A–Z" },
];

const controlStyle = { background: C.card, borderColor: C.line, color: C.ink };

function HubSectionHeading({ children, count }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold" style={{ color: C.ink }}>
        {children}
      </h2>
      <span className="shrink-0 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
        {count}
      </span>
    </div>
  );
}

const NO_REVIEW = { states: new Map(), due: [], enrolled: [], reviewedToday: 0, today: null };

export default function LexicalHub({
  notebook,
  active = true,
  formRequest = null,
  pinnedLexicalIds = [],
  onLexicalPinnedChange,
  onSelect,
  onBack,
  onSearchDictionary,
}) {
  const { items, itemState, events, reload } = notebook;
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [formFilter, setFormFilter] = useState(FILTERS.all);
  const [contextFilter, setContextFilter] = useState(LEXICAL_CONTEXTS.anywhere);
  const [learningFilter, setLearningFilter] = useState(LEXICAL_LEARNING.any);
  const [maintenanceView, setMaintenanceView] = useState(MAINTENANCE_VIEWS.all);
  const [browseOrder, setBrowseOrder] = useState(BROWSE_ORDERS.touched);
  const [tagFilter, setTagFilter] = useState(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [practiceSetupOpen, setPracticeSetupOpen] = useState(false);
  const [practiceCards, setPracticeCards] = useState(null);

  // The chip the owner tapped in Cuaderno arrives as a fresh request object each time, so tapping
  // "frases" twice still selects Phrases even after they changed the chip inside the hub.
  useEffect(() => {
    if (formRequest?.form) setFormFilter(formRequest.form);
  }, [formRequest]);

  const searching = query.trim() !== "";
  const lexical = useMemo(() => items.filter((item) => item.type === "lexical"), [items]);

  // Both scan the whole notebook, so they run once per notebook change rather than once per
  // filtered item. The hub stays mounted while the trail is elsewhere — that is what preserves
  // its visit-local controls — so `active` keeps the cost off every unrelated notebook change.
  const contextIndex = useMemo(() => active ? pageContextIndex(items) : new Map(), [active, items]);
  const review = useMemo(
    () => active ? deriveReviewState(items, events) : NO_REVIEW,
    [active, items, events]
  );

  const reviewFor = (item) => review.states.get(item.id) || emptyReviewState;
  const contextsFor = (item) => contextIndex.get(item.id) || [];

  // Maintenance must see the COMPLETE notebook before the type narrowing: a word with no meaning
  // is still unlinked only if no page anywhere points at it (src/lib/organization.js).
  const viewedItems = useMemo(
    () => maintenanceItems(items, maintenanceView).filter((item) => item.type === "lexical"),
    [items, maintenanceView]
  );

  const formItems = useMemo(
    () => viewedItems.filter((item) => matchesTypeFilter(item, formFilter)),
    [formFilter, viewedItems]
  );

  const lensedItems = useMemo(
    () => formItems.filter(
      (item) => matchesContextFilter(contextIndex.get(item.id) || [], contextFilter)
        && matchesLearningFilter(review.states.get(item.id), learningFilter)
    ),
    [contextFilter, contextIndex, formItems, learningFilter, review]
  );

  // Tag choices describe the lens, not the already-selected tag, so the picker stays useful.
  const tagCounts = useMemo(() => tagCountsIn(lensedItems), [lensedItems]);
  const tagAvailable = tagFilter && tagCounts.some(({ tag }) => tag === tagFilter);
  const effectiveTag = tagAvailable ? tagFilter : null;

  useEffect(() => {
    if (tagFilter && !tagAvailable) setTagFilter(null);
  }, [tagAvailable, tagFilter]);

  const filtered = useMemo(
    () => effectiveTag ? lensedItems.filter((item) => item.tags.includes(effectiveTag)) : lensedItems,
    [effectiveTag, lensedItems]
  );

  // Personal vocabulary only. The dictionary stays behind Cuaderno's one mixed list (§8); an
  // empty result here hands the query over rather than quietly widening the hub's scope.
  const searchResults = useMemo(
    () => searching ? searchItems(filtered, query, { allItems: items }) : [],
    [filtered, items, query, searching]
  );

  const ordered = useMemo(
    () => searching ? [] : orderItems(filtered, browseOrder),
    [browseOrder, filtered, searching]
  );
  const pinnedIds = useMemo(() => new Set(pinnedLexicalIds), [pinnedLexicalIds]);
  const pinnedItems = ordered.filter((item) => pinnedIds.has(item.id));
  const otherItems = ordered.filter((item) => !pinnedIds.has(item.id));
  // This is the order the owner can actually see: pins lead while browsing and relevance leads
  // while searching. The preflight may preserve it or deliberately shuffle it.
  const practiceSource = searching
    ? searchResults.map(({ item }) => item)
    : [...pinnedItems, ...otherItems];
  const practiceEligibleCount = practiceSource.filter(isPracticeEligible).length;
  const practiceOmittedCount = practiceSource.length - practiceEligibleCount;
  const indexed = browseOrder === BROWSE_ORDERS.alphabetical;
  const letterGroups = useMemo(
    () => indexed ? groupByInitial(otherItems) : [],
    [indexed, otherItems]
  );

  const refineCount = Number(contextFilter !== LEXICAL_CONTEXTS.anywhere)
    + Number(learningFilter !== LEXICAL_LEARNING.any)
    + Number(maintenanceView !== MAINTENANCE_VIEWS.all)
    + Number(browseOrder !== BROWSE_ORDERS.touched)
    + Number(Boolean(effectiveTag));

  function toggleSearch() {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    if (query) setQuery("");
    else setSearchOpen(false);
  }

  function startPractice(options) {
    const deck = buildPracticeDeck(practiceSource, options);
    if (deck.length === 0) return;
    setPracticeCards(deck);
    setPracticeSetupOpen(false);
  }

  const renderCard = (item, reason = null) => (
    <LexicalHubCard
      key={item.id}
      item={item}
      state={itemState.get(item.id) || emptyItemState}
      review={reviewFor(item)}
      contexts={contextsFor(item)}
      pinned={pinnedIds.has(item.id)}
      reason={reason}
      onOpen={onSelect}
      onPinnedChange={onLexicalPinnedChange}
    />
  );

  if (practiceCards) {
    return (
      <PracticeSession
        cards={practiceCards}
        onFinish={() => setPracticeCards(null)}
        onOpen={onSelect}
      />
    );
  }

  return (
    <>
      <header
        className="sticky top-0 z-20 border-b px-3 py-3"
        style={{ background: C.card, borderColor: C.line }}
      >
        <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-self-start text-sm"
            style={{ color: C.pen }}
          >
            <ChevronLeft size={18} /> Cuaderno
          </button>
          <div className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
            Words &amp; phrases
          </div>
          <button
            type="button"
            aria-label="Add word or phrase"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center justify-self-end rounded-lg"
            style={{ color: C.ink }}
          >
            <Plus size={21} />
          </button>
        </div>
      </header>

      <main className="px-4 pb-28 pt-7" style={{ background: C.paper }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className="text-[11px] uppercase"
              style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.14em" }}
            >
              One vocabulary · many contexts
            </div>
            <h1 className="mt-2 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
              Your words and phrases
            </h1>
          </div>
          <button
            type="button"
            aria-label={searchOpen ? (query ? "Clear vocabulary search" : "Close vocabulary search") : "Search words and phrases"}
            aria-pressed={searchOpen}
            onClick={toggleSearch}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
            style={{ color: searchOpen ? C.pen : C.mut }}
          >
            <Search size={20} />
          </button>
        </div>
        <p className="mt-3 max-w-sm text-base leading-relaxed" style={{ color: C.mut }}>
          Everything you have collected, and where each one lives.
        </p>

        {searchOpen && (
          <div className="mt-4">
            <SearchBar
              value={query}
              onChange={setQuery}
              resultCount={searchResults.length}
              logMisses={false}
              placeholder="Search your words, meanings and examples…"
              inputLabel="Search words and phrases"
              autoFocus
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Vocabulary forms">
          {FORM_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={formFilter === option.value}
              onClick={() => setFormFilter(option.value)}
              className="min-h-11 px-3"
            >
              {option.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3">
          <button
            type="button"
            aria-expanded={refineOpen}
            aria-controls="lexical-hub-refine"
            onClick={() => setRefineOpen((open) => !open)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm"
            style={{ color: refineCount ? C.pen : C.mut }}
          >
            <SlidersHorizontal size={16} />
            Refine{refineCount ? ` (${refineCount})` : ""}
          </button>
        </div>

        {refineOpen && (
          <div
            id="lexical-hub-refine"
            className="mt-1 grid grid-cols-2 gap-2 rounded-xl border p-3"
            style={{ borderColor: C.line, background: C.card }}
          >
            <label className="col-span-2 min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">Where it lives</span>
              <select
                aria-label="Where it lives"
                value={contextFilter}
                onChange={(event) => setContextFilter(event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none"
                style={controlStyle}
              >
                {CONTEXT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">Learning</span>
              <select
                aria-label="Learning"
                value={learningFilter}
                onChange={(event) => setLearningFilter(event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none"
                style={controlStyle}
              >
                {LEARNING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">View</span>
              <select
                aria-label="Vocabulary view"
                value={maintenanceView}
                onChange={(event) => setMaintenanceView(event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none"
                style={controlStyle}
              >
                {VIEW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">Order</span>
              <select
                aria-label="Vocabulary order"
                value={searching ? "relevance" : browseOrder}
                onChange={(event) => setBrowseOrder(event.target.value)}
                disabled={searching}
                className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none disabled:opacity-70"
                style={controlStyle}
              >
                {searching && <option value="relevance">Search relevance</option>}
                {BROWSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">Tag</span>
              <select
                aria-label="Vocabulary tag"
                value={effectiveTag || ""}
                onChange={(event) => setTagFilter(event.target.value || null)}
                disabled={tagCounts.length === 0}
                className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none disabled:opacity-70"
                style={controlStyle}
              >
                <option value="">{tagCounts.length ? "All tags" : "No tags in this view"}</option>
                {tagCounts.map(({ tag, count }) => (
                  <option key={tag} value={tag}>{tag} · {count}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <section
          aria-label="Free practice"
          className="mt-5 rounded-xl border p-4"
          style={{ background: C.card, borderColor: C.line }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold" style={{ color: C.ink }}>Practice this view</h2>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mut }}>
                {practiceEligibleCount > 0
                  ? `${practiceEligibleCount} answerable ${practiceEligibleCount === 1 ? "card" : "cards"}`
                  : "No answerable cards in this view"}
                {practiceOmittedCount > 0
                  && ` · ${practiceOmittedCount} ${practiceOmittedCount === 1 ? "needs" : "need"} a meaning`}
              </p>
            </div>
            <Button
              className="min-h-11 shrink-0"
              disabled={practiceEligibleCount === 0}
              onClick={() => setPracticeSetupOpen(true)}
            >
              <Play size={15} /> Practice
            </Button>
          </div>
          <p className="mt-2 text-xs" style={{ color: C.mut }}>
            Free practice stays in this session and does not change your Repaso schedule.
          </p>
        </section>

        <div className="mt-8 space-y-8">
          {searching ? (
            searchResults.length > 0 ? (
              <section aria-labelledby="vocabulary-search-heading">
                <HubSectionHeading count={`${searchResults.length} total`}>
                  <span id="vocabulary-search-heading">Matching vocabulary</span>
                </HubSectionHeading>
                <div className="space-y-3">
                  {searchResults.map(({ item, reason }) => renderCard(item, reason))}
                </div>
              </section>
            ) : (
              <div
                className="rounded-xl border p-4 text-sm"
                style={{ background: C.card, borderColor: C.line, color: C.mut }}
              >
                <p>No words or phrases match “{query.trim()}” in this view.</p>
                {onSearchDictionary && (
                  <button
                    type="button"
                    onClick={() => onSearchDictionary(query.trim())}
                    className="mt-3 inline-flex min-h-11 items-center rounded-lg border px-3 text-sm"
                    style={{ borderColor: C.line, color: C.pen, background: C.paper }}
                  >
                    Search the dictionary for “{query.trim()}”
                  </button>
                )}
              </div>
            )
          ) : ordered.length > 0 ? (
            <>
              {pinnedItems.length > 0 && (
                <section aria-labelledby="pinned-vocabulary-heading">
                  <HubSectionHeading count={`${pinnedItems.length} ${pinnedItems.length === 1 ? "item" : "items"}`}>
                    <span id="pinned-vocabulary-heading">Pinned</span>
                  </HubSectionHeading>
                  <div className="space-y-3">{pinnedItems.map((item) => renderCard(item))}</div>
                </section>
              )}

              {otherItems.length > 0 && (
                <section aria-labelledby="all-vocabulary-heading">
                  <HubSectionHeading count={`${ordered.length} total`}>
                    <span id="all-vocabulary-heading">All matching vocabulary</span>
                  </HubSectionHeading>
                  {indexed ? (
                    <div className="space-y-6">
                      {letterGroups.map((group) => (
                        <div key={group.letter}>
                          <div
                            className="mb-2 border-b pb-1 text-xs font-semibold uppercase"
                            style={{ color: C.mut, borderColor: C.line, letterSpacing: "0.14em" }}
                          >
                            {group.letter}
                          </div>
                          <div className="space-y-3">{group.items.map((item) => renderCard(item))}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">{otherItems.map((item) => renderCard(item))}</div>
                  )}
                </section>
              )}
            </>
          ) : (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{ background: C.card, borderColor: C.line, color: C.mut }}
            >
              {lexical.length === 0
                ? "Nothing here yet. Add the first word or phrase you want to keep."
                : "No words or phrases match these filters."}
            </div>
          )}
        </div>
      </main>

      {adding && (
        <AddSheet
          kind="lexical"
          initialForm={formFilter === FILTERS.phrase ? "phrase" : formFilter === FILTERS.word ? "word" : null}
          items={items}
          onClose={() => setAdding(false)}
          onCreated={(id) => {
            setAdding(false);
            reload();
            onSelect(id);
          }}
        />
      )}

      {practiceSetupOpen && (
        <PracticeSetupSheet
          eligibleCount={practiceEligibleCount}
          omittedCount={practiceOmittedCount}
          onClose={() => setPracticeSetupOpen(false)}
          onStart={startPractice}
        />
      )}
    </>
  );
}
