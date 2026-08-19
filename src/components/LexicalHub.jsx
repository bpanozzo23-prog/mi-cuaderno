import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Link2, Play, Plus, Search } from "lucide-react";
import { Button, C, Chip, MONO, SERIF } from "../theme.jsx";
import AddSheet from "./AddSheet.jsx";
import { RefineBar, RefinePanel, RefineSelect } from "./Refine.jsx";
import LexicalHubCard from "./LexicalHubCard.jsx";
import PracticeSession from "./PracticeSession.jsx";
import PracticeSetupSheet from "./PracticeSetupSheet.jsx";
import SearchBar from "./SearchBar.jsx";
import SimilarMeaningRecallSession from "./SimilarMeaningRecallSession.jsx";
import SimilarMeaningRecallSetupSheet from "./SimilarMeaningRecallSetupSheet.jsx";
import { searchItems } from "../lib/search.js";
import { installedMeta } from "../db/ref/entries.js";
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
  LEXICAL_POS_ANY,
  matchesContextFilter,
  matchesLearningFilter,
  matchesPageFilter,
  matchesPosFilter,
  pageContextIndex,
  pageContextCountsIn,
  posCountsIn,
} from "../lib/lexicalViews.js";
import { buildPracticeDeck, isPracticeEligible } from "../lib/practice.js";
import { preparePracticeCards } from "../lib/practiceCards.js";
import {
  deriveSimilarMeaningPrompts,
  selectSimilarMeaningRecallDeck,
} from "../lib/similarMeaningRecall.js";

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

const UNATTACHED_WORD_OPTION = {
  value: MAINTENANCE_VIEWS.unattachedWord,
  label: "No dictionary attachment",
};

