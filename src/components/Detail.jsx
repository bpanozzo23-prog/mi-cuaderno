import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, Trash2, X, ExternalLink, Pencil, CalendarDays, FileText, Check,
  Highlighter, Eye, Clock, Plus, Bookmark, BookmarkCheck, Layers, RotateCcw,
  BarChart3, ChevronDown,
} from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, SectionTitle, Card, Button, IconButton } from "../theme.jsx";
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
import { connectionsFromResolvedEntryLinks } from "../lib/resolvedConnections.js";
import { allTagsIn } from "../lib/tags.js";
import { localDate, timeAgo } from "../lib/dates.js";
import { emptyReviewState } from "../lib/review.js";
import { cloneMeanings } from "../lib/meanings.js";
import MeaningsSection from "./MeaningsSection.jsx";
import SpeakButton from "./SpeakButton.jsx";
import CollectionPage from "./CollectionPage.jsx";
import MarkdownText from "./MarkdownText.jsx";
import MarkdownTextarea from "./MarkdownTextarea.jsx";
import MediaImage from "./MediaImage.jsx";
import { isDirectImageUrl } from "../lib/mediaUrls.js";
import { getAvailableCollectionDestinations, getCollectionPlacements } from "../lib/collections.js";
import { activePageContextsForLexical } from "../lib/pageReferences.js";
import { commitCollectionAdd } from "../db/collections.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

function CompactEntryAction({ expanded = false, openLabel, closeLabel, controls, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={expanded ? closeLabel : openLabel}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium whitespace-nowrap"
      style={{ background: C.card, borderColor: C.line, color: C.ink }}
    >
      {expanded ? <X size={14} /> : <Plus size={14} />}
      {children}
    </button>
  );
}

