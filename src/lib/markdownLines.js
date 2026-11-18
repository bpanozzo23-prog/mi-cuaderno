/**
 * Line grammar for the notebook Markdown editor. The toolbar's line rules, Enter continuation
 * and the list Indent/Outdent actions all read lines through these patterns, so they can never
 * disagree about what counts as a list or quote line.
 */
export const BULLET_LINE = /^(\s*)([-*+])\s+(.*)$/;
export const ORDERED_LINE = /^(\s*)(\d+)([.)])\s+(.*)$/;
export const QUOTE_LINE = /^(>\s?)(.*)$/;

const TAB_STOP = 4;
const LEADING_SPACE = /^[ \t]*/;

/** Visual width of leading whitespace, with tabs advancing to CommonMark's 4-column stops. */
function columns(whitespace) {
  let width = 0;
  for (const char of whitespace) {
    width = char === "\t" ? width + TAB_STOP - (width % TAB_STOP) : width + 1;
  }
  return width;
}

function parseListItem(line) {
  const ordered = line.match(ORDERED_LINE);
  const found = ordered || line.match(BULLET_LINE);
  if (!found) return null;
  const leading = found[1];
  const marker = ordered ? `${found[2]}${found[3]}` : found[2];
  const content = ordered ? found[4] : found[3];
  const gap = line.length - leading.length - marker.length - content.length;
  const indent = columns(leading);
  return {
    indent,
    leadingLength: leading.length,
    marker,
    ordered: Boolean(ordered),
    number: ordered ? Number(found[2]) : null,
    delimiter: ordered ? found[3] : null,
    // CommonMark: an empty item, or one whose text starts 5+ spaces out, has its content one
    // space after the marker. A child list must start at or beyond this column to nest.
    contentColumn: indent + marker.length + (!content || gap > 4 ? 1 : gap),
  };
}

/**
 * Nearest list item above `index` that `matches`. Blank lines and indented continuation lines
 * are passed over; unindented prose (a paragraph, heading or quote) ends the list, so nothing
 * above it is found.
 */
function itemAbove(lines, items, index, matches) {
  for (let above = index - 1; above >= 0; above -= 1) {
    const line = lines[above];
    if (!line.trim()) continue;
    const item = items[above];
    if (item) {
      if (matches(item)) return above;
      continue;
    }
    if (columns(line.match(LEADING_SPACE)[0]) === 0) return -1;
  }
  return -1;
}

/** One level in means starting at the content column of the sibling item above. */
function nestedIndent(lines, items, lead) {
  const { indent } = items[lead];
  const sibling = itemAbove(lines, items, lead, (item) => item.indent <= indent);
  if (sibling === -1) return null;
  const column = items[sibling].contentColumn;
  // Already that item's child: Markdown cannot skip a level, so there is nothing deeper to go.
  return indent < column ? column : null;
}

/** One level out means lining up with the parent item; with no parent, the left margin. */
function outdentedIndent(lines, items, lead) {
  const { indent } = items[lead];
  if (indent === 0) return null;
  const parent = itemAbove(lines, items, lead, (item) => item.indent < indent);
  return parent === -1 ? 0 : items[parent].indent;
}

/**
 * The number a moved numbered item takes at its new level: one after an ordered sibling it
 * now follows, or 1 when indenting starts a new sub-list. `null` keeps the existing number.
 */
function startingNumber(lines, items, lead, target, direction) {
  const sibling = itemAbove(lines, items, lead, (item) => item.indent <= target);
  const previous = sibling === -1 ? null : items[sibling];
  if (previous?.indent === target && previous.ordered) return previous.number + 1;
  return direction === "indent" ? 1 : null;
}

function lineStarts(lines) {
  const starts = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
}

function lineAt(starts, position) {
  let index = 0;
  while (index + 1 < starts.length && starts[index + 1] <= position) index += 1;
  return index;
}

/**
 * Move the list items on the selected lines one level in (`"indent"`) or out (`"outdent"`).
 *
 * The selection's shallowest items move together, carrying their sub-items and indented
 * continuation lines so the structure under them is kept. Lines that are not list items are
 * never moved on their own: leading spaces on ordinary prose do not show in read mode.
 * Indentation is written as spaces in the same string, so nothing about storage changes.
 *
 * Returns `{ value, selectionStart, selectionEnd }`, or `null` when there is nothing to move:
 * no list item is selected, the first item of a list has nothing to nest under, an item is
 * already its sibling's child, or an outdent is already at the left margin.
 */
export function shiftListLevel(value, selectionStart, selectionEnd, direction) {
  const lines = value.split("\n");
  const starts = lineStarts(lines);
  const first = lineAt(starts, selectionStart);
  const last = lineAt(starts, selectionEnd);
  const items = lines.map(parseListItem);

  const selected = [];
  for (let index = first; index <= last; index += 1) {
    if (items[index]) selected.push(index);
  }
  if (!selected.length) return null;
  const top = Math.min(...selected.map((index) => items[index].indent));
  const lead = selected.find((index) => items[index].indent === top);
  const target = direction === "indent"
    ? nestedIndent(lines, items, lead)
    : outdentedIndent(lines, items, lead);
  if (target === null) return null;
  const delta = target - top;
  let number = startingNumber(lines, items, lead, target, direction);

  // Sub-items of the last selected item come along even when the selection stops above them.
  let end = last;
  while (end + 1 < lines.length) {
    const next = lines[end + 1];
    if (next.trim() && columns(next.match(LEADING_SPACE)[0]) <= top) break;
    end += 1;
  }

  const changed = [...lines];
  const prefixes = new Map();
  let markerGrowth = 0;
  for (let index = lead; index <= end; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const item = items[index];
    if (item?.indent === top) {
      const marker = item.ordered && number !== null ? `${number++}${item.delimiter}` : item.marker;
      // A wider number moves the item's content column; its sub-items follow it.
      markerGrowth = marker.length - item.marker.length;
      const rest = line.slice(item.leadingLength + item.marker.length);
      changed[index] = `${" ".repeat(target)}${marker}${rest}`;
      prefixes.set(index, [item.leadingLength + item.marker.length, target + marker.length]);
      continue;
    }
    const leading = line.match(LEADING_SPACE)[0];
    const indent = columns(leading);
    if (indent <= top) continue;
    const moved = Math.max(0, indent + delta + markerGrowth);
    changed[index] = `${" ".repeat(moved)}${line.slice(leading.length)}`;
    prefixes.set(index, [leading.length, moved]);
  }

  const nextValue = changed.join("\n");
  if (nextValue === value) return null;
  const nextStarts = lineStarts(changed);
  const map = (position) => {
    const index = lineAt(starts, position);
    const column = position - starts[index];
    const prefix = prefixes.get(index);
    if (!prefix) return nextStarts[index] + column;
    const [before, after] = prefix;
    // Text after the indent and marker keeps its place; a caret inside them stays put.
    return nextStarts[index] + (column >= before ? column + after - before : Math.min(column, after));
  };
  return { value: nextValue, selectionStart: map(selectionStart), selectionEnd: map(selectionEnd) };
}
