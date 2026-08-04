import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, Trash2, X, ExternalLink, Pencil, CalendarDays, FileText, Check,
  Highlighter, Eye, Clock, Plus, Bookmark, BookmarkCheck, Library,
} from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, SectionTitle, Card, Button } from "../theme.jsx";
import { POS_OPTIONS, personalHeadingSuffix, personalLexicalForm } from "./ItemCard.jsx";
import DictAttachment from "./DictAttachment.jsx";
import LinkPicker from "./LinkPicker.jsx";
import AliasConflictResolver from "./AliasConflictResolver.jsx";
import TagInput from "./TagInput.jsx";
import { ItemLinkCard, EntryLinkCard, OrphanLinkCard } from "./LinkCard.jsx";
import {
  updateItem, deleteItem, linkItems, unlinkItems, setLinkRelationship,
  createItem, newLexical, newPage,
} from "../db/items.js";
import { logView, toggleTricky } from "../db/events.js";
import { resolveLinkedKeys } from "../db/linkedEntries.js";
import { emptyItemState } from "../useNotebook.js";
import {
  connectionsFor,
  groupConnections,
  relationshipForTarget,
  relationshipLabel,
} from "../lib/relationships.js";
import { allTagsIn } from "../lib/tags.js";
import { timeAgo } from "../lib/dates.js";
import { cloneMeanings } from "../lib/meanings.js";
import MeaningsSection from "./MeaningsSection.jsx";
import CollectionPage from "./CollectionPage.jsx";
import { effectivePageKind, PAGE_KINDS, PAGE_PROFILES } from "../lib/pageProfiles.js";
import { getCollectionPlacements } from "../lib/collections.js";
import { setPageProfile } from "../db/collections.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

export default function Detail(props) {
  if (props.item.type === "page") return <PageDetail {...props} />;
  return <StandardDetail {...props} />;
}

/** Page-specific dispatch stays below App so the existing detail trail and scroll rules remain shared. */
export function PageDetail(props) {
  return effectivePageKind(props.item) === PAGE_KINDS.collection
    ? <CollectionPage {...props} />
    : <GeneralPageDetail {...props} />;
}

/** General and dated-Journal pages deliberately keep the pre-profile detail experience. */
export function GeneralPageDetail(props) {
  return <StandardDetail {...props} />;
}

