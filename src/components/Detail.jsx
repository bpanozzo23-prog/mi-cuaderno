import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, Trash2, X, ExternalLink, Pencil, CalendarDays, FileText, Check,
  Highlighter, Eye, Clock, Plus, Bookmark, BookmarkCheck, Layers, RotateCcw,
  BarChart3, ChevronDown, Ellipsis, History, MoveRight,
} from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, SectionTitle, Card, Button, IconButton } from "../theme.jsx";
import { POS_OPTIONS, PosSuffix, personalHeadingSuffix, personalLexicalForm } from "./ItemCard.jsx";
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
import { mergeLinkedEntryIntoTwin, resolveLinkedKeys } from "../db/linkedEntries.js";
import { installedMeta } from "../db/ref/entries.js";
import { derivePersonalTwinMerges } from "../lib/personalTwins.js";
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
import KnowledgeConsolidation from "./KnowledgeConsolidation.jsx";
import Biography from "./Biography.jsx";
import ExamplePhraseAction from "./ExamplePhraseAction.jsx";
import ExampleEditForm from "./ExampleEditForm.jsx";
import SharedSourceDisclosure from "./SharedSourceDisclosure.jsx";
import { canonicalSharedSourceUrl } from "../lib/sharedSources.js";

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
  events = [],
  onBack,
  backLabel = "Todo el cuaderno",
  onOpen,
  onChanged,
  onAddPhraseFromExample,
  prepareBiographyFamily,
  pagePinned = false,
  onPagePinnedChange,
  destinationScreen = null,
  onOpenBiography = null,
  onCloseBiography = null,
  biographyBackLabel = null,
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
  const [openGeneralExampleActions, setOpenGeneralExampleActions] = useState(null);
  const [editingGeneralExample, setEditingGeneralExample] = useState(null);
  const [generalExampleError, setGeneralExampleError] = useState("");
  const [addingMedia, setAddingMedia] = useState(false);
  const [mUrl, setMUrl] = useState("");
  const [mLabel, setMLabel] = useState("");
  // Which saved link the media composer is editing; null means it is adding a new one. A saved
  // link was previously open-or-delete only, so fixing a label meant retyping the URL.
  const [editingMediaIndex, setEditingMediaIndex] = useState(null);
  const [deleteArm, setDeleteArm] = useState(false);
  const [picking, setPicking] = useState(false);
  const [assigningCollection, setAssigningCollection] = useState(false);
  const [linkedEntryLinks, setLinkedEntryLinks] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);
  const [linkConflicts, setLinkConflicts] = useState([]);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [view, setView] = useState("detail");
  const activeView = destinationScreen === "biography" ? "biography" : view;
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

  // A dictionary connection whose entry the owner has since attached to an item of their own
  // gets a prompted merge offer on its card. Alias awareness needs the installed previousIds
  // map on the attachment side (the DictDetail rule); the LinkPicker precedent for loading it.
  const [dictionaryMeta, setDictionaryMeta] = useState(null);
  useEffect(() => {
    let alive = true;
    installedMeta().then((meta) => {
      if (alive) setDictionaryMeta(meta);
    });
    return () => { alive = false; };
  }, [item.id]);
  const twinMerges = useMemo(
    () => derivePersonalTwinMerges(item, linkedEntryLinks, items, dictionaryMeta?.previousIds || {}),
    [item, linkedEntryLinks, items, dictionaryMeta]
  );

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
    setOpenGeneralExampleActions(null);
    setEditingGeneralExample(null);
    setGeneralExampleError("");
    setAddingMedia(false);
    setMUrl("");
    setMLabel("");
    setEditingMediaIndex(null);
    setDeleteArm(false);
    setPicking(false);
    setAssigningCollection(false);
    setStatsExpanded(false);
    setView("detail");
    setHead(
      isPage
        ? { title: item.title, pageDate: item.pageDate || "" }
        : { term: item.term, pos: item.pos || "", form: item.form }
    );
  }, [item.id]);

  useEffect(() => {
    if (openGeneralExampleActions === null || typeof document === "undefined") return undefined;

    function closeOnOutsidePress(event) {
      if (!event.target.closest("[data-general-example-actions-root]")) {
        setOpenGeneralExampleActions(null);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpenGeneralExampleActions(null);
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openGeneralExampleActions]);

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

  if (activeView === "biography") {
    return (
      <Biography
        item={item}
        items={items}
        events={events}
        state={state}
        reviewState={reviewState}
        connections={connections}
        onOpen={onOpen}
        onClose={onCloseBiography || (() => setView("detail"))}
        backLabel={biographyBackLabel}
        prepareFamily={prepareBiographyFamily}
      />
    );
  }

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

  function startGeneralExampleEdit(index, example) {
    setOpenGeneralExampleActions(null);
    setEditingGeneralExample({ index, es: example.es, en: example.en || "" });
    setGeneralExampleError("");
  }

  async function saveGeneralExampleEdit(event) {
    event.preventDefault();
    const es = editingGeneralExample?.es.trim();
    if (!es || !item.myExamples[editingGeneralExample.index]) return;
    const nextExamples = item.myExamples.map((example, index) => (
      index === editingGeneralExample.index
        ? { es, en: editingGeneralExample.en.trim() }
        : example
    ));
    try {
      await patch({ myExamples: nextExamples });
      setEditingGeneralExample(null);
      setGeneralExampleError("");
    } catch (problem) {
      setGeneralExampleError(problem.message);
    }
  }

  function cancelMedia() {
    setMUrl("");
    setMLabel("");
    setEditingMediaIndex(null);
    setAddingMedia(false);
  }

  function startMediaEdit(index) {
    const media = item.mediaLinks[index];
    setMUrl(media.url);
    setMLabel(media.label || "");
    setEditingMediaIndex(index);
    setAddingMedia(true);
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
                const media = { url, label: mLabel.trim() };
                await patch({
                  mediaLinks: editingMediaIndex === null
                    ? [...item.mediaLinks, media]
                    : item.mediaLinks.map((existing, i) => (i === editingMediaIndex ? media : existing)),
                });
                cancelMedia();
              }}
            >
              {editingMediaIndex === null ? "Add link" : "Save link"}
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
                    <PosSuffix className="text-base ml-2">{headingSuffix}</PosSuffix>
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
              {!isPage && (
                <button
                  type="button"
                  onClick={onOpenBiography || (() => setView("biography"))}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                  style={{ background: C.card, borderColor: C.line, color: C.mut }}
                >
                  <History size={15} /> Historia
                </button>
              )}
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
          <MeaningsSection
            item={item}
            onPatch={patch}
            onAddPhraseFromExample={onAddPhraseFromExample}
          />
        </>
      )}

      <SectionTitle>{isPage ? "Page" : "Notes"}</SectionTitle>
      <Card>
        {editingBody ? (
          <>
            <MarkdownTextarea
              autoFocus
              blankLines={!isPage}
              noteCallouts={!isPage}
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
              <MarkdownText
                blankLines={!isPage}
                explicitNoteCallouts={!isPage}
                compact
                className="min-w-0 flex-1 text-sm"
                style={{ color: C.ink }}
              >
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
            {item.myExamples.map((x, i) => {
              const actionsOpen = openGeneralExampleActions === i;
              const editingThisExample = editingGeneralExample?.index === i;
              const popoverId = `general-example-actions-${i}`;
              return (
                <Card key={i}>
                  <div className="relative" data-general-example-actions-root>
                    {editingThisExample ? (
                      <ExampleEditForm
                        originalExample={x}
                        draft={editingGeneralExample}
                        onChange={setEditingGeneralExample}
                        onSubmit={saveGeneralExampleEdit}
                        onCancel={() => {
                          setEditingGeneralExample(null);
                          setGeneralExampleError("");
                        }}
                        error={generalExampleError}
                      />
                    ) : (
                      <>
                        <div className="flex items-start gap-1">
                          <div className="min-w-0 flex-1">
                            <div style={{ fontFamily: SERIF, color: C.ink }}>{x.es}</div>
                            {x.en && <div className="mt-1 text-xs" style={{ color: C.mut }}>{x.en}</div>}
                          </div>
                          <div className="flex shrink-0 items-start">
                            <SpeakButton text={x.es} label={`Play example ${i + 1}`} />
                            <button
                              type="button"
                              aria-label={`Actions for “${x.es}”`}
                              aria-haspopup="dialog"
                              aria-expanded={actionsOpen}
                              aria-controls={popoverId}
                              onClick={() => setOpenGeneralExampleActions(actionsOpen ? null : i)}
                              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                              style={{ color: C.pen }}
                            >
                              <Ellipsis size={17} />
                            </button>
                          </div>
                        </div>

                        {actionsOpen && (
                          <div
                            id={popoverId}
                            role="dialog"
                            aria-label={`Actions for “${x.es}”`}
                            className="absolute right-0 z-20 mt-1 w-56 max-w-full rounded-xl border p-1 shadow-lg"
                            style={{ background: C.card, borderColor: C.line }}
                          >
                            <button
                              type="button"
                              aria-label={`Edit example “${x.es}”`}
                              onClick={() => startGeneralExampleEdit(i, x)}
                              className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-xs"
                              style={{ color: C.mut }}
                            >
                              <Pencil size={14} className="shrink-0" />
                              Edit example…
                            </button>
                            {item.meanings.length > 0 && (
                              <div className="border-t" style={{ borderColor: C.line }}>
                                <div className="flex min-h-11 items-center gap-2 px-2">
                                  <MoveRight size={14} className="shrink-0" style={{ color: C.mut }} />
                                  <select
                                    aria-label={`Assign “${x.es}” to meaning`}
                                    defaultValue=""
                                    onChange={async (event) => {
                                      if (!event.target.value) return;
                                      setOpenGeneralExampleActions(null);
                                      const nextMeanings = cloneMeanings(item.meanings);
                                      nextMeanings.find((meaning) => meaning.id === event.target.value).examples.push(x);
                                      await patch({
                                        meanings: nextMeanings,
                                        myExamples: item.myExamples.filter((_, itemIndex) => itemIndex !== i),
                                      });
                                    }}
                                    className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none"
                                    style={{ color: C.mut }}
                                  >
                                    <option value="">Assign to meaning…</option>
                                    {item.meanings.map((meaning) => (
                                      <option key={meaning.id} value={meaning.id}>{meaning.gloss}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                            {onAddPhraseFromExample && (
                              <div className="border-t" style={{ borderColor: C.line }}>
                                <ExamplePhraseAction
                                  example={x}
                                  menu
                                  onAddPhraseFromExample={(selectedExample) => {
                                    setOpenGeneralExampleActions(null);
                                    onAddPhraseFromExample(selectedExample);
                                  }}
                                />
                              </div>
                            )}
                            <div className="border-t" style={{ borderColor: C.line }}>
                              <button
                                type="button"
                                aria-label={`Delete example “${x.es}”`}
                                onClick={async () => {
                                  setOpenGeneralExampleActions(null);
                                  await patch({ myExamples: item.myExamples.filter((_, itemIndex) => itemIndex !== i) });
                                }}
                                className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-xs"
                                style={{ color: C.red }}
                              >
                                <Trash2 size={14} className="shrink-0" />
                                Delete example
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
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
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={`Edit media ${m.label || m.url}`}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center"
                      onClick={() => startMediaEdit(i)}
                    >
                      <Pencil size={14} style={{ color: C.mut }} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove media ${m.label || m.url}`}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center"
                      onClick={() => patch({ mediaLinks: item.mediaLinks.filter((_, j) => j !== i) })}
                    >
                      <X size={14} style={{ color: C.mut }} />
                    </button>
                  </div>
                </div>
                {isDirectImageUrl(m.url) && (
                  <MediaImage src={m.url} alt={m.label || ""} caption={false} />
                )}
                {canonicalSharedSourceUrl(m.url)
                  && item.mediaLinks.findIndex((candidate) =>
                    canonicalSharedSourceUrl(candidate.url) === canonicalSharedSourceUrl(m.url)
                  ) === i && (
                  <SharedSourceDisclosure
                    items={items}
                    currentItemId={item.id}
                    url={m.url}
                    onOpen={onOpen}
                  />
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

      {!isPage && (
        <KnowledgeConsolidation
          item={item}
          items={items}
          onOpen={onOpen}
          onAcceptSimilar={async (targetId) => {
            await linkItems(item.id, targetId, { type: "similar_meaning" });
            await onChanged();
          }}
          onAcceptContainment={async (targetId) => {
            // The word is always the found_in subject: a word is "Found in" its phrase, so a
            // phrase-side confirmation stores the same edge with the target as subject.
            await linkItems(item.id, targetId, {
              type: "found_in",
              subject: item.form === "word" ? "owner" : "target",
            });
            await onChanged();
          }}
        />
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
                  twinMerge={twinMerges.get(row.key)}
                  onMerge={async (twinId, relationship) => {
                    const result = await mergeLinkedEntryIntoTwin(item.id, row.key, twinId, relationship);
                    if (result?.merged) await onChanged();
                    return result;
                  }}
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
