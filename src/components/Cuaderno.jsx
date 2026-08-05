import { useEffect, useMemo, useState } from "react";
import { Plus, BookOpen, FileText, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Chip, Card } from "../theme.jsx";
import ItemCard from "./ItemCard.jsx";
import AddSheet from "./AddSheet.jsx";
import PageStarterGallery from "./PageStarterGallery.jsx";
import Detail from "./Detail.jsx";
import DictCard from "./DictCard.jsx";
import DictDetail from "./DictDetail.jsx";
import SearchBar from "./SearchBar.jsx";
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

/** Long enough that a fast typist does not fire a query per keystroke, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 140;

const BROWSE_OPTIONS = [
  { value: BROWSE_ORDERS.touched, label: "Recently touched" },
  { value: BROWSE_ORDERS.added, label: "Recently added" },
  { value: BROWSE_ORDERS.alphabetical, label: "A–Z" },
];

const MAINTENANCE_OPTIONS = [
  { value: MAINTENANCE_VIEWS.all, label: "All items" },
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
  seedQuery = null,
  pinnedPageIds = [],
  onPagePinnedChange,
}) {
  const { items, itemState, reload } = notebook;
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
  const [dictionary, setDictionary] = useState(null);

  const searching = query.trim() !== "";

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

  // A query handed over from the Words & phrases hub, which searches personal vocabulary only.
  // Keyed so handing over the same text twice still re-applies it after the owner edits the box.
  useEffect(() => {
    if (!seedQuery?.key) return;
    setQuery(seedQuery.text || "");
    setTypeFilter(FILTERS.all);
  }, [seedQuery]);

  // Maintenance must see the COMPLETE personal notebook. A page filtered out by the type
  // controls may still be the only item linking back to a word.
  const maintenanceSet = useMemo(
    () => maintenanceItems(items, maintenanceView),
    [items, maintenanceView]
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

  const selected = items.find((i) => i.id === selectedId) || null;

  if (selectedId && isDictKey(selectedId)) {
    return (
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
    );
  }

  if (selected) {
    return (
      <Detail
        // Optional example/media drafts are intentionally local to one detail screen.
        key={selected.id}
        item={selected}
        state={itemState.get(selected.id) || emptyItemState}
        items={items}
        onBack={onBack}
        backLabel={backLabel}
        onOpen={onSelect}
        onChanged={reload}
        pagePinned={pinnedPageIds.includes(selected.id)}
        onPagePinnedChange={(pinned) => onPagePinnedChange?.(selected.id, pinned)}
      />
    );
  }

  return (
    <>
      <div className="px-4 pt-3" style={{ background: C.paper }}>
        {/*
          The miss count is the COMBINED one: a query the dictionary answers is not a
          word the owner could not find (§7), so it must not become a search_miss.
        */}
        <SearchBar
          value={query}
          onChange={setQuery}
          resultCount={visible.length}
          pending={dictPending}
          onMissLogged={reload}
          placeholder={dictionary ? "Search the dictionary and your notes…" : "Search words, meanings, notes, pages…"}
        />
        <div className="flex gap-1.5 items-center mt-2">
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
          <span className="shrink-0 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            {visible.length}
          </span>
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

      <div className="px-4 py-4 space-y-2.5 pb-28" style={dotGrid}>
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
        {visible.map((result) =>
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
            />
          )
        )}
      </div>

      <button
        onClick={() => setAskKind(true)}
        aria-label="Add"
        className="fixed z-30 rounded-full p-4 shadow-lg"
        style={{ background: C.pen, color: "#fff", bottom: 84, right: "max(16px, calc(50% - 208px))" }}
      >
        <Plus size={22} />
      </button>

      {askKind && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ background: "rgba(33,42,61,0.35)" }}
          onClick={() => setAskKind(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-2"
            style={{ background: C.paper }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold" style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}>
                ¿Qué añadimos?
              </div>
              <button onClick={() => setAskKind(false)} aria-label="Close">
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

      {addKind && (
        <AddSheet
          kind={addKind}
          pageStarter={pageStarter}
          items={items}
          onClose={() => {
            setAddKind(null);
            setPageStarter(null);
          }}
          onCreated={(id) => {
            setAddKind(null);
            setPageStarter(null);
            reload();
            onSelect(id);
          }}
        />
      )}
    </>
  );
}
