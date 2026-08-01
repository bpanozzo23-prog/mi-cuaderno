import { X, FileText, CalendarDays, Type, BookMarked, Unlink } from "lucide-react";
import { C, SERIF, MONO } from "../theme.jsx";
import { POS_ABBR } from "./ItemCard.jsx";
import { POS_LABEL } from "./DictCard.jsx";
import { timeAgo } from "../lib/dates.js";

/**
 * One link, shown as something you can recognise (requirement 4).
 *
 * A chip carrying only a word was fine when links were rare; with a page linking eight verbs
 * it stops answering "is this the one I meant". So each row shows type, term or title,
 * translation or gloss, when it was last touched, a notes preview, and whether it is attached
 * to the dictionary.
 *
 * Deliberately **no tags**: on a phone the space is better spent, and tags are the least
 * useful field for recognising a specific item. (They still filter the Cuaderno screen.)
 */

const previewOf = (item) => {
  const text = item.type === "page" ? item.body : item.notes;
  return text ? text.replace(/\s+/g, " ").slice(0, 80) : "";
};

function Shell({ icon: Icon, onOpen, onRemove, removeLabel, children, dashed }) {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border px-3 py-2"
      style={{ background: C.card, borderColor: C.line, borderStyle: dashed ? "dashed" : "solid" }}
    >
      <Icon size={14} className="shrink-0 mt-0.5" style={{ color: C.mut }} />
      <button onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
        {children}
      </button>
      <button onClick={onRemove} aria-label={removeLabel} className="shrink-0 p-0.5">
        <X size={13} style={{ color: C.mut }} />
      </button>
    </div>
  );
}

/** A link to one of the owner's own items. */
export function ItemLinkCard({ item, attached, onOpen, onRemove }) {
  const isPage = item.type === "page";
  const preview = previewOf(item);

  return (
    <Shell
      icon={isPage ? (item.pageDate ? CalendarDays : FileText) : Type}
      onOpen={() => onOpen(item.id)}
      onRemove={onRemove}
      removeLabel={`Unlink ${isPage ? item.title || "page" : item.term}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
          {isPage ? item.title || "Untitled page" : item.term}
          {!isPage && item.form === "phrase" && (
            <span className="italic font-normal text-xs ml-1.5" style={{ color: C.mut }}>
              loc.
            </span>
          )}
          {!isPage && item.form !== "phrase" && POS_ABBR[item.pos] && (
            <span className="italic font-normal text-xs ml-1.5" style={{ color: C.mut }}>
              {POS_ABBR[item.pos]}
            </span>
          )}
          {attached && <BookMarked size={11} className="inline ml-1.5 -mt-0.5" style={{ color: C.mut }} />}
        </div>
        <span className="text-[11px] shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
          {isPage && item.pageDate ? item.pageDate : timeAgo(item.updatedAt)}
        </span>
      </div>

      {!isPage && item.translation && (
        <div className="text-sm" style={{ color: C.ink }}>
          — {item.translation}
        </div>
      )}
      {preview && (
        <div className="text-xs truncate mt-0.5" style={{ color: C.mut }}>
          {preview}
        </div>
      )}
    </Shell>
  );
}

/** A link to a dictionary entry. Read-only by definition (§5); the owner never edits it. */
export function EntryLinkCard({ entry, onOpen, onRemove }) {
  return (
    <Shell icon={BookMarked} onOpen={() => onOpen(entry.id)} onRemove={onRemove} removeLabel={`Unlink ${entry.lemma}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
          {entry.lemma}
          <span className="italic font-normal text-xs ml-1.5" style={{ color: C.mut }}>
            {POS_LABEL[entry.pos] || entry.pos}
          </span>
        </div>
        <span className="text-[11px] shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
          dictionary
        </span>
      </div>
      {entry.senses?.[0]?.gloss && (
        <div className="text-sm truncate" style={{ color: C.ink }}>
          — {entry.senses[0].gloss}
        </div>
      )}
    </Shell>
  );
}

/**
 * A link whose dictionary entry is gone and whose alias map cannot find it (§5).
 *
 * Shown rather than silently dropped: the owner made this link deliberately, and a link that
 * disappears without a word is data loss they cannot see. Same manners as an orphaned
 * attachment in DictAttachment — say what happened, and offer to forget it.
 */
export function OrphanLinkCard({ dictKey, onRemove }) {
  return (
    <Shell icon={Unlink} onRemove={onRemove} removeLabel="Forget this link" dashed>
      <div className="text-xs" style={{ color: C.mut }}>
        No longer in the dictionary. Your notes are untouched.
      </div>
      <div className="text-[11px] truncate mt-0.5" style={{ fontFamily: MONO, color: C.mut }}>
        {dictKey}
      </div>
    </Shell>
  );
}
