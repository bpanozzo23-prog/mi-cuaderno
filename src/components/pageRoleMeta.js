import { BookOpen, Braces, FileText, Library } from "lucide-react";
import { C } from "../theme.jsx";
import { deriveCollection } from "../lib/collections.js";
import {
  enabledPageRoles,
  grammarStructureCounts,
  isJournalPage,
  PAGE_FOCUSES,
} from "../lib/pageKinds.js";

/**
 * How a page role presents itself on a card: one label, one icon, one colour pair.
 *
 * Both folder cards (`PageHubCard` and the page branch of `ItemCard`) previously declared this
 * themselves and had already drifted — the hub card carried per-role pastels while the mixed-list
 * card put every role in the same blue pill, and the two picked different icons than the create
 * flow. Ordering is not this file's business: `enabledPageRoles` decides that, and its first entry
 * is the page's focus, which is what the folder tab shows.
 */
export const PAGE_ROLE_META = {
  [PAGE_FOCUSES.notes]: { label: "Notes", icon: FileText, background: C.penPale, color: C.penDark },
  [PAGE_FOCUSES.vocabulary]: {
    label: "Vocabulary",
    icon: Library,
    background: C.roleVocabularyPale,
    color: C.roleVocabularyInk,
  },
  [PAGE_FOCUSES.source]: { label: "Source", icon: BookOpen, background: C.greenPale, color: C.green },
  [PAGE_FOCUSES.grammar]: {
    label: "Grammar",
    icon: Braces,
    background: C.roleGrammarPale,
    color: C.roleGrammarInk,
  },
};

/**
 * The folder trio — body, tab, outline — each family's card wears (owner-picked 2026-08-08).
 * Vocabulary is the anchor: its chip family is the original manila, so it keeps the base trio,
 * and a page with no role to name (a Diario entry in the mixed list) falls back to the same via
 * `pageFolderColors`. The card's own primary role decides the trio; that is `enabledPageRoles`'
 * first entry, the same rule that decides what the tab names.
 */
const MANILA_FOLDER = { body: C.pageFolder, tab: C.pageFolderTab, line: C.pageFolderLine };

const PAGE_FOLDER_COLORS = {
  [PAGE_FOCUSES.notes]: { body: C.pageFolderNotes, tab: C.pageFolderNotesTab, line: C.pageFolderNotesLine },
  [PAGE_FOCUSES.vocabulary]: MANILA_FOLDER,
  [PAGE_FOCUSES.source]: { body: C.pageFolderSource, tab: C.pageFolderSourceTab, line: C.pageFolderSourceLine },
  [PAGE_FOCUSES.grammar]: { body: C.pageFolderGrammar, tab: C.pageFolderGrammarTab, line: C.pageFolderGrammarLine },
};

export function pageFolderColors(role) {
  return PAGE_FOLDER_COLORS[role] || MANILA_FOLDER;
}

/**
 * The inline style a folder card root carries: its family's body and outline directly, plus the
 * custom properties `.page-folder-tab` and its sloped cap resolve for the tab fill and seam
 * shadow. The properties inherit, which is how a style set here reaches a pseudo-element.
 */
export function pageFolderStyle(role) {
  const folder = pageFolderColors(role);
  return {
    background: folder.body,
    borderColor: folder.line,
    "--folder-tab": folder.tab,
    "--folder-line": folder.line,
  };
}

/**
 * The primary role a page presents itself as — its folder trio, its tab label, and now the page
 * chip on a lexical card. One rule in one place: `enabledPageRoles`' first entry, except a Journal
 * entry, which has no role to name and falls back to manila exactly as its folder does.
 */
export function primaryPageRole(page) {
  if (page?.type !== "page" || isJournalPage(page)) return null;
  const [role = null] = enabledPageRoles(page);
  return role;
}

/**
 * The page-context chip on a lexical entry card, wearing its page's own family so a word's
 * placement is recognisable at a glance from the same colour its folder carries. It is not a tag
 * chip and never was, but it borrows the tag's shape; what it borrows here is the folder's trio —
 * the tab tint as fill, the family outline as border, the role's ink as text. A page with no role
 * to name gets the manila fallback, whose ink is the Vocabulary family's (manila IS its chip
 * colour, per the 2026-08-08 folder decision).
 */
