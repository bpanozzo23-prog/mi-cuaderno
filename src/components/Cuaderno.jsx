import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, BookOpen, FileText, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Chip, Card } from "../theme.jsx";
import ItemCard from "./ItemCard.jsx";
import AddSheet from "./AddSheet.jsx";
import PageStarterGallery from "./PageStarterGallery.jsx";
import Detail from "./Detail.jsx";
import DictCard from "./DictCard.jsx";
import DictDetail from "./DictDetail.jsx";
import SearchBar from "./SearchBar.jsx";
import CuadernoLanding from "./CuadernoLanding.jsx";
import EmptyState from "./EmptyState.jsx";
import { RefineBar, RefinePanel, RefineSelect } from "./Refine.jsx";
import { searchItems, mergeResults } from "../lib/search.js";
import { searchDictionary } from "../db/ref/search.js";
import { isDictKey, installedMeta } from "../db/ref/entries.js";
import { TYPE_FILTERS, FILTERS, matchesTypeFilter, wantsDictionary } from "../lib/filters.js";
import {
  BROWSE_ORDERS,
  MAINTENANCE_VIEWS,
  maintenanceItems,
  orderItems,
  tagCountsIn,
} from "../lib/organization.js";
import { isJournalEntry } from "../lib/journal.js";
import { emptyItemState } from "../useNotebook.js";
import { deriveReviewState, emptyReviewState } from "../lib/review.js";
import { eligibleWanderItems, sampleWanderStart } from "../lib/wander.js";
import { updateItem } from "../db/items.js";
import ShareArrivalSheet, { ShareContinuationPill } from "./ShareArrivalSheet.jsx";

