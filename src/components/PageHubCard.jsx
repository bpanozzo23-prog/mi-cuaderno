import { Bookmark, BookmarkCheck } from "lucide-react";
import { C, MONO, SERIF, useHubTitleSize } from "../theme.jsx";
import { enabledPageRoles } from "../lib/pageKinds.js";
import { markdownPreviewText } from "../lib/noteMarkdown.js";
import { pageFolderStyle, pageSummary } from "./pageRoleMeta.js";
import PageFolderTab from "./PageFolderTab.jsx";

export default function PageHubCard({
  page,
  items = [],
  pinned = false,
  reason = null,
  onOpen,
  onPinnedChange,
}) {
  const title = page.title || "Untitled page";
  const [primaryRole] = enabledPageRoles(page);
  const summary = pageSummary(page, items);
  const bodyPreview = markdownPreviewText(page.body);
  const [titleRef, titlePx] = useHubTitleSize(title, { weight: 800, letterSpacing: "0.63px" });

  return (
    <div
      className="page-folder-card relative w-full border"
      style={pageFolderStyle(primaryRole)}
    >
      <button
        type="button"
        onClick={() => onOpen(page.id)}
        aria-label={title}
        className="relative w-full text-left px-4 py-4 pr-14 active:opacity-80"
      >
        <PageFolderTab role={primaryRole} />

        <div
          ref={titleRef}
          className="leading-tight"
          style={{
            fontFamily: SERIF,
            color: C.ink,
            fontWeight: 800,
            letterSpacing: "0.035em",
            fontSize: titlePx,
          }}
        >
          {title}
        </div>
        {summary && (
          <div className="mt-1.5 text-sm leading-relaxed" style={{ color: C.mut }}>
            {summary}
          </div>
        )}

        {page.pageFocus === "notes" && bodyPreview && (
          <div className="mt-1 text-sm line-clamp-2" style={{ color: C.mut }}>
            {bodyPreview}
          </div>
        )}

        {reason && (
          <div className="mt-2 text-xs italic" style={{ color: C.mut }}>
            {reason}
          </div>
        )}
      </button>

      <button
        type="button"
        aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`}
        aria-pressed={pinned}
        onClick={() => onPinnedChange(page.id, !pinned)}
        className="absolute right-1.5 top-1.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg active:opacity-70"
        style={{ color: pinned ? C.pen : C.mut, fontFamily: MONO }}
      >
        {pinned ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
      </button>
    </div>
  );
}
