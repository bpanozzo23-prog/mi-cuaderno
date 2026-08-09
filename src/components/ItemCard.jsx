import { CalendarDays, Pin } from "lucide-react";
import { C, SERIF, MONO, Hi } from "../theme.jsx";
import { emptyItemState } from "../useNotebook.js";
import { firstMeaningGloss } from "../lib/meanings.js";
import { activePageContextsForLexical } from "../lib/pageReferences.js";
import { enabledPageRoles, hasEnabledStructuredCapability, isJournalPage } from "../lib/pageKinds.js";
import { pageFolderStyle, pageSummary } from "./pageRoleMeta.js";
import PageFolderTab from "./PageFolderTab.jsx";
import PageContextSummary from "./PageContextSummary.jsx";
import TagChip from "./TagChip.jsx";
import { PART_OF_SPEECH_ABBR, grammarAbbreviations } from "../lib/partOfSpeech.js";
import { markdownPreviewText } from "../lib/noteMarkdown.js";

export const POS_OPTIONS = ["", "noun", "verb", "adjective", "adverb", "other"];
export const POS_ABBR = PART_OF_SPEECH_ABBR;

/** Personal `form` terminology. Dictionary part-of-speech labels remain separate. */
export const personalLexicalForm = (item) => (item?.form === "phrase" ? "phrase" : "word");
/** A phrase reads as one on sight, so it carries no heading suffix — only words are abbreviated. */
export const personalHeadingSuffix = (item, attachedEntry = null) => {
  if (personalLexicalForm(item) === "phrase") return "";
  const pos = item?.pos || attachedEntry?.pos;
  const gender = pos === "noun" ? attachedEntry?.gender : null;
  return grammarAbbreviations(pos, gender);
};

export default function ItemCard({
  item,
  state = emptyItemState,
  onOpen,
  reason,
  items = [],
  pinned = false,
  onPinnedChange,
  showTags = true,
}) {
  const isPage = item.type === "page";
  const journal = isPage && isJournalPage(item);
  const headingSuffix = isPage ? "" : personalHeadingSuffix(item);
  const gloss = isPage ? "" : firstMeaningGloss(item);
  const title = isPage ? item.title || "Untitled page" : item.term;
  const bodyPreview = isPage ? markdownPreviewText(item.body) : "";
  /* A Diario entry is a page without a role to name, so its tab stays bare. */
  const [primaryRole = null] = isPage && !journal ? enabledPageRoles(item) : [];
  /* The summary's Notes fallback belongs to the Pages hub; here a page with nothing enabled says
     what it is through its own preview and date instead. */
  const summary = isPage && hasEnabledStructuredCapability(item) ? pageSummary(item, items) : "";
  const pageContexts = !isPage && reason ? activePageContextsForLexical(item.id, items) : [];
  return (
    <div
      className={`relative w-full border ${isPage ? "page-folder-card" : "rounded-xl"}`}
      style={
        isPage
          ? pageFolderStyle(primaryRole)
          : {
              background: C.card,
              borderColor: C.line,
            }
      }
    >
      <button
        onClick={() => onOpen(item.id)}
        aria-label={isPage ? title : undefined}
        className={`relative w-full text-left px-4 py-3 active:opacity-80 ${
          isPage && onPinnedChange ? "pr-14" : ""
        }`}
      >
        {isPage && <PageFolderTab role={primaryRole} />}

        <div className="flex items-baseline justify-between gap-3">
          <div
            className={`min-w-0 ${isPage ? "text-lg" : "text-[18px]"}`}
            style={{
              fontFamily: SERIF,
              color: C.ink,
              fontWeight: isPage ? 800 : 700,
              fontStyle: "normal",
              letterSpacing: isPage ? "0.035em" : undefined,
            }}
          >
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

        {/* One meaning, clamped: a browsing row must not become a paragraph. The hanging indent
            sets wrapped lines under the gloss text rather than back under the dash, the way a
            printed dictionary does — padding positions the text, the negative indent pulls only
            the first line's dash back out. */}
        {!isPage && gloss && (
          <div
            className="mt-2 pl-[26px] -indent-[16px] line-clamp-2 text-[13px] leading-relaxed"
            style={{ color: C.entryMeaning }}
          >
            <span style={{ color: C.entryMeaningDash }}>—</span> {gloss}
          </div>
        )}
        {summary && (
          <div className="text-xs mt-1" style={{ fontFamily: MONO, color: C.mut }}>
            {summary}
          </div>
        )}
        {journal && item.pageDate && (
          <div className="text-xs mt-1 inline-flex items-center gap-1" style={{ fontFamily: MONO, color: C.mut }}>
            <CalendarDays size={11} /> {item.pageDate}
          </div>
        )}
        {isPage && bodyPreview && (
          <div className="text-sm mt-1 line-clamp-2" style={{ color: C.mut }}>
            {bodyPreview.slice(0, 120)}
            {bodyPreview.length > 120 ? "…" : ""}
          </div>
        )}

        {showTags && item.tags.length > 0 && (
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {item.tags.map((t) => (
              <TagChip key={t} tag={t} />
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
