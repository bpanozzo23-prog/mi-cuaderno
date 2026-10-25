/**
 * "Ask about this": the text of a notebook entry that Pregunta sends with a question.
 *
 * Built from an allowlist, field by field, so nothing joins the request by accident: meanings,
 * examples, notes, page prose and the names of linked entries. Never IDs, tags, media or image
 * links, a page's source URL, events or review history. The owner's own prose can still contain
 * a link or an internal key, so every string is scrubbed as well. The app keeps which entry an
 * attachment came from; only this text leaves the device.
 */

import { plainTextFromMarkdown } from "./noteMarkdown.js";
import { lexicalNotesPlainText } from "./lexicalNotes.js";
import { meaningLabels } from "./meanings.js";
import { connectionsFor } from "./relationships.js";
import {
  canonicalGrammarSections,
  canonicalNoteSections,
  grammarSectionBreadcrumb,
  noteSectionBreadcrumb,
} from "./pageKinds.js";
import { neutralizeTags } from "./aiRequest.js";
import { deriveCollection } from "./collections.js";

/** Per attachment. A typical word is a few hundred characters; long pages are cut. */
export const MAX_ATTACHMENT_CHARS = 6000;
/** Per question. Room for a handful of cards missed in one review session. */
export const MAX_ATTACHMENTS = 5;
const MAX_LINKED_NAMES = 20;
const SHORTENED = "[…shortened]";

/**
 * Removes what must never be sent even when the owner typed it: links, image syntax and the
 * app's internal `user:` / `dict:` keys.
 */
