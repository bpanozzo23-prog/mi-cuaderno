import { useEffect, useRef, useState } from "react";
import {
  BetweenHorizontalStart, Bold, Eye, Heading2, Highlighter, Image as ImageIcon, Italic, List,
  ListOrdered, Minus, Quote, StickyNote,
} from "lucide-react";
import { C } from "../theme.jsx";
import MarkdownText from "./MarkdownText.jsx";

const INLINE_ACTIONS = [
  { label: "Bold", icon: Bold, before: "**", after: "**" },
  { label: "Italic", icon: Italic, before: "*", after: "*" },
  { label: "Highlight", icon: Highlighter, before: "==", after: "==" },
];

// One grammar for both the toolbar's line rules and Enter continuation, so the two can never
// disagree about what counts as a list or quote line.
const BULLET_LINE = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED_LINE = /^(\s*)(\d+)([.)])\s+(.*)$/;
const QUOTE_LINE = /^(>\s?)(.*)$/;

const CONTINUATIONS = [
  { pattern: ORDERED_LINE, next: (m) => `${m[1]}${Number(m[2]) + 1}${m[3]} `, content: (m) => m[4] },
  { pattern: BULLET_LINE, next: (m) => `${m[1]}${m[2]} `, content: (m) => m[3] },
  { pattern: QUOTE_LINE, next: () => "> ", content: (m) => m[2] },
];

const focusSelection = (textarea, start, end) => {
  requestAnimationFrame(() => {
    textarea?.focus({ preventScroll: true });
    textarea?.setSelectionRange(start, end);
  });
};

function replaceSelection(value, onChange, replacement, start, end) {
  onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
}

function lineRange(value, start, end) {
  const rangeStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  return [rangeStart, nextBreak === -1 ? value.length : nextBreak];
}

function ToolbarButton({ label, icon: Icon, onAction, disabled = false, pressed = null }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-pressed={pressed === null ? undefined : pressed}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onAction}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border disabled:opacity-40"
      style={{ background: C.card, borderColor: C.line, color: C.ink }}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function MarkdownToolbar({
  textareaRef, value, onChange, quoteLabel, noteCallouts, blankLines, previewing, onTogglePreview,
}) {
  function inline(before, after) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const wrappedOutside = value.slice(Math.max(0, start - before.length), start) === before
      && value.slice(end, end + after.length) === after;

    if (wrappedOutside) {
      const replaceStart = start - before.length;
      const replaceEnd = end + after.length;
      replaceSelection(value, onChange, selected, replaceStart, replaceEnd);
      focusSelection(textarea, replaceStart, replaceStart + selected.length);
      return;
    }

    const replacement = `${before}${selected}${after}`;
    replaceSelection(value, onChange, replacement, start, end);
    if (selected) {
      focusSelection(textarea, start + before.length, end + before.length);
    } else {
      focusSelection(textarea, start + before.length, start + before.length);
    }
  }

  function prefixLines(kind) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const [start, end] = lineRange(value, textarea.selectionStart, textarea.selectionEnd);
    const lines = value.slice(start, end).split("\n");
    const rules = {
      heading: { matches: (line) => /^##\s+/.test(line), strip: (line) => line.replace(/^#{1,6}\s+/, ""), add: () => "## " },
      bullet: { matches: (line) => BULLET_LINE.test(line), strip: (line) => line.replace(BULLET_LINE, "$1$3"), add: () => "- " },
      ordered: { matches: (line) => ORDERED_LINE.test(line), strip: (line) => line.replace(ORDERED_LINE, "$1$4"), add: (index) => `${index + 1}. ` },
      quote: { matches: (line) => QUOTE_LINE.test(line), strip: (line) => line.replace(QUOTE_LINE, "$2"), add: () => "> " },
    };
    const rule = rules[kind];
    const nonblank = lines.filter((line) => line.trim());
    const remove = nonblank.length > 0 && nonblank.every(rule.matches);
    let orderedIndex = 0;
    const changed = lines.map((line) => {
      if (!line.trim()) {
        if (kind === "quote" && !remove) return lines.length === 1 ? "> " : ">";
        return line;
      }
      const prefix = rule.add(orderedIndex++);
      return remove ? rule.strip(line) : `${prefix}${rule.strip(line)}`;
    }).join("\n");
    replaceSelection(value, onChange, changed, start, end);
    focusSelection(textarea, start, start + changed.length);
  }

  function imageLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const placeholder = "https://";
    const replacement = `![${selected}](${placeholder})`;
    replaceSelection(value, onChange, replacement, start, end);
    // Leave the placeholder selected so pasting a copied URL overwrites it in one gesture.
    const urlStart = start + 2 + selected.length + 2;
    focusSelection(textarea, urlStart, urlStart + placeholder.length);
  }

  function divider() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const after = end < value.length && value[end] !== "\n" ? "\n" : "";
    const replacement = `${before}---${after}`;
    replaceSelection(value, onChange, replacement, start, end);
    const caret = start + replacement.length;
    focusSelection(textarea, caret, caret);
  }

  function noteCallout() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const [start, end] = lineRange(value, textarea.selectionStart, textarea.selectionEnd);
    const selected = value.slice(start, end);
    const quoted = selected
      ? selected.split("\n").map((line) => line.trim() ? `> ${line}` : ">").join("\n")
      : "> ";
    const replacement = `> [!NOTE]\n${quoted}`;
    replaceSelection(value, onChange, replacement, start, end);
    const caret = start + replacement.length;
    focusSelection(textarea, caret, caret);
  }

  function blankLine() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const [, insertAt] = lineRange(value, textarea.selectionStart, textarea.selectionEnd);
    let replaceEnd = insertAt;
    while (replaceEnd < value.length && value[replaceEnd] === "\n" && replaceEnd - insertAt < 2) {
      replaceEnd += 1;
    }
    let precedingBreaks = 0;
    while (insertAt - precedingBreaks - 1 >= 0
      && value[insertAt - precedingBreaks - 1] === "\n"
      && precedingBreaks < 2) {
      precedingBreaks += 1;
    }
    const before = insertAt === 0 ? "" : "\n".repeat(2 - precedingBreaks);
    const replacement = `${before}<br>\n\n`;
    replaceSelection(value, onChange, replacement, insertAt, replaceEnd);
    const caret = insertAt + replacement.length;
    focusSelection(textarea, caret, caret);
  }

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      className="mb-1.5 flex flex-wrap items-center gap-1"
    >
      <span className="mr-1 text-[11px] font-medium" style={{ color: C.mut }}>Format</span>
      {INLINE_ACTIONS.map((action) => (
        <ToolbarButton
          key={action.label}
          {...action}
          disabled={previewing}
          onAction={() => inline(action.before, action.after)}
        />
      ))}
      <ToolbarButton label="Heading" icon={Heading2} disabled={previewing} onAction={() => prefixLines("heading")} />
      <ToolbarButton label="Bulleted list" icon={List} disabled={previewing} onAction={() => prefixLines("bullet")} />
      <ToolbarButton label="Numbered list" icon={ListOrdered} disabled={previewing} onAction={() => prefixLines("ordered")} />
      <ToolbarButton label={quoteLabel} icon={Quote} disabled={previewing} onAction={() => prefixLines("quote")} />
      {noteCallouts && <ToolbarButton label="Note callout" icon={StickyNote} disabled={previewing} onAction={noteCallout} />}
      {blankLines && <ToolbarButton label="Blank line" icon={BetweenHorizontalStart} disabled={previewing} onAction={blankLine} />}
      <ToolbarButton label="Image link" icon={ImageIcon} disabled={previewing} onAction={imageLink} />
      <ToolbarButton label="Divider" icon={Minus} disabled={previewing} onAction={divider} />
      <ToolbarButton label="Preview" icon={Eye} pressed={previewing} onAction={onTogglePreview} />
    </div>
  );
}

