import { FileText } from "lucide-react";
import { C } from "../theme.jsx";

/**
 * Where one word is actually used — the first page it lives on, plus a count of the rest.
 *
 * Shared by the Cuaderno card and the Words & phrases hub card so the two surfaces can never
 * describe the same placements differently. Callers pass contexts from
 * `activePageContextsForLexical`, which already leaves disabled structures out (§7).
 *
 * A card row is the page title and nothing else — not the placement kind, not the `detail` (group
 * name, grammar section, capture location). On a phone that tail only ever arrived truncated
 * mid-word, and the title alone is what the owner is actually scanning for. Both belong to the
 * entry's own "Used in pages" list, which has the room for them.
 *
 * `onOpenPage` makes the row a link to its page. It is optional because the Cuaderno card renders
 * this summary *inside* its own card button, where a nested button would be invalid HTML; that
 * caller gets a plain row.
 */
export default function PageContextSummary({ contexts = [], onOpenPage = null, onOpenMore = null }) {
  // With only the title left, several placements on one page collapse to the same row, and a
  // repeated line reads as a rendering bug. One row per page, and "+N more" counts from that same
  // list so the row and the count can never disagree.
  const seen = new Set();
  const pages = [];
  for (const context of contexts) {
    if (seen.has(context.pageId)) continue;
    seen.add(context.pageId);
    pages.push(context);
  }
  if (pages.length === 0) return null;

  const [first] = pages;
  const remaining = pages.length - 1;
  const row = (
    <>
      <FileText size={11} className="shrink-0" style={{ color: C.mut }} />
      <span className="min-w-0 truncate" style={{ color: C.ink }}>{first.pageTitle}</span>
    </>
  );
  const rowClass = "flex w-full items-center gap-1.5 text-left";

  return (
    <div className="mt-2 text-xs">
      {onOpenPage ? (
        <button
          type="button"
          aria-label={`Open ${first.pageTitle}`}
          onClick={() => onOpenPage(first.pageId)}
          className={`${rowClass} min-h-8 active:opacity-70`}
        >
          {row}
        </button>
      ) : (
        <div className={rowClass}>{row}</div>
      )}
      {remaining > 0 && (
        onOpenMore ? (
          <button
            type="button"
            onClick={onOpenMore}
            className="min-h-8 pl-[18px] text-left active:opacity-70"
            style={{ color: C.mut }}
          >
            +{remaining} more
          </button>
        ) : (
          <div className="pl-[18px]" style={{ color: C.mut }}>+{remaining} more</div>
        )
      )}
    </div>
  );
}
