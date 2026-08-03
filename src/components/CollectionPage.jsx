import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark, BookmarkCheck, CalendarDays, Check, ChevronLeft, ExternalLink,
  MoreHorizontal, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { C, SERIF, MONO, dotGrid, Card, SectionTitle, Button } from "../theme.jsx";
import { allTagsIn } from "../lib/tags.js";
import { deriveCollection, NOT_GROUPED_LABEL } from "../lib/collections.js";
import { groupRelated, GROUPS, relatedTo } from "../lib/links.js";
import { resolveLinkedKeys } from "../db/linkedEntries.js";
import {
  commitCollectionAdd, saveCollectionOrganization, setPageProfile,
} from "../db/collections.js";
import { updateItem, deleteItem, linkItems, unlinkItems, createItem, newPage } from "../db/items.js";
import { logView } from "../db/events.js";
import { PAGE_PROFILES } from "../lib/pageProfiles.js";
import { ItemLinkCard, EntryLinkCard, OrphanLinkCard } from "./LinkCard.jsx";
import CollectionVocabularyCard from "./CollectionVocabularyCard.jsx";
import CollectionAddVocabularySheet from "./CollectionAddVocabularySheet.jsx";
import CollectionOrganizer from "./CollectionOrganizer.jsx";
import LinkPicker from "./LinkPicker.jsx";
import TagInput from "./TagInput.jsx";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

