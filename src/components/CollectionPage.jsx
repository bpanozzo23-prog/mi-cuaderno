import { useEffect, useMemo, useState } from "react";
import {
  Bookmark, BookmarkCheck, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ExternalLink,
  Goal, ListTree, MoreHorizontal, Pencil, Play, Plus, Settings2, Trash2, X,
} from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, Button, IconButton } from "../theme.jsx";
import { allTagsIn } from "../lib/tags.js";
import TagChip from "./TagChip.jsx";
import { deriveCollection, NOT_GROUPED_LABEL } from "../lib/collections.js";
import {
  connectionsFor,
  groupConnections,
  relationshipForTarget,
  relationshipLabel,
} from "../lib/relationships.js";
import { connectionsFromResolvedEntryLinks } from "../lib/resolvedConnections.js";
import { resolveLinkedKeys } from "../db/linkedEntries.js";
import {
  commitCollectionAdd, commitPageVocabularyAdd, saveCollectionOrganization,
} from "../db/collections.js";
import {
  updateItem, deleteItem, linkItems, unlinkItems, setLinkRelationship, createItem, newLexical, newPage,
} from "../db/items.js";
import { logView } from "../db/events.js";
import { PAGE_FOCUSES, enabledPageRoles } from "../lib/pageKinds.js";
import { savePageFocus } from "../db/pageStructures.js";
import { vocabularyRemovalImpact } from "../lib/pageReferences.js";
import { ItemLinkCard, EntryLinkCard, OrphanLinkCard } from "./LinkCard.jsx";
import MediaImage from "./MediaImage.jsx";
import { isDirectImageUrl } from "../lib/mediaUrls.js";
import CollectionVocabularyCard from "./CollectionVocabularyCard.jsx";
import CollectionAddVocabularySheet from "./CollectionAddVocabularySheet.jsx";
import CollectionOrganizer from "./CollectionOrganizer.jsx";
import LinkPicker from "./LinkPicker.jsx";
import AliasConflictResolver from "./AliasConflictResolver.jsx";
import TagInput from "./TagInput.jsx";
import SourceSection from "./SourceSection.jsx";
import GrammarSection from "./GrammarSection.jsx";
import PageCustomizeSheet from "./PageCustomizeSheet.jsx";
import PageSectionDisclosure, { SectionSpineNode } from "./PageSectionDisclosure.jsx";
import { PAGE_ROLE_META, sectionFamily } from "./pageRoleMeta.js";
import MarkdownTextarea from "./MarkdownTextarea.jsx";
import StructuredNotesSection from "./StructuredNotesSection.jsx";
import PracticeSession from "./PracticeSession.jsx";
import PracticeSetupSheet from "./PracticeSetupSheet.jsx";
import { buildPracticeDeck, isPracticeEligible } from "../lib/practice.js";
import { preparePracticeCards } from "../lib/practiceCards.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };
const VOCABULARY_FAMILY = sectionFamily("vocabulary");

const FOCUS_LABELS = {
  [PAGE_FOCUSES.notes]: "Notes",
  [PAGE_FOCUSES.vocabulary]: "Vocabulary",
  [PAGE_FOCUSES.source]: "Source",
  [PAGE_FOCUSES.grammar]: "Grammar",
};

const FOCUS_HEADINGS = {
  [PAGE_FOCUSES.notes]: "Notes page",
  [PAGE_FOCUSES.vocabulary]: "Vocabulary collection",
  [PAGE_FOCUSES.source]: "Source notebook",
  [PAGE_FOCUSES.grammar]: "Grammar guide",
};

const SECTION_ORDERS = {
  [PAGE_FOCUSES.notes]: ["source", "grammar", "vocabulary"],
  [PAGE_FOCUSES.source]: ["source", "vocabulary", "grammar"],
  [PAGE_FOCUSES.grammar]: ["grammar", "vocabulary", "source"],
  [PAGE_FOCUSES.vocabulary]: ["vocabulary", "source", "grammar"],
};

function availableFocusChoices(page) {
  return [
    PAGE_FOCUSES.notes,
    page.collection?.enabled && PAGE_FOCUSES.vocabulary,
    page.source?.enabled && PAGE_FOCUSES.source,
    page.grammar?.enabled && PAGE_FOCUSES.grammar,
  ].filter(Boolean);
}

