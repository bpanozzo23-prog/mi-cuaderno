/**
 * "Ask about this" groups: many words and phrases attached to a Pregunta question as one chip.
 *
 * A group is sent in a short form — term, kind, part of speech and numbered meanings with their
 * labels, and, when the owner chooses, examples — built by an allowlist like a single attachment
 * and scrubbed the same way. Never notes, tags, IDs, links, media or review data.
 *
 * Two sources: a collection page's vocabulary (its outgoing links to words and phrases, the one
 * membership authority, while the Vocabulary structure is enabled), resolved when Ask is tapped
 * like the page's own text; and a narrowed list in Words & phrases or Cuaderno, frozen to the
 * entries the owner saw when tapping.
 *
 * `resolveAttachments` turns the whole queue into what one question sends. The preview, Ask and
 * the turn record all use it, so what the owner reads is what leaves the device.
 */

import { MAX_ATTACHMENTS, attachmentSnapshot, cleanText, entryKind, entryLabel, shownMeanings } from "./askContext.js";
import { deriveCollection } from "./collections.js";
import { meaningLabels } from "./meanings.js";

export const GROUP_DETAIL = Object.freeze({ meanings: "meanings", examples: "examples" });
export const MAX_GROUP_ENTRIES = 50;
export const MAX_GROUP_CHARS = 12000;
export const MAX_GROUPS_PER_QUESTION = 2;
/** Group text echoes with every follow-up, so a conversation's total is bounded too. */
export const MAX_CONVERSATION_GROUP_CHARS = 30000;
const MAX_SHORT_EXAMPLES_PER_MEANING = 3;
const MAX_SHORT_MY_EXAMPLES = 3;
/** A group's heading is cut to this, so a long page title or search cannot crowd out entries. */
const MAX_HEADING_CHARS = 200;

export const groupDetail = (detail) => (detail === GROUP_DETAIL.examples ? GROUP_DETAIL.examples : GROUP_DETAIL.meanings);

const DETAIL_WORDS = {
  [GROUP_DETAIL.meanings]: "meanings only",
  [GROUP_DETAIL.examples]: "meanings and examples",
};

/** An example's Spanish and English only; its note is left out of the short form. */
function shortExample(example, prefix) {
  const es = cleanText(example?.es);
  if (!es) return "";
  const en = cleanText(example?.en);
  return `${prefix}${es}${en ? ` — ${en}` : ""}`;
}

/**
 * One word or phrase in short form: { text, meaningIds }. `meaningRefs` numbers meanings `m1.`,
 * `m2.`… for Keep; `meaningIds` maps each number to its meaning's ID, from the same reading, so
 * the numbers Claude sees and the meanings an addition lands on always agree.
 */
export function shortFormEntry(item, { detail = GROUP_DETAIL.meanings, meaningRefs = false } = {}) {
  const withExamples = groupDetail(detail) === GROUP_DETAIL.examples;
  const pos = cleanText(item?.pos);
  const lines = [`Entry: ${entryLabel(item)} (${entryKind(item)}${pos ? `, ${pos}` : ""})`];
  const meaningIds = {};
  shownMeanings(item).forEach((meaning, index) => {
    meaningIds[`m${index + 1}`] = meaning.id;
    const gloss = cleanText(meaning.gloss) || "(no gloss)";
    const labels = meaningLabels(meaning).map(cleanText).filter(Boolean);
    lines.push(`${meaningRefs ? "m" : ""}${index + 1}. ${gloss}${labels.length ? ` [${labels.join(", ")}]` : ""}`);
    if (withExamples) {
      const examples = (meaning.examples || [])
        .map((example) => shortExample(example, "   Example: "))
        .filter(Boolean)
        .slice(0, MAX_SHORT_EXAMPLES_PER_MEANING);
      lines.push(...examples);
    }
  });
  if (withExamples) {
    const mine = (item?.myExamples || [])
      .map((example) => shortExample(example, "- "))
      .filter(Boolean)
      .slice(0, MAX_SHORT_MY_EXAMPLES);
    if (mine.length) lines.push("My examples:", ...mine);
  }
  return { text: lines.join("\n"), meaningIds };
}

