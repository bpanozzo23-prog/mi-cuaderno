import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListTree, Pencil, Plus } from "lucide-react";
import { Button, C, Card, SERIF } from "../theme.jsx";
import { updateItem } from "../db/items.js";
import {
  deleteNoteSection,
  saveNoteOrganization,
  saveNoteSection,
} from "../db/pageStructures.js";
import {
  deleteLexicalNoteSection,
  saveLexicalNoteOrganization,
  saveLexicalNoteSection,
} from "../db/lexicalNotes.js";
import {
  canonicalNoteSections,
  hasEnabledStructuredCapability,
  noteSectionHierarchy,
  noteStructureCounts,
  newNoteSection,
  pageStructureNameKey,
} from "../lib/pageKinds.js";
import { outlineNamesValid } from "../lib/oneLevelOutline.js";
import MarkdownText from "./MarkdownText.jsx";
import MarkdownTextarea from "./MarkdownTextarea.jsx";
import MentionedHere from "./MentionedHere.jsx";
import OutlineOrganizerFields from "./OutlineOrganizerFields.jsx";
import PageSectionDisclosure, { SectionSpineNode } from "./PageSectionDisclosure.jsx";
import { sectionFamily } from "./pageRoleMeta.js";

const fieldStyle = { background: C.card, borderColor: C.line, color: C.ink };
const NOTES_FAMILY = sectionFamily("notes");

/**
 * The overview's handle in the same collapsed-set the named sections use, so it folds and resets
 * exactly as they do. Safe as a bare word: every other member of that set is a note section's id,
 * and `newNoteSectionKey` makes those `note-section:<uuid>` — a namespaced key can never collide
 * with an unnamespaced one (`src/lib/ids.js`, brief §6).
 */
const OVERVIEW_COLLAPSE_KEY = "overview";

const problemMessage = (error, fallback) =>
  error instanceof Error && error.message ? error.message : fallback;

