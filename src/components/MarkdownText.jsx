import { useId } from "react";
import Markdown from "react-markdown";
import {
  NOTE_BLANK_LINE_MARKDOWN_PLUGINS,
  NOTE_CALLOUT_BLANK_LINE_MARKDOWN_PLUGINS,
  NOTE_CALLOUT_MARKDOWN_PLUGINS,
  NOTE_MARKDOWN_PLUGINS,
  safeMarkdownSource,
} from "../lib/noteMarkdown.js";

const ALLOWED_ELEMENTS = [
  "p", "h1", "h2", "h3", "strong", "em", "mark",
  "ul", "ol", "li", "hr", "blockquote", "br",
];

function NoteCallout({ children, family }) {
  const labelId = useId();
  return (
    <aside
      role="note"
      aria-labelledby={labelId}
      className={`note-callout ${family}-note-callout note-callout--${family}`}
    >
      <div id={labelId} className="note-callout__label">Note</div>
      {children}
    </aside>
  );
}

function hasExplicitCalloutClass(node) {
  const names = node?.properties?.className || [];
  return (Array.isArray(names) ? names : String(names).split(/\s+/)).includes("note-callout-source");
}

function hasBlankLineClass(node) {
  const names = node?.properties?.className || [];
  return (Array.isArray(names) ? names : String(names).split(/\s+/)).includes("note-blank-line-source");
}

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
  explicitNoteCallouts = false,
  blankLines = false,
}) {
  const components = {};
  if (calloutBlockquotes || explicitNoteCallouts) {
    components.blockquote = ({ children: quoteChildren, className, node }) => {
      if (calloutBlockquotes || (explicitNoteCallouts && hasExplicitCalloutClass(node))) {
        return <NoteCallout family={calloutBlockquotes ? "grammar" : "notes"}>{quoteChildren}</NoteCallout>;
      }
      return <blockquote className={className}>{quoteChildren}</blockquote>;
    };
  }
  if (blankLines) {
    components.hr = ({ className, node }) => hasBlankLineClass(node)
      ? <div className="note-blank-line" aria-hidden="true" />
      : <hr className={className} />;
  }

  const remarkPlugins = explicitNoteCallouts
    ? blankLines ? NOTE_CALLOUT_BLANK_LINE_MARKDOWN_PLUGINS : NOTE_CALLOUT_MARKDOWN_PLUGINS
    : blankLines ? NOTE_BLANK_LINE_MARKDOWN_PLUGINS : NOTE_MARKDOWN_PLUGINS;

  return (
    <div
      ref={elementRef}
      className={`note-markdown ${compact ? "note-markdown--compact" : ""} ${className}`.trim()}
      style={style}
    >
      <Markdown
        remarkPlugins={remarkPlugins}
        allowedElements={ALLOWED_ELEMENTS}
        components={Object.keys(components).length ? components : undefined}
        unwrapDisallowed
        skipHtml
      >
        {safeMarkdownSource(children)}
      </Markdown>
    </div>
  );
}
