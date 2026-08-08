import { BookOpen, Braces, FileText, Library } from "lucide-react";
import { C } from "../theme.jsx";
import { deriveCollection } from "../lib/collections.js";
import { PAGE_FOCUSES } from "../lib/pageKinds.js";

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
 * line is also what discloses a page's secondary structures: sections and examples mean Grammar,
 * items and groups mean Vocabulary.
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
    const sections = page.grammar.sections || [];
    const examples = sections.reduce((total, section) => total + (section.examples?.length || 0), 0);
    parts.push(countPart(sections.length, "section"));
    parts.push(countPart(examples, "example"));
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