/**
 * A group's text, filled entry by entry in order until the next would pass either cap:
 * { text, sentIds, total, omitted }. `sections` is [{ name, items }]; a section's heading is
 * printed before its first entry that fits.
 */
export function groupText({ heading, sections = [], detail }) {
  const level = groupDetail(detail);
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const cleaned = cleanText(heading);
  const title = cleaned.length > MAX_HEADING_CHARS ? `${cleaned.slice(0, MAX_HEADING_CHARS - 1)}…` : cleaned;
  const headLine = (count) => `Group: ${title} (${count}; ${DETAIL_WORDS[level]})`;
  const omittedLine = (omitted) => `[${omitted} more ${omitted === 1 ? "entry" : "entries"} not included]`;
  // Every line the frame might add, at its longest, comes out of the cap before any entry.
  const room = MAX_GROUP_CHARS
    - headLine(`first ${MAX_GROUP_ENTRIES} of ${total} entries`).length
    - (omittedLine(total).length + 1);
  const body = [];
  const sentIds = [];
  let size = 0;
  let full = false;
  for (const section of sections) {
    let headed = false;
    for (const item of section.items) {
      if (full) break;
      const entry = shortFormEntry(item, { detail: level }).text;
      const sectionLine = section.name && !headed ? `Section: ${cleanText(section.name)}` : "";
      const added = entry.length + 1 + (sectionLine ? sectionLine.length + 1 : 0);
      if (sentIds.length >= MAX_GROUP_ENTRIES || size + added > room) {
        full = true;
        break;
      }
      if (sectionLine) {
        body.push(sectionLine);
        headed = true;
      }
      body.push(entry);
      sentIds.push(item.id);
      size += added;
    }
  }
  const sent = sentIds.length;
  const omitted = total - sent;
  const count = omitted > 0 ? `first ${sent} of ${total} entries` : `${total} ${total === 1 ? "entry" : "entries"}`;
  const lines = [headLine(count), ...body];
  if (omitted > 0) lines.push(omittedLine(omitted));
  return { text: lines.join("\n"), sentIds, total, omitted };
}

/**
 * A collection page's vocabulary as group sections, or null when the Vocabulary structure is
 * off or has no members. Members come from the page's own links, never from group layout alone.
 */
export function pageVocabulary(page, items = []) {
  if (page?.type !== "page" || !page.collection?.enabled) return null;
  const derived = deriveCollection(page, items);
  if (derived.members.length === 0) return null;
  const named = derived.groups.filter((group) => group.items.length > 0);
  const sections = named.map((group) => ({ name: group.name || "Untitled group", items: group.items }));
  if (derived.ungroupedItems.length > 0) {
    sections.push({ name: named.length > 0 ? "Not in a group" : "", items: derived.ungroupedItems });
  }
  return { sections };
}

/**
 * A list label as Claude reads it: only the tag, the form or type, and the search text. Any
 * other narrowing — including learning filters such as "Due today" — is just "(filtered)", so
 * review state never leaves the device.
 */