export function pageContextChipStyle(page) {
  const role = primaryPageRole(page);
  const folder = pageFolderColors(role);
  const meta = PAGE_ROLE_META[role];
  return {
    background: folder.tab,
    borderColor: folder.line,
    color: meta ? meta.color : C.roleVocabularyInk,
  };
}

/**
 * What a section inside an open page wears: its heading band, that band's outline, the heading ink
 * and the spine hung beneath it (owner-requested 2026-08-08).
 *
 * Keyed by section rather than by page, because one page shows several: a Vocabulary page with
 * Notes turned on has a gold Vocabulary section and a blue Notes section, and each should say which
 * kind of content it is. The four typed families reuse the exact chip and folder-line values their
 * folders already wear, so a Grammar section and a Grammar folder are the same purple rather than
 * two purples. `neutral` covers the sections that belong to no page type — Media links, Connections
 * and Tags — in the app's existing red, which is deliberately unlike all four families.
 */
const SECTION_FAMILIES = {
  notes: { band: C.penPale, line: C.chipBorder, ink: C.penDark, spine: C.pageFolderNotesLine },
  vocabulary: {
    band: C.roleVocabularyPale,
    line: C.pageFolderLine,
    ink: C.roleVocabularyInk,
    spine: C.pageFolderLine,
  },
  source: { band: C.greenPale, line: C.pageFolderSourceLine, ink: C.green, spine: C.pageFolderSourceLine },
  grammar: {
    band: C.roleGrammarPale,
    line: C.pageFolderGrammarLine,
    ink: C.roleGrammarInk,
    spine: C.pageFolderGrammarLine,
  },
  neutral: { band: C.redPale, line: C.dangerBorder, ink: C.red, spine: C.red },
};

/** Falls back to Notes blue, which is what every section wore before families existed. */
export function sectionFamily(family) {
  return SECTION_FAMILIES[family] || SECTION_FAMILIES.notes;
}

const SOURCE_FORMAT_LABELS = {
  book: "Book",
  audio: "Audio",
  video: "Video",
  article_lesson: "Article or lesson",
  other: "Source",
};

/**
 * A count only earns its place in the summary when there is something to count. An enabled but
 * still-empty structure says nothing rather than reporting itself as zero: `0 items · 0 groups` is
 * noise on a Grammar page that happens to have a collection turned on, and the page itself is
 * where an empty structure is worth seeing.
 */
const countPart = (count, singular) =>
  count > 0 ? `${count} ${count === 1 ? singular : `${singular}s`}` : null;

/**
 * The one-line count summary under a page title, in a fixed order so two pages with the same
 * structures always read the same way. With the role pills reduced to the single tab badge, this
 * line is also what discloses a page's secondary structures: root sections, subsections and
 * examples mean Grammar; items and groups mean Vocabulary.
 *
 * Returns "" when an enabled structure has nothing in it yet. The Notes fallback below is reserved
 * for a page with no structure at all, so it can never speak for a Vocabulary or Grammar page.
 */
export function pageSummary(page, items) {
  const parts = [];
  const structured =
    page.source?.enabled || page.grammar?.enabled || page.collection?.enabled;

  if (page.source?.enabled) {
    /* Format and creator are identity, not a count, so they show even before the first capture. */
    const identity = [SOURCE_FORMAT_LABELS[page.source.format], page.source.creator]
      .filter(Boolean)
      .join(" · ");
    if (identity) parts.push(identity);
    parts.push(countPart(page.source.captures?.length || 0, "capture"));
  }

  if (page.grammar?.enabled) {
    const counts = grammarStructureCounts(page.grammar.sections);
    parts.push(countPart(counts.sections, "section"));
    parts.push(countPart(counts.subsections, "subsection"));
    parts.push(countPart(counts.examples, "example"));
  }

  if (page.collection?.enabled) {
    const collection = deriveCollection(page, items);
    parts.push(countPart(collection.itemCount, "item"));
    parts.push(countPart(collection.groupCount, "group"));
  }

  const shown = parts.filter(Boolean);

  if (!structured && shown.length === 0) {
    if (page.tags?.length) return page.tags.join(" · ");
    return page.body?.trim() ? "Notes page" : "Empty notes page";
  }

  return shown.join(" · ");
}