function CollectionAssignmentForm({ itemId, destinations, onCancel, onSaved }) {
  const [pageId, setPageId] = useState(() => destinations.length === 1 ? destinations[0].pageId : "");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const destination = destinations.find((candidate) => candidate.pageId === pageId);

  const save = async (event) => {
    event.preventDefault();
    if (!destination || saving) return;
    setSaving(true);
    setError("");
    try {
      await commitCollectionAdd(pageId, {
        targetGroupId: groupId || null,
        candidates: [{ kind: "personal", itemId }],
      });
      await onSaved();
    } catch (caught) {
      setError(caught?.message || "Could not add this entry to the Collection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-2" style={{ borderColor: C.pen }}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label htmlFor="collection-assignment-page" className="mb-1 block text-xs" style={{ color: C.mut }}>
            Collection
          </label>
          <select
            id="collection-assignment-page"
            aria-label="Collection"
            value={pageId}
            onChange={(event) => {
              setPageId(event.target.value);
              setGroupId("");
              setError("");
            }}
            disabled={saving}
            className="min-h-11 w-full rounded-lg border px-2 text-sm"
            style={inputStyle}
          >
            {destinations.length > 1 && <option value="">Choose a Collection</option>}
            {destinations.map((candidate) => (
              <option key={candidate.pageId} value={candidate.pageId}>{candidate.pageTitle}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="collection-assignment-group" className="mb-1 block text-xs" style={{ color: C.mut }}>
            Group
          </label>
          <select
            id="collection-assignment-group"
            aria-label="Collection group"
            value={groupId}
            onChange={(event) => {
              setGroupId(event.target.value);
              setError("");
            }}
            disabled={!destination || saving}
            className="min-h-11 w-full rounded-lg border px-2 text-sm"
            style={inputStyle}
          >
            {(destination?.groups || [{ id: null, name: "Not grouped yet" }]).map((group) => (
              <option key={group.id || "ungrouped"} value={group.id || ""}>{group.name}</option>
            ))}
          </select>
        </div>

        {error && <div role="alert" className="text-xs" style={{ color: C.red }}>{error}</div>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!destination || saving}>
            {saving ? "Adding…" : "Save Collection assignment"}
          </Button>
          <Button type="button" tone="quiet" disabled={saving} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

export default function Detail(props) {
  if (props.item.type === "page") return <PageDetail {...props} />;
  return <StandardDetail {...props} />;
}

/** Page-specific dispatch stays below App so the existing detail trail and scroll rules remain shared. */
export function PageDetail(props) {
  return <CollectionPage {...props} />;
}

/** Compatibility export: every non-Diario page now uses the composable page workspace. */
export function GeneralPageDetail(props) {
  return <CollectionPage {...props} />;
}

function StandardDetail({
  item,
  state = emptyItemState,
  reviewState = emptyReviewState,
  items = [],
  onBack,
  backLabel = "Todo el cuaderno",
  onOpen,
  onChanged,
  pagePinned = false,
  onPagePinnedChange,
}) {
  const isPage = item.type === "page";
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
  const [assigningCollection, setAssigningCollection] = useState(false);
  const [linkedEntryLinks, setLinkedEntryLinks] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);
  const [linkConflicts, setLinkConflicts] = useState([]);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [resolvedAttachment, setResolvedAttachment] = useState({ itemId: null, entry: null });
  const attachedEntry = resolvedAttachment.itemId === item.id ? resolvedAttachment.entry : null;
  const headingSuffix = isPage ? "" : personalHeadingSuffix(item, attachedEntry);
  const statsId = `entry-stats-${item.id}`;
  const handleEntryResolved = useCallback((entry) => {
    setResolvedAttachment({ itemId: item.id, entry });
  }, [item.id]);

  // The tag vocabulary already in use, derived from the notebook in memory (§7) — what makes
  // the tag field offer `expression` instead of letting a fourth spelling of it be created.
  const allTags = useMemo(() => allTagsIn(items), [items]);

  // Both directions at once: links this item made, and links made to it from
  // elsewhere. Which side stores the link is bookkeeping the owner shouldn't see.
  const collectionPlacements = useMemo(
    () => isPage ? [] : getCollectionPlacements(item.id, items),
    [isPage, item.id, items]
  );
  const collectionDestinations = useMemo(
    () => isPage ? [] : getAvailableCollectionDestinations(item.id, items),
    [isPage, item.id, items]
  );
  const contextualPlacements = useMemo(
    () => isPage
      ? []
      : activePageContextsForLexical(item.id, items).filter((context) => context.kind !== "vocabulary"),
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
      ...linkedEntryLinks.map((link) => link.canonicalKey),
      ...placementPageIds,
    ]),
    [item, items, linkedEntryLinks, placementPageIds]
  );
  const unresolvedKeys = useMemo(
    () => new Set(linkConflicts.flatMap((conflict) => [
      conflict.canonicalKey,
      ...(conflict.rawKeys || []),
    ])),
    [linkConflicts]
  );

  // linkedKeys may point into the reference layer (§6). Those entries cannot hold a
  // reciprocal link, which is exactly why links are stored on one side and read back
  // from both — the design Phase 1c chose for this moment. Resolving them goes through
  // the alias map and reports what it could not find (§5); see db/linkedEntries.js.
  useEffect(() => {
    let alive = true;
    resolveLinkedKeys(item).then(({ entryLinks, orphans, conflicts, rewritten }) => {
      if (!alive) return;
      setLinkedEntryLinks(entryLinks);
      setOrphanKeys(orphans);
      setLinkConflicts(conflicts || []);
      if (rewritten) onChanged();
    });
    return () => {
      alive = false;
    };
  }, [item.id, item.linkedKeys, item.linkAnnotations]);

  /**
   * Ordinary connections group in the fixed relationship order, with words, pages, Diario
   * moments and dictionary entries mixed inside each group and Related last. Specialized
   * surfaces keep their intentional outer structure: Collections separate membership, while
   * Diario keeps its kind sections and groups by relationship inside them. All grouping is
   * derived at render; no display group or order is stored.
   */
  const connections = useMemo(
    () => [
      ...connectionsFor(item, items),
      ...connectionsFromResolvedEntryLinks(item, linkedEntryLinks),
    ].filter((connection) => connection.kind !== "item" || !placementPageIds.has(connection.key)),
    [item, items, linkedEntryLinks, placementPageIds]
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
    setAssigningCollection(false);
    setStatsExpanded(false);
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
  const examplesAreEmpty = !isPage && item.myExamples.length === 0;
  const mediaIsEmpty = !isPage && item.mediaLinks.length === 0;
  const collectionsAreEmpty = !isPage
    && collectionPlacements.length === 0
    && collectionDestinations.length > 0;
  const hasCompactEntryActions = examplesAreEmpty || mediaIsEmpty || collectionsAreEmpty;

  function renderExampleComposer() {
    if (!addingExample) return null;
    return (
      <div id="example-composer">
        <Card className="space-y-2">
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
      </div>
    );
  }

  function renderMediaComposer() {
    if (!addingMedia) return null;
    return (
      <div id="media-composer">
        <Card className="space-y-2">
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
      </div>
    );
  }

  function renderCollectionAssignment() {
    if (!assigningCollection) return null;
    return (
      <div id="collection-assignment-form">
        <CollectionAssignmentForm
          itemId={item.id}
          destinations={collectionDestinations}
          onCancel={() => setAssigningCollection(false)}
          onSaved={async () => {
            setAssigningCollection(false);
            await onChanged();
          }}
        />
      </div>
    );
  }

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
                        style={head.form === f ? { background: C.pen, color: C.onAccent } : { background: C.card, color: C.mut }}
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
                {/* Lexical only: a page title is usually English and is not a thing to
                    practise saying. */}
                {!isPage && <SpeakButton text={item.term} className="align-middle" size={15} />}
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
                </>
              )}
              <button
                onClick={() => setEditingHead(true)}
                aria-label={isPage ? "Edit page details" : "Edit word or phrase details"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
              >
                <Pencil size={15} style={{ color: C.mut }} />
              </button>
            </div>
          </div>
        )}

        {!editingHead && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-expanded={statsExpanded}
                aria-controls={statsId}
                onClick={() => setStatsExpanded((expanded) => !expanded)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                style={{ background: C.card, borderColor: C.line, color: C.mut }}
              >
                <BarChart3 size={15} /> Stats
                <ChevronDown
                  size={14}
                  className={`transition-transform ${statsExpanded ? "rotate-180" : ""}`}
                />
              </button>
              <button
                onClick={async () => {
                  await toggleTricky(item.id, state.tricky);
                  onChanged();
                }}
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border font-medium"
                style={
                  state.tricky
                    ? { background: C.hi, borderColor: C.hiBorder, color: C.hiInk }
                    : { background: C.card, borderColor: C.line, color: C.mut }
                }
              >
                <Highlighter size={15} /> {state.tricky ? "Marked tricky" : "Highlight as tricky"}
              </button>
            </div>

            {statsExpanded && (
              <div
                id={statsId}
                className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs"
                style={{ background: C.paper, borderColor: C.line, fontFamily: MONO, color: C.mut }}
              >
                <span className="inline-flex items-center gap-1">
                  <Eye size={12} /> opened {state.views}×
                </span>
                {state.lastViewedAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {timeAgo(state.lastViewedAt)}
                  </span>
                )}
                {item.createdAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} /> added {localDate(new Date(item.createdAt))}
                  </span>
                )}
                {!isPage && (
                  <span className="inline-flex items-center gap-1">
                    <Layers size={12} />{" "}
                    {reviewState.graduated
                      ? "retired"
                      : reviewState.enrolled
                        ? `box ${reviewState.box}`
                        : "not in review"}
                  </span>
                )}
                {!isPage && reviewState.lastReviewedAt && (
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw size={12} /> reviewed {timeAgo(reviewState.lastReviewedAt)}
                  </span>
                )}
                {!isPage && reviewState.enrolled && !reviewState.graduated && (
                  <span className="inline-flex items-center gap-1">
                    {reviewState.dueDate <= localDate()
                      ? "due today"
                      : `due ${reviewState.dueDate}`}
                  </span>
                )}
              </div>
            )}

            {!isPage && (
              <DictAttachment
                item={item}
                onOpen={onOpen}
                onChanged={onChanged}
                onEntryResolved={handleEntryResolved}
              />
            )}
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
            <MarkdownTextarea
              autoFocus
              aria-label={isPage ? "Page body" : "Note"}
              value={bodyDraft}
              onChange={(value) => {
                setBodyDraft(value);
                setBodyDirty(true);
              }}
              placeholder={
                isPage
                  ? "Write the page — grammar rules, a source, what happened today…"
                  : "Your notes — mnemonics, gotchas, where you heard it…"
              }
              className="w-full bg-transparent outline-none text-sm"
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
            {hasSavedBody ? (
              <MarkdownText compact className="min-w-0 flex-1 text-sm" style={{ color: C.ink }}>
                {savedBody}
              </MarkdownText>
            ) : (
              <div className="min-w-0 flex-1 text-sm italic" style={{ color: C.mut }}>
                {isPage ? "This page is empty." : "No notes yet."}
              </div>
            )}
            <button
              type="button"
              aria-label={
                hasSavedBody
                  ? `Edit ${isPage ? "page" : "note"}`
                  : isPage
                    ? "Write page"
                    : "Add note"
              }
              className="shrink-0 inline-flex h-11 w-11 items-center justify-center"
              onClick={() => {
                setBodyDraft(savedBody);
                setBodyDirty(false);
                setEditingBody(true);
              }}
            >
              <Pencil size={14} style={{ color: C.pen }} />
            </button>
          </div>
        )}
      </Card>

      <SectionTitle>Tags</SectionTitle>
      <TagInput tags={item.tags} allTags={allTags} onChange={(tags) => patch({ tags })} />

      {!isPage && item.myExamples.length > 0 && (
        <>
          <SectionTitle>General examples</SectionTitle>
          <div className="space-y-2">
            {item.myExamples.map((x, i) => (
              <Card key={i} className="flex justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1">
                    <span className="min-w-0 flex-1" style={{ fontFamily: SERIF, color: C.ink }}>{x.es}</span>
                    <SpeakButton text={x.es} label={`Play example ${i + 1}`} />
                  </div>
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
              aria-label={addingExample ? "Close example form" : "Add an example"}
              onClick={() => (addingExample ? cancelExample() : setAddingExample(true))}
            >
              <Plus size={14} /> {addingExample ? "Close example form" : "Example"}
            </Button>
            {renderExampleComposer()}
          </div>
        </>
      )}

      {(isPage || item.mediaLinks.length > 0) && (
        <>
          <SectionTitle>Media links</SectionTitle>
          <div className="space-y-2">
            {item.mediaLinks.map((m, i) => (
              <Card key={i} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
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
                </div>
                {isDirectImageUrl(m.url) && (
                  <MediaImage src={m.url} alt={m.label || ""} caption={false} />
                )}
              </Card>
            ))}
            <Button
              tone="quiet"
              aria-expanded={addingMedia}
              aria-controls="media-composer"
              aria-label={addingMedia ? "Close media form" : "Add a media link"}
              onClick={() => (addingMedia ? cancelMedia() : setAddingMedia(true))}
            >
              <Plus size={14} /> {addingMedia ? "Close media form" : "Media link"}
            </Button>
            {renderMediaComposer()}
          </div>
        </>
      )}

      {!isPage && collectionPlacements.length > 0 && (
        <>
          <SectionTitle>Collections</SectionTitle>
          {collectionDestinations.length > 0 && !assigningCollection && (
            <IconButton
              tone="quiet"
              className="mb-3"
              aria-label="Add to Collection"
              onClick={() => setAssigningCollection(true)}
            >
              <Plus size={17} />
            </IconButton>
          )}
          {renderCollectionAssignment()}
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

      {hasCompactEntryActions && (
        <div className="mt-6 space-y-2">
          <div
            role="group"
            aria-label="Add entry details"
            className="flex flex-nowrap items-center gap-2"
          >
            {examplesAreEmpty && (
              <CompactEntryAction
                expanded={addingExample}
                openLabel="Add an example"
                closeLabel="Close example form"
                controls="example-composer"
                onClick={() => (addingExample ? cancelExample() : setAddingExample(true))}
              >
                Example
              </CompactEntryAction>
            )}
            {mediaIsEmpty && (
              <CompactEntryAction
                expanded={addingMedia}
                openLabel="Add a media link"
                closeLabel="Close media form"
                controls="media-composer"
                onClick={() => (addingMedia ? cancelMedia() : setAddingMedia(true))}
              >
                Media
              </CompactEntryAction>
            )}
            {collectionsAreEmpty && (
              <CompactEntryAction
                expanded={assigningCollection}
                openLabel="Add to Collection"
                closeLabel="Close Collection form"
                controls="collection-assignment-form"
                onClick={() => setAssigningCollection((open) => !open)}
              >
                Collection
              </CompactEntryAction>
            )}
          </div>
          {examplesAreEmpty && renderExampleComposer()}
          {mediaIsEmpty && renderMediaComposer()}
          {collectionsAreEmpty && renderCollectionAssignment()}
        </div>
      )}

      {!isPage && contextualPlacements.length > 0 && (
        <>
          <SectionTitle>Used in pages</SectionTitle>
          <div className="space-y-1.5">
            {contextualPlacements.map((context, index) => (
              <button
                type="button"
                key={`${context.pageId}:${context.kind}:${context.label}:${index}`}
                onClick={() => onOpen(context.pageId)}
                className="w-full rounded-xl border p-3 text-left"
                style={{ background: C.card, borderColor: C.line }}
              >
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{context.pageTitle}</div>
                <div className="mt-0.5 text-xs" style={{ color: C.mut }}>
                  {context.label}{context.detail ? ` · ${context.detail}` : ""}
                </div>
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
          <Plus size={11} /> link
        </button>
      )}

      {picking && (
        <LinkPicker
          item={item}
          items={items}
          candidateFilter={(candidate) =>
            isPage || candidate.type !== "page" || candidate.collection?.enabled !== true
          }
          linkedKeys={linkedKeys}
          unresolvedKeys={unresolvedKeys}
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