/** Plain textarea plus small Markdown insertion controls; formatting appears in read mode. */
export default function MarkdownTextarea({
  value,
  onChange,
  textareaRef = null,
  quoteLabel = "Block quote",
  noteCallouts = false,
  blankLines = false,
  calloutBlockquotes = false,
  onKeyDown = null,
  className = "",
  ...props
}) {
  const localRef = useRef(null);
  const ref = textareaRef || localRef;
  const [previewing, setPreviewing] = useState(false);
  const [previewMinHeight, setPreviewMinHeight] = useState(0);

  function togglePreview() {
    // Freeze the editor's current height under the preview so the layout doesn't jump.
    if (!previewing) setPreviewMinHeight(ref.current?.offsetHeight || 0);
    setPreviewing((current) => !current);
  }

  // Restoring the caret has to wait for the commit that unhides the textarea: a hidden element
  // cannot take focus, so doing this in the click handler silently loses the caret.
  const wasPreviewing = useRef(false);
  useEffect(() => {
    if (previewing) {
      wasPreviewing.current = true;
      return;
    }
    if (!wasPreviewing.current) return;
    wasPreviewing.current = false;
    const textarea = ref.current;
    if (textarea) focusSelection(textarea, textarea.selectionStart, textarea.selectionEnd);
  }, [previewing, ref]);

  function continueListOnEnter(event) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    // Android keyboards report keyCode 229 while predictive text is composing; never
    // preventDefault a composition commit — the worst case is a native newline.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextBreak = value.indexOf("\n", start);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const match = CONTINUATIONS
      .map((rule) => ({ rule, found: value.slice(lineStart, lineEnd).match(rule.pattern) }))
      .find(({ found }) => found);
    if (!match) return;
    event.preventDefault();
    const { rule, found } = match;
    if (start === end && !rule.content(found).trim()) {
      // Enter on an empty item ends the list instead of continuing it.
      replaceSelection(value, onChange, "", lineStart, lineEnd);
      focusSelection(textarea, lineStart, lineStart);
      return;
    }
    const insert = `\n${rule.next(found)}`;
    replaceSelection(value, onChange, insert, start, end);
    focusSelection(textarea, start + insert.length, start + insert.length);
  }

  return (
    <div className="min-w-0">
      <MarkdownToolbar
        textareaRef={ref}
        value={value}
        onChange={onChange}
        quoteLabel={quoteLabel}
        noteCallouts={noteCallouts}
        blankLines={blankLines}
        previewing={previewing}
        onTogglePreview={togglePreview}
      />
      {previewing && (
        <div
          className="rounded-lg border px-3 py-2"
          style={{ background: C.card, borderColor: C.line, minHeight: previewMinHeight || undefined }}
        >
          {value.trim() ? (
            <MarkdownText
              explicitNoteCallouts={noteCallouts}
              blankLines={blankLines}
              calloutBlockquotes={calloutBlockquotes}
            >
              {value}
            </MarkdownText>
          ) : (
            <p className="text-sm" style={{ color: C.mut }}>Nothing to preview yet</p>
          )}
        </div>
      )}
      {/* Hidden, not unmounted: keeps the selection for caret restore and never re-fires autoFocus. */}
      <textarea
        {...props}
        // Caller sizing classes stay in force: field-sizing grows from their min-height floor.
        // resize-none because a dragged height would pin the box and defeat that growth.
        className={`field-sizing-content resize-none ${className}`.trim()}
        ref={ref}
        hidden={previewing}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={continueListOnEnter}
      />
    </div>
  );
}
