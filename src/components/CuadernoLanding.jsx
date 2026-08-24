import {
  BookOpen,
  ChevronRight,
  FileText,
  Languages,
  Plus,
  Route,
  Sprout,
} from "lucide-react";
import { useState } from "react";
import { C, SERIF } from "../theme.jsx";
import { firstMeaningGloss } from "../lib/meanings.js";
import { activePageContextsForLexical } from "../lib/pageReferences.js";
import SearchBar from "./SearchBar.jsx";
import headerIllustration from "../assets/cuaderno-landing/header-notebook-pen.png";
import wordsIllustration from "../assets/cuaderno-landing/words-index-cards.png";
import pagesIllustration from "../assets/cuaderno-landing/pages-folders.png";

const PAGE_LABELS = {
  notes: "Notes page",
  vocabulary: "Vocabulary page",
  source: "Source page",
  grammar: "Grammar page",
};

const quietFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pen)]";

function itemTitle(item) {
  return item?.type === "page" ? item.title || "Untitled page" : item?.term || "Untitled item";
}

function itemMeta(item) {
  if (item?.type === "page") return PAGE_LABELS[item.pageFocus] || "Page";
  if (item?.form === "phrase") return "Phrase";
  if (item?.pos) return item.pos.charAt(0).toUpperCase() + item.pos.slice(1);
  return "Word";
}

function itemRecognition(item) {
  if (item?.type === "page") return "";
  return firstMeaningGloss(item) || "";
}

function searchResultCopy(result) {
  if (result.kind === "entry") {
    return {
      title: result.entry.lemma,
      meta: "Dictionary",
      recognition: result.entry.senses?.[0]?.gloss || "",
      Icon: BookOpen,
    };
  }
  return {
    title: itemTitle(result.item),
    meta: itemMeta(result.item),
    recognition: itemRecognition(result.item),
    Icon: result.item.type === "page" ? FileText : Languages,
  };
}

function SearchResultRow({ result, onOpen, items }) {
  const { title, meta, recognition, Icon } = searchResultCopy(result);
  const reason = ["exact match", "page title", "starts with your search"].includes(result.reason)
    ? ""
    : result.reason;
  const id = result.kind === "entry" ? result.entry.id : result.item.id;
  const pageContext = result.kind === "item" && result.item.type === "lexical"
    ? activePageContextsForLexical(result.item.id, items)[0]
    : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      aria-label={`${title}. ${meta}${recognition ? `. ${recognition}` : ""}`}
      className={`flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left active:opacity-75 ${quietFocus}`}
      style={{ color: C.ink }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: C.penPale, color: C.pen }}
      >
        <Icon size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold" style={{ fontFamily: SERIF }}>
          {title}
        </span>
        <span className="block truncate text-xs" style={{ color: C.entryMeaning }}>
          {meta}{recognition ? ` · ${recognition}` : ""}
        </span>
        {reason && (
          <span className="block truncate text-[11px] italic" style={{ color: C.mut }}>
            Matched {reason}
          </span>
        )}
        {pageContext && (
          <span className="block truncate text-[11px]" style={{ color: C.pen }}>
            {pageContext.pageTitle}
          </span>
        )}
      </span>
      <ChevronRight size={17} className="shrink-0" aria-hidden="true" style={{ color: C.pen }} />
    </button>
  );
}

export function SearchCreateAction({ query, onCreate, className = "" }) {
  const term = String(query || "").trim();
  if (!term || !onCreate) return null;

  return (
    <button
      type="button"
      onClick={() => onCreate(term)}
      className={`flex min-h-12 w-full items-center gap-3 border-t px-4 py-2.5 text-left text-sm font-semibold active:opacity-75 ${quietFocus} ${className}`}
      style={{ background: C.card, borderColor: C.line, color: C.pen }}
    >
      <Plus size={17} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words">
        Add <span style={{ fontFamily: SERIF }}>“{term}”</span> as a new word or phrase
      </span>
    </button>
  );
}