function CollectionDetailsEditor({ item, items, onCancel, onSaved }) {
  const [draft, setDraft] = useState(() => ({
    title: item.title || "",
    pageDate: item.pageDate || "",
    body: item.body || "",
    tags: [...(item.tags || [])],
    mediaLinks: (item.mediaLinks || []).map((link) => ({ ...link })),
  }));
  const [media, setMedia] = useState({ url: "", label: "" });
  const allTags = useMemo(() => allTagsIn(items), [items]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3" style={{ background: C.penPale, borderColor: C.line }}>
        <div className="text-sm font-semibold" style={{ color: C.ink }}>Edit page details</div>
        <div className="text-xs" style={{ color: C.mut }}>Structured sections and connections stay unchanged.</div>
      </div>
      <label className="block text-xs" style={{ color: C.mut }}>
        Title
        <input
          autoFocus
          value={draft.title}
          onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-base outline-none"
          style={{ ...inputStyle, fontFamily: SERIF }}
        />
      </label>
      <label className="block text-xs" style={{ color: C.mut }}>
        Date (optional)
        <input
          type="date"
          value={draft.pageDate}
          onChange={(event) => setDraft((current) => ({ ...current, pageDate: event.target.value }))}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
      </label>
      <label className="block text-xs" style={{ color: C.mut }}>
        Notes
        <MarkdownTextarea
          blankLines
          noteCallouts
          aria-label="Page notes"
          value={draft.body}
          onChange={(body) => setDraft((current) => ({ ...current, body }))}
          className="mt-1 min-h-32 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
      </label>
      <div>
        <div className="mb-1 text-xs" style={{ color: C.mut }}>Tags</div>
        <TagInput tags={draft.tags} allTags={allTags} onChange={(tags) => setDraft((current) => ({ ...current, tags }))} />
      </div>
      <div>
        <div className="mb-2 text-xs" style={{ color: C.mut }}>Media links</div>
        <div className="space-y-1.5">
          {draft.mediaLinks.map((link, index) => (
            <div key={`${link.url}:${index}`} className="flex items-center gap-2 rounded-lg border px-2 py-2" style={{ borderColor: C.line }}>
              <span className="min-w-0 flex-1 truncate text-xs" style={{ color: C.ink }}>{link.label || link.url}</span>
              <button type="button" aria-label={`Remove media ${link.label || link.url}`} onClick={() => setDraft((current) => ({ ...current, mediaLinks: current.mediaLinks.filter((_, candidate) => candidate !== index) }))}>
                <X size={13} style={{ color: C.red }} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            aria-label="Media URL"
            value={media.url}
            onChange={(event) => setMedia((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://…"
            className="min-w-0 rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          />
          <input
            aria-label="Media label"
            value={media.label}
            onChange={(event) => setMedia((current) => ({ ...current, label: event.target.value }))}
            placeholder="Label (optional)"
            className="min-w-0 rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <Button
          tone="quiet"
          className="mt-2"
          aria-label="Add media link"
          disabled={!/^https?:\/\//.test(media.url.trim())}
          onClick={() => {
            setDraft((current) => ({
              ...current,
              mediaLinks: [...current.mediaLinks, { url: media.url.trim(), label: media.label.trim() }],
            }));
            setMedia({ url: "", label: "" });
          }}
        >
          <Plus size={14} /> Media link
        </Button>
      </div>
      <div className="flex gap-2 border-t pt-4" style={{ borderColor: C.line }}>
        <Button
          disabled={!draft.title.trim()}
          onClick={async () => {
            await updateItem(item.id, {
              title: draft.title.trim(),
              pageDate: draft.pageDate || null,
              body: draft.body,
              tags: draft.tags,
              mediaLinks: draft.mediaLinks,
            });
            await onSaved();
          }}
        >
          <Check size={14} /> Save details
        </Button>
        <Button tone="quiet" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ConnectionsSection({
  item,
  items,
  vocabularyEnabled = false,
  relatedItems,
  linkedEntryLinks,
  orphanKeys,
  linkConflicts,
  onOpen,
  onChanged,
}) {
  const [picking, setPicking] = useState(false);
  const relatedItemIds = useMemo(
    () => new Set(relatedItems.map((candidate) => candidate.id)),
    [relatedItems]
  );
  const relatedKeys = useMemo(
    () => new Set([
      ...connectionsFor(item, items).map((connection) => connection.key),
      ...(item.linkedKeys || []),
      ...linkedEntryLinks.map((link) => link.canonicalKey),
    ]),
    [item, items, linkedEntryLinks]
  );
  const unresolvedKeys = useMemo(
    () => new Set(linkConflicts.flatMap((conflict) => [
      conflict.canonicalKey,
      ...(conflict.rawKeys || []),
    ])),
    [linkConflicts]
  );
  const connections = useMemo(
    () => [
      ...connectionsFor(item, items),
      ...connectionsFromResolvedEntryLinks(item, linkedEntryLinks),
    ].filter((connection) => !vocabularyEnabled || connection.kind !== "item" || relatedItemIds.has(connection.key)),
    [item, items, linkedEntryLinks, relatedItemIds, vocabularyEnabled]
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
  const connectionCount = groups.reduce((total, group) => total + group.rows.length, 0) + linkConflicts.length;
  const empty = connectionCount === 0;
  async function unlink(key) {
    await unlinkItems(item.id, key);
    await onChanged();
  }

  return (
    <PageSectionDisclosure
      id="page-connections"
      family="neutral"
      title="Connections"
      summary={empty ? "" : `${connectionCount} ${connectionCount === 1 ? "connection" : "connections"}`}
      defaultCollapsed={empty}
      empty={empty}
      resetKey={item.id}
      actions={!picking && empty ? (
        <IconButton
          tone="quiet"
          style={{ background: "transparent", color: C.mut }}
          aria-label={vocabularyEnabled ? "link something related" : "link something"}
          aria-expanded={picking}
          onClick={() => setPicking(true)}
        >
          <Plus size={17} />
        </IconButton>
      ) : null}
    >
      <div className="mt-3">
      {groups.length === 0 && linkConflicts.length === 0 && !picking && (
        <div className="mb-2 text-xs" style={{ color: C.mut }}>
          No ordinary connections yet. Structured vocabulary stays in its page sections.
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
          <div className="mb-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>{group.name}</div>
          <div className="space-y-1.5">
            {group.rows.map((row) => row.kind === "entry" ? (
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
            ))}
          </div>
        </div>
      ))}
      {!picking && !empty && (
        <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ background: C.card, borderColor: C.line, color: C.mut }}>
          <Plus size={11} /> link
        </button>
      )}
      {picking && (
        <>
          <LinkPicker
            item={item}
            items={items}
            linkedKeys={relatedKeys}
            connections={connections}
            unresolvedKeys={unresolvedKeys}
            candidateFilter={(candidate) => vocabularyEnabled ? candidate.type === "page" : true}
            allowCreateLexical={!vocabularyEnabled}
            onCancel={() => setPicking(false)}
            onPick={async (key, relationship) => {
              await linkItems(item.id, key, relationship);
              await onChanged();
            }}
            onCreate={async (kind, text, relationship) => {
              const created = await createItem(
                kind === "page"
                  ? newPage({ title: text })
                  : newLexical({ term: text, form: text.includes(" ") ? "phrase" : "word" })
              );
              await linkItems(item.id, created.id, relationship);
              await onChanged();
            }}
          />
          {vocabularyEnabled && <div className="mt-2 text-[11px]" style={{ color: C.mut }}>Use the + Vocabulary action inside an enabled section to attach words and phrases in context.</div>}
        </>
      )}
      </div>
    </PageSectionDisclosure>
  );
}

function PageMediaSection({ page, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const empty = (page.mediaLinks || []).length === 0;

  useEffect(() => {
    setAdding(false);
    setUrl("");
    setLabel("");
  }, [page.id]);

  function cancel() {
    setAdding(false);
    setUrl("");
    setLabel("");
  }

  return (
    <PageSectionDisclosure
      id="page-media"
      family="neutral"
      title="Media links"
      summary={empty ? "" : `${page.mediaLinks.length} ${page.mediaLinks.length === 1 ? "link" : "links"}`}
      defaultCollapsed={empty}
      empty={empty}
      resetKey={page.id}
      actions={(
        <IconButton
          tone="quiet"
          style={empty ? { background: "transparent", color: C.mut } : undefined}
          aria-label={adding ? "Close media form" : "Add a media link"}
          aria-expanded={adding}
          aria-controls="page-media-composer"
          onClick={() => adding ? cancel() : setAdding(true)}
        >
          {adding ? <X size={17} /> : <Plus size={17} />}
        </IconButton>
      )}
    >
      <div className="mt-3 space-y-2">
        {(page.mediaLinks || []).map((media, index) => (
          <Card key={`${media.url}:${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <a href={media.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm underline underline-offset-2" style={{ color: C.pen }}>
                <ExternalLink size={14} className="shrink-0" /><span className="truncate">{media.label || media.url}</span>
              </a>
              <button type="button" aria-label={`Remove media ${media.label || media.url}`} className="min-h-11 min-w-11 inline-flex items-center justify-center" onClick={async () => {
                await updateItem(page.id, { mediaLinks: page.mediaLinks.filter((_, candidate) => candidate !== index) });
                await onChanged();
              }}><X size={14} style={{ color: C.mut }} /></button>
            </div>
            {isDirectImageUrl(media.url) && (
              <MediaImage src={media.url} alt={media.label || ""} caption={false} />
            )}
          </Card>
        ))}
        {adding && (
          <Card id="page-media-composer" className="space-y-2">
            <input autoFocus aria-label="Media URL" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https:// link to video, image, article…" className="w-full bg-transparent text-sm outline-none" style={{ color: C.ink }} />
            <input aria-label="Media label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label (optional)" className="w-full border-t bg-transparent pt-2 text-sm outline-none" style={{ color: C.ink, borderColor: C.line }} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={async () => {
                const savedUrl = url.trim();
                if (!/^https?:\/\//.test(savedUrl)) return;
                await updateItem(page.id, { mediaLinks: [...(page.mediaLinks || []), { url: savedUrl, label: label.trim() }] });
                cancel();
                await onChanged();
              }}>Add link</Button>
              <Button tone="quiet" onClick={cancel}>Cancel</Button>
            </div>
          </Card>
        )}
      </div>
    </PageSectionDisclosure>
  );
}

const UNGROUPED_COLLAPSE_KEY = "collection-ungrouped";

function VocabularyGroupHeader({
  name,
  itemCount,
  headingId,
  contentId,
  collapsed,
  onToggle,
  onAdd,
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label={`${collapsed ? "Expand" : "Collapse"} group ${name}`}
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={onToggle}
        className="-ml-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left flex items-center gap-2"
      >
        {collapsed
          ? <ChevronRight size={16} className="shrink-0" style={{ color: C.mut }} />
          : <ChevronDown size={16} className="shrink-0" style={{ color: C.mut }} />}
        <div className="min-w-0">
          <h3 id={headingId} className="break-words text-sm font-semibold leading-snug" style={{ color: C.ink }}>{name}</h3>
          <div className="text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add vocabulary"
        className="min-h-11 shrink-0 rounded-full border px-3 py-1 text-xs inline-flex items-center gap-1"
        style={{ background: C.card, borderColor: C.line, color: C.pen }}
      >
        <Plus size={11} /> Vocabulary
      </button>
    </div>
  );
}

function VocabularySection({
  page,
  items,
  collection,
  onOpen,
  onChanged,
  onOrganize,
  onPractice,
  onPracticeSession,
}) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set(
    collection.groups.filter((group) => group.items.length === 0).map((group) => group.id)
  ));
  const [addTarget, setAddTarget] = useState(null);
  const memberLocations = useMemo(() => {
    const map = new Map();
    for (const group of collection.groups) for (const key of group.itemKeys) map.set(key, group.name);
    for (const key of collection.ungroupedItemKeys) map.set(key, NOT_GROUPED_LABEL);
    return map;
  }, [collection]);

  useEffect(() => {
    setExpanded(new Set());
    setCollapsedGroups(new Set(
      collection.groups.filter((group) => group.items.length === 0).map((group) => group.id)
    ));
    setAddTarget(null);
  }, [page.id]);

  function toggleGroup(groupKey) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
      return next;
    });
  }

  function openAddTarget(groupId, label) {
    const groupKey = groupId || UNGROUPED_COLLAPSE_KEY;
    setCollapsedGroups((current) => {
      if (!current.has(groupKey)) return current;
      const next = new Set(current);
      next.delete(groupKey);
      return next;
    });
    setAddTarget({ groupId, label });
  }

  async function commit(targetGroupId, candidates) {
    await commitCollectionAdd(page.id, { targetGroupId, candidates });
    setAddTarget(null);
    await onChanged();
  }

  function vocabularyCard(entry) {
    return (
      <CollectionVocabularyCard
        key={entry.id}
        item={entry}
        expanded={expanded.has(entry.id)}
        onToggle={() => setExpanded((current) => {
          const next = new Set(current);
          if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
          return next;
        })}
        onOpen={onOpen}
      />
    );
  }

  return (
    <PageSectionDisclosure
      id="page-vocabulary"
      family="vocabulary"
      title="Vocabulary"
      summary={`${collection.itemCount} ${collection.itemCount === 1 ? "item" : "items"} · ${collection.groupCount} ${collection.groupCount === 1 ? "group" : "groups"}`}
      defaultCollapsed={collection.itemCount === 0}
      resetKey={page.id}
      actions={({ collapsed }) => collection.itemCount === 0 ? (
        <>
          <button
            type="button"
            aria-label="Add vocabulary"
            onClick={() => openAddTarget(null, NOT_GROUPED_LABEL)}
            className="inline-flex items-center justify-center rounded-lg border p-2"
            style={{ background: VOCABULARY_FAMILY.band, borderColor: VOCABULARY_FAMILY.line, color: VOCABULARY_FAMILY.ink }}
          >
            <Plus size={15} />
          </button>
          {!collapsed && (
            <button
              type="button"
              aria-label="Organize"
              onClick={() => onOrganize(false)}
              className="inline-flex items-center justify-center rounded-lg border p-2"
              style={{ background: VOCABULARY_FAMILY.band, borderColor: VOCABULARY_FAMILY.line, color: VOCABULARY_FAMILY.ink }}
            >
              <ListTree size={15} />
            </button>
          )}
        </>
      ) : !collapsed ? (
        <>
          <IconButton tone="quiet" aria-label="Practice" onClick={onPractice} disabled={!collection.practiceEligible}>
            <Goal size={18} />
          </IconButton>
          <IconButton tone="primary" aria-label="Start practice session" onClick={onPracticeSession} disabled={!collection.practiceEligible}>
            <Play size={18} />
          </IconButton>
          <button
            type="button"
            aria-label="Organize"
            onClick={() => onOrganize(false)}
            className="inline-flex items-center justify-center rounded-lg border p-2"
            style={{ background: VOCABULARY_FAMILY.band, borderColor: VOCABULARY_FAMILY.line, color: VOCABULARY_FAMILY.ink }}
          >
            <ListTree size={15} />
          </button>
        </>
      ) : null}
    >
      <div className="mt-4 space-y-5">
        {collection.groups.map((group) => {
          const headingId = `collection-group-${group.id}`;
          const contentId = `collection-group-content-${group.id}`;
          const collapsed = collapsedGroups.has(group.id);
          return (
            <section key={group.id} aria-labelledby={headingId} className="relative">
              <SectionSpineNode family="vocabulary" />
              <VocabularyGroupHeader
                name={group.name}
                itemCount={group.items.length}
                headingId={headingId}
                contentId={contentId}
                collapsed={collapsed}
                onToggle={() => toggleGroup(group.id)}
                onAdd={() => openAddTarget(group.id, group.name)}
              />
              <div id={contentId} hidden={collapsed}>
                {addTarget?.groupId === group.id && (
                  <CollectionAddVocabularySheet
                    items={items}
                    memberLocations={memberLocations}
                    targetLabel={group.name}
                    onCancel={() => setAddTarget(null)}
                    onCommit={(candidates) => commit(group.id, candidates)}
                  />
                )}
                <div className="mt-2 space-y-2">
                  {group.items.map(vocabularyCard)}
                  {group.items.length === 0 && <Card><div className="text-xs italic" style={{ color: C.mut }}>No vocabulary in this group yet.</div></Card>}
                </div>
              </div>
            </section>
          );
        })}

        {collection.ungroupedItems.length > 0 && (
          <section aria-labelledby="collection-ungrouped" className="relative">
            <SectionSpineNode family="vocabulary" />
            <VocabularyGroupHeader
              name={NOT_GROUPED_LABEL}
              itemCount={collection.ungroupedItems.length}
              headingId="collection-ungrouped"
              contentId="collection-ungrouped-content"
              collapsed={collapsedGroups.has(UNGROUPED_COLLAPSE_KEY)}
              onToggle={() => toggleGroup(UNGROUPED_COLLAPSE_KEY)}
              onAdd={() => openAddTarget(null, NOT_GROUPED_LABEL)}
            />
            <div id="collection-ungrouped-content" hidden={collapsedGroups.has(UNGROUPED_COLLAPSE_KEY)}>
              {addTarget && addTarget.groupId === null && (
                <CollectionAddVocabularySheet
                  items={items}
                  memberLocations={memberLocations}
                  targetLabel={NOT_GROUPED_LABEL}
                  onCancel={() => setAddTarget(null)}
                  onCommit={(candidates) => commit(null, candidates)}
                />
              )}
              <div className="mt-2 space-y-2">{collection.ungroupedItems.map(vocabularyCard)}</div>
            </div>
          </section>
        )}

        {collection.ungroupedItems.length === 0 && addTarget?.groupId === null && (
          <CollectionAddVocabularySheet
            items={items}
            memberLocations={memberLocations}
            targetLabel={NOT_GROUPED_LABEL}
            onCancel={() => setAddTarget(null)}
            onCommit={(candidates) => commit(null, candidates)}
          />
        )}
      </div>

      {collection.itemCount === 0 && collection.groupCount === 0 && (
        <div className="mt-4 text-xs" style={{ color: C.mut }}>
          Add personal entries, search the dictionary, or create something new.
        </div>
      )}

      <Button tone="quiet" className="mt-4" aria-label="Add group" onClick={() => onOrganize(true)}><Plus size={14} /> Group</Button>
    </PageSectionDisclosure>
  );
}

export default function CollectionPage({
  item,
  state,
  items,
  onBack,
  backLabel,
  onOpen,
  onChanged,
  pagePinned = false,
  onPagePinnedChange,
}) {
  const [mode, setMode] = useState("read");
  const [revealed, setRevealed] = useState(() => new Set());
  const [editingDetails, setEditingDetails] = useState(false);
  const [startWithNewGroup, setStartWithNewGroup] = useState(false);
  const [deleteArm, setDeleteArm] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [focusSaving, setFocusSaving] = useState(false);
  const [linkedEntryLinks, setLinkedEntryLinks] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);
  const [linkConflicts, setLinkConflicts] = useState([]);
  const [practiceSetupOpen, setPracticeSetupOpen] = useState(false);
  const [practiceStarting, setPracticeStarting] = useState(false);
  const [practiceSession, setPracticeSession] = useState(null);

  const collection = useMemo(() => deriveCollection(item, items), [item, items]);
  const practiceScopes = useMemo(() => {
    const describe = (value, label, scopeItems) => {
      const eligibleCount = scopeItems.filter(isPracticeEligible).length;
      return {
        value,
        label,
        items: scopeItems,
        eligibleCount,
        omittedCount: scopeItems.length - eligibleCount,
      };
    };
    const collectionOrder = [
      ...collection.groups.flatMap((group) => group.items),
      ...collection.ungroupedItems,
    ];
    return [
      describe("all", "Whole collection", collectionOrder),
      ...collection.groups
        .filter((group) => group.items.length > 0)
        .map((group) => describe(group.id, group.name, group.items)),
      ...(collection.ungroupedItems.length > 0
        ? [describe(UNGROUPED_COLLAPSE_KEY, NOT_GROUPED_LABEL, collection.ungroupedItems)]
        : []),
    ];
  }, [collection]);
  const itemById = useMemo(() => new Map(items.map((candidate) => [candidate.id, candidate])), [items]);
  const focusChoices = useMemo(() => availableFocusChoices(item), [item]);
  const roles = useMemo(() => enabledPageRoles(item), [item]);
  const sectionOrder = SECTION_ORDERS[item.pageFocus] || SECTION_ORDERS[PAGE_FOCUSES.notes];
  /* The kicker pill wears its focus family's pale/ink pair, same fallback as the heading text. */
  const kickerMeta = PAGE_ROLE_META[item.pageFocus] || PAGE_ROLE_META[PAGE_FOCUSES.notes];

  useEffect(() => {
    setMode("read");
    setRevealed(new Set());
    setEditingDetails(false);
    setDeleteArm(false);
    setCustomizing(false);
    setPracticeSetupOpen(false);
    setPracticeStarting(false);
    setPracticeSession(null);
  }, [item.id]);

  useEffect(() => {
    logView(item.id).then((logged) => {
      if (logged) onChanged();
    });
  }, [item.id]);

  useEffect(() => {
    let alive = true;
    resolveLinkedKeys(item).then(({ entryLinks, orphans, conflicts, rewritten }) => {
      if (!alive) return;
      setLinkedEntryLinks(entryLinks);
      setOrphanKeys(orphans);
      setLinkConflicts(conflicts || []);
      if (rewritten) onChanged();
    });
    return () => { alive = false; };
  }, [item.id, item.linkedKeys, item.linkAnnotations]);

  function enterMode(next) {
    setRevealed(new Set());
    setEditingDetails(false);
    if (next !== "organize") setStartWithNewGroup(false);
    setMode(next);
  }

  async function startCollectionPractice({ scope, direction, mode: answerMode, ...deckOptions }) {
    if (practiceStarting) return;
    const selectedScope = practiceScopes.find((candidate) => candidate.value === scope);
    if (!selectedScope) return;
    setPracticeStarting(true);
    try {
      const deck = buildPracticeDeck(selectedScope.items, deckOptions);
      if (deck.length === 0) return;
      const cards = await preparePracticeCards(deck, { direction });
      setPracticeSession({ cards, mode: answerMode });
      setPracticeSetupOpen(false);
    } finally {
      setPracticeStarting(false);
    }
  }

  if (practiceSession && item.collection?.enabled) {
    return (
      <PracticeSession
        cards={practiceSession.cards}
        mode={practiceSession.mode}
        onFinish={() => setPracticeSession(null)}
        onOpen={onOpen}
        backLabel="Back to collection"
        sessionLabel="Collection practice"
      />
    );
  }

  if (mode === "organize" && item.collection?.enabled) {
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <button type="button" onClick={() => enterMode("read")} className="mb-3 flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Page
        </button>
        <CollectionOrganizer
          groups={collection.groups.map(({ id, name, itemKeys }) => ({ id, name, itemKeys }))}
          ungroupedItemKeys={collection.ungroupedItemKeys}
          itemById={itemById}
          removalImpactForKey={(itemKey) => vocabularyRemovalImpact(item, itemKey)}
          startWithNewGroup={startWithNewGroup}
          onCancel={() => {
            setStartWithNewGroup(false);
            enterMode("read");
          }}
          onSave={async (draft) => {
            await saveCollectionOrganization(item.id, draft);
            setStartWithNewGroup(false);
            await onChanged();
            enterMode("read");
          }}
        />
      </div>
    );
  }

  if (mode === "practice" && item.collection?.enabled) {
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>Practice collection</div>
            <h1 className="mt-1 text-2xl" style={{ color: C.ink, fontFamily: SERIF, fontWeight: 700 }}>{item.title}</h1>
          </div>
          <Button tone="quiet" onClick={() => enterMode("read")}>Done</Button>
        </div>
        {collection.groups.map((group) => group.items.length > 0 && (
          <div key={group.id} className="mb-5">
            <div className="mb-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>{group.name}</div>
            <div className="space-y-2">
              {group.items.map((entry) => (
                <CollectionVocabularyCard
                  key={entry.id}
                  item={entry}
                  practice
                  revealed={revealed.has(entry.id)}
                  onReveal={() => setRevealed((current) => new Set(current).add(entry.id))}
                />
              ))}
            </div>
          </div>
        ))}
        {collection.ungroupedItems.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>{NOT_GROUPED_LABEL}</div>
            <div className="space-y-2">
              {collection.ungroupedItems.map((entry) => (
                <CollectionVocabularyCard
                  key={entry.id}
                  item={entry}
                  practice
                  revealed={revealed.has(entry.id)}
                  onReveal={() => setRevealed((current) => new Set(current).add(entry.id))}
                />
              ))}
            </div>
          </div>
        )}
        {collection.itemCount === 0 && <Card><div className="text-sm italic" style={{ color: C.mut }}>Add vocabulary before practicing this page.</div></Card>}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-sm" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> {backLabel}
      </button>

      {editingDetails ? (
        <CollectionDetailsEditor item={item} items={items} onCancel={() => setEditingDetails(false)} onSaved={async () => {
          setEditingDetails(false);
          await onChanged();
        }} />
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="inline-block rounded-full px-2.5 py-[3px] text-[11px] uppercase" style={{ background: kickerMeta.background, color: kickerMeta.color, fontFamily: MONO, letterSpacing: "0.1em" }}>{FOCUS_HEADINGS[item.pageFocus] || "Notes page"}</div>
                <h1 className="mt-1 break-words text-2xl" style={{ color: C.ink, fontFamily: SERIF, fontWeight: 700 }}><span>{item.title || "Untitled page"}</span></h1>
                {item.pageDate && <div className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: C.mut, fontFamily: MONO }}><CalendarDays size={12} /> {item.pageDate}</div>}
                <div className="mt-2 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
                  {roles.map((role) => FOCUS_LABELS[role]).join(" · ") || "Notes"}
                </div>
                <div className="mt-1 text-xs" style={{ color: C.mut, fontFamily: MONO }}>opened {state?.views || 0}×</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={pagePinned ? "Unpin page" : "Pin page"}
                  aria-pressed={pagePinned}
                  onClick={() => onPagePinnedChange?.(!pagePinned)}
                  className="p-2"
                >
                  {pagePinned ? <BookmarkCheck size={18} style={{ color: C.pen }} /> : <Bookmark size={18} style={{ color: C.mut }} />}
                </button>
                <details className="relative">
                  <summary aria-label="Page actions" className="cursor-pointer list-none p-2"><MoreHorizontal size={19} style={{ color: C.mut }} /></summary>
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border p-1 shadow-lg" style={{ background: C.card, borderColor: C.line }}>
                    <button type="button" onClick={() => setEditingDetails(true)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"><Pencil size={14} className="mr-2 inline" />Edit details</button>
                    {item.collection?.enabled && <button type="button" onClick={() => enterMode("organize")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">Organize vocabulary</button>}
                    <button type="button" onClick={() => setCustomizing(true)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"><Settings2 size={14} className="mr-2 inline" />Customize page</button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!deleteArm) {
                          setDeleteArm(true);
                          setTimeout(() => setDeleteArm(false), 3000);
                          return;
                        }
                        await deleteItem(item.id);
                        onBack();
                        await onChanged();
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm"
                      style={{ color: C.red }}
                    >
                      <Trash2 size={14} className="mr-2 inline" />{deleteArm ? "Tap again to confirm" : "Delete page"}
                    </button>
                  </div>
                </details>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Leading page focus">
              {focusChoices.map((focus) => (
                <button
                  type="button"
                  key={focus}
                  aria-pressed={item.pageFocus === focus}
                  disabled={focusSaving}
                  onClick={async () => {
                    if (focus === item.pageFocus || focusSaving) return;
                    setFocusSaving(true);
                    try {
                      await savePageFocus(item.id, focus);
                      await onChanged();
                    } finally {
                      setFocusSaving(false);
                    }
                  }}
                  className="min-h-11 rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-60"
                  style={item.pageFocus === focus
                    ? { background: C.pen, borderColor: C.pen, color: C.onAccent }
                    : { background: C.card, borderColor: C.line, color: C.mut }}
                >
                  {FOCUS_LABELS[focus]}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-12">
            <StructuredNotesSection page={item} onChanged={onChanged} />
          </div>

          <div className="mt-12 space-y-12">
            {sectionOrder.map((sectionKind) => {
              if (sectionKind === "source" && item.source?.enabled) {
                return (
                  <div key="source">
                    <SourceSection
                      page={item}
                      items={items}
                      onOpen={onOpen}
                      onChanged={onChanged}
                      onJumpToVocabulary={() => document.getElementById("page-vocabulary")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      onAddVocabulary={(captureId, candidates) => commitPageVocabularyAdd(item.id, {
                        candidates,
                        context: { kind: "source", captureId },
                      })}
                    />
                  </div>
                );
              }
              if (sectionKind === "grammar" && item.grammar?.enabled) {
                return (
                  <div key="grammar">
                    <GrammarSection
                      page={item}
                      items={items}
                      onOpen={onOpen}
                      onChanged={onChanged}
                      onAddVocabulary={(sectionId, exampleId, candidates) => commitPageVocabularyAdd(item.id, {
                        candidates,
                        context: { kind: "grammar", sectionId, exampleId },
                      })}
                    />
                  </div>
                );
              }
              if (sectionKind === "vocabulary" && item.collection?.enabled) {
                return (
                  <div key="vocabulary">
                    <VocabularySection
                      page={item}
                      items={items}
                      collection={collection}
                      onOpen={onOpen}
                      onChanged={onChanged}
                      onPractice={() => enterMode("practice")}
                      onPracticeSession={() => setPracticeSetupOpen(true)}
                      onOrganize={(newGroup) => {
                        setStartWithNewGroup(Boolean(newGroup));
                        enterMode("organize");
                      }}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* The page's trailing sections sit apart from its content, behind a short hairline,
              and tuck close to one another (owner-picked 2026-08-10). */}
          <hr aria-hidden="true" className="mx-auto mt-11 w-[120px] border-t" style={{ borderColor: C.line }} />

          <div className="mt-11">
            <ConnectionsSection
              item={item}
              items={items}
              vocabularyEnabled={item.collection?.enabled === true}
              relatedItems={collection.relatedItems}
              linkedEntryLinks={linkedEntryLinks}
              orphanKeys={orphanKeys}
              linkConflicts={linkConflicts}
              onOpen={onOpen}
              onChanged={onChanged}
            />
          </div>

          {item.tags?.length > 0 && (
            <div className="mt-4">
              <PageSectionDisclosure
                id="page-tags"
                family="neutral"
                title="Tags"
                summary={`${item.tags.length} ${item.tags.length === 1 ? "tag" : "tags"}`}
                resetKey={item.id}
              >
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => <TagChip key={tag} tag={tag} className="py-1" />)}
                </div>
              </PageSectionDisclosure>
            </div>
          )}

          <div className="mt-4">
            <PageMediaSection page={item} onChanged={onChanged} />
          </div>
        </>
      )}
      {customizing && (
        <PageCustomizeSheet
          page={item}
          items={items}
          onClose={() => setCustomizing(false)}
          onSaved={async () => {
            setCustomizing(false);
            await onChanged();
          }}
        />
      )}
      {practiceSetupOpen && (
        <PracticeSetupSheet
          eligibleCount={practiceScopes[0]?.eligibleCount || 0}
          omittedCount={practiceScopes[0]?.omittedCount || 0}
          sourceLabel={item.title || "Collection"}
          orderLabel="Collection order"
          scopeOptions={practiceScopes}
          starting={practiceStarting}
          onClose={() => setPracticeSetupOpen(false)}
          onStart={startCollectionPractice}
        />
      )}
    </div>
  );
}