function CollectionOverview({ body }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef(null);

  useEffect(() => setExpanded(false), [body]);

  useLayoutEffect(() => {
    function measure() {
      const element = textRef.current;
      if (!element) return;
      const clone = element.cloneNode(true);
      clone.classList.remove("line-clamp-4");
      Object.assign(clone.style, {
        position: "fixed",
        visibility: "hidden",
        pointerEvents: "none",
        inset: "0 auto auto 0",
        width: `${element.getBoundingClientRect().width}px`,
        height: "auto",
        maxHeight: "none",
        overflow: "visible",
      });
      document.body.appendChild(clone);
      const lineHeight = Number.parseFloat(getComputedStyle(clone).lineHeight) || 20;
      setOverflows(clone.scrollHeight > lineHeight * 4 + 1);
      clone.remove();
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [body]);

  return (
    <div className="mt-4">
      <div
        ref={textRef}
        className={`whitespace-pre-wrap break-words text-sm ${expanded ? "" : "line-clamp-4"}`}
        style={{ color: C.ink }}
      >
        {body}
      </div>
      {overflows && (
        <button type="button" className="mt-1 text-xs" style={{ color: C.pen }} onClick={() => setExpanded((shown) => !shown)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
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
        <div className="text-sm font-semibold" style={{ color: C.ink }}>Edit collection details</div>
        <div className="text-xs" style={{ color: C.mut }}>Groups and vocabulary stay unchanged.</div>
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
        Overview
        <textarea
          aria-label="Collection overview"
          value={draft.body}
          onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          className="mt-1 min-h-32 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
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
          disabled={!/^https?:\/\//.test(media.url.trim())}
          onClick={() => {
            setDraft((current) => ({
              ...current,
              mediaLinks: [...current.mediaLinks, { url: media.url.trim(), label: media.label.trim() }],
            }));
            setMedia({ url: "", label: "" });
          }}
        >
          <Plus size={14} /> Add media link
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

function RelatedSection({ item, items, relatedItems, linkedEntries, orphanKeys, onOpen, onChanged }) {
  const [picking, setPicking] = useState(false);
  const relatedKeys = useMemo(
    () => new Set([...relatedTo(item, items).map((candidate) => candidate.id), ...(item.linkedKeys || [])]),
    [item, items]
  );
  const groups = useMemo(
    () => groupRelated(relatedItems, linkedEntries, [GROUPS.paginas, GROUPS.diario, GROUPS.palabras]),
    [relatedItems, linkedEntries]
  );
  const hasRelated = groups.length > 0 || orphanKeys.length > 0;

  async function unlink(key) {
    await unlinkItems(item.id, key);
    await onChanged();
  }

  return (
    <>
      {hasRelated && <SectionTitle>Related</SectionTitle>}
      {groups.map((group) => (
        <div key={group.name} className="mb-3">
          <div className="mb-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.08em" }}>{group.name}</div>
          <div className="space-y-1.5">
            {group.rows.map((row) => row.kind === "entry" ? (
              <EntryLinkCard key={row.key} entry={row.entry} onOpen={onOpen} onRemove={() => unlink(row.key)} />
            ) : (
              <ItemLinkCard key={row.key} item={row.item} attached={Boolean(row.item.dictKey)} onOpen={onOpen} onRemove={() => unlink(row.key)} />
            ))}
          </div>
        </div>
      ))}
      {orphanKeys.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {orphanKeys.map((key) => <OrphanLinkCard key={key} dictKey={key} onRemove={() => unlink(key)} />)}
        </div>
      )}
      {!picking && (
        <button type="button" onClick={() => setPicking(true)} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs" style={{ background: C.card, borderColor: C.line, color: C.mut }}>
          <Plus size={11} /> link something related
        </button>
      )}
      {picking && (
        <LinkPicker
          item={item}
          items={items}
          linkedKeys={relatedKeys}
          onCancel={() => setPicking(false)}
          onPick={async (key) => {
            const personal = items.find((candidate) => candidate.id === key);
            if (personal?.type === "lexical") {
              await commitCollectionAdd(item.id, { targetGroupId: null, candidates: [{ kind: "personal", itemId: key }] });
            } else {
              await linkItems(item.id, key);
            }
            await onChanged();
          }}
          onCreate={async (kind, text) => {
            if (kind === "lexical") {
              await commitCollectionAdd(item.id, {
                targetGroupId: null,
                candidates: [{ kind: "new", term: text, form: text.includes(" ") ? "phrase" : "word", meanings: [] }],
              });
            } else {
              const created = await createItem(newPage({ title: text }));
              await linkItems(item.id, created.id);
            }
            await onChanged();
          }}
        />
      )}
    </>
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
  const [expanded, setExpanded] = useState(() => new Set());
  const [revealed, setRevealed] = useState(() => new Set());
  const [addTarget, setAddTarget] = useState(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [startWithNewGroup, setStartWithNewGroup] = useState(false);
  const [deleteArm, setDeleteArm] = useState(false);
  const [linkedEntries, setLinkedEntries] = useState([]);
  const [orphanKeys, setOrphanKeys] = useState([]);

  const collection = useMemo(() => deriveCollection(item, items), [item, items]);
  const itemById = useMemo(() => new Map(items.map((candidate) => [candidate.id, candidate])), [items]);
  const memberLocations = useMemo(() => {
    const map = new Map();
    for (const group of collection.groups) for (const key of group.itemKeys) map.set(key, group.name);
    for (const key of collection.ungroupedItemKeys) map.set(key, NOT_GROUPED_LABEL);
    return map;
  }, [collection]);

  useEffect(() => {
    setMode("read");
    setExpanded(new Set());
    setRevealed(new Set());
    setAddTarget(null);
    setEditingDetails(false);
    setDeleteArm(false);
  }, [item.id]);

  useEffect(() => {
    logView(item.id).then((logged) => {
      if (logged) onChanged();
    });
  }, [item.id]);

  useEffect(() => {
    let alive = true;
    resolveLinkedKeys(item).then(({ entries, orphans, rewritten }) => {
      if (!alive) return;
      setLinkedEntries(entries);
      setOrphanKeys(orphans);
      if (rewritten) onChanged();
    });
    return () => { alive = false; };
  }, [item.id, item.linkedKeys]);

  function enterMode(next) {
    setExpanded(new Set());
    setRevealed(new Set());
    setAddTarget(null);
    setEditingDetails(false);
    if (next !== "organize") setStartWithNewGroup(false);
    setMode(next);
  }

  if (mode === "organize") {
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <button type="button" onClick={() => enterMode("read")} className="mb-3 flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Collection
        </button>
        <CollectionOrganizer
          groups={collection.groups.map(({ id, name, itemKeys }) => ({ id, name, itemKeys }))}
          ungroupedItemKeys={collection.ungroupedItemKeys}
          itemById={itemById}
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

  if (mode === "practice") {
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
        {collection.itemCount === 0 && <Card><div className="text-sm italic" style={{ color: C.mut }}>Add vocabulary before practicing this collection.</div></Card>}
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
                <div className="text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.1em" }}>Vocabulary collection</div>
                <h1 className="mt-1 break-words text-2xl" style={{ color: C.ink, fontFamily: SERIF, fontWeight: 700 }}>{item.title || "Untitled page"}</h1>
                {item.pageDate && <div className="mt-1 inline-flex items-center gap-1 text-xs" style={{ color: C.mut, fontFamily: MONO }}><CalendarDays size={12} /> {item.pageDate}</div>}
                <div className="mt-2 text-xs" style={{ color: C.mut, fontFamily: MONO }}>
                  {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"} · {collection.groupCount} {collection.groupCount === 1 ? "group" : "groups"}
                  {state?.views ? ` · opened ${state.views}×` : ""}
                </div>
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
                  <summary aria-label="Collection actions" className="cursor-pointer list-none p-2"><MoreHorizontal size={19} style={{ color: C.mut }} /></summary>
                  <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border p-1 shadow-lg" style={{ background: C.card, borderColor: C.line }}>
                    <button type="button" onClick={() => setEditingDetails(true)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"><Pencil size={14} className="mr-2 inline" />Edit details</button>
                    <button type="button" onClick={() => enterMode("organize")} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">Organize collection</button>
                    <button type="button" onClick={async () => { await setPageProfile(item.id, PAGE_PROFILES.general); await onChanged(); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">Change to General page</button>
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
            <div className="mt-4 flex gap-2">
              <Button onClick={() => enterMode("practice")} disabled={!collection.practiceEligible}>Practice</Button>
              <Button tone="quiet" onClick={() => enterMode("organize")}>Organize</Button>
            </div>
          </Card>

          {item.body?.trim() && <CollectionOverview body={item.body} />}

          <div className="mt-5 space-y-5">
            {collection.groups.map((group) => (
              <section key={group.id} aria-labelledby={`collection-group-${group.id}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h2 id={`collection-group-${group.id}`} className="truncate text-sm font-semibold" style={{ color: C.ink }}>{group.name}</h2>
                    <div className="text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>{group.items.length} {group.items.length === 1 ? "item" : "items"}</div>
                  </div>
                  <button type="button" onClick={() => setAddTarget({ groupId: group.id, label: group.name })} className="shrink-0 rounded-full border px-2 py-1 text-xs inline-flex items-center gap-1" style={{ background: C.card, borderColor: C.line, color: C.pen }}>
                    <Plus size={11} /> Add vocabulary
                  </button>
                </div>
                {addTarget?.groupId === group.id && (
                  <CollectionAddVocabularySheet
                    items={items}
                    memberLocations={memberLocations}
                    targetLabel={group.name}
                    onCancel={() => setAddTarget(null)}
                    onCommit={async (candidates) => {
                      await commitCollectionAdd(item.id, { targetGroupId: group.id, candidates });
                      setAddTarget(null);
                      await onChanged();
                    }}
                  />
                )}
                <div className="mt-2 space-y-2">
                  {group.items.map((entry) => (
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
                  ))}
                  {group.items.length === 0 && <Card><div className="text-xs italic" style={{ color: C.mut }}>No vocabulary in this group yet.</div></Card>}
                </div>
              </section>
            ))}

            {collection.ungroupedItems.length > 0 && (
              <section aria-labelledby="collection-ungrouped">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <h2 id="collection-ungrouped" className="text-sm font-semibold" style={{ color: C.ink }}>{NOT_GROUPED_LABEL}</h2>
                    <div className="text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>{collection.ungroupedItems.length} items</div>
                  </div>
                  <button type="button" onClick={() => setAddTarget({ groupId: null, label: NOT_GROUPED_LABEL })} className="shrink-0 rounded-full border px-2 py-1 text-xs inline-flex items-center gap-1" style={{ background: C.card, borderColor: C.line, color: C.pen }}><Plus size={11} /> Add vocabulary</button>
                </div>
                {addTarget && addTarget.groupId === null && (
                  <CollectionAddVocabularySheet
                    items={items}
                    memberLocations={memberLocations}
                    targetLabel={NOT_GROUPED_LABEL}
                    onCancel={() => setAddTarget(null)}
                    onCommit={async (candidates) => {
                      await commitCollectionAdd(item.id, { targetGroupId: null, candidates });
                      setAddTarget(null);
                      await onChanged();
                    }}
                  />
                )}
                <div className="mt-2 space-y-2">
                  {collection.ungroupedItems.map((entry) => (
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
                  ))}
                </div>
              </section>
            )}
          </div>

          {collection.itemCount === 0 && collection.groupCount === 0 && (
            <Card className="mt-5 text-center">
              <div className="text-sm font-semibold" style={{ color: C.ink }}>Start this collection with vocabulary</div>
              <div className="mt-1 text-xs" style={{ color: C.mut }}>Add personal entries, search the dictionary, or create something new.</div>
              <Button className="mt-3" onClick={() => setAddTarget({ groupId: null, label: NOT_GROUPED_LABEL })}><Plus size={14} /> Add vocabulary</Button>
              {addTarget && addTarget.groupId === null && (
                <CollectionAddVocabularySheet
                  items={items}
                  memberLocations={memberLocations}
                  targetLabel={NOT_GROUPED_LABEL}
                  onCancel={() => setAddTarget(null)}
                  onCommit={async (candidates) => {
                    await commitCollectionAdd(item.id, { targetGroupId: null, candidates });
                    setAddTarget(null);
                    await onChanged();
                  }}
                />
              )}
            </Card>
          )}

          <Button tone="quiet" className="mt-5" onClick={() => {
            setStartWithNewGroup(true);
            enterMode("organize");
          }}><Plus size={14} /> Add group</Button>

          <RelatedSection
            item={item}
            items={items}
            relatedItems={collection.relatedItems}
            linkedEntries={linkedEntries}
            orphanKeys={orphanKeys}
            onOpen={onOpen}
            onChanged={onChanged}
          />

          {item.tags?.length > 0 && (
            <>
              <SectionTitle>Tags</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => <span key={tag} className="rounded-full border px-2 py-1 text-xs" style={{ background: C.penPale, borderColor: C.line, color: C.penDark }}>{tag}</span>)}
              </div>
            </>
          )}

          {item.mediaLinks?.length > 0 && (
            <>
              <SectionTitle>Media links</SectionTitle>
              <div className="space-y-2">
                {item.mediaLinks.map((media, index) => (
                  <Card key={`${media.url}:${index}`}>
                    <a href={media.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-sm underline underline-offset-2" style={{ color: C.pen }}>
                      <ExternalLink size={14} className="shrink-0" /><span className="truncate">{media.label || media.url}</span>
                    </a>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