function CollectionDoor({ label, count, image, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}. ${count}`}
      className={`min-w-0 overflow-hidden rounded-2xl border text-left active:opacity-80 ${quietFocus}`}
      style={{
        background: C.card,
        borderColor: C.line,
        boxShadow: `0 5px 14px color-mix(in srgb, ${C.ink} 8%, transparent)`,
      }}
    >
      <span className="flex h-40 items-center justify-center overflow-hidden px-2 pt-2">
        <img src={image} alt="" className="h-full w-full scale-[1.3] object-contain" />
      </span>
      <span className="block border-t px-3 py-3" style={{ borderColor: C.line }}>
        <span
          className="block whitespace-nowrap text-[14px] font-bold leading-tight"
          style={{ color: C.ink, fontFamily: SERIF }}
        >
          {label}
        </span>
        <span className="mt-1 block text-[11px] leading-snug" style={{ color: C.entryMeaning }}>
          {count}
        </span>
      </span>
    </button>
  );
}

function RecentIcon({ item }) {
  const isPage = item.type === "page";
  const Icon = isPage ? FileText : Languages;
  const color = isPage ? C.pageFolderNotesLine : item.form === "phrase" ? C.green : C.pageFolderGrammarLine;
  return <Icon size={19} aria-hidden="true" style={{ color }} />;
}

function RecentRow({ item, onOpen }) {
  const title = itemTitle(item);
  const recognition = itemRecognition(item);
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      aria-label={`${title}. ${itemMeta(item)}${recognition ? `. ${recognition}` : ""}`}
      className={`flex min-h-[62px] w-full items-center gap-3 px-4 py-2 text-left active:opacity-75 ${quietFocus}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">
        <RecentIcon item={item} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
          {title}
        </span>
        <span className="block truncate text-xs" style={{ color: C.entryMeaning }}>
          {itemMeta(item)}{recognition ? ` · ${recognition}` : ""}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0" aria-hidden="true" style={{ color: C.ink }} />
    </button>
  );
}