export function listGroupLabel({ tag = "", form = "", search = "", filtered = false } = {}) {
  const parts = [];
  if (tag) parts.push(`tagged “${tag}”`);
  if (form) parts.push(form);
  if (search) parts.push(`search “${search}”`);
  if (filtered) parts.push("(filtered)");
  const text = parts.join(" · ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Filtered list";
}

/**
 * Adds a list group to Pregunta's queue: { queue, result: "added" | "updated" | "full" }. The same
 * list replaces the earlier group under a new key, as re-attaching an entry does. `sourceKey`
 * names the exact filters on the device, so two lists Claude would see under the same label
 * ("(filtered)") stay apart; it is never sent.
 */
export function queueGroupAttachment(queue, { label, memberIds = [], sourceKey = null }, makeKey) {
  const identity = sourceKey ?? `label:${label}`;
  const index = queue.attachments.findIndex((attachment) =>
    attachment.kind === "group" && (attachment.sourceKey ?? `label:${attachment.label}`) === identity);
  const groups = queue.attachments.filter((attachment) => attachment.kind === "group").length;
  if (index < 0 && (queue.attachments.length >= MAX_ATTACHMENTS || groups >= MAX_GROUPS_PER_QUESTION)) {
    return { queue, result: "full" };
  }
  const fresh = {
    key: makeKey(),
    kind: "group",
    label: String(label || ""),
    sourceKey: identity,
    memberIds: [...new Set(memberIds)],
    detail: index >= 0 ? groupDetail(queue.attachments[index].detail) : GROUP_DETAIL.meanings,
  };
  const attachments = index >= 0
    ? queue.attachments.map((attachment, at) => (at === index ? fresh : attachment))
    : [...queue.attachments, fresh];
  return { queue: { attachments, arrival: queue.arrival + 1 }, result: index >= 0 ? "updated" : "added" };
}

/** The owner's choice of detail for one queued group. Not an arrival: Pregunta is already open. */
export function setAttachmentDetail(queue, key, detail) {
  return {
    ...queue,
    attachments: queue.attachments.map((attachment) =>
      attachment.key === key ? { ...attachment, detail: groupDetail(detail) } : attachment
    ),
  };
}

/**
 * What one question sends, from the whole queue and the notebook as it is now:
 *
 * - `snapshots`: blocks in send order, `{ block: "entry" | "group", text, … }` (see attachmentsBlock).
 * - `chips`: per queue key, `{ label, kind, preview, group }` where `group` is
 *   `{ detail, sent, total, omitted, chars }` or null.
 * - `sent`: one device-side record per chip for the turn: `{ itemId?, label, kind, group? }`,
 *   `group` being `{ source, detail, memberIds, chars }`.
 * - `gone`: keys whose entry, page or every list member no longer exists.
 * - `groupCount` and `groupChars`: for the per-question and per-conversation limits.
 *
 * An entry attached on its own is sent in full and left out of every group, wherever it sits in
 * the queue; an entry in two groups appears in the first. Only then are the caps applied.
 */
export function resolveAttachments(attachments = [], items = []) {
  const byId = new Map(items.map((item) => [item?.id, item]));
  const singles = new Set(attachments
    .filter((attachment) => attachment.kind !== "group" && byId.get(attachment.itemId)?.type === "lexical")
    .map((attachment) => attachment.itemId));

  // Membership first, in queue order and before any cap: an entry belongs to the first group
  // that lists it, even if that group's cap later leaves it out.
  const claimed = new Set();
  const plans = new Map();
  for (const attachment of attachments) {
    let sections = null;
    if (attachment.kind === "group") {
      const members = (attachment.memberIds || []).map((id) => byId.get(id)).filter((item) => item?.type === "lexical");
      if (members.length > 0) sections = [{ name: "", items: members }];
    } else {
      const item = byId.get(attachment.itemId);
      sections = item?.type === "page" ? pageVocabulary(item, items)?.sections || null : null;
    }
    if (!sections) continue;
    const memberIds = sections.flatMap((section) => section.items.map((item) => item.id));
    const total = memberIds.length;
    const eligible = sections
      .map((section) => ({
        name: section.name,
        items: section.items.filter((item) => !singles.has(item.id) && !claimed.has(item.id)),
      }))
      .filter((section) => section.items.length > 0);
    for (const section of eligible) for (const item of section.items) claimed.add(item.id);
    plans.set(attachment.key, { total, memberIds, eligible });
  }

  const result = { snapshots: [], chips: {}, sent: [], gone: [], groupCount: 0, groupChars: 0 };
  /** Builds a planned group's text: { built, group } for the chip and the turn record. */
  const buildGroup = (plan, heading, detail) => {
    const built = plan.eligible.length > 0 ? groupText({ heading, sections: plan.eligible, detail }) : null;
    if (built) {
      result.groupCount += 1;
      result.groupChars += built.text.length;
    }
    const sent = built?.sentIds.length || 0;
    return {
      built,
      summary: { detail, sent, total: plan.total, omitted: built?.omitted || 0, chars: built?.text.length || 0 },
      record: { detail, memberIds: built?.sentIds || [], chars: built?.text.length || 0 },
    };
  };

  for (const attachment of attachments) {
    if (attachment.kind === "group") {
      const plan = plans.get(attachment.key);
      if (!plan) {
        result.gone.push(attachment.key);
        continue;
      }
      const detail = groupDetail(attachment.detail);
      const label = cleanText(attachment.label) || "Filtered list";
      const { built, summary, record } = buildGroup(plan, `My words and phrases — ${label}`, detail);
      if (built) result.snapshots.push({ block: "group", text: built.text });
      result.chips[attachment.key] = { label, kind: "group", preview: built ? built.text : "", group: summary };
      result.sent.push({ label, kind: "group", group: { source: "list", ...record } });
      continue;
    }

    const item = byId.get(attachment.itemId);
    const snapshot = attachmentSnapshot(item, { items, review: attachment.review });
    if (!snapshot) {
      result.gone.push(attachment.key);
      continue;
    }
    result.snapshots.push({ block: "entry", ...snapshot });
    const record = { itemId: snapshot.itemId, label: snapshot.label, kind: snapshot.kind };
    const chip = { label: snapshot.label, kind: snapshot.kind, preview: snapshot.text, group: null };
    const plan = plans.get(attachment.key);
    if (plan) {
      const detail = groupDetail(attachment.detail);
      const group = buildGroup(plan, `Vocabulary on the page “${snapshot.label}”`, detail);
      if (group.built) {
        result.snapshots.push({ block: "group", text: group.built.text });
        chip.preview = `${snapshot.text}\n\n${group.built.text}`;
      }
      chip.group = group.summary;
      record.group = { source: "page", ...group.record };
    }
    result.chips[attachment.key] = chip;
    result.sent.push(record);
  }

  // What each group's chip can honestly say: entries sent elsewhere versus entries sent nowhere.
  const sentAnywhere = new Set([...singles, ...result.sent.flatMap((record) => record.group?.memberIds || [])]);
  for (const attachment of attachments) {
    const chip = result.chips[attachment.key];
    const plan = plans.get(attachment.key);
    if (!chip?.group || !plan) continue;
    const missing = plan.memberIds.filter((id) => !sentAnywhere.has(id)).length;
    chip.group.missing = missing;
    chip.group.elsewhere = plan.total - chip.group.sent - missing;
  }
  return result;
}

/**
 * A group's size as the tray states it, from a chip's `group`: what is sent, how much text that
 * is, and why anything is not — attached elsewhere, or left out by a size limit.
 */
export function groupSummaryText(group) {
  const reasons = [
    group.missing > 0 ? `${group.missing} left out by size limits` : "",
    group.elsewhere > 0 ? `${group.elsewhere} already attached` : "",
  ].filter(Boolean);
  if (group.sent === 0) return `no entries sent${reasons.length ? ` · ${reasons.join(" · ")}` : ""}`;
  const size = `about ${Math.max(100, Math.round(group.chars / 100) * 100).toLocaleString("en-US")} characters`;
  const count = group.sent === group.total
    ? `${group.total} ${group.total === 1 ? "entry" : "entries"}`
    : `${group.sent} of ${group.total} entries sent`;
  return [count, ...reasons, size].join(" · ");
}

/** Group characters a conversation has already sent, from its turn records. */
export function conversationGroupChars(turns = []) {
  return turns.reduce((sum, turn) =>
    sum + (turn.attachments || []).reduce((inner, record) => inner + (record.group?.chars || 0), 0), 0);
}