function DeleteSectionAction({ description, onDelete }) {
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [problem, setProblem] = useState("");

  return (
    <>
      <Button type="button" tone="danger" className="min-h-11" disabled={deleting} onClick={() => {
        setProblem("");
        setArmed(true);
      }}>
        Delete section
      </Button>
      {armed && (
        <div role="alertdialog" aria-label="Confirm delete section" className="basis-full rounded-lg border p-3" style={{ borderColor: C.dangerBorder, background: C.paper }}>
          <div className="text-sm" style={{ color: C.ink }}>{description}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              tone="dangerArmed"
              className="min-h-11"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setProblem("");
                try {
                  await onDelete();
                } catch (error) {
                  setProblem(problemMessage(error, "This Notes section could not be deleted."));
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </Button>
            <Button type="button" tone="quiet" className="min-h-11" disabled={deleting} onClick={() => setArmed(false)}>Keep</Button>
          </div>
          {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
        </div>
      )}
    </>
  );
}

/**
 * The overview, wearing exactly the card a named section wears: chevron, heading, pencil, and a
 * body that collapses (owner-requested 2026-08-28). It was the one note on the page that could not
 * be folded away, which made it the loudest thing in the section rather than the first thing in it.
 *
 * `editing` is the parent's, not this component's, because the card no longer renders at all while
 * the overview is empty — something outside it has to be able to summon the editor.
 */
function NotesOverview({
  owner, lexical, items, onOpen, onAddMention, onChanged,
  collapsed, onToggle, editing, onEditingChange,
}) {
  const saved = lexical ? owner.notes || "" : owner.body || "";
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const dirty = draft !== saved;
  const overviewName = lexical ? "General note" : "Overview";
  const editLabel = lexical
    ? (saved.trim() ? "Edit note" : "Add note")
    : (saved.trim() ? "Edit Notes overview" : "Write Notes overview");
  const contentId = `notes-overview-content-${owner.id}`;

  return (
    <div className="relative mt-3">
      <SectionSpineNode className="top-[24px]" family="notes" />
      <Card>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            aria-label={`${collapsed ? "Expand" : "Collapse"} Notes ${overviewName}`}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={onToggle}
            className="-ml-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left flex items-center gap-2"
          >
            {collapsed
              ? <ChevronRight size={16} className="shrink-0" style={{ color: C.mut }} />
              : <ChevronDown size={16} className="shrink-0" style={{ color: C.mut }} />}
            <h3 className="min-w-0 break-words text-base font-bold leading-snug" style={{ color: C.ink, fontFamily: SERIF }}>{overviewName}</h3>
          </button>
          {!editing && (
            <button
              type="button"
              aria-label={editLabel}
              onClick={() => {
                setDraft(saved);
                setProblem("");
                onEditingChange(true);
              }}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
            >
              <Pencil size={15} style={{ color: C.pen }} />
            </button>
          )}
        </div>

        <div id={contentId} hidden={collapsed}>
        {!editing && (saved.trim() ? (
          <MarkdownText blankLines explicitNoteCallouts compact className="mt-3 break-words text-sm leading-relaxed" style={{ color: C.ink }}>
            {saved}
          </MarkdownText>
        ) : (
          <div className="mt-2 text-xs" style={{ color: C.mut }}>
            {lexical ? "No notes yet." : "Add context for the page as a whole."}
          </div>
        ))}

        {editing && (
          <div className="mt-3">
            <MarkdownTextarea
              autoFocus
              blankLines
              noteCallouts
              aria-label={lexical ? "Note" : "Notes overview"}
              value={draft}
              onChange={setDraft}
              placeholder={lexical
                ? "Your notes — mnemonics, gotchas, where you heard it…"
                : "What is this page or collection about?"}
              className="min-h-32 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
              style={fieldStyle}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="min-h-11" disabled={!dirty || saving} onClick={async () => {
                setSaving(true);
                setProblem("");
                try {
                  await updateItem(owner.id, lexical ? { notes: draft } : { body: draft });
                  onEditingChange(false);
                  await onChanged?.();
                } catch (error) {
                  setProblem(problemMessage(error, "The Notes overview could not be saved."));
                } finally {
                  setSaving(false);
                }
              }}>{saving ? "Saving…" : lexical ? "Save note" : "Save overview"}</Button>
              <Button tone="quiet" className="min-h-11" disabled={saving} onClick={() => {
                setDraft(saved);
                onEditingChange(false);
                setProblem("");
              }}>Cancel</Button>
            </div>
            {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
          </div>
        )}
        {!editing && !lexical && (
          <MentionedHere
            items={items}
            contextId={`${owner.id}:notes:overview`}
            onOpen={onOpen}
            onAdd={onAddMention}
          />
        )}
        </div>
      </Card>
    </div>
  );
}

function NoteSectionEditor({ section, childCount, movesToJournal, onCancel, onSaved, onDelete }) {
  const initial = useMemo(() => ({
    ...(section?.id ? { id: section.id } : {}),
    ...(Object.prototype.hasOwnProperty.call(section || {}, "parentId")
      ? { parentId: section.parentId }
      : {}),
    name: section?.name || "",
    body: section?.body || "",
  }), [section]);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const deleteDescription = childCount
    ? "This section has subsections. Promote or move them before deleting the section."
    : `Delete “${section?.name}” and its Notes body?${movesToJournal ? " This dated page will move to Diario." : ""}`;

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <form onSubmit={async (event) => {
        event.preventDefault();
        if (!draft.name.trim() || !dirty) return;
        setSaving(true);
        setProblem("");
        try {
          await onSaved({ ...draft, name: draft.name.trim() });
        } catch (error) {
          setProblem(problemMessage(error, "This Notes section could not be saved."));
        } finally {
          setSaving(false);
        }
      }}>
        <div className="text-sm font-semibold" style={{ color: C.ink }}>
          {section?.id ? "Edit Notes section" : section?.parentId ? "New Notes subsection" : "New Notes section"}
        </div>
        <div className="mt-3 space-y-3">
          <label className="block text-xs" style={{ color: C.mut }}>
            Section name
            <input
              autoFocus
              required
              aria-label="Notes section name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Usage and register"
              className="mt-1 min-h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={fieldStyle}
            />
          </label>
          <label className="block text-xs" style={{ color: C.mut }}>
            Notes
            <MarkdownTextarea
              blankLines
              noteCallouts
              aria-label="Notes section body"
              value={draft.body}
              onChange={(body) => setDraft((current) => ({ ...current, body }))}
              placeholder="Explain this part of the page in your own words."
              className="mt-1 min-h-32 w-full rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none"
              style={fieldStyle}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
          <Button type="submit" className="min-h-11" disabled={!draft.name.trim() || !dirty || saving}>{saving ? "Saving…" : "Save section"}</Button>
          <Button type="button" tone="quiet" className="min-h-11" disabled={saving} onClick={onCancel}>Cancel</Button>
          {section?.id && (
            <DeleteSectionAction description={deleteDescription} onDelete={onDelete} />
          )}
        </div>
        {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
      </form>
    </Card>
  );
}

function NotesOrganizer({ sections, onCancel, onSaved }) {
  const initial = useMemo(() => canonicalNoteSections(sections).map((section) => ({
    id: section.id,
    parentId: section.parentId ?? null,
    name: section.name,
  })), [sections]);
  const [draft, setDraft] = useState(() => initial.map((section) => ({ ...section })));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const namesValid = outlineNamesValid(draft, pageStructureNameKey);

  function addSection() {
    const section = newNoteSection();
    setDraft((current) => [...current, {
      id: section.id,
      parentId: null,
      name: "",
    }]);
  }

  return (
    <Card className="mt-3" style={{ borderColor: C.pen }}>
      <div className="text-sm font-semibold" style={{ color: C.ink }}>Organize Notes</div>
      <div className="mt-0.5 text-xs" style={{ color: C.mut }}>
        Add, rename and reorder siblings, or promote and reparent subsections. Section prose stays unchanged.
      </div>
      <div className="mt-3 space-y-3">
        {draft.map((section, index) => (
          <div
            key={section.id}
            className={`rounded-lg border p-2 ${section.parentId ? "ml-4" : ""}`}
            style={{ background: C.paper, borderColor: C.line }}
          >
            <OutlineOrganizerFields rows={draft} row={section} index={index} onChange={setDraft} />
          </div>
        ))}
      </div>
      <Button
        type="button"
        tone="quiet"
        className="mt-3 min-h-11"
        aria-label="Add Notes section to organizer"
        disabled={saving}
        onClick={addSection}
      >
        <Plus size={14} /> Section
      </Button>
      {!namesValid && (
        <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>
          Section names must be nonblank and unique among siblings.
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: C.line }}>
        <Button className="min-h-11" disabled={!changed || !namesValid || saving} onClick={async () => {
          setSaving(true);
          setProblem("");
          try {
            await onSaved(draft.map((section) => ({
              id: section.id,
              parentId: section.parentId ?? null,
              name: section.name.trim(),
            })));
          } catch (error) {
            setProblem(problemMessage(error, "Notes organization could not be saved."));
          } finally {
            setSaving(false);
          }
        }}>{saving ? "Saving…" : "Save organization"}</Button>
        <Button tone="quiet" className="min-h-11" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
      {problem && <div role="alert" className="mt-2 text-xs" style={{ color: C.red }}>{problem}</div>}
    </Card>
  );
}

export default function StructuredNotesSection({
  page,
  item,
  items = [],
  onOpen,
  onAddMention,
  onChanged,
}) {
  const owner = page || item;
  const lexical = owner?.type === "lexical";
  const sections = owner?.noteSections || [];
  const hierarchy = useMemo(() => noteSectionHierarchy(sections), [sections]);
  const counts = noteStructureCounts(sections);
  const [sectionDraft, setSectionDraft] = useState(null);
  const [organizing, setOrganizing] = useState(false);
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState(() => new Set(
    sections.filter((section) => !section.body?.trim()).map((section) => section.id)
  ));
  const hasOverview = Boolean((lexical ? owner?.notes : owner?.body)?.trim());
  const hasContent = hasOverview || sections.length > 0;

  useEffect(() => {
    setSectionDraft(null);
    setOrganizing(false);
    setOverviewEditing(false);
    setCollapsedSections(new Set(
      sections.filter((section) => !section.body?.trim()).map((section) => section.id)
    ));
  }, [owner?.id]);

  if (!owner || (owner.type !== "page" && owner.type !== "lexical")) return null;

  const summary = [
    ...(counts.sections ? [`${counts.sections} ${counts.sections === 1 ? "section" : "sections"}`] : []),
    ...(counts.subsections ? [`${counts.subsections} ${counts.subsections === 1 ? "subsection" : "subsections"}`] : []),
  ].join(" · ") || (hasOverview ? (lexical ? "General note" : "Overview") : "Empty");
  const movesToJournal = !lexical && Boolean(owner.pageDate)
    && sections.length === 1
    && !hasEnabledStructuredCapability(owner);

  async function changed() {
    await onChanged?.();
  }

  function openEditor(section) {
    setSectionDraft(section);
    setOrganizing(false);
    if (!section?.id) return;
    setCollapsedSections((current) => {
      const next = new Set(current);
      next.delete(section.id);
      if (section.parentId) next.delete(section.parentId);
      return next;
    });
  }

  function toggleSection(sectionId) {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      return next;
    });
  }

  function renderSectionNode(section, isSubsection = false) {
    const collapsed = collapsedSections.has(section.id);
    const contentId = `notes-section-content-${section.id}`;
    const children = isSubsection ? [] : (hierarchy.childrenByParent.get(section.id) || []);
    const Heading = isSubsection ? "h4" : "h3";
    const node = (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            aria-label={`${collapsed ? "Expand" : "Collapse"} Notes ${isSubsection ? "subsection" : "section"} ${section.name}`}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={() => toggleSection(section.id)}
            className="-ml-2 min-h-11 min-w-0 flex-1 rounded-lg px-2 text-left flex items-center gap-2"
          >
            {collapsed
              ? <ChevronRight size={16} className="shrink-0" style={{ color: C.mut }} />
              : <ChevronDown size={16} className="shrink-0" style={{ color: C.mut }} />}
            <Heading className={`min-w-0 break-words font-bold leading-snug ${isSubsection ? "text-sm" : "text-base"}`} style={{ color: C.ink, fontFamily: SERIF }}>
              {section.name}
            </Heading>
          </button>
          <button
            type="button"
            aria-label={`Edit Notes section ${section.name}`}
            onClick={() => openEditor(section)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            <Pencil size={15} style={{ color: C.pen }} />
          </button>
        </div>
        <div id={contentId} hidden={collapsed}>
          {section.body?.trim() ? (
            <MarkdownText blankLines explicitNoteCallouts compact className="mt-3 break-words text-sm leading-relaxed" style={{ color: C.ink }}>
              {section.body}
            </MarkdownText>
          ) : (
            <div className="mt-2 text-xs" style={{ color: C.mut }}>No Notes body yet.</div>
          )}
          {!lexical && (
            <MentionedHere
              items={items}
              contextId={`${owner.id}:notes:${section.id}`}
              onOpen={onOpen}
              onAdd={onAddMention}
            />
          )}
          {!isSubsection && (
            <Button
              tone="quiet"
              className="mt-3 min-h-11"
              aria-label={`Add Notes subsection to ${section.name}`}
              onClick={() => openEditor({ parentId: section.id })}
            >
              <Plus size={14} /> Subsection
            </Button>
          )}
          {children.length > 0 && (
            <div className="ml-[10px] mt-3 space-y-3 border-l-2 pl-4" style={{ borderColor: C.pageFolderNotesLine }} aria-label={`${section.name} Notes subsections`}>
              {children.map((child) => (
                <div key={child.id} className="relative">
                  <SectionSpineNode className="top-[24px]" family="notes" />
                  {renderSectionNode(child, true)}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    );

    if (isSubsection) return node;
    return (
      <div key={section.id} className="relative">
        <SectionSpineNode className="top-[24px]" family="notes" />
        {node}
      </div>
    );
  }

  return (
    <PageSectionDisclosure
      id={lexical ? "lexical-notes" : "page-notes"}
      family="notes"
      title="Notes"
      summary={summary}
      defaultCollapsed={lexical ? false : !hasContent}
      resetKey={owner.id}
      actions={!organizing ? (
        <>
          {sections.length > 0 && (
            <button
              type="button"
              aria-label="Organize Notes"
              onClick={() => {
                setOrganizing(true);
                setSectionDraft(null);
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2"
              style={{ background: NOTES_FAMILY.band, borderColor: NOTES_FAMILY.line, color: NOTES_FAMILY.ink }}
            >
              <ListTree size={15} />
            </button>
          )}
          <button
            type="button"
            aria-label="Add Notes section"
            onClick={() => openEditor({ parentId: null })}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border p-2"
            style={{ background: NOTES_FAMILY.band, borderColor: NOTES_FAMILY.line, color: NOTES_FAMILY.ink }}
          >
            <Plus size={15} />
          </button>
        </>
      ) : null}
    >
      {/* On a page, no card while there is nothing in it (owner-requested 2026-08-28): a named
          subsection was the usual reason to open Notes, and the empty overview stood permanently
          above it asking to be written. Writing one is an offer at the foot of the section instead.
          A lexical entry's General note keeps its empty card: the request was about pages, and that
          card is the whole of a Word's Notes section rather than one member of a list. */}
      {(lexical || hasOverview || overviewEditing) && (
        <NotesOverview
          key={`${owner.id}:${lexical ? owner.notes || "" : owner.body || ""}`}
          owner={owner}
          lexical={lexical}
          items={items}
          onOpen={onOpen}
          onAddMention={onAddMention}
          onChanged={changed}
          collapsed={collapsedSections.has(OVERVIEW_COLLAPSE_KEY)}
          onToggle={() => toggleSection(OVERVIEW_COLLAPSE_KEY)}
          editing={overviewEditing}
          onEditingChange={setOverviewEditing}
        />
      )}

      {sectionDraft && (
        <NoteSectionEditor
          key={sectionDraft.id || `new-note-section:${sectionDraft.parentId || "root"}`}
          section={sectionDraft}
          childCount={sections.filter((section) => section.parentId === sectionDraft.id).length}
          movesToJournal={movesToJournal && sectionDraft.id === sections[0]?.id}
          onCancel={() => setSectionDraft(null)}
          onSaved={async (draft) => {
            if (lexical) await saveLexicalNoteSection(owner.id, draft);
            else await saveNoteSection(owner.id, draft);
            setSectionDraft(null);
            await changed();
          }}
          onDelete={sectionDraft.id ? async () => {
            if (lexical) await deleteLexicalNoteSection(owner.id, sectionDraft.id);
            else await deleteNoteSection(owner.id, sectionDraft.id);
            setSectionDraft(null);
            await changed();
          } : null}
        />
      )}

      {organizing && (
        <NotesOrganizer
          sections={sections}
          onCancel={() => setOrganizing(false)}
          onSaved={async (draft) => {
            if (lexical) await saveLexicalNoteOrganization(owner.id, draft);
            else await saveNoteOrganization(owner.id, draft);
            setOrganizing(false);
            await changed();
          }}
        />
      )}

      {!organizing && (
        <div className="mt-4 space-y-4">
          {hierarchy.roots.map((section) => renderSectionNode(section))}
        </div>
      )}

      {!lexical && !hasOverview && !overviewEditing && !organizing && (
        <Button
          tone="quiet"
          className="mt-3 min-h-11"
          aria-label="Write Notes overview"
          onClick={() => setOverviewEditing(true)}
        >
          <Plus size={14} /> Overview
        </Button>
      )}

      {sections.length === 0 && !sectionDraft && !organizing && (
        <div className="mt-3 text-xs" style={{ color: C.mut }}>
          {lexical
            ? "Add named sections when this entry needs more structure than its General note."
            : "Add named sections when the page needs more structure than its Overview."}
        </div>
      )}
    </PageSectionDisclosure>
  );
}