const BROWSE_OPTIONS = [
  { value: BROWSE_ORDERS.touched, label: "Recently touched" },
  { value: BROWSE_ORDERS.added, label: "Recently added" },
  { value: BROWSE_ORDERS.alphabetical, label: "A–Z" },
];

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
  backLabel = "Cuaderno",
  onSearchDictionary,
}) {
  const { items, events, reload } = notebook;
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [formFilter, setFormFilter] = useState(FILTERS.all);
  const [contextFilter, setContextFilter] = useState(LEXICAL_CONTEXTS.anywhere);
  const [pageFilter, setPageFilter] = useState(null);
  const [learningFilter, setLearningFilter] = useState(LEXICAL_LEARNING.any);
  const [maintenanceView, setMaintenanceView] = useState(MAINTENANCE_VIEWS.all);
  const [browseOrder, setBrowseOrder] = useState(BROWSE_ORDERS.touched);
  const [tagFilter, setTagFilter] = useState(null);
  const [posFilter, setPosFilter] = useState(LEXICAL_POS_ANY);
  const [refineOpen, setRefineOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [practiceSetupOpen, setPracticeSetupOpen] = useState(false);
  const [practiceSession, setPracticeSession] = useState(null);
  const [practiceStarting, setPracticeStarting] = useState(false);
  const [similarRecallSetupOpen, setSimilarRecallSetupOpen] = useState(false);
  const [similarRecallSession, setSimilarRecallSession] = useState(null);
  const [dictionaryAvailable, setDictionaryAvailable] = useState(false);

  // The chip the owner tapped in Cuaderno arrives as a fresh request object each time, so tapping
  // "frases" twice still selects Phrases even after they changed the chip inside the hub.
  useEffect(() => {
    if (formRequest?.form) setFormFilter(formRequest.form);
  }, [formRequest]);

  useEffect(() => {
    if (!active) return undefined;
    let current = true;
    installedMeta().then((meta) => {
      if (current) setDictionaryAvailable(Boolean(meta));
    });
    return () => {
      current = false;
    };
  }, [active]);

  const searching = query.trim() !== "";
  const lexical = useMemo(() => items.filter((item) => item.type === "lexical"), [items]);

  // These derivations scan the whole notebook, so they run once per notebook change rather than
  // once per filtered item. The hub stays mounted while the trail is elsewhere — that is what
  // preserves its visit-local controls — so `active` keeps the cost off every unrelated change.
  const contextIndex = useMemo(() => active ? pageContextIndex(items) : new Map(), [active, items]);
  const review = useMemo(
    () => active ? deriveReviewState(items, events) : NO_REVIEW,
    [active, items, events]
  );
  const similarPrompts = useMemo(
    () => active ? deriveSimilarMeaningPrompts(items) : [],
    [active, items]
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

  const pageCounts = useMemo(
    () => pageContextCountsIn(lensedItems, contextIndex),
    [contextIndex, lensedItems]
  );
  const pageAvailable = pageFilter && pageCounts.some(({ pageId }) => pageId === pageFilter);
  const effectivePage = pageAvailable ? pageFilter : null;

  useEffect(() => {
    if (pageFilter && !pageAvailable) setPageFilter(null);
  }, [pageAvailable, pageFilter]);

  const pageItems = useMemo(
    () => effectivePage
      ? lensedItems.filter((item) => matchesPageFilter(contextIndex.get(item.id) || [], effectivePage))
      : lensedItems,
    [contextIndex, effectivePage, lensedItems]
  );

  // Tag choices describe the lens, not the already-selected tag, so the picker stays useful.
  const tagCounts = useMemo(() => tagCountsIn(pageItems), [pageItems]);
  const tagAvailable = tagFilter && tagCounts.some(({ tag }) => tag === tagFilter);
  const effectiveTag = tagAvailable ? tagFilter : null;

  useEffect(() => {
    if (tagFilter && !tagAvailable) setTagFilter(null);
  }, [tagAvailable, tagFilter]);

  const taggedItems = useMemo(
    () => effectiveTag ? pageItems.filter((item) => item.tags.includes(effectiveTag)) : pageItems,
    [effectiveTag, pageItems]
  );

  // Part of speech is the innermost lens, so its choices describe everything already narrowed —
  // and, like tags, describe the lens rather than the selection, so the picker stays usable.
  const posCounts = useMemo(() => posCountsIn(taggedItems), [taggedItems]);
  const posAvailable = posCounts.some(({ pos }) => pos === posFilter);
  const effectivePos = posAvailable ? posFilter : LEXICAL_POS_ANY;

  useEffect(() => {
    if (posFilter !== LEXICAL_POS_ANY && !posAvailable) setPosFilter(LEXICAL_POS_ANY);
  }, [posAvailable, posFilter]);

  const filtered = useMemo(
    () => effectivePos === LEXICAL_POS_ANY
      ? taggedItems
      : taggedItems.filter((item) => matchesPosFilter(item, effectivePos)),
    [effectivePos, taggedItems]
  );

  const attachmentViewAvailable = dictionaryAvailable && formFilter !== FILTERS.phrase;
  useEffect(() => {
    if (!attachmentViewAvailable && maintenanceView === MAINTENANCE_VIEWS.unattachedWord) {
      setMaintenanceView(MAINTENANCE_VIEWS.all);
    }
  }, [attachmentViewAvailable, maintenanceView]);

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
  const practiceStatus = `${practiceEligibleCount > 0
    ? `${practiceEligibleCount} answerable ${practiceEligibleCount === 1 ? "card" : "cards"}.`
    : "No answerable cards in this view."}${practiceOmittedCount > 0
    ? ` ${practiceOmittedCount} ${practiceOmittedCount === 1 ? "entry needs" : "entries need"} a meaning.`
    : ""}`;
  // The active form chip carries the count, so it has to say what is actually on screen — search
  // results while searching, the whole browsed list otherwise.
  const visibleCount = searching ? searchResults.length : ordered.length;
  const indexed = browseOrder === BROWSE_ORDERS.alphabetical;
  const letterGroups = useMemo(
    () => indexed ? groupByInitial(otherItems) : [],
    [indexed, otherItems]
  );

  const refineCount = Number(contextFilter !== LEXICAL_CONTEXTS.anywhere)
    + Number(Boolean(effectivePage))
    + Number(learningFilter !== LEXICAL_LEARNING.any)
    + Number(maintenanceView !== MAINTENANCE_VIEWS.all)
    + Number(browseOrder !== BROWSE_ORDERS.touched)
    + Number(Boolean(effectiveTag))
    + Number(effectivePos !== LEXICAL_POS_ANY);

  function toggleSearch() {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    if (query) setQuery("");
    else setSearchOpen(false);
  }

  async function startPractice({ direction, mode, ...deckOptions }) {
    if (practiceStarting) return;
    setPracticeStarting(true);
    const deck = buildPracticeDeck(practiceSource, deckOptions);
    if (deck.length === 0) {
      setPracticeStarting(false);
      return;
    }
    const cards = await preparePracticeCards(deck, { direction });
    setPracticeSession({ cards, mode });
    setPracticeSetupOpen(false);
    setPracticeStarting(false);
  }

  function startSimilarRecall({ limit }) {
    const prompts = selectSimilarMeaningRecallDeck(similarPrompts, { limit });
    if (prompts.length === 0) return;
    setSimilarRecallSession(prompts);
    setSimilarRecallSetupOpen(false);
  }

  const renderCard = (item, reason = null) => (
    <LexicalHubCard
      key={item.id}
      item={item}
      review={reviewFor(item)}
      contexts={contextsFor(item)}
      pinned={pinnedIds.has(item.id)}
      reason={reason}
      onOpen={onSelect}
      onPinnedChange={onLexicalPinnedChange}
    />
  );

  if (similarRecallSession) {
    return (
      <SimilarMeaningRecallSession
        prompts={similarRecallSession}
        onFinish={() => setSimilarRecallSession(null)}
      />
    );
  }

  if (practiceSession) {
    return (
      <PracticeSession
        cards={practiceSession.cards}
        mode={practiceSession.mode}
        onFinish={() => setPracticeSession(null)}
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
            <ChevronLeft size={18} /> {backLabel}
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
            Words &amp; phrases
          </h1>
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

      <main className="px-4 pb-28 pt-4" style={{ background: C.paper }}>
        <div className="flex flex-wrap gap-2" aria-label="Vocabulary forms">
          {FORM_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={formFilter === option.value}
              onClick={() => setFormFilter(option.value)}
              className="min-h-11 px-3"
            >
              {option.label}
              {formFilter === option.value && (
                <span style={{ fontFamily: MONO, opacity: 0.75 }}>{visibleCount}</span>
              )}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
          <RefineBar
            panelId="lexical-hub-refine"
            open={refineOpen}
            count={refineCount}
            onToggle={() => setRefineOpen((open) => !open)}
          />
          <div className="flex shrink-0 items-center gap-1">
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
            <Button
              className="min-h-11 shrink-0"
              disabled={practiceEligibleCount === 0}
              aria-describedby="lexical-hub-practice-status"
              onClick={() => setPracticeSetupOpen(true)}
            >
              <Play size={15} /> Practice
            </Button>
          </div>
        </div>

        <span id="lexical-hub-practice-status" className="sr-only">{practiceStatus}</span>

        {similarPrompts.length > 0 && (
          <button
            type="button"
            aria-label="Start similar-meaning recall"
            onClick={() => setSimilarRecallSetupOpen(true)}
            className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ background: C.penPale, borderColor: C.chipBorder, color: C.penDark }}
          >
            <Link2 size={15} className="shrink-0" />
            <span>Similar-meaning recall</span>
            <span className="ml-auto shrink-0 text-xs" style={{ fontFamily: MONO, opacity: 0.75 }}>
              {similarPrompts.length} {similarPrompts.length === 1 ? "prompt" : "prompts"}
            </span>
          </button>
        )}

        {searchOpen && (
          <div className="mt-2">
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

        {refineOpen && (
          <RefinePanel id="lexical-hub-refine">
            <RefineSelect
              label="Where it lives"
              value={contextFilter}
              onChange={setContextFilter}
              wide
            >
              {CONTEXT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </RefineSelect>

            <RefineSelect
              label="Specific Page"
              value={effectivePage || ""}
              onChange={(value) => setPageFilter(value || null)}
              disabled={pageCounts.length === 0}
              wide
            >
              <option value="">{pageCounts.length ? "Any page" : "No pages in this view"}</option>
              {pageCounts.map(({ pageId, pageTitle, count }) => (
                <option key={pageId} value={pageId}>{pageTitle} · {count}</option>
              ))}
            </RefineSelect>

            <RefineSelect label="Learning" value={learningFilter} onChange={setLearningFilter}>
              {LEARNING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </RefineSelect>

            <RefineSelect
              label="Part of speech"
              ariaLabel="Part of speech"
              value={effectivePos}
              onChange={setPosFilter}
              disabled={posCounts.length === 0}
            >
              <option value={LEXICAL_POS_ANY}>
                {posCounts.length ? "Any" : "None recorded in this view"}
              </option>
              {posCounts.map(({ pos, count }) => (
                <option key={pos} value={pos}>{pos} · {count}</option>
              ))}
            </RefineSelect>

            <RefineSelect
              label="View"
              ariaLabel="Vocabulary view"
              value={maintenanceView}
              onChange={setMaintenanceView}
            >
              {VIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
              {attachmentViewAvailable && (
                <option value={UNATTACHED_WORD_OPTION.value}>{UNATTACHED_WORD_OPTION.label}</option>
              )}
            </RefineSelect>

            <RefineSelect
              label="Order"
              ariaLabel="Vocabulary order"
              value={searching ? "relevance" : browseOrder}
              onChange={setBrowseOrder}
              disabled={searching}
            >
              {searching && <option value="relevance">Search relevance</option>}
              {BROWSE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </RefineSelect>

            <RefineSelect
              label="Tag"
              ariaLabel="Vocabulary tag"
              value={effectiveTag || ""}
              onChange={(value) => setTagFilter(value || null)}
              disabled={tagCounts.length === 0}
            >
              <option value="">{tagCounts.length ? "All tags" : "No tags in this view"}</option>
              {tagCounts.map(({ tag, count }) => (
                <option key={tag} value={tag}>{tag} · {count}</option>
              ))}
            </RefineSelect>
          </RefinePanel>
        )}

        <div className="mt-6 space-y-8">
          {searching ? (
            searchResults.length > 0 ? (
              <section aria-labelledby="vocabulary-search-heading">
                <HubSectionHeading count={`${searchResults.length} total`}>
                  <span id="vocabulary-search-heading">Matching vocabulary</span>
                </HubSectionHeading>
                <div className="space-y-[9px]">
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
                  <div className="space-y-[9px]">{pinnedItems.map((item) => renderCard(item))}</div>
                </section>
              )}

              {otherItems.length > 0 && (
                <section aria-label="All matching vocabulary">
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
                          <div className="space-y-[9px]">{group.items.map((item) => renderCard(item))}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-[9px]">{otherItems.map((item) => renderCard(item))}</div>
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
          starting={practiceStarting}
          onClose={() => setPracticeSetupOpen(false)}
          onStart={startPractice}
        />
      )}

      {similarRecallSetupOpen && (
        <SimilarMeaningRecallSetupSheet
          eligibleCount={similarPrompts.length}
          onClose={() => setSimilarRecallSetupOpen(false)}
          onStart={startSimilarRecall}
        />
      )}
    </>
  );
}
