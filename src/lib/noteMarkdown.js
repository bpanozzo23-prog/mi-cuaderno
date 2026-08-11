import remarkBreaks from "remark-breaks";
import { remarkMark } from "remark-mark-highlight";
import remarkParse from "remark-parse";
import { unified } from "unified";

/**
 * The complete notebook-markdown dialect. Keep display and plain-text consumers on this exact
 * plugin list so a note cannot mean one thing in its reader and another in search or a preview.
 */
export const NOTE_MARKDOWN_PLUGINS = Object.freeze([remarkMark, remarkBreaks]);

const NOTE_CALLOUT_CLASS = "note-callout-source";
const NOTE_CALLOUT_MARKER = "[!NOTE]";
const NOTE_BLANK_LINE_CLASS = "note-blank-line-source";

function visitExplicitNoteCallouts(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "blockquote") {
    const paragraph = node.children?.[0];
    const first = paragraph?.type === "paragraph" ? paragraph.children?.[0] : null;
    const marker = first?.type === "text"
      ? first.value.match(/^\[!NOTE\][ \t]*(?:\r?\n|$)/)
      : null;
    if (marker) {
      first.value = first.value.slice(marker[0].length);
      if (!first.value) paragraph.children.shift();
      if (!paragraph.children.length) node.children.shift();
      const priorClasses = node.data?.hProperties?.className || [];
      node.data = {
        ...node.data,
        hProperties: {
          ...node.data?.hProperties,
          className: [...(Array.isArray(priorClasses) ? priorClasses : [priorClasses]), NOTE_CALLOUT_CLASS],
        },
      };
    }
  }
  for (const child of node.children || []) visitExplicitNoteCallouts(child);
}

/** Mark and de-label explicit Page Notes callouts without changing their saved Markdown source. */
export function remarkExplicitNoteCallouts() {
  return visitExplicitNoteCallouts;
}

/** Convert only an exact top-level `<br>` line into the safe blank-line render node. */
export function remarkStandaloneBlankLines() {
  return (tree) => {
    if (tree?.type !== "root" || !Array.isArray(tree.children)) return;
    tree.children = tree.children.map((node) => node?.type === "html" && node.value === "<br>"
      ? {
          type: "thematicBreak",
          data: { hProperties: { className: [NOTE_BLANK_LINE_CLASS] } },
        }
      : node);
  };
}

export const NOTE_CALLOUT_MARKDOWN_PLUGINS = Object.freeze([
  remarkExplicitNoteCallouts,
  remarkMark,
  remarkBreaks,
]);

export const NOTE_BLANK_LINE_MARKDOWN_PLUGINS = Object.freeze([
  remarkStandaloneBlankLines,
  remarkMark,
  remarkBreaks,
]);

export const NOTE_CALLOUT_BLANK_LINE_MARKDOWN_PLUGINS = Object.freeze([
  remarkExplicitNoteCallouts,
  remarkStandaloneBlankLines,
  remarkMark,
  remarkBreaks,
]);

const plainTextParser = unified()
  .use(remarkParse)
  .use(remarkMark)
  .use(remarkBreaks);
const calloutPlainTextParser = unified()
  .use(remarkParse)
  .use(remarkExplicitNoteCallouts)
  .use(remarkMark)
  .use(remarkBreaks);
const plainTextCache = new Map();

const BLOCK_CONTAINERS = new Set(["root", "blockquote", "list", "listItem"]);

/** Remove the contents of active HTML containers before Markdown sees them at all. */
export function safeMarkdownSource(source) {
  return String(source || "").replace(
    /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    ""
  );
}

function visibleText(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text" || node.type === "inlineCode" || node.type === "code") {
    return node.value || "";
  }
  if (node.type === "break") return "\n";

  // Raw HTML and images are deliberately not part of the notebook dialect, so neither their
  // markup nor hidden payload should leak into search, previews, or an AI review.
  if (node.type === "html" || node.type === "image" || node.type === "imageReference"
    || node.type === "definition" || node.type === "thematicBreak") return "";

  const children = Array.isArray(node.children) ? node.children : [];
  const pieces = children.map(visibleText).filter(Boolean);
  return pieces.join(BLOCK_CONTAINERS.has(node.type) ? "\n" : "");
}

/** The words a reader can actually see, with Markdown punctuation and unsupported HTML removed. */
export function plainTextFromMarkdown(source, { noteCallouts = false } = {}) {
  const markdown = safeMarkdownSource(source);
  if (!markdown) return "";
  const cacheKey = `${noteCallouts ? "callout" : "plain"}:${markdown}`;
  if (plainTextCache.has(cacheKey)) return plainTextCache.get(cacheKey);
  const parser = noteCallouts ? calloutPlainTextParser : plainTextParser;
  const tree = parser.runSync(parser.parse(markdown));
  const text = visibleText(tree)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Cards normally warm this before a search. Bound it anyway so a very long editing session
  // cannot retain every intermediate autosave string forever.
  if (plainTextCache.size >= 2000) plainTextCache.clear();
  plainTextCache.set(cacheKey, text);
  return text;
}

/** One-line form for cards and pickers. Truncation remains the caller's layout decision. */
export function markdownPreviewText(source, options) {
  return plainTextFromMarkdown(source, options).replace(/\s+/g, " ").trim();
}
