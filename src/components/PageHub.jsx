import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Search, SlidersHorizontal } from "lucide-react";
import { C, Chip, MONO, SERIF } from "../theme.jsx";
import AddSheet from "./AddSheet.jsx";
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

const controlStyle = { background: C.card, borderColor: C.line, color: C.ink };

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
          <div className="text-lg font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
            Pages
          </div>
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

      <main className="px-4 pb-28 pt-7" style={{ background: C.paper }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className="text-[11px] uppercase"
              style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.14em" }}
            >
              One library · overlapping roles
            </div>
            <h1 className="mt-2 text-3xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
              Your pages
            </h1>
          </div>
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
        <p className="mt-3 max-w-sm text-base leading-relaxed" style={{ color: C.mut }}>
          Sources, Grammar guides, Collections, and notes stay together.
        </p>

        {searchOpen && (
          <div className="mt-4">
            <SearchBar
              value={query}
              onChange={setQuery}
              resultCount={searchResults.length}
              onMissLogged={reload}
              placeholder="Search your pages and their vocabulary…"
              inputLabel="Search pages"
              autoFocus
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2" aria-label="Page roles">
          {PAGE_ROLE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              active={roleFilter === option.value}
              onClick={() => setRoleFilter(option.value)}
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
            aria-controls="page-hub-refine"
            onClick={() => setRefineOpen((open) => !open)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm"
            style={{ color: refineCount ? C.pen : C.mut }}
          >
            <SlidersHorizontal size={16} />
            Refine{refineCount ? ` (${refineCount})` : ""}
          </button>
        </div>

        {refineOpen && (
          <div id="page-hub-refine" className="mt-1 grid grid-cols-2 gap-2 rounded-xl border p-3" style={{ borderColor: C.line, background: C.card }}>
            <label className="min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">View</span>
              <select
                aria-label="Page view"
                value={maintenanceView}
                onChange={(event) => setMaintenanceView(event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-lg border px-2 text-sm outline-none"
                style={controlStyle}
              >
                {PAGE_VIEW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">Order</span>
              <select
                aria-label="Page order"
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

            <label className="col-span-2 min-w-0 text-xs" style={{ color: C.mut }}>
              <span className="mb-1 block">Tag</span>
              <select
                aria-label="Page tag"
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

        <div className="mt-8 space-y-8">
          {searching ? (
            searchResults.length > 0 ? (
              <section aria-labelledby="page-search-heading">
                <PageSectionHeading count={`${searchResults.length} total`}>
                  <span id="page-search-heading">Matching pages</span>
                </PageSectionHeading>
                <div className="space-y-3">
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
                  <div className="space-y-3">{pinnedPages.map((page) => renderCard(page))}</div>
                </section>
              )}

              {otherPages.length > 0 && (
                <section aria-labelledby="all-pages-heading">
                  <PageSectionHeading count={`${resultCount} total`}>
                    <span id="all-pages-heading">All matching pages</span>
                  </PageSectionHeading>
                  <div className="space-y-3">{otherPages.map((page) => renderCard(page))}</div>
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
