import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { C, Chip, MONO, SERIF } from "../theme.jsx";
import AddSheet from "./AddSheet.jsx";
import { RefineBar, RefinePanel, RefineSelect } from "./Refine.jsx";
import PageHubCard from "./PageHubCard.jsx";
import PageStarterGallery from "./PageStarterGallery.jsx";
import SearchBar from "./SearchBar.jsx";
import { searchItems } from "../lib/search.js";
import {
  BROWSE_ORDERS,
  MAINTENANCE_VIEWS,
  maintenanceItems,
  orderItems,
  tagCountsIn,
} from "../lib/organization.js";
import { PAGE_FOCUSES, enabledPageRoles } from "../lib/pageKinds.js";
import { isJournalEntry } from "../lib/journal.js";

const PAGE_ROLE_FILTERS = {
  all: "all",
  source: PAGE_FOCUSES.source,
  grammar: PAGE_FOCUSES.grammar,
  collection: PAGE_FOCUSES.vocabulary,
  notes: PAGE_FOCUSES.notes,
};

const PAGE_ROLE_OPTIONS = [
  { value: PAGE_ROLE_FILTERS.all, label: "All" },
  { value: PAGE_ROLE_FILTERS.source, label: "Sources" },
  { value: PAGE_ROLE_FILTERS.grammar, label: "Grammar" },
  { value: PAGE_ROLE_FILTERS.collection, label: "Collections" },
  { value: PAGE_ROLE_FILTERS.notes, label: "Notes" },
];

const BROWSE_OPTIONS = [
  { value: BROWSE_ORDERS.touched, label: "Recently touched" },
  { value: BROWSE_ORDERS.added, label: "Recently added" },
  { value: BROWSE_ORDERS.alphabetical, label: "A–Z" },
];

const PAGE_VIEW_OPTIONS = [
  { value: MAINTENANCE_VIEWS.all, label: "All pages" },
  { value: MAINTENANCE_VIEWS.unlinked, label: "No connections" },
];