/** Long enough that a fast typist does not fire a query per keystroke, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 140;

const BROWSE_OPTIONS = [
  { value: BROWSE_ORDERS.touched, label: "Recently touched" },
  { value: BROWSE_ORDERS.added, label: "Recently added" },
  { value: BROWSE_ORDERS.alphabetical, label: "A–Z" },
];

const MAINTENANCE_OPTIONS = [
  { value: MAINTENANCE_VIEWS.all, label: "All items" },
  { value: MAINTENANCE_VIEWS.added7Days, label: "Added in the last 7 days" },
  { value: MAINTENANCE_VIEWS.added30Days, label: "Added in the last 30 days" },
  { value: MAINTENANCE_VIEWS.withMedia, label: "With media links" },
  { value: MAINTENANCE_VIEWS.missingMeaning, label: "Missing meaning" },
  { value: MAINTENANCE_VIEWS.missingExamples, label: "Missing examples" },
  { value: MAINTENANCE_VIEWS.unlinked, label: "No links" },
];

function pinnedFirst(items, pinnedIds) {
  const pinned = [];
  const unpinned = [];
  for (const item of items) (pinnedIds.has(item.id) ? pinned : unpinned).push(item);
  return [...pinned, ...unpinned];
}

export default function Cuaderno({
  notebook,
  selectedId,
  onSelect,
  onBack,
  backLabel = "Todo el cuaderno",
  onOpenSettings,
  onOpenPages,
  onOpenLexical,
  onOpenCuidar,
  onWander,
  random = Math.random,
  now = new Date(),
  seedQuery = null,
  seedBrowseView = null,
  shareSource = null,
  rootScreen = null,
  onOpenRoot = null,
  onOpenBiography = null,
  onCloseBiography = null,
  pinnedPageIds = [],
  onPagePinnedChange,
}) {
  const { items, events, itemState, reload } = notebook;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(FILTERS.all);
  const [tagFilter, setTagFilter] = useState(null);
  const [browseOrder, setBrowseOrder] = useState(BROWSE_ORDERS.touched);
  const [maintenanceView, setMaintenanceView] = useState(MAINTENANCE_VIEWS.all);
  const [refineOpen, setRefineOpen] = useState(false);
  const [addKind, setAddKind] = useState(null);
  const [pageStarter, setPageStarter] = useState(null);
  const [askKind, setAskKind] = useState(false);
  const [askPageStarter, setAskPageStarter] = useState(false);
  const [shareArrival, setShareArrival] = useState(null);
  // Ephemeral continuation: the video stays available for more targets after the first chooser
  // action, until Done or reload. Set when a destination is CHOSEN (not when a write lands), so
  // a cancelled creation can still be retried from the pill. In-memory only — never stored.
  const [shareFollowUp, setShareFollowUp] = useState(null);
  const [addSeed, setAddSeed] = useState(null);
  const [dictionary, setDictionary] = useState(null);
  const [rootMode, setRootMode] = useState("landing");
  const controlledRootMode = ["landing", "browse", "search"].includes(rootScreen)
    ? rootScreen
    : null;
  const activeRootMode = controlledRootMode || rootMode;
  const [resultLimit, setResultLimit] = useState(30);

  const searching = query.trim() !== "";
  const wanderItems = useMemo(() => eligibleWanderItems(items), [items]);
  const nonJournalItems = useMemo(
    () => items.filter((item) => !isJournalEntry(item)),
    [items]
  );
  const recentItems = useMemo(
    () => orderItems(nonJournalItems, BROWSE_ORDERS.touched).slice(0, 3),
    [nonJournalItems]
  );
  const wordCount = nonJournalItems.filter(
    (item) => item.type === "lexical" && item.form !== "phrase"
  ).length;
  const phraseCount = nonJournalItems.filter(
    (item) => item.type === "lexical" && item.form === "phrase"
  ).length;
  const pageCount = nonJournalItems.filter((item) => item.type === "page").length;

  // Whether this device has the dictionary changes what an empty screen should say, and
  // what the search box should promise. It is per-device by design (§11).
  useEffect(() => {
    installedMeta().then(setDictionary);
  }, [selectedId]);

  /**
   * Three of the four chips are doors rather than filters: pages have had their own hub since
   * Phase 4z, and words and phrases got theirs in Phase 8. What stays here is `todo` — one mixed
   * list, and the only place a search spans both layers (§8).
   *
   * Each falls back to filtering in place when its hub is not wired up, so this component still
   * stands alone in a test.
   */
  function changeTypeFilter(next) {
    if (next === FILTERS.page && onOpenPages) {
      onOpenPages();
      return;
    }
    if ((next === FILTERS.word || next === FILTERS.phrase) && onOpenLexical) {
      onOpenLexical(next);
      return;
    }
    setTypeFilter(next);
  }

  function changeQuery(next) {
    setQuery(next);
    if (!next.trim()) {
      if (onOpenRoot) onOpenRoot("landing", { replace: true });
      else setRootMode("landing");
    }
  }

  function openBrowseAll() {
    setQuery("");
    setTypeFilter(FILTERS.all);
    setTagFilter(null);
    setBrowseOrder(BROWSE_ORDERS.touched);
    setMaintenanceView(MAINTENANCE_VIEWS.all);
    setRefineOpen(false);
    setResultLimit(30);
    if (onOpenRoot) onOpenRoot("browse");
    else setRootMode("browse");
  }

  function startWander() {
    const start = sampleWanderStart(wanderItems, random);
    if (start) onWander?.(start.id);
  }

  // A query handed over from the Words & phrases hub, which searches personal vocabulary only.
  // Keyed so handing over the same text twice still re-applies it after the owner edits the box.
  useEffect(() => {
    if (!seedQuery?.key) return;
    setQuery(seedQuery.text || "");
    setTypeFilter(FILTERS.all);
    if (!controlledRootMode) setRootMode("landing");
  }, [seedQuery]);

  // A maintenance view handed over from the Cuidar hub's "see all" action. Keyed like seedQuery
  // so tapping the same category twice still re-applies after the owner changed the controls.
  // Everything else resets so the arriving list is exactly the promised one.
  useEffect(() => {
    if (!seedBrowseView?.key) return;
    setQuery("");
    setTypeFilter(FILTERS.all);
    setTagFilter(null);
    setBrowseOrder(BROWSE_ORDERS.touched);
    setMaintenanceView(seedBrowseView.view);
    setRefineOpen(false);
    setResultLimit(30);
    if (!controlledRootMode) setRootMode("browse");
  }, [seedBrowseView]);

  // A URL shared in from another Android app (share_target → App's startup dispatch). It opens
  // the destination chooser rather than committing to a new Source page: the owner's dominant
  // share is a short learning video that usually belongs on something that already exists.
  // Keyed like seedQuery; dismissing the chooser writes nothing.
  useEffect(() => {
    if (!shareSource?.key) return;
    setShareArrival(shareSource);
  }, [shareSource]);

  // Maintenance must see the COMPLETE personal notebook. A page filtered out by the type
  // controls may still be the only item linking back to a word.
  const maintenanceSet = useMemo(
    () => maintenanceItems(items, maintenanceView, now),
    [items, maintenanceView, now]
  );

  // Empty-query browsing belongs to Cuaderno, not Diario. A typed query is intentional global
  // retrieval, so journals rejoin the candidate set and can still be found from here.
  const candidateSet = useMemo(
    () => searching ? maintenanceSet : maintenanceSet.filter((item) => !isJournalEntry(item)),
    [maintenanceSet, searching]
  );

  const typeItems = useMemo(
    () => candidateSet.filter((item) => matchesTypeFilter(item, typeFilter)),
    [candidateSet, typeFilter]
  );

  const contextItems = typeItems;

  // Tag choices describe the type/maintenance context, not the already-selected tag or query.
  // That keeps the picker useful while a tag narrows the cards and while the owner searches.
  const tagCounts = useMemo(() => tagCountsIn(contextItems), [contextItems]);
  const tagAvailable = tagFilter && tagCounts.some(({ tag }) => tag === tagFilter);
  const effectiveTag = tagAvailable ? tagFilter : null;

  // The derived value above prevents a one-render empty state. The effect only synchronizes the
  // stored control state after another filter or a notebook reload makes an exact tag impossible.
  useEffect(() => {
    if (tagFilter && !tagAvailable) setTagFilter(null);
  }, [tagAvailable, tagFilter]);

  const filtered = useMemo(
    () =>
      effectiveTag
        ? contextItems.filter((item) => item.tags.includes(effectiveTag))
        : contextItems,
    [contextItems, effectiveTag]
  );

  // Searching ranks across everything the filters allow, so a tag filter narrows
  // the search rather than being silently ignored by it.
  const personalResults = useMemo(
    () => {
      if (searching) {
        return searchItems(filtered, query, {
          allItems: items,
          // Pages search may retrieve a page through active contained vocabulary. Global search
          // keeps the lexical result primary and lets its card summarize those page contexts.
          includeContainedVocabulary: typeFilter === FILTERS.page,
        });
      }
      const ordered = orderItems(filtered, browseOrder);
      const browsed =
        typeFilter === FILTERS.page
          ? pinnedFirst(ordered, new Set(pinnedPageIds))
          : ordered;
      return browsed.map((item) => ({ item, reason: null }));
    },
    [browseOrder, filtered, items, pinnedPageIds, query, searching, typeFilter]
  );

  /**
   * The dictionary half of the seam (§8). It is asynchronous — the reference layer lives
   * in IndexedDB — so it is debounced and guarded against out-of-order replies: a slow
   * query for "sac" must never overwrite the results for "sacar" typed after it.
   *
   * Dictionary results are shown only when nothing is filtered to a type the dictionary
   * cannot satisfy; filtering to "páginas" means the owner is looking through their own
   * pages, and reference words would be noise.
   */
  const [dictResults, setDictResults] = useState([]);
  const [dictPending, setDictPending] = useState(false);
  const dictionaryEligible =
    maintenanceView === MAINTENANCE_VIEWS.all && wantsDictionary(typeFilter, effectiveTag);
  const dictionaryWanted = searching && dictionaryEligible;

  useEffect(() => {
    if (!dictionaryWanted) {
      setDictResults([]);
      setDictPending(false);
      return;
    }
    let current = true;
    setDictPending(true);
    const timer = setTimeout(async () => {
      const found = await searchDictionary(query);
      if (!current) return;
      setDictResults(found);
      setDictPending(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, dictionaryWanted]);

  const visible = useMemo(
    () =>
      searching
        ? mergeResults(personalResults, dictionaryWanted ? dictResults : [], items, {
            previousIds: dictionary?.previousIds,
          })
        : personalResults.map((r) => ({ ...r, kind: "item", key: r.item.id })),
    [personalResults, dictResults, items, searching, dictionaryWanted]
  );

  // What the Refine disclosure is hiding. The type chips and the query stay visible, so they are
  // not refinements the owner could lose track of (Phase 4z).
  const refineCount = Number(maintenanceView !== MAINTENANCE_VIEWS.all)
    + Number(browseOrder !== BROWSE_ORDERS.touched)
    + Number(Boolean(effectiveTag));
  const displayedVisible = activeRootMode === "landing" ? [] : visible.slice(0, resultLimit);
  const canLoadMore = activeRootMode !== "landing" && displayedVisible.length < visible.length;

  const selected = items.find((i) => i.id === selectedId) || null;
  const rootOverlayOpen = Boolean(askKind || askPageStarter || addKind || shareArrival);

  /**
   * The review state behind a lexical entry's stats strip (Phase 11). Gated, not merely
   * memoized: this screen never unmounts — App keeps it mounted behind `hidden` so its
   * filters survive a trail hop — so an ungated derivation would replay the whole log on
   * every notebook change while the owner is looking at another tab entirely.
   */
  const wantsReview = Boolean(selected && selected.type === "lexical");
  const review = useMemo(
    () => (wantsReview ? deriveReviewState(items, events || []) : null),
    [wantsReview, items, events]
  );

  /**
   * The share overlays exist on EVERY Cuaderno screen, because the flow deliberately lands the
   * owner on a detail view after each action: the pill must follow them there, and "Add to
   * another item" must be able to reopen the chooser (and its AddSheet) from that screen. The
   * list-only add flow (FAB, kind chooser, starter gallery) stays in the list branch.
   */
  const shareLayer = (
    <>
      {shareFollowUp && (
        <ShareContinuationPill
          share={shareFollowUp}
          onReopen={() => setShareArrival({ ...shareFollowUp, key: Date.now() })}
          onDone={() => setShareFollowUp(null)}
        />
      )}
      {shareArrival && (
        <ShareArrivalSheet
          share={shareArrival}
          items={items}
          onClose={() => setShareArrival(null)}
          onCreate={(starter) => {
            setShareArrival(null);
            setShareFollowUp({ url: shareArrival.url, title: shareArrival.title });
            setPageStarter(starter);
            setAddKind("page");
          }}
          onCreateLexical={(term) => {
            setShareArrival(null);
            setShareFollowUp({ url: shareArrival.url, title: shareArrival.title });
            setAddSeed({
              initialTerm: term,
              mediaLinks: [{ url: shareArrival.url, label: shareArrival.title || "" }],
            });
            setAddKind("lexical");
          }}
          onAttach={async (target) => {
            // One ordinary content edit — the same write Detail's media composer makes —
            // then land on the item so the real work (vocab, captures, notes) continues there.
            await updateItem(target.id, {
              mediaLinks: [
                ...(target.mediaLinks || []),
                { url: shareArrival.url, label: shareArrival.title || "" },
              ],
            });
            setShareArrival(null);
            setShareFollowUp({ url: shareArrival.url, title: shareArrival.title });
            reload();
            onSelect(target.id);
          }}
        />
      )}
      {addKind && (
        <AddSheet
          kind={addKind}
          pageStarter={pageStarter}
          initialTerm={addSeed?.initialTerm || ""}
          initialForm={addSeed?.initialForm || null}
          initialGloss={addSeed?.initialGloss || ""}
          seedMediaLinks={addSeed?.mediaLinks || []}
          items={items}
          onClose={() => {
            setAddKind(null);
            setPageStarter(null);
            setAddSeed(null);
          }}
          onCreated={(id) => {
            setAddKind(null);
            setPageStarter(null);
            setAddSeed(null);
            reload();
            onSelect(id);
          }}
        />
      )}
    </>
  );

  if (selectedId && isDictKey(selectedId)) {
    return (
      <>
        <DictDetail
          // Each destination owns its drafts and async lookup state. Remounting on a trail
          // hop prevents either from flashing or being saved against the next entry.
          key={selectedId}
          entryId={selectedId}
          items={items}
          onBack={onBack}
          backLabel={backLabel}
          onOpen={onSelect}
          onChanged={reload}
        />
        {shareLayer}
      </>
    );
  }

  if (selected) {
    return (
      <>
        <Detail
          // Optional example/media drafts are intentionally local to one detail screen.
          key={selected.id}
          item={selected}
          state={itemState.get(selected.id) || emptyItemState}
          reviewState={review?.states.get(selected.id) || emptyReviewState}
          items={items}
          events={events || []}
          onBack={onBack}
          backLabel={backLabel}
          onOpen={onSelect}
          onChanged={reload}
          destinationScreen={rootScreen}
          onOpenBiography={onOpenBiography}
          onCloseBiography={onCloseBiography}
          onAddPhraseFromExample={(example) => {
            setPageStarter(null);
            setAddSeed({
              initialTerm: String(example?.es || ""),
              initialForm: "phrase",
              initialGloss: String(example?.en || ""),
            });
            setAddKind("lexical");
          }}
          pagePinned={pinnedPageIds.includes(selected.id)}
          onPagePinnedChange={(pinned) => onPagePinnedChange?.(selected.id, pinned)}
        />
        {shareLayer}
      </>
    );
  }

  return (
    <>
      <div aria-hidden={rootOverlayOpen ? true : undefined}>
      {activeRootMode === "landing" ? (
        <CuadernoLanding
          query={query}
          onQueryChange={changeQuery}
          results={visible}
          pending={dictPending}
          dictionary={dictionary}
          onMissLogged={reload}
          wordCount={wordCount}
          phraseCount={phraseCount}
          pageCount={pageCount}
          totalCount={nonJournalItems.length}
          recentItems={recentItems}
          items={items}
          onOpen={onSelect}
          onOpenLexical={() => onOpenLexical?.(FILTERS.all)}
          onOpenPages={onOpenPages}
          onOpenCuidar={onOpenCuidar}
          onBrowseAll={openBrowseAll}
          onShowAllResults={() => {
            setResultLimit(30);
            if (onOpenRoot) onOpenRoot("search", { query });
            else setRootMode("search");
          }}
          canWander={wanderItems.length > 0 && Boolean(onWander)}
          onWander={startWander}
        />
      ) : (
        <>
          <div className="px-4 pt-3" style={{ background: C.paper }}>
            <div className="flex min-h-11 items-center gap-2">
              <button
                type="button"
                onClick={onBack || (() => setRootMode("landing"))}
                aria-label={`Back to ${backLabel}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]"
                style={{ color: C.pen }}
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <h1 className="text-xl font-bold" style={{ color: C.ink, fontFamily: SERIF }}>
                {activeRootMode === "search" ? "Search results" : "Browse all"}
              </h1>
              <span className="ml-auto shrink-0 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
                {visible.length}
              </span>
            </div>

            {(activeRootMode === "search" || activeRootMode === "browse") && (
              <div className="mt-2">
                {/* The miss count is combined across the personal and dictionary layers. */}
                <SearchBar
                  value={query}
                  onChange={activeRootMode === "browse" ? setQuery : changeQuery}
                  resultCount={visible.length}
                  pending={dictPending}
                  onMissLogged={reload}
                  placeholder={dictionary ? "Search your notebook and dictionary…" : "Search your notebook…"}
                  autoFocus
                />
              </div>
            )}

            <div className="mt-2 flex items-center gap-1.5">
              {TYPE_FILTERS.map((f) => (
                <Chip key={f.id} active={typeFilter === f.id} onClick={() => changeTypeFilter(f.id)}>
                  {f.label}
                </Chip>
              ))}
            </div>

            <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
              <RefineBar
                panelId="cuaderno-refine"
                open={refineOpen}
                count={refineCount}
                onToggle={() => setRefineOpen((open) => !open)}
              />
            </div>

            {refineOpen && (
              <RefinePanel id="cuaderno-refine">
                <RefineSelect label="View" value={maintenanceView} onChange={setMaintenanceView}>
                  {MAINTENANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </RefineSelect>

                <RefineSelect
                  label="Order"
                  value={searching ? "relevance" : browseOrder}
                  onChange={setBrowseOrder}
                  disabled={searching}
                >
                  {searching && <option value="relevance">Search relevance</option>}
                  {BROWSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </RefineSelect>

                <RefineSelect
                  label="Tag"
                  value={effectiveTag || ""}
                  onChange={(value) => setTagFilter(value || null)}
                  disabled={tagCounts.length === 0}
                  wide
                >
                  <option value="">
                    {tagCounts.length === 0 ? "No tags in this view" : "All tags"}
                  </option>
                  {tagCounts.map(({ tag, count }) => (
                    <option key={tag} value={tag}>
                      {tag} · {count}
                    </option>
                  ))}
                </RefineSelect>
              </RefinePanel>
            )}
          </div>

          <div className="space-y-[7.5px] px-4 py-4 pb-28" style={dotGrid}>
            {visible.length === 0 && (
              <EmptyState
                hasItems={items.length > 0}
                searching={searching}
                query={query}
                dictionary={dictionary}
                dictionaryEligible={dictionaryEligible}
                onOpenSettings={onOpenSettings}
              />
            )}
            {displayedVisible.map((result) =>
              result.kind === "entry" ? (
                <DictCard key={result.key} entry={result.entry} reason={result.reason} onOpen={onSelect} />
              ) : (
                <ItemCard
                  key={result.key}
                  item={result.item}
                  state={itemState.get(result.item.id) || emptyItemState}
                  onOpen={onSelect}
                  reason={result.reason}
                  items={items}
                  pinned={pinnedPageIds.includes(result.item.id)}
                  onPinnedChange={isJournalEntry(result.item) || !onPagePinnedChange
                    ? undefined
                    : (pinned) => onPagePinnedChange(result.item.id, pinned)}
                  showTags={false}
                />
              )
            )}
            {canLoadMore && (
              <button
                type="button"
                onClick={() => setResultLimit((limit) => limit + 30)}
                className="mt-3 min-h-11 w-full rounded-lg border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]"
                style={{ background: C.card, borderColor: C.line, color: C.pen }}
              >
                Load 30 more
              </button>
            )}
          </div>
        </>
      )}
      </div>

      {!rootOverlayOpen && (
        <button
          type="button"
          onClick={() => setAskKind(true)}
          aria-label="Add"
          className="fixed z-30 rounded-full p-4 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]"
          style={{ background: C.floatingAdd, color: C.onAccent, bottom: 84, right: "max(16px, calc(50% - 208px))" }}
        >
          <Plus size={22} />
        </button>
      )}

      {askKind && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ background: C.scrim }}
          onClick={() => setAskKind(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cuaderno-add-kind-title"
            className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-2"
            style={{ background: C.paper }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1">
              <div id="cuaderno-add-kind-title" className="font-semibold" style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}>
                ¿Qué añadimos?
              </div>
              <button
                type="button"
                onClick={() => setAskKind(false)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]"
              >
                <X size={18} style={{ color: C.mut }} />
              </button>
            </div>
            {[
              { kind: "lexical", icon: BookOpen, title: "Word or phrase", sub: "With a meaning, notes and your own examples" },
              { kind: "page", icon: FileText, title: "Page", sub: "A grammar topic, a film, podcast, source, or other note" },
            ].map(({ kind, icon: Icon, title, sub }) => (
              <button
                key={kind}
                onClick={() => {
                  setAskKind(false);
                  if (kind === "page") setAskPageStarter(true);
                  else setAddKind(kind);
                }}
                className="w-full text-left"
              >
                <Card className="flex items-start gap-3 p-4">
                  <Icon size={18} style={{ color: C.pen, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>{title}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                      {sub}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {askPageStarter && (
        <PageStarterGallery
          items={items}
          onClose={() => setAskPageStarter(false)}
          onChoose={(starter) => {
            setAskPageStarter(false);
            setPageStarter(starter);
            setAddKind("page");
          }}
        />
      )}

      {shareLayer}
    </>
  );
}
