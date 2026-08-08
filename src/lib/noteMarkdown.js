import remarkBreaks from "remark-breaks";
import { remarkMark } from "remark-mark-highlight";
import remarkParse from "remark-parse";
import { unified } from "unified";

/**
 * The complete notebook-markdown dialect. Keep display and plain-text consumers on this exact
 * plugin list so a note cannot mean one thing in its reader and another in search or a preview.
 */
export const NOTE_MARKDOWN_PLUGINS = Object.freeze([remarkMark, remarkBreaks]);

const plainTextParser = unified()
  .use(remarkParse)
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
export function plainTextFromMarkdown(source) {
  const markdown = safeMarkdownSource(source);
  if (!markdown) return "";
  if (plainTextCache.has(markdown)) return plainTextCache.get(markdown);
  const tree = plainTextParser.runSync(plainTextParser.parse(markdown));
  const text = visibleText(tree)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Cards normally warm this before a search. Bound it anyway so a very long editing session
  // cannot retain every intermediate autosave string forever.
  if (plainTextCache.size >= 2000) plainTextCache.clear();
  plainTextCache.set(markdown, text);
  return text;
}

/** One-line form for cards and pickers. Truncation remains the caller's layout decision. */
export function markdownPreviewText(source) {
  return plainTextFromMarkdown(source).replace(/\s+/g, " ").trim();
}