export default function CuadernoLanding({
  query,
  onQueryChange,
  results,
  pending,
  searchSettled,
  dictionary,
  onMissLogged,
  wordCount,
  phraseCount,
  pageCount,
  totalCount,
  recentItems,
  items,
  onOpen,
  onOpenLexical,
  onOpenPages,
  onBrowseAll,
  onShowAllResults,
  onOpenCuidar,
  onCreateLexical,
  canWander,
  onWander,
}) {
  const searching = query.trim() !== "";
  const topResults = results.slice(0, 5);
  // Collapsed shows 5 of the up-to-10 recent items Cuaderno passes in; in-memory only, so the
  // landing reopens compact.
  const [recentExpanded, setRecentExpanded] = useState(false);
  const visibleRecent = recentExpanded ? recentItems : recentItems.slice(0, 5);
  const recentOverflow = recentItems.length > 5;

  return (
    <main className="px-4 pb-32 pt-2" style={{ background: C.paper }}>
      <header className="flex min-h-[86px] items-center justify-between gap-2">
        <h1
          className="relative z-0 whitespace-nowrap text-[28px] font-bold leading-none"
          style={{ color: C.ink, fontFamily: SERIF }}
        >
          <span className="relative z-10">Mi cuaderno</span>
          <span
            aria-hidden="true"
            className="absolute bottom-[-5px] left-[31%] -z-0 h-[7px] w-[66%] -rotate-1 rounded-full opacity-90"
            style={{ background: C.hi }}
          />
        </h1>
        <img
          src={headerIllustration}
          alt=""
          className="h-[78px] w-[130px] shrink-0 object-contain"
        />
      </header>

      <div className="relative z-20 mt-1">
        <SearchBar
          value={query}
          onChange={onQueryChange}
          resultCount={results.length}
          pending={pending}
          onMissLogged={onMissLogged}
          placeholder={dictionary ? "Search your notebook and dictionary…" : "Search your notebook…"}
          className="min-h-[54px] rounded-2xl px-3 shadow-sm"
          inputClassName="text-[15px]"
        />

        {searching && (
          <section
            aria-label="Search results"
            className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[420px] overflow-y-auto rounded-2xl border"
            style={{
              background: C.card,
              borderColor: C.line,
              boxShadow: `0 12px 30px color-mix(in srgb, ${C.ink} 16%, transparent)`,
            }}
          >
            {topResults.length > 0 ? (
              <div className="divide-y" style={{ borderColor: C.line }}>
                {topResults.map((result) => (
                  <SearchResultRow key={result.key} result={result} onOpen={onOpen} items={items} />
                ))}
              </div>
            ) : (
              <div className="px-4 py-5 text-sm" style={{ color: C.entryMeaning }}>
                {pending ? "Searching…" : `Nothing matches “${query.trim()}”.`}
              </div>
            )}
            {results.length > 5 && (
              <button
                type="button"
                onClick={onShowAllResults}
                className={`flex min-h-11 w-full items-center justify-center gap-1 border-t px-3 text-sm font-semibold ${quietFocus}`}
                style={{ borderColor: C.line, color: C.pen }}
              >
                See all {results.length} results
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
            {searchSettled && (
              <SearchCreateAction query={query} onCreate={onCreateLexical} />
            )}
          </section>
        )}
      </div>

      <div aria-hidden={searching ? true : undefined} inert={searching ? true : undefined}>
      <section aria-label="Notebook collections" className="mt-5 grid grid-cols-2 gap-3">
        <CollectionDoor
          label="Words & phrases"
          count={`${wordCount} ${wordCount === 1 ? "word" : "words"} · ${phraseCount} ${phraseCount === 1 ? "phrase" : "phrases"}`}
          image={wordsIllustration}
          onClick={onOpenLexical}
        />
        <CollectionDoor
          label="Pages"
          count={`${pageCount} ${pageCount === 1 ? "page" : "pages"}`}
          image={pagesIllustration}
          onClick={onOpenPages}
        />
      </section>

      <button
        type="button"
        onClick={onBrowseAll}
        className={`mx-auto mt-1 flex min-h-11 items-center gap-1 px-3 text-sm font-semibold ${quietFocus}`}
        style={{ color: C.pen }}
      >
        Browse all {totalCount} {totalCount === 1 ? "item" : "items"}
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      <section aria-labelledby="recent-heading">
        <div className="mb-2 flex items-center gap-3">
          <h2 id="recent-heading" className="text-[20px] font-bold" style={{ color: C.ink, fontFamily: SERIF }}>
            Recent
          </h2>
          <span className="h-px flex-1" aria-hidden="true" style={{ background: C.line }} />
        </div>
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            background: C.card,
            borderColor: C.line,
            boxShadow: `3px 4px 0 ${C.paper}, 4px 5px 0 ${C.line}`,
          }}
        >
          {recentItems.length > 0 ? (
            <div className="divide-y" style={{ borderColor: C.line }}>
              {visibleRecent.map((item) => (
                <RecentRow key={item.id} item={item} onOpen={onOpen} />
              ))}
              {recentOverflow && (
                <button
                  type="button"
                  onClick={() => setRecentExpanded((open) => !open)}
                  aria-expanded={recentExpanded}
                  className={`flex min-h-11 w-full items-center justify-center gap-1 px-4 text-sm font-semibold active:opacity-75 ${quietFocus}`}
                  style={{ color: C.pen }}
                >
                  {recentExpanded ? "Show less" : `Show more (${recentItems.length - 5})`}
                </button>
              )}
            </div>
          ) : (
            <div className="px-4 py-5 text-sm" style={{ color: C.entryMeaning }}>
              Your recently edited words, phrases, and pages will appear here.
            </div>
          )}
        </div>
      </section>

      {Boolean(onOpenCuidar) && (
        // Deliberately static: no counts, no category info, no notebook-dependent voice. The
        // icon and label never pressure — whether anything needs tending is discovered inside.
        <button
          type="button"
          onClick={onOpenCuidar}
          className={`mt-6 flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-2 text-left active:opacity-80 ${quietFocus}`}
          style={{
            background: C.card,
            borderColor: C.line,
            color: C.ink,
          }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: C.roleSourcePale, color: C.roleSourceInk }}
          >
            <Sprout size={20} aria-hidden="true" />
          </span>
          <span className="text-[16px] font-bold leading-tight" style={{ fontFamily: SERIF }}>
            Cuidar
          </span>
        </button>
      )}

      {canWander && (
        <button
          type="button"
          onClick={onWander}
          className={`mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-2 text-left active:opacity-80 ${quietFocus}`}
          style={{
            background: C.roleSourcePale,
            borderColor: C.pageFolderSourceLine,
            color: C.ink,
          }}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: C.card, color: C.pageFolderSourceLine }}
          >
            <Route size={20} aria-hidden="true" />
          </span>
          <span className="text-[16px] font-bold leading-tight" style={{ fontFamily: SERIF }}>
            Pasear
          </span>
        </button>
      )}
      </div>
    </main>
  );
}
