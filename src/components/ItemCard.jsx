import { FileText, CalendarDays, Library, Pin, BookOpen, Braces } from "lucide-react";
import { C, SERIF, MONO, Hi } from "../theme.jsx";
import { emptyItemState } from "../useNotebook.js";
import { meaningGlossText } from "../lib/meanings.js";
import { deriveCollection } from "../lib/collections.js";
import { activePageContextsForLexical } from "../lib/pageReferences.js";
import { PAGE_FOCUSES, enabledPageRoles, isJournalPage } from "../lib/pageKinds.js";
import PageContextSummary from "./PageContextSummary.jsx";

export const POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "other"];
export const POS_ABBR = { noun: "s.", verb: "v.", adjective: "adj.", adverb: "adv.", other: "" };

/** Personal `form` terminology. Dictionary part-of-speech labels remain separate. */
export const personalLexicalForm = (item) => (item?.form === "phrase" ? "phrase" : "word");
export const personalHeadingSuffix = (item) =>
  personalLexicalForm(item) === "phrase" ? "phrase" : POS_ABBR[item?.pos] || "";

const amount = (count, singular) => `${count} ${count === 1 ? singular : `${singular}s`}`;

export default function ItemCard({
  item,
  state = emptyItemState,
  onOpen,
  reason,
  items = [],
  pinned = false,
  onPinnedChange,
}) {
  const isPage = item.type === "page";
  const journal = isPage && isJournalPage(item);
  const collection = isPage && item.collection?.enabled ? deriveCollection(item, items) : null;
  const headingSuffix = isPage ? "" : personalHeadingSuffix(item);
  const glosses = isPage ? "" : meaningGlossText(item);
  const title = isPage ? item.title || "Untitled page" : item.term;
  const PageIcon = item.pageFocus === PAGE_FOCUSES.source
    ? BookOpen
    : item.pageFocus === PAGE_FOCUSES.grammar
      ? Braces
      : item.pageFocus === PAGE_FOCUSES.vocabulary
        ? Library
        : FileText;
  const roles = isPage && !journal ? enabledPageRoles(item) : [];
  const roleDetails = {
    notes: { label: "Notes", icon: FileText },
    vocabulary: { label: "Vocabulary", icon: Library },
    source: { label: "Source", icon: BookOpen },
    grammar: { label: "Grammar", icon: Braces },
  };
  const captureCount = item.source?.enabled ? item.source.captures?.length || 0 : 0;
  const grammarSectionCount = item.grammar?.enabled ? item.grammar.sections?.length || 0 : 0;
  const grammarExampleCount = item.grammar?.enabled
    ? (item.grammar.sections || []).reduce((total, section) => total + (section.examples || []).length, 0)
    : 0;
  const pageContexts = !isPage && reason ? activePageContextsForLexical(item.id, items) : [];

  return (
    <div
      className="relative w-full rounded-xl border"
      style={{ background: C.card, borderColor: C.line }}
    >
      <button
        onClick={() => onOpen(item.id)}
        aria-label={isPage ? title : undefined}
        className={`w-full text-left px-4 py-3 active:opacity-80 ${
          isPage && onPinnedChange ? "pr-14" : ""
        }`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
            {isPage && <PageIcon size={14} className="inline mr-1.5 -mt-0.5" style={{ color: C.mut }} />}
            <Hi on={state.tricky}>{title}</Hi>
            {headingSuffix && (
              <>
                {" "}
                <span className="italic font-normal text-sm ml-2" style={{ color: C.mut }}>
                  {headingSuffix}
                </span>
              </>
            )}
          </div>
          {state.views > 0 && (
            <span className="text-xs shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
              ×{state.views}
            </span>
          )}
        </div>

        {/* Clamped: a meaning with several lines must not stretch a row in a long list. */}
        {!isPage && glosses && (
          <div className="text-sm mt-0.5 whitespace-pre-wrap line-clamp-2" style={{ color: C.ink }}>
            — {glosses}
          </div>
        )}
        {roles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Page roles">
            {roles.map((role) => {
              const detail = roleDetails[role];
              const RoleIcon = detail.icon;
              return (
                <span key={role} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: C.line, background: C.penPale, color: C.penDark }}>
                  <RoleIcon size={10} /> {detail.label}
                </span>
              );
            })}
          </div>
        )}
        {isPage && roles.length > 0 && (
          <div className="text-xs mt-1" style={{ fontFamily: MONO, color: C.mut }}>
            {[
              item.source?.enabled ? amount(captureCount, "capture") : null,
              item.grammar?.enabled ? `${amount(grammarSectionCount, "section")} · ${amount(grammarExampleCount, "example")}` : null,
              item.collection?.enabled ? `${amount(collection?.itemCount || 0, "item")} · ${amount(collection?.groupCount || 0, "group")}` : null,
            ].filter(Boolean).join(" · ")}
          </div>
        )}
        {journal && item.pageDate && (
          <div className="text-xs mt-1 inline-flex items-center gap-1" style={{ fontFamily: MONO, color: C.mut }}>
            <CalendarDays size={11} /> {item.pageDate}
          </div>
        )}
        {isPage && item.body && (
          <div className="text-sm mt-1 line-clamp-2" style={{ color: C.mut }}>
            {item.body.slice(0, 120)}
            {item.body.length > 120 ? "…" : ""}
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {item.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: C.penPale, color: C.penDark }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {reason && (
          <div className="mt-1.5 text-xs italic" style={{ color: C.mut }}>
            {reason}
          </div>
        )}
        <PageContextSummary contexts={pageContexts} />
      </button>

      {isPage && onPinnedChange && (
        <button
          type="button"
          aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`}
          aria-pressed={pinned}
          onClick={() => onPinnedChange(!pinned)}
          className="absolute top-1.5 right-1.5 min-w-11 min-h-11 inline-flex items-center justify-center rounded-lg active:opacity-70"
          style={{ color: pinned ? C.pen : C.mut }}
        >
          <Pin size={17} fill={pinned ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}
