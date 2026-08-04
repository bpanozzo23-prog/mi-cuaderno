import { useEffect, useState } from "react";
import { FileText, CalendarDays, Type, BookMarked, Unlink, MoreHorizontal, Trash2 } from "lucide-react";
import { Button, C, SERIF, MONO } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { POS_LABEL } from "./DictCard.jsx";
import { timeAgo } from "../lib/dates.js";
import { meaningGlossText } from "../lib/meanings.js";
import { normalizeRelationship } from "../lib/relationships.js";
import RelationshipSelect from "./RelationshipSelect.jsx";

/**
 * One link, shown as something you can recognise (requirement 4).
 *
 * A chip carrying only a word was fine when links were rare; with a page linking eight verbs
 * it stops answering "is this the one I meant". So each row shows type, term or title,
 * personal meaning glosses, when it was last touched, a notes preview, and whether it is attached
 * to the dictionary.
 *
 * Deliberately **no tags**: on a phone the space is better spent, and tags are the least
 * useful field for recognising a specific item. (They still filter the Cuaderno screen.)
 */

const previewOf = (item) => {
  const text = item.type === "page" ? item.body : item.notes;
  return text ? text.replace(/\s+/g, " ").slice(0, 80) : "";
};

function ConnectionEditor({ connection, onSave, onCancel, onRemove }) {
  const [draft, setDraft] = useState(() => normalizeRelationship(connection?.relationship || connection));

  useEffect(() => {
    setDraft(normalizeRelationship(connection?.relationship || connection));
  }, [connection?.type, connection?.subject, connection?.note]);

  return (
    <div className="mt-2 border-t pt-3" style={{ borderColor: C.line }}>
      <div className="mb-2 text-sm font-semibold" style={{ color: C.ink }}>Edit connection</div>
      <RelationshipSelect relationship={draft} onChange={setDraft} />
      <label className="mt-3 block text-xs" style={{ color: C.mut }}>
        <span className="mb-1 block" style={{ fontFamily: MONO }}>Shared note (optional)</span>
        <textarea
          aria-label="Connection note"
          value={draft.note}
          onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          placeholder="Why are these connected?"
          className="min-h-24 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: C.paper, borderColor: C.line, color: C.ink }}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={async () => { await onSave(draft); onCancel(); }}>Save</Button>
        <Button tone="quiet" onClick={onCancel}>Cancel</Button>
        {onRemove && (
          <Button tone="danger" onClick={onRemove}>
            <Trash2 size={14} /> Remove connection
          </Button>
        )}
      </div>
    </div>
  );
}

function Shell({ icon: Icon, onOpen, onEdit, editLabel, children, dashed, editor }) {
  return (
    <div
      className="rounded-xl border px-3 py-2"
      style={{ background: C.card, borderColor: C.line, borderStyle: dashed ? "dashed" : "solid" }}
    >
      <div className="flex items-start gap-2">
        <Icon size={14} className="shrink-0 mt-0.5" style={{ color: C.mut }} />
        <button onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 text-left">
          {children}
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={editLabel}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ color: C.mut }}
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>
      {editor}
    </div>
  );
}