function PageSectionHeading({ children, count }) {
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

export default function PageHub({
  notebook,
  pinnedPageIds = [],
  onPagePinnedChange,
  onSelect,
  onBack,
}) {
  const { items, reload } = notebook;
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState(PAGE_ROLE_FILTERS.all);
  const [browseOrder, setBrowseOrder] = useState(BROWSE_ORDERS.touched);
  const [maintenanceView, setMaintenanceView] = useState(MAINTENANCE_VIEWS.all);
  const [tagFilter, setTagFilter] = useState(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [askPageStarter, setAskPageStarter] = useState(false);
  const [pageStarter, setPageStarter] = useState(null);

  const searching = query.trim() !== "";
  const pages = useMemo(
    () => items.filter((item) => item.type === "page" && !isJournalEntry(item)),
    [items]
  );

  const viewedPages = useMemo(
    () => maintenanceItems(items, maintenanceView)
      .filter((item) => item.type === "page" && !isJournalEntry(item)),
    [items, maintenanceView]
  );

  const rolePages = useMemo(
    () => roleFilter === PAGE_ROLE_FILTERS.all
      ? viewedPages
      : viewedPages.filter((page) => enabledPageRoles(page).includes(roleFilter)),
    [roleFilter, viewedPages]
  );

  const tagCounts = useMemo(() => tagCountsIn(rolePages), [rolePages]);
  const tagAvailable = tagFilter && tagCounts.some(({ tag }) => tag === tagFilter);
  const effectiveTag = tagAvailable ? tagFilter : null;

  useEffect(() => {
    if (tagFilter && !tagAvailable) setTagFilter(null);
  }, [tagAvailable, tagFilter]);

  const filteredPages = useMemo(
    () => effectiveTag
      ? rolePages.filter((page) => page.tags.includes(effectiveTag))
      : rolePages,
    [effectiveTag, rolePages]
  );

  const searchResults = useMemo(
    () => searching
      ? searchItems(filteredPages, query, {
          allItems: items,
          includeContainedVocabulary: true,
        })
      : [],
    [filteredPages, items, query, searching]
  );

  const orderedPages = useMemo(
    () => searching ? [] : orderItems(filteredPages, browseOrder),
    [browseOrder, filteredPages, searching]
  );
  const pinnedIds = useMemo(() => new Set(pinnedPageIds), [pinnedPageIds]);
  const pinnedPages = orderedPages.filter((page) => pinnedIds.has(page.id));
  const otherPages = orderedPages.filter((page) => !pinnedIds.has(page.id));
  const resultCount = searching ? searchResults.length : orderedPages.length;
  const refineCount = Number(maintenanceView !== MAINTENANCE_VIEWS.all)
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

  const renderCard = (page, reason = null) => (
    <PageHubCard
      key={page.id}
      page={page}
      items={items}
      pinned={pinnedIds.has(page.id)}
      reason={reason}
      onOpen={onSelect}
      onPinnedChange={onPagePinnedChange}
    />
  );

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
          <h1 className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
            Pages
          </h1>
          <button
            type="button"
            aria-label="Add page"
            onClick={() => setAskPageStarter(true)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center justify-self-end rounded-lg"
            style={{ color: C.ink }}
          >
            <Plus size={21} />
          </button>
        </div>
      </header>

      <main className="px-4 pb-28 pt-4" style={{ background: C.paper }}>
        <div className="flex flex-wrap gap-2" aria-label="Page roles">
          {PAGE_ROLE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={roleFilter === option.value}
              onClick={() => setRoleFilter(option.value)}
              className="min-h-11 px-3"
            >
              {option.label}
              {roleFilter === option.value && (
                <span style={{ fontFamily: MONO, opacity: 0.75 }}>{resultCount}</span>
              )}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
          <RefineBar
            panelId="page-hub-refine"
            open={refineOpen}
            count={refineCount}
            onToggle={() => setRefineOpen((open) => !open)}
          />
          <button
            type="button"
            aria-label={searchOpen ? (query ? "Clear page search" : "Close page search") : "Search pages"}
            aria-pressed={searchOpen}
            onClick={toggleSearch}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full"
            style={{ color: searchOpen ? C.pen : C.mut }}
          >
            <Search size={20} />
          </button>
        </div>

        {searchOpen && (
          <div className="mt-2">
            <SearchBar
              value={query}
              onChange={setQuery}
              resultCount={searchResults.length}
              logMisses={false}
              placeholder="Search your pages and their vocabulary…"
              inputLabel="Search pages"
              autoFocus
            />
          </div>
        )}

        {refineOpen && (
          <RefinePanel id="page-hub-refine">
            <RefineSelect
              label="View"
              ariaLabel="Page view"
              value={maintenanceView}
              onChange={setMaintenanceView}
            >
              {PAGE_VIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </RefineSelect>

            <RefineSelect
              label="Order"
              ariaLabel="Page order"
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
              ariaLabel="Page tag"
              value={effectiveTag || ""}
              onChange={(value) => setTagFilter(value || null)}
              disabled={tagCounts.length === 0}
              wide
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
              <section aria-labelledby="page-search-heading">
                <PageSectionHeading count={`${searchResults.length} total`}>
                  <span id="page-search-heading">Matching pages</span>
                </PageSectionHeading>
                <div className="space-y-[9px]">
                  {searchResults.map(({ item, reason }) => renderCard(item, reason))}
                </div>
              </section>
            ) : (
              <div className="rounded-xl border p-4 text-sm" style={{ background: C.card, borderColor: C.line, color: C.mut }}>
                No Pages match “{query.trim()}” in this view.
              </div>
            )
          ) : orderedPages.length > 0 ? (
            <>
              {pinnedPages.length > 0 && (
                <section aria-labelledby="pinned-pages-heading">
                  <PageSectionHeading count={`${pinnedPages.length} ${pinnedPages.length === 1 ? "page" : "pages"}`}>
                    <span id="pinned-pages-heading">Pinned</span>
                  </PageSectionHeading>
                  <div className="space-y-[9px]">{pinnedPages.map((page) => renderCard(page))}</div>
                </section>
              )}

              {otherPages.length > 0 && (
                <section aria-label="All matching pages">
                  <div className="space-y-[9px]">{otherPages.map((page) => renderCard(page))}</div>
                </section>
              )}
            </>
          ) : (
            <div className="rounded-xl border p-4 text-sm" style={{ background: C.card, borderColor: C.line, color: C.mut }}>
              {pages.length === 0
                ? "Your first Page can be Notes, Vocabulary, a Source, or a Grammar guide."
                : "No Pages match these filters."}
            </div>
          )}
        </div>
      </main>

      {askPageStarter && (
        <PageStarterGallery
          items={items}
          onClose={() => setAskPageStarter(false)}
          onChoose={(starter) => {
            setAskPageStarter(false);
            setPageStarter(starter);
          }}
        />
      )}

      {pageStarter && (
        <AddSheet
          kind="page"
          pageStarter={pageStarter}
          items={items}
          onClose={() => setPageStarter(null)}
          onCreated={(id) => {
            setPageStarter(null);
            reload();
            onSelect(id);
          }}
        />
      )}
    </>
  );
}
