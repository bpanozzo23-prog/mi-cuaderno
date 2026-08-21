import { markdownPreviewText, plainTextFromMarkdown } from "./noteMarkdown.js";
import { canonicalNoteSections, noteSectionBreadcrumb } from "./pageKinds.js";

/** All lexical Notes text in its visible order: General note, then the named outline. */
export function lexicalNotesPlainText(item = {}) {
  const general = plainTextFromMarkdown(item.notes || "", { noteCallouts: true });
  const sections = canonicalNoteSections(item.noteSections || []).flatMap((section) => [
    noteSectionBreadcrumb(section, item.noteSections || []),
    plainTextFromMarkdown(section.body || "", { noteCallouts: true }),
  ]);
  return [general, ...sections].filter(Boolean).join("\n");
}

/** Compact card/picker preview, preferring General note before canonical named sections. */
export function lexicalNotePreview(item = {}, maxLength = 80) {
  const general = markdownPreviewText(item.notes || "", { noteCallouts: true });
  if (general) return general.slice(0, maxLength);

  for (const section of canonicalNoteSections(item.noteSections || [])) {
    const body = markdownPreviewText(section.body || "", { noteCallouts: true });
    if (!body) continue;
    const breadcrumb = noteSectionBreadcrumb(section, item.noteSections || []);
    return `${breadcrumb}: ${body}`.slice(0, maxLength);
  }
  return "";
}
