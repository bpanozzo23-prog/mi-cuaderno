import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Braces,
  FileText,
  Library,
} from "lucide-react";
import { C, MONO, SERIF, hubTitleSize } from "../theme.jsx";
import { deriveCollection } from "../lib/collections.js";
import { enabledPageRoles } from "../lib/pageKinds.js";
import { markdownPreviewText } from "../lib/noteMarkdown.js";

const amount = (count, singular) => `${count} ${count === 1 ? singular : `${singular}s`}`;

const ROLE_DETAILS = {
  notes: { label: "Notes", icon: FileText, background: C.penPale, color: C.penDark },
  vocabulary: { label: "Vocabulary", icon: Library, background: "#F7F0D8", color: "#695B27" },
  source: { label: "Source", icon: BookOpen, background: C.greenPale, color: C.green },
  grammar: { label: "Grammar", icon: Braces, background: "#F0ECF8", color: "#574676" },
};

const SOURCE_FORMAT_LABELS = {
  book: "Book",
  audio: "Audio",
  video: "Video",
  article_lesson: "Article or lesson",
  other: "Source",
};

function pageSummary(page, items) {
  const parts = [];

  if (page.source?.enabled) {
    const identity = [SOURCE_FORMAT_LABELS[page.source.format], page.source.creator]
      .filter(Boolean)
      .join(" · ");
    if (identity) parts.push(identity);
    parts.push(amount(page.source.captures?.length || 0, "capture"));
  }

  if (page.grammar?.enabled) {
    const sections = page.grammar.sections || [];
    const examples = sections.reduce((total, section) => total + (section.examples?.length || 0), 0);
    parts.push(amount(sections.length, "section"));
    parts.push(amount(examples, "example"));
  }

  if (page.collection?.enabled) {
    const collection = deriveCollection(page, items);
    parts.push(amount(collection.itemCount, "item"));
    parts.push(amount(collection.groupCount, "group"));
  }

  if (parts.length === 0) {
    if (page.tags?.length) return page.tags.join(" · ");
    return page.body?.trim() ? "Notes page" : "Empty notes page";
  }

  return parts.join(" · ");
}

export default function PageHubCard({
  page,
  items = [],
  pinned = false,
  reason = null,
  onOpen,
  onPinnedChange,
}) {
  const title = page.title || "Untitled page";
  const roles = enabledPageRoles(page);
  const summary = pageSummary(page, items);
  const bodyPreview = markdownPreviewText(page.body);

  return (
    <div
      className="page-folder-card relative w-full border shadow-entry-card"
      style={{
        background: C.pageFolder,
        borderColor: C.pageFolderLine,
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(page.id)}
        aria-label={title}
        className="relative w-full text-left px-4 py-4 pr-14 active:opacity-80"
      >
        <div className="flex flex-wrap gap-1.5" aria-label="Page roles">
          {roles.map((role) => {
            const detail = ROLE_DETAILS[role];
            const RoleIcon = detail.icon;
            return (
              <span
                key={role}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
                style={{ background: detail.background, color: detail.color }}
              >
                <RoleIcon size={13} /> {detail.label}
              </span>
            );
          })}
        </div>

        <div
          className={`mt-2 leading-tight ${hubTitleSize(title)}`}
          style={{ fontFamily: SERIF, color: C.ink, fontWeight: 800, letterSpacing: "0.035em" }}
        >
          {title}
        </div>
        <div className="mt-1.5 text-sm leading-relaxed" style={{ color: C.mut }}>
          {summary}
        </div>

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