/** A link to one of the owner's own items. */
export function ItemLinkCard({
  item,
  attached,
  connection,
  onOpen,
  onSaveRelationship,
  onRemove,
  displayHeading,
  displayMeta,
  suppressPreview = false,
  editLabel,
}) {
  const isPage = item.type === "page";
  const preview = previewOf(item);
  const headingSuffix = isPage ? "" : personalHeadingSuffix(item);
  const glosses = isPage ? "" : meaningGlossText(item);
  const relationship = normalizeRelationship(connection?.relationship || connection);
  const [editing, setEditing] = useState(false);
  const fallbackHeading = isPage ? item.title || "Untitled page" : item.term;
  const heading = displayHeading ?? fallbackHeading;
  const meta = displayMeta ?? (isPage && item.pageDate ? item.pageDate : timeAgo(item.updatedAt));
  const defaultEditTarget = displayHeading ?? (isPage ? item.title || "page" : item.term);
  const accessibleEditLabel = editLabel || `Edit connection to ${defaultEditTarget}`;

  return (
    <Shell
      icon={isPage ? (item.pageDate ? CalendarDays : FileText) : Type}
      onOpen={() => onOpen(item.id)}
      onEdit={onSaveRelationship ? () => setEditing((open) => !open) : null}
      editLabel={accessibleEditLabel}
      editor={editing ? (
        <ConnectionEditor
          connection={relationship}
          onSave={onSaveRelationship}
          onCancel={() => setEditing(false)}
          onRemove={onRemove}
        />
      ) : null}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
          {heading}
          {headingSuffix && (
            <>
              {" "}
              <span className="italic font-normal text-xs ml-1.5" style={{ color: C.mut }}>
                {headingSuffix}
              </span>
            </>
          )}
          {attached && <BookMarked size={11} className="inline ml-1.5 -mt-0.5" style={{ color: C.mut }} />}
        </div>
        <span className="text-[11px] shrink-0" style={{ fontFamily: MONO, color: C.mut }}>
          {meta}
        </span>
      </div>

      {/* Clamped, for the same reason as the list card: a link row should stay a row. */}
      {!isPage && glosses && (
        <div className="text-sm whitespace-pre-wrap line-clamp-2" style={{ color: C.ink }}>
          — {glosses}
        </div>
      )}
      {relationship.note ? (
        <div className="mt-1 whitespace-pre-wrap break-words text-xs line-clamp-2" style={{ color: C.penDark }}>
          {relationship.note}
        </div>
      ) : preview && !suppressPreview ? (
        <div className="text-xs truncate mt-0.5" style={{ color: C.mut }}>
          {preview}
        </div>
      ) : null}
    </Shell>
  );
}

/** A link to a dictionary entry. Read-only by definition (§5); the owner never edits it. */
export function EntryLinkCard({ entry, connection, onOpen, onSaveRelationship, onRemove }) {
  const relationship = normalizeRelationship(connection?.relationship || connection);
  const [editing, setEditing] = useState(false);
  return (
    <Shell
      icon={BookMarked}
      onOpen={() => onOpen(entry.id)}
      onEdit={onSaveRelationship ? () => setEditing((open) => !open) : null}
      editLabel={`Edit connection to ${entry.lemma}`}
      editor={editing ? (
        <ConnectionEditor
          connection={relationship}
          onSave={onSaveRelationship}
          onCancel={() => setEditing(false)}
          onRemove={onRemove}
        />
      ) : null}
    >
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
      {relationship.note && (
        <div className="mt-1 whitespace-pre-wrap break-words text-xs line-clamp-2" style={{ color: C.penDark }}>
          {relationship.note}
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
export function OrphanLinkCard({ dictKey, connection, onSaveRelationship, onRemove }) {
  const relationship = normalizeRelationship(connection?.relationship || connection);
  const [editing, setEditing] = useState(false);
  return (
    <Shell
      icon={Unlink}
      onEdit={onSaveRelationship ? () => setEditing((open) => !open) : null}
      editLabel="Edit unresolved dictionary connection"
      dashed
      editor={editing ? (
        <ConnectionEditor
          connection={relationship}
          onSave={onSaveRelationship}
          onCancel={() => setEditing(false)}
          onRemove={onRemove}
        />
      ) : null}
    >
      <div className="text-xs" style={{ color: C.mut }}>
        No longer in the dictionary. Your notes are untouched.
      </div>
      <div className="text-[11px] truncate mt-0.5" style={{ fontFamily: MONO, color: C.mut }}>
        {dictKey}
      </div>
      {relationship.note && (
        <div className="mt-1 whitespace-pre-wrap break-words text-xs line-clamp-2" style={{ color: C.penDark }}>
          {relationship.note}
        </div>
      )}
    </Shell>
  );
}
