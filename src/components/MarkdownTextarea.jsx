import { useRef } from "react";
import {
  Bold, Heading2, Highlighter, Italic, List, ListOrdered, Minus, Quote, StickyNote,
} from "lucide-react";
import { C } from "../theme.jsx";

const INLINE_ACTIONS = [
  { label: "Bold", icon: Bold, before: "**", after: "**" },
  { label: "Italic", icon: Italic, before: "*", after: "*" },
  { label: "Highlight", icon: Highlighter, before: "==", after: "==" },
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

function ToolbarButton({ label, icon: Icon, onAction }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.preventDefault()}
      onClick={onAction}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
      style={{ background: C.card, borderColor: C.line, color: C.ink }}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function MarkdownToolbar({ textareaRef, value, onChange, quoteLabel, noteCallouts }) {
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
      bullet: { matches: (line) => /^\s*[-*+]\s+/.test(line), strip: (line) => line.replace(/^(\s*)[-*+]\s+/, "$1"), add: () => "- " },
      ordered: { matches: (line) => /^\s*\d+[.)]\s+/.test(line), strip: (line) => line.replace(/^(\s*)\d+[.)]\s+/, "$1"), add: (index) => `${index + 1}. ` },
      quote: { matches: (line) => /^>\s?/.test(line), strip: (line) => line.replace(/^>\s?/, ""), add: () => "> " },
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
          onAction={() => inline(action.before, action.after)}
        />
      ))}
      <ToolbarButton label="Heading" icon={Heading2} onAction={() => prefixLines("heading")} />
      <ToolbarButton label="Bulleted list" icon={List} onAction={() => prefixLines("bullet")} />
      <ToolbarButton label="Numbered list" icon={ListOrdered} onAction={() => prefixLines("ordered")} />
      <ToolbarButton label={quoteLabel} icon={Quote} onAction={() => prefixLines("quote")} />
      {noteCallouts && <ToolbarButton label="Note callout" icon={StickyNote} onAction={noteCallout} />}
      <ToolbarButton label="Divider" icon={Minus} onAction={divider} />
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
  ...props
}) {
  const localRef = useRef(null);
  const ref = textareaRef || localRef;

  return (
    <div className="min-w-0">
      <MarkdownToolbar
        textareaRef={ref}
        value={value}
        onChange={onChange}
        quoteLabel={quoteLabel}
        noteCallouts={noteCallouts}
      />
      <textarea
        {...props}
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
