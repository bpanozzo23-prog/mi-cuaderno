import Markdown from "react-markdown";
import { NOTE_MARKDOWN_PLUGINS, safeMarkdownSource } from "../lib/noteMarkdown.js";

const ALLOWED_ELEMENTS = [
  "p", "h1", "h2", "h3", "strong", "em", "mark",
  "ul", "ol", "li", "hr", "blockquote", "br",
];

/**
 * Safe, deliberately narrow rendering for page bodies and entry-level lexical notes. Unsupported
 * CommonMark containers are unwrapped to readable text; raw HTML and images are discarded.
 */
export default function MarkdownText({
  children,
  className = "",
  compact = false,
  elementRef = null,
  style = {},
  calloutBlockquotes = false,
}) {
  const components = calloutBlockquotes
    ? {
        blockquote: ({ children: quoteChildren }) => (
          <aside role="note" aria-label="Note" className="grammar-note-callout">
            <div className="grammar-note-callout__label">Note</div>
            {quoteChildren}
          </aside>
        ),
      }
    : undefined;

  return (
    <div
      ref={elementRef}
      className={`note-markdown ${compact ? "note-markdown--compact" : ""} ${className}`.trim()}
      style={style}
    >
      <Markdown
        remarkPlugins={NOTE_MARKDOWN_PLUGINS}
        allowedElements={ALLOWED_ELEMENTS}
        components={components}
        unwrapDisallowed
        skipHtml
      >
        {safeMarkdownSource(children)}
      </Markdown>
    </div>
  );
}
