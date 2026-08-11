import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  Eye,
  Highlighter,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button, C, Card, MONO, SectionTitle, SERIF } from "../theme.jsx";
import {
  deleteItem,
  linkItems,
  setLinkRelationship,
  unlinkItems,
  updateItem,
} from "../db/items.js";
import { toggleTricky } from "../db/events.js";
import MediaImage from "./MediaImage.jsx";
import { isDirectImageUrl } from "../lib/mediaUrls.js";
import { allTagsIn } from "../lib/tags.js";
import { timeAgo } from "../lib/dates.js";
import { groupConnections } from "../lib/relationships.js";
import TagInput from "./TagInput.jsx";
import JournalLinkPicker from "./JournalLinkPicker.jsx";
import { EntryLinkCard, ItemLinkCard, OrphanLinkCard } from "./LinkCard.jsx";
import AliasConflictResolver from "./AliasConflictResolver.jsx";

export default function JournalMore({
  entry,
  state,
  items,
  pageConnections = [],
  linkedIds,
  connections = [],
  dictionaryConnections = [],
  aliasConflicts = [],
  onOpen,
  onChanged,
  onBack,
  onClose,
}) {
  const [addingMedia, setAddingMedia] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaLabel, setMediaLabel] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [pickingPage, setPickingPage] = useState(false);
  const [moveArmed, setMoveArmed] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const allTags = useMemo(() => allTagsIn(items), [items]);
  const pageGroups = useMemo(() => groupConnections(pageConnections), [pageConnections]);
  const dictionaryGroups = useMemo(
    () => groupConnections(dictionaryConnections),
    [dictionaryConnections]
  );

  async function patch(fields, options) {
    await updateItem(entry.id, fields, options);
    onChanged();
  }

  async function removeLink(key) {
    await unlinkItems(entry.id, key);
    onChanged();
  }

  async function saveRelationship(key, relationship) {
    await setLinkRelationship(entry.id, key, relationship);
    await onChanged();
  }

  function closeMedia() {
    setAddingMedia(false);
    setMediaUrl("");
    setMediaLabel("");
    setMediaError("");
  }

  return (
    <div className="mt-7 border-t pt-1" style={{ borderColor: C.line }}>
      <div className="mt-4 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Más</h2>
        <button type="button" onClick={onClose} aria-label="Close more tools" className="min-h-11 min-w-11 inline-flex items-center justify-center">
          <X size={17} style={{ color: C.mut }} />
        </button>
      </div>

      <SectionTitle>Tags</SectionTitle>
      <TagInput tags={entry.tags} allTags={allTags} onChange={(tags) => patch({ tags })} />

      <SectionTitle>Media links</SectionTitle>
      <div className="space-y-2">
        {entry.mediaLinks.map((media, index) => (
          <Card key={`${media.url}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 inline-flex items-center gap-2 text-sm underline underline-offset-2"
              style={{ color: C.pen }}
            >
              <ExternalLink size={14} className="shrink-0" />
              <span className="truncate">{media.label || media.url}</span>
            </a>
            <button
              type="button"
              onClick={() => patch({ mediaLinks: entry.mediaLinks.filter((_, itemIndex) => itemIndex !== index) })}
              aria-label={`Remove media link ${media.label || media.url}`}
              className="p-1"
            >
              <X size={14} style={{ color: C.mut }} />
            </button>
            </div>
            {isDirectImageUrl(media.url) && (
              <MediaImage src={media.url} alt={media.label || ""} caption={false} />
            )}
          </Card>
        ))}
        <Button
          tone="quiet"
          onClick={() => addingMedia ? closeMedia() : setAddingMedia(true)}
          aria-expanded={addingMedia}
          aria-label={addingMedia ? "Close media form" : "Add a media link"}
        >
          <Plus size={14} /> {addingMedia ? "Close media form" : "Media link"}
        </Button>
        {addingMedia && (
          <Card className="space-y-2">
            <input
              autoFocus
              aria-label="Journal media URL"
              value={mediaUrl}
              onChange={(event) => { setMediaUrl(event.target.value); setMediaError(""); }}
              placeholder="https:// link"
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: C.ink }}
            />
            <input
              aria-label="Journal media label"
              value={mediaLabel}
              onChange={(event) => setMediaLabel(event.target.value)}
              placeholder="Label (optional)"
              className="w-full border-t bg-transparent pt-2 text-sm outline-none"
              style={{ color: C.ink, borderColor: C.line }}
            />
            {mediaError && <div role="alert" className="text-xs" style={{ color: C.red }}>{mediaError}</div>}
            <div className="flex gap-2">
              <Button onClick={async () => {
                const url = mediaUrl.trim();
                if (!/^https?:\/\//i.test(url)) {
                  setMediaError("Use a complete http:// or https:// link.");
                  return;
                }
                await patch({ mediaLinks: [...entry.mediaLinks, { url, label: mediaLabel.trim() }] });
                closeMedia();
              }}>
                Add link
              </Button>
              <Button tone="quiet" onClick={closeMedia}>Cancel</Button>
            </div>
          </Card>
        )}
      </div>

      <SectionTitle>Page relations</SectionTitle>
      <div className="space-y-2">
        {pageGroups.map((group) => (
          <div key={group.key} className="mb-3">
            <div className="mb-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
              {group.label}
            </div>
            <div className="space-y-2">
              {group.rows.map((connection) => (
                <ItemLinkCard
                  key={connection.key}
                  item={connection.item}
                  connection={connection}
                  onOpen={onOpen}
                  onSaveRelationship={(relationship) => saveRelationship(connection.key, relationship)}
                  onRemove={() => removeLink(connection.key)}
                />
              ))}
            </div>
          </div>
        ))}
        {!pickingPage && (
          <Button tone="quiet" onClick={() => setPickingPage(true)}>
            <Plus size={14} /> Relate a page
          </Button>
        )}
        {pickingPage && (
          <JournalLinkPicker
            mode="page"
            item={entry}
            items={items}
            linkedIds={linkedIds}
            connections={connections}
            onClose={() => setPickingPage(false)}
            onPick={async (key, relationship) => {
              await linkItems(entry.id, key, relationship);
              onChanged();
            }}
          />
        )}
      </div>

      {(dictionaryConnections.length > 0 || aliasConflicts.length > 0) && (
        <>
          <SectionTitle>Dictionary links</SectionTitle>
          {aliasConflicts.map((conflict) => (
            <div key={conflict.canonicalKey} className="mb-3">
              <AliasConflictResolver
                itemId={entry.id}
                conflict={conflict}
                onResolved={() => onChanged()}
              />
            </div>
          ))}
          {dictionaryGroups.map((group) => (
            <div key={group.key} className="mb-3">
              <div className="mb-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>
                {group.label}
              </div>
              <div className="space-y-2">
                {group.rows.map((connection) => connection.kind === "entry" ? (
                  <EntryLinkCard
                    key={connection.key}
                    entry={connection.entry}
                    connection={connection}
                    onOpen={onOpen}
                    onSaveRelationship={(relationship) => saveRelationship(connection.key, relationship)}
                    onRemove={() => removeLink(connection.key)}
                  />
                ) : (
                  <OrphanLinkCard
                    key={connection.key}
                    dictKey={connection.key}
                    connection={connection}
                    onSaveRelationship={(relationship) => saveRelationship(connection.key, relationship)}
                    onRemove={() => removeLink(connection.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      <SectionTitle>Activity</SectionTitle>
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
          <span className="inline-flex items-center gap-1"><Eye size={12} /> opened {state.views}×</span>
          {state.lastViewedAt && <span className="inline-flex items-center gap-1"><Clock size={12} /> {timeAgo(state.lastViewedAt)}</span>}
        </div>
        <button
          type="button"
          onClick={async () => {
            await toggleTricky(entry.id, state.tricky);
            onChanged();
          }}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
          style={state.tricky
            ? { background: C.hi, borderColor: C.hiBorder, color: C.hiInk }
            : { background: C.card, borderColor: C.line, color: C.mut }}
        >
          <Highlighter size={15} /> {state.tricky ? "Marked tricky" : "Highlight as tricky"}
        </button>
      </Card>

      <SectionTitle>Entry</SectionTitle>
      <Card className="space-y-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: C.ink }}>Move to Pages</div>
          <div className="mt-0.5 text-xs" style={{ color: C.mut }}>Clears the date; the same page and all its links stay intact.</div>
        </div>
        {moveArmed ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={async () => {
              await patch({ pageDate: null });
            }}>
              <ArrowRight size={14} /> Confirm move
            </Button>
            <Button tone="quiet" onClick={() => setMoveArmed(false)}>Cancel</Button>
          </div>
        ) : (
          <Button tone="quiet" onClick={() => setMoveArmed(true)}>
            <ArrowRight size={14} /> Move to Pages
          </Button>
        )}

        <div className="border-t pt-3" style={{ borderColor: C.line }}>
          <Button
            tone={deleteArmed ? "dangerArmed" : "danger"}
            onClick={async () => {
              if (!deleteArmed) {
                setDeleteArmed(true);
                setTimeout(() => setDeleteArmed(false), 3000);
                return;
              }
              await deleteItem(entry.id);
              onBack();
              onChanged();
            }}
          >
            <Trash2 size={14} /> {deleteArmed ? "Tap again to confirm" : "Delete journal entry"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