function StandardDetail({
  item,
  state = emptyItemState,
  items = [],
  onBack,
  backLabel = "Todo el cuaderno",
  onOpen,
  onChanged,
  pagePinned = false,
  onPagePinnedChange,
}) {
  const isPage = item.type === "page";
  const headingSuffix = isPage ? "" : personalHeadingSuffix(item);
  const itemKind = isPage ? "page" : personalLexicalForm(item);

  const [editingHead, setEditingHead] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [head, setHead] = useState({});
  const [bodyDraft, setBodyDraft] = useState("");
  const [bodyDirty, setBodyDirty] = useState(false);
  const [addingExample, setAddingExample] = useState(false);
  const [exEs, setExEs] = useState("");
  const [exEn, setExEn] = useState("");
  const [addingMedia, setAddingMedia] = useState(false);
  const [mUrl, setMUrl] = useState("");
  const [mLabel, setMLabel] = useState("");
  const [deleteArm, setDeleteArm] = useState(false);
  const [picking, setPicking] = useState(false);

  // The tag vocabulary already in use, derived from the notebook in memory (§7) — what makes
  // the tag field offer `expression` instead of letting a fourth spelling of it be created.
  const allTags = useMemo(() => allTagsIn(items), [items]);

  // Both directions at once: links this item made, and links made to it from
  // elsewhere. Which side stores the link is bookkeeping the owner shouldn't see.
  const collectionPlacements = useMemo(
    () => isPage ? [] : getCollectionPlacements(item.id, items),
    [isPage, item.id, items]
  );
  const placementPageIds = useMemo(
    () => new Set(collectionPlacements.map((placement) => placement.page.id)),
    [collectionPlacements]
  );
  // Everything already connected, in one set, so the picker can mark it rather than hide it:
  // seeing "linked ✓" answers "have I already done this?" where a missing row just looks
  // like the search failed. Dictionary keys are in here too — they live in linkedKeys.
  const linkedKeys = useMemo(
    () => new Set([
      ...connectionsFor(item, items).map((connection) => connection.key),
      ...(item.linkedKeys || []),
      ...placementPageIds,
    ]),
    [item, items, placementPageIds]
  );

  // linkedKeys may point into the reference layer (§6). Those entries cannot hold a
  // reciprocal link, which is exactly why links are stored on one side and read back
  // from both — the design Phase 1c chose for this moment. Resolving them goes through
  // the alias map and reports what it could not find (§5); see db/linkedEntries.js.
  const [linkedEntries, setLinkedEntries] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);
  const [linkConflicts, setLinkConflicts] = useState([]);

  useEffect(() => {
    let alive = true;
    resolveLinkedKeys(item).then(({ entries, orphans, conflicts, rewritten }) => {
      if (!alive) return;
      setLinkedEntries(entries);
      setOrphanKeys(orphans);
      setLinkConflicts(conflicts || []);
      if (rewritten) onChanged();
    });
    return () => {
      alive = false;
    };
  }, [item.id, item.linkedKeys]);

  /**
   * Grouped for display (requirement 5), and led by what THIS screen is for (requirement 6):
   * a page leads with the words it is about — every page is then its own vocabulary sheet,
   * which is what made deferring a "source" page type free. A word leads with the pages it
   * turns up on. Fixed orders, derived at render, nothing stored and nothing configurable.
   */
  const connections = useMemo(
    () => connectionsFor(item, items, linkedEntries)
      .filter((connection) => connection.kind !== "item" || !placementPageIds.has(connection.key))
      .filter((connection) => connection.kind !== "entry"
        || !linkConflicts.some((conflict) => conflict.canonicalKey === connection.key)),
    [item, items, linkedEntries, placementPageIds, linkConflicts]
  );
  const orphanConnections = useMemo(
    () => orphanKeys.map((key) => {
      const relationship = relationshipForTarget(item, key);
      return {
        kind: "orphan",
        key,
        relationship,
        ...relationship,
        label: relationshipLabel(relationship),
      };
    }),
    [item, orphanKeys]
  );
  const groups = useMemo(
    () => groupConnections([...connections, ...orphanConnections]),
    [connections, orphanConnections]
  );

  async function unlink(key) {
    await unlinkItems(item.id, key);
    onChanged();
  }

  useEffect(() => {
    setBodyDraft(isPage ? item.body || "" : item.notes || "");
    setBodyDirty(false);
    setEditingHead(false);
    setEditingBody(false);
    setAddingExample(false);
    setExEs("");
    setExEn("");
    setAddingMedia(false);
    setMUrl("");
    setMLabel("");
    setDeleteArm(false);
    setPicking(false);
    setHead(
      isPage
        ? { title: item.title, pageDate: item.pageDate || "" }
        : { term: item.term, pos: item.pos || "", form: item.form }
    );
  }, [item.id]);

  // An open is recorded when the owner intentionally opens an item — keyed on
  // item.id alone, so rerenders and edits within this screen never re-fire it.
  // logView itself decides whether this counts as a new lookup; the refresh is
  // not tied to this component still being mounted, because the effect may be
  // torn down and re-run before the write settles.
  useEffect(() => {
    logView(item.id).then((logged) => {
      if (logged) onChanged();
    });
  }, [item.id]);

  async function patch(fields, options) {
    await updateItem(item.id, fields, options);
    await onChanged();
  }

  async function saveHead() {
    const fields = isPage
      ? { title: head.title.trim(), pageDate: head.pageDate || null }
      : {
          term: head.term.trim(),
          pos: head.pos,
          form: head.form,
        };
    if (isPage ? !fields.title : !fields.term) return;
    setEditingHead(false);
    await patch(fields);
  }

  async function saveBody() {
    await patch(isPage ? { body: bodyDraft } : { notes: bodyDraft });
    setBodyDirty(false);
    setEditingBody(false);
  }

  function cancelBody() {
    setBodyDraft(isPage ? item.body || "" : item.notes || "");
    setBodyDirty(false);
    setEditingBody(false);
  }

  function cancelExample() {
    setExEs("");
    setExEn("");
    setAddingExample(false);
  }

  function cancelMedia() {
    setMUrl("");
    setMLabel("");
    setAddingMedia(false);
  }

  const savedBody = isPage ? item.body || "" : item.notes || "";
  const hasSavedBody = savedBody.trim() !== "";

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> {backLabel}
      </button>

      <Card className="p-4">
        {editingHead ? (
          <div className="space-y-2">
            {isPage ? (
              <>
                <input
                  value={head.title}
                  onChange={(e) => setHead({ ...head, title: e.target.value })}
                  className="w-full text-lg rounded-xl border px-3 py-2 outline-none"
                  style={{ ...inputStyle, fontFamily: SERIF }}
                />
                <input
                  type="date"
                  value={head.pageDate}
                  onChange={(e) => setHead({ ...head, pageDate: e.target.value })}
                  className="w-full text-sm rounded-xl border px-3 py-2 outline-none"
                  style={inputStyle}
                />
              </>
            ) : (
              <>
                <input
                  value={head.term}
                  onChange={(e) => setHead({ ...head, term: e.target.value })}
                  className="w-full text-lg rounded-xl border px-3 py-2 outline-none"
                  style={{ ...inputStyle, fontFamily: SERIF }}
                />
                <div className="flex gap-2">
                  <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: C.line }}>
                    {["word", "phrase"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setHead({ ...head, form: f })}
                        className="text-sm px-3 py-2"
                        style={head.form === f ? { background: C.pen, color: "#fff" } : { background: C.card, color: C.mut }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <select
                    value={head.pos}
                    onChange={(e) => setHead({ ...head, pos: e.target.value })}
                    className="flex-1 text-sm rounded-xl border px-3 py-2 outline-none"
                    style={inputStyle}
                  >
                    {POS_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p || "part of speech…"}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button onClick={saveHead}>
                <Check size={15} /> Save
              </Button>
              <Button tone="quiet" onClick={() => setEditingHead(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-2xl" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
                {isPage && <FileText size={16} className="inline mr-2 -mt-1" style={{ color: C.mut }} />}
                <Hi on={state.tricky}>{isPage ? item.title || "Untitled page" : item.term}</Hi>
                {headingSuffix && (
                  <>
                    {" "}
                    <span className="italic font-normal text-base ml-2" style={{ color: C.mut }}>
                      {headingSuffix}
                    </span>
                  </>
                )}
              </div>
              {isPage && item.pageDate && (
                <div className="mt-1 text-xs inline-flex items-center gap-1" style={{ fontFamily: MONO, color: C.mut }}>
                  <CalendarDays size={12} /> {item.pageDate}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isPage && (
                <>
                  <button
                    type="button"
                    onClick={() => onPagePinnedChange?.(!pagePinned)}
                    aria-label={pagePinned ? "Unpin page" : "Pin page"}
                    aria-pressed={pagePinned}
                    className="p-1.5"
                  >
                    {pagePinned ? <BookmarkCheck size={16} style={{ color: C.pen }} /> : <Bookmark size={16} style={{ color: C.mut }} />}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await setPageProfile(item.id, PAGE_PROFILES.collection);
                      await onChanged();
                    }}
                    aria-label="Change to Vocabulary Collection"
                    className="p-1.5"
                  >
                    <Library size={16} style={{ color: C.mut }} />
                  </button>
                </>
              )}
              <button
                onClick={() => setEditingHead(true)}
                aria-label={isPage ? "Edit page details" : "Edit word or phrase details"}
                className="p-1.5"
              >
                <Pencil size={15} style={{ color: C.mut }} />
              </button>
            </div>
          </div>
        )}

        {!editingHead && (
          <>
            <div className="mt-3 flex items-center gap-4 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              <span className="inline-flex items-center gap-1">
                <Eye size={12} /> opened {state.views}×
              </span>
              {state.lastViewedAt && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> {timeAgo(state.lastViewedAt)}
                </span>
              )}
            </div>
            <button
              onClick={async () => {
                await toggleTricky(item.id, state.tricky);
                onChanged();
              }}
              className="mt-3 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border font-medium"
              style={
                state.tricky
                  ? { background: C.hi, borderColor: "#E3C93A", color: "#5B4E08" }
                  : { background: C.card, borderColor: C.line, color: C.mut }
              }
            >
              <Highlighter size={15} /> {state.tricky ? "Marked tricky" : "Highlight as tricky"}
            </button>

            {!isPage && <DictAttachment item={item} onOpen={onOpen} onChanged={onChanged} />}
          </>
        )}
      </Card>

      {!isPage && (
        <>
          <SectionTitle>Meanings</SectionTitle>
          <MeaningsSection item={item} onPatch={patch} />
        </>
      )}

      <SectionTitle>{isPage ? "Page" : "Notes"}</SectionTitle>
      <Card>
        {editingBody ? (
          <>
            <textarea
              autoFocus
              aria-label={isPage ? "Page body" : "Note"}
              value={bodyDraft}
              onChange={(e) => {
                setBodyDraft(e.target.value);
                setBodyDirty(true);
              }}
              placeholder={
                isPage
                  ? "Write the page — grammar rules, a source, what happened today…"
                  : "Your notes — mnemonics, gotchas, where you heard it…"
              }
              className="w-full bg-transparent outline-none text-sm resize-y"
              style={{ color: C.ink, minHeight: isPage ? 160 : 96 }}
            />
            <div className="mt-2 flex gap-2">
              <Button onClick={saveBody} disabled={!bodyDirty}>
                Save {isPage ? "page" : "note"}
              </Button>
              <Button tone="quiet" onClick={cancelBody}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div
              className={`min-w-0 flex-1 text-sm whitespace-pre-wrap break-words ${hasSavedBody ? "" : "italic"}`}
              style={{ color: hasSavedBody ? C.ink : C.mut }}
            >
              {hasSavedBody ? savedBody : isPage ? "This page is empty." : "No notes yet."}
            </div>
            <Button
              tone="quiet"
              className="shrink-0"
              onClick={() => {
                setBodyDraft(savedBody);
                setBodyDirty(false);
                setEditingBody(true);
              }}
            >
              <Pencil size={14} />
              {hasSavedBody ? `Edit ${isPage ? "page" : "note"}` : isPage ? "Write page" : "Add note"}
            </Button>
          </div>
        )}
      </Card>

      <SectionTitle>Tags</SectionTitle>
      <TagInput tags={item.tags} allTags={allTags} onChange={(tags) => patch({ tags })} />

      {!isPage && (
        <>
          <SectionTitle>General examples</SectionTitle>
          <div className="space-y-2">
            {item.myExamples.map((x, i) => (
              <Card key={i} className="flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div style={{ fontFamily: SERIF, color: C.ink }}>{x.es}</div>
                  {x.en && (
                    <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                      {x.en}
                    </div>
                  )}
                  {item.meanings.length > 0 && (
                    <select
                      aria-label="Assign general example to meaning"
                      defaultValue=""
                      onChange={async (event) => {
                        if (!event.target.value) return;
                        const nextMeanings = cloneMeanings(item.meanings);
                        nextMeanings.find((meaning) => meaning.id === event.target.value).examples.push(x);
                        await patch({
                          meanings: nextMeanings,
                          myExamples: item.myExamples.filter((_, itemIndex) => itemIndex !== i),
                        });
                      }}
                      className="mt-1 text-xs rounded border px-1.5 py-1 max-w-full"
                      style={{ background: C.card, borderColor: C.line, color: C.mut }}
                    >
                      <option value="">Assign to meaning…</option>
                      {item.meanings.map((meaning) => (
                        <option key={meaning.id} value={meaning.id}>{meaning.gloss}</option>
                      ))}
                    </select>
                  )}
                </div>
                <X
                  size={14}
                  className="shrink-0 mt-1"
                  style={{ color: C.mut }}
                  onClick={() => patch({ myExamples: item.myExamples.filter((_, j) => j !== i) })}
                />
              </Card>
            ))}
            <Button
              tone="quiet"
              aria-expanded={addingExample}
              aria-controls="example-composer"
              onClick={() => (addingExample ? cancelExample() : setAddingExample(true))}
            >
              <Plus size={14} /> {addingExample ? "Close example form" : "Add an example"}
            </Button>
            {addingExample && (
              <Card id="example-composer" className="space-y-2">
                <input
                  autoFocus
                  aria-label="Sentence in Spanish"
                  value={exEs}
                  onChange={(e) => setExEs(e.target.value)}
                  placeholder="Sentence in Spanish"
                  className="w-full text-sm bg-transparent outline-none"
                  style={{ color: C.ink }}
                />
                <input
                  aria-label="English (optional)"
                  value={exEn}
                  onChange={(e) => setExEn(e.target.value)}
                  placeholder="English (optional)"
                  className="w-full text-sm bg-transparent outline-none border-t pt-2"
                  style={{ color: C.ink, borderColor: C.line }}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!exEs.trim()) return;
                      await patch({ myExamples: [...item.myExamples, { es: exEs.trim(), en: exEn.trim() }] });
                      cancelExample();
                    }}
                  >
                    Add example
                  </Button>
                  <Button tone="quiet" onClick={cancelExample}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      <SectionTitle>Media links</SectionTitle>
      <div className="space-y-2">
        {item.mediaLinks.map((m, i) => (
          <Card key={i} className="flex items-center justify-between gap-2">
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm underline underline-offset-2 min-w-0"
              style={{ color: C.pen }}
            >
              <ExternalLink size={14} className="shrink-0" />
              <span className="truncate">{m.label || m.url}</span>
            </a>
            <X
              size={14}
              className="shrink-0"
              style={{ color: C.mut }}
              onClick={() => patch({ mediaLinks: item.mediaLinks.filter((_, j) => j !== i) })}
            />
          </Card>
        ))}
        <Button
          tone="quiet"
          aria-expanded={addingMedia}
          aria-controls="media-composer"
          onClick={() => (addingMedia ? cancelMedia() : setAddingMedia(true))}
        >
          <Plus size={14} /> {addingMedia ? "Close media form" : "Add a media link"}
        </Button>
        {addingMedia && (
          <Card id="media-composer" className="space-y-2">
            <input
              autoFocus
              aria-label="Media URL"
              value={mUrl}
              onChange={(e) => setMUrl(e.target.value)}
              placeholder="https:// link to video, image, article…"
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: C.ink }}
            />
            <input
              aria-label="Media label"
              value={mLabel}
              onChange={(e) => setMLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full text-sm bg-transparent outline-none border-t pt-2"
              style={{ color: C.ink, borderColor: C.line }}
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const url = mUrl.trim();
                  if (!/^https?:\/\//.test(url)) return;
                  await patch({ mediaLinks: [...item.mediaLinks, { url, label: mLabel.trim() }] });
                  cancelMedia();
                }}
              >
                Add link
              </Button>
              <Button tone="quiet" onClick={cancelMedia}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>

      {!isPage && collectionPlacements.length > 0 && (
        <>
          <SectionTitle>Collections</SectionTitle>
          <div className="space-y-1.5">
            {collectionPlacements.map((placement) => (
              <button
                type="button"
                key={placement.page.id}
                onClick={() => onOpen(placement.page.id)}
                className="w-full rounded-xl border p-3 text-left"
                style={{ background: C.card, borderColor: C.line }}
              >
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{placement.page.title || "Untitled page"}</div>
                <div className="mt-0.5 text-xs" style={{ color: C.mut }}>{placement.groupName}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Connections</SectionTitle>

      {groups.length === 0 && linkConflicts.length === 0 && !picking && (
        <div className="text-xs mb-2" style={{ color: C.mut }}>
          {isPage
            ? "Nothing linked yet. Link the words and phrases this page is about."
            : "Nothing linked yet. Link the pages, words and phrases this one belongs with."}
        </div>
      )}

      {linkConflicts.length > 0 && (
        <div className="mb-3 space-y-2">
          {linkConflicts.map((conflict) => (
            <AliasConflictResolver
              key={conflict.canonicalKey}
              itemId={item.id}
              conflict={conflict}
              onResolved={onChanged}
            />
          ))}
        </div>
      )}

      {groups.map((group) => (
        <div key={group.name} className="mb-3">
          <div className="text-[11px] uppercase mb-1.5" style={{ fontFamily: MONO, color: C.mut, letterSpacing: "0.08em" }}>
            {group.name}
          </div>
          <div className="space-y-1.5">
            {group.rows.map((row) =>
              row.kind === "entry" ? (
                <EntryLinkCard
                  key={row.key}
                  entry={row.entry}
                  connection={row}
                  onOpen={onOpen}
                  onSaveRelationship={async (relationship) => {
                    await setLinkRelationship(item.id, row.key, relationship);
                    await onChanged();
                  }}
                  onRemove={() => unlink(row.key)}
                />
              ) : row.kind === "orphan" ? (
                <OrphanLinkCard
                  key={row.key}
                  dictKey={row.key}
                  connection={row}
                  onSaveRelationship={async (relationship) => {
                    await setLinkRelationship(item.id, row.key, relationship);
                    await onChanged();
                  }}
                  onRemove={() => unlink(row.key)}
                />
              ) : (
                <ItemLinkCard
                  key={row.key}
                  item={row.item}
                  attached={Boolean(row.item.dictKey)}
                  connection={row}
                  onOpen={onOpen}
                  onSaveRelationship={async (relationship) => {
                    await setLinkRelationship(item.id, row.key, relationship);
                    await onChanged();
                  }}
                  onRemove={() => unlink(row.key)}
                />
              )
            )}
          </div>
        </div>
      ))}

      {!picking && (
        <button
          onClick={() => setPicking(true)}
          className="text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1"
          style={{ background: C.card, color: C.mut, borderColor: C.line }}
        >
          <Plus size={11} /> link something
        </button>
      )}

      {picking && (
        <LinkPicker
          item={item}
          items={items}
          linkedKeys={linkedKeys}
          connections={connections}
          onCancel={() => setPicking(false)}
          onPick={async (key, relationship) => {
            await linkItems(item.id, key, relationship);
            onChanged();
          }}
          onCreate={async (kind, text, relationship) => {
            // Deliberately NOT onOpen(created.id): the whole point of quick-create is that
            // the owner stays on the item they were writing. Detail resets its draft only
            // when item.id changes, so staying put is what keeps unsaved work alive.
            const created = await createItem(
              kind === "page"
                ? newPage({ title: text })
                : newLexical({ term: text, form: text.includes(" ") ? "phrase" : "word" })
            );
            await linkItems(item.id, created.id, relationship);
            onChanged();
          }}
        />
      )}

      <div className="mt-8">
        <Button
          tone={deleteArm ? "dangerArmed" : "danger"}
          onClick={async () => {
            if (!deleteArm) {
              setDeleteArm(true);
              setTimeout(() => setDeleteArm(false), 3000);
              return;
            }
            await deleteItem(item.id);
            onBack();
            onChanged();
          }}
        >
          <Trash2 size={14} /> {deleteArm ? "Tap again to confirm" : `Delete ${itemKind}`}
        </Button>
      </div>
    </div>
  );
}