export function scrubText(value) {
  // Whole non-space runs: a URL may legally contain ")" and a query token may follow it, so
  // stopping at punctuation would leave the token behind. Losing a trailing "." is the price.
  return String(value ?? "")
    .replace(/!\[([^\]]*)\]\(\S*/g, "$1")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link]")
    .replace(/\b(?:user|dict):\S+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Adds an entry to Pregunta's queue: { queue, result: "added" | "updated" | "full" }. A queued
 * entry is updated under a new key, so an answer still in flight — which clears the keys it sent —
 * cannot take the newer attachment with it.
 */
export function queueAttachment(queue, itemId, { origin = "entry", review = null } = {}, makeKey) {
  const index = queue.attachments.findIndex((attachment) => attachment.itemId === itemId);
  if (index < 0 && queue.attachments.length >= MAX_ATTACHMENTS) return { queue, result: "full" };
  const fresh = { key: makeKey(), itemId, origin, review };
  const attachments = index >= 0
    ? queue.attachments.map((attachment, at) => (at === index ? fresh : attachment))
    : [...queue.attachments, fresh];
  return { queue: { attachments, arrival: queue.arrival + 1 }, result: index >= 0 ? "updated" : "added" };
}

const clean = (value) => neutralizeTags(scrubText(value));
/** Scrubbed and made safe inside any data tag: the treatment every sent string gets. */
export const cleanText = clean;
const prose = (markdown, options) => clean(plainTextFromMarkdown(markdown || "", options));

const line = (label, value) => {
  const text = clean(value);
  return text ? `${label}${text}` : "";
};

const exampleLine = (example, prefix = "- ") => {
  const es = clean(example?.es);
  if (!es) return "";
  const en = clean(example?.en);
  const note = clean(example?.note);
  return `${prefix}${es}${en ? ` — ${en}` : ""}${note ? ` (${note})` : ""}`;
};

const labelFor = (item) => clean(item?.type === "page" ? item?.title : item?.term) || "(untitled)";

const kindFor = (item) => (item?.type === "page" ? "page" : item?.form === "phrase" ? "phrase" : "word");

/** An entry's name and kind as a snapshot states them. */
export { labelFor as entryLabel, kindFor as entryKind };

/** Linked entries by name and relationship only, from either end of the link. */
function linkedLines(item, items, skipIds = new Set()) {
  const rows = connectionsFor(item, items, [])
    .filter((row) => row.kind === "item" && row.item && !skipIds.has(row.item.id))
    .slice(0, MAX_LINKED_NAMES)
    .map((row) => `- ${row.label}: ${labelFor(row.item)}`);
  return rows.length ? ["Linked entries:", ...rows] : [];
}

/** Pages that place this word in a vocabulary group are memberships, not links worth naming. */
function collectionPageIds(item, items) {
  return new Set(items
    .filter((page) => page?.type === "page" && page.collection?.enabled
      && (page.collection.groups || []).some((group) => (group.itemKeys || []).includes(item.id)))
    .map((page) => page.id));
}

/** The meanings a snapshot lists, in the order it numbers them. Blank ones are left out. */
export function shownMeanings(item) {
  return (item?.meanings || []).filter((meaning) => clean(meaning?.gloss) || meaning?.examples?.length);
}

/**
 * A word or phrase as snapshot lines. `meaningRefs` numbers meanings `m1.`, `m2.`… so Keep can
 * say which one an example belongs to; `shownMeanings` gives the same order.
 */
export function lexicalLines(item, items, { meaningRefs = false } = {}) {
  const pos = clean(item.pos);
  const lines = [`Entry: ${labelFor(item)} (${kindFor(item)}${pos ? `, ${pos}` : ""})`];
  const meanings = shownMeanings(item);
  if (meanings.length) {
    lines.push("Meanings:");
    meanings.forEach((meaning, index) => {
      const gloss = clean(meaning.gloss) || "(no gloss)";
      const labels = meaningLabels(meaning).map(clean).filter(Boolean);
      lines.push(`${meaningRefs ? "m" : ""}${index + 1}. ${gloss}${labels.length ? ` [${labels.join(", ")}]` : ""}`);
      const cue = line("   When: ", meaning.usageCue);
      if (cue) lines.push(cue);
      const note = line("   Note: ", meaning.note);
      if (note) lines.push(note);
      for (const example of meaning.examples || []) {
        const text = exampleLine(example, "   Example: ");
        if (text) lines.push(text);
      }
    });
  }
  const mine = (item.myExamples || []).map((example) => exampleLine(example)).filter(Boolean);
  if (mine.length) lines.push("My examples:", ...mine);
  const notes = clean(lexicalNotesPlainText(item));
  if (notes) lines.push("Notes:", notes);
  lines.push(...linkedLines(item, items, collectionPageIds(item, items)));
  return lines;
}

/**
 * A page's own content. Its vocabulary, while the structure is enabled, travels as a separate
 * group block (askGroups.js), so its members are not repeated here as linked entries. Disabled,
 * those links are ordinary linked entries, named as any others.
 */
function pageLines(page, items) {
  const lines = [`Page: ${labelFor(page)}`];
  const body = prose(page.body, { noteCallouts: true });
  if (body) lines.push(body);

  const sections = page.noteSections || [];
  for (const section of canonicalNoteSections(sections)) {
    const text = prose(section.body, { noteCallouts: true });
    const name = clean(noteSectionBreadcrumb(section, sections));
    if (name || text) lines.push(`Section: ${name || "(untitled)"}`, ...(text ? [text] : []));
  }

  if (page.source?.enabled) {
    const source = page.source;
    const about = [clean(source.creator), clean(source.scope)].filter(Boolean).join(" · ");
    if (about) lines.push(`Source: ${about}`);
    const context = line("Context: ", source.context);
    if (context) lines.push(context);
    // Deliberately no `source.url`.
    for (const capture of source.captures || []) {
      const text = clean(capture?.text);
      if (!text) continue;
      const location = clean(capture.location);
      lines.push(`- Capture: ${text}${location ? ` (${location})` : ""}`);
      const reflection = line("  My reflection: ", capture.reflection);
      if (reflection) lines.push(reflection);
    }
  }

  if (page.grammar?.enabled) {
    const grammar = page.grammar;
    const keyIdea = line("Key idea: ", grammar.keyIdea);
    if (keyIdea) lines.push(keyIdea);
    const grammarSections = grammar.sections || [];
    for (const section of canonicalGrammarSections(grammarSections)) {
      lines.push(`Grammar: ${clean(grammarSectionBreadcrumb(section, grammarSections)) || "(untitled)"}`);
      const pattern = line("Pattern: ", section.pattern);
      if (pattern) lines.push(pattern);
      const explanation = prose(section.explanation);
      if (explanation) lines.push(explanation);
      for (const example of section.examples || []) {
        const text = exampleLine(example, "Example: ");
        if (text) lines.push(text);
      }
    }
  }

  const memberIds = page.collection?.enabled ? new Set(deriveCollection(page, items).memberKeys) : new Set();
  lines.push(...linkedLines(page, items, memberIds));
  return lines;
}

/**
 * What a review card showed and asked, frozen when the owner tapped Ask — the card itself moves
 * on. Mirrors the faces chosen in PracticeCard.
 */
export function reviewContextFor(card, typedResult = null) {
  const reverse = card?.direction === "reverse" && (card.meanings?.length || 0) > 0;
  const picture = !reverse && card?.face === "image" && Boolean(card.image?.url);
  const cloze = !reverse && !picture && card?.cloze?.answer ? card.cloze : null;
  return {
    shown: reverse ? "meanings" : picture ? "picture" : cloze ? "sentence" : "spanish",
    cloze: cloze
      ? { before: String(cloze.before || ""), answer: String(cloze.answer || ""), after: String(cloze.after || ""), en: String(cloze.en || "") }
      : null,
    typed: typedResult?.attempt
      ? { attempt: String(typedResult.attempt), answer: String(typedResult.answer || ""), verdict: String(typedResult.verdict || "") }
      : null,
  };
}

const VERDICTS = { exact: "correct", accents: "correct apart from accents", wrong: "wrong" };

function reviewLines(review, item) {
  if (!review) return [];
  const term = labelFor(item);
  const lines = ["From review (a flashcard the learner just studied):"];
  if (review.shown === "meanings") {
    lines.push("- The card showed the English meaning(s) and asked for the Spanish.");
  } else if (review.shown === "picture") {
    lines.push("- The card showed a picture and asked for the Spanish.");
  } else if (review.shown === "sentence" && review.cloze) {
    const sentence = `${clean(review.cloze.before)} ___ ${clean(review.cloze.after)}`.trim();
    lines.push(`- The card showed this sentence with a blank: "${sentence}" and asked for the missing word.`);
    const en = clean(review.cloze.en);
    if (en) lines.push(`- The sentence's translation: ${en}`);
  } else {
    lines.push(`- The card showed "${term}" and asked for its meaning.`);
  }
  if (review.typed) {
    lines.push(`- The learner typed: "${clean(review.typed.attempt)}"`);
    const answer = clean(review.typed.answer || review.cloze?.answer || term);
    lines.push(`- Expected answer: "${answer}"`);
    lines.push(`- Result: ${VERDICTS[review.typed.verdict] || "wrong"}`);
  } else if (review.shown !== "spanish") {
    lines.push(`- Answer: "${clean(review.cloze?.answer) || term}"`);
  }
  return lines;
}

/** Caps one attachment's text on a line boundary, saying so when it had to cut. */
export function capped(text) {
  if (text.length <= MAX_ATTACHMENT_CHARS) return { text, truncated: false };
  const room = MAX_ATTACHMENT_CHARS - SHORTENED.length - 1;
  const slice = text.slice(0, room);
  const breakAt = slice.lastIndexOf("\n");
  const kept = breakAt > room / 2 ? slice.slice(0, breakAt) : slice;
  return { text: `${kept}\n${SHORTENED}`, truncated: true };
}

/**
 * The text sent for one attached item: { itemId, kind: "word"|"phrase"|"page", label, text,
 * truncated }, or null when the item is not a word, phrase or page. `itemId` stays on the device.
 */
export function attachmentSnapshot(item, { items = [], review = null } = {}) {
  if (!item || (item.type !== "lexical" && item.type !== "page")) return null;
  const lines = item.type === "page" ? pageLines(item, items) : lexicalLines(item, items);
  if (item.type === "lexical") lines.push(...reviewLines(review, item));
  const { text, truncated } = capped(lines.filter(Boolean).join("\n"));
  return { itemId: item.id, kind: kindFor(item), label: labelFor(item), text, truncated };
}

/**
 * The attachments as they open the question: plain blocks, no attributes to escape. A group
 * (askGroups.js) is its own kind of block, so Claude can tell many short entries from one in full.
 */
export function attachmentsBlock(snapshots = []) {
  return snapshots
    .map((snapshot) => {
      const tag = snapshot.block === "group" ? "attached_group" : "attached_entry";
      return `<${tag}>\n${snapshot.text}\n</${tag}>`;
    })
    .join("\n\n");
}

/** One-tap openings for the composer. They only fill it; Ask still sends. */
export function starterQuestions(attachments = []) {
  if (attachments.length === 0) return [];
  if (attachments.length > 1) {
    return ["What's the difference between these?", "Help me remember these", "Give me a sentence using each"];
  }
  const [only] = attachments;
  if (only.kind === "page") {
    return ["Check this for mistakes", "Explain this more simply", "Give me practice sentences"];
  }
  if (only.origin === "review") {
    const starters = ["Help me remember this", "Use it in a few everyday sentences"];
    if (only.review?.typed && only.review.typed.verdict === "wrong") starters.unshift("Why was my answer wrong?");
    return starters;
  }
  const starters = ["Give me more examples", "When would I use this?", "How is it different from "];
  if (only.hasExamples) starters.push("Are my examples natural?");
  return starters;
}
