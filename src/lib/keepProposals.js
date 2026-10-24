/**
 * Keep's proposals, made safe to review and to save.
 *
 * `normalizeKeepProposals` turns what Claude returned into review cards: blanks dropped,
 * examples the backup format could not hold removed, tags matched to the owner's own spellings,
 * the `ia` provenance tag added, duplicates flagged, and links reduced to ones that can actually
 * be stored. `buildKeepWrites` turns the owner's ticks into the items and links the batch writer
 * saves. Both are pure; nothing here reads or writes the database.
 */

import { newLexical } from "../db/items.js";
import { findPersonalHeadingDuplicates } from "./duplicateGuard.js";
import { USAGE_LABELS } from "./meanings.js";
import { normalize } from "./normalize.js";
import { RELATIONSHIP_TYPES, reorientRelationship } from "./relationships.js";
import { allTagsIn } from "./tags.js";

export const PROVENANCE_TAG = "ia";
export const MAX_KEEP_ENTRIES = 12;
const MAX_TAGS_PER_ENTRY = 3;
const MAX_EXAMPLES_PER_ENTRY = 3;

/**
 * Saved fields are AI-written text that later renders as Markdown (notes) or beside it. Image
 * syntax is turned into an ordinary link so that opening the saved entry can never load a remote
 * image — a URL could otherwise carry conversation text to a third party. Links stay tap-only.
 */
const inert = (value) => value.replaceAll("![", "[");
const text = (value) => (typeof value === "string" ? inert(value.trim()) : "");

/** The owner's existing spelling of the provenance tag ("IA", say), or the default. */
function provenanceTagFor(existingTags) {
  return existingTags.find((tag) => tag.toLowerCase() === PROVENANCE_TAG) || PROVENANCE_TAG;
}

function proposedTags(rawTags, existingByNormalized, provenanceTag, existingTags) {
  const names = [];
  for (const raw of Array.isArray(rawTags) ? rawTags : []) {
    const typed = text(raw);
    if (!typed || normalize(typed) === PROVENANCE_TAG) continue;
    const name = existingByNormalized.get(normalize(typed)) || typed;
    if (!names.includes(name)) names.push(name);
    if (names.length === MAX_TAGS_PER_ENTRY) break;
  }
  return [
    ...names.map((name) => ({ name, isNew: !existingTags.includes(name), provenance: false })),
    { name: provenanceTag, isNew: !existingTags.includes(provenanceTag), provenance: true },
  ];
}

function cleanExamples(rawExamples) {
  return (Array.isArray(rawExamples) ? rawExamples : [])
    .map((example) => ({ es: text(example?.es), en: text(example?.en) }))
    // The backup format requires Spanish on every example; an English-only one could not be exported.
    .filter((example) => example.es)
    .slice(0, MAX_EXAMPLES_PER_ENTRY);
}

/**
 * Returns { summary, entries, links, droppedCount }.
 *
 * entries: [{ ref, term, form, meaning: { gloss, usageCue, usageLabels, examples }, note, reason,
 *   tags: [{ name, isNew, provenance }], duplicateIds, batchDuplicateOf, defaultSelected }]
 * links: [{ id, from, to, type, reason }] where an end is { kind: "new", ref, term } or
 *   { kind: "existing", itemId, term }.
 */
export function normalizeKeepProposals(raw, { candidates = [], items = [] } = {}) {
  const existingTags = allTagsIn(items);
  const existingByNormalized = new Map();
  for (const tag of existingTags) {
    if (!existingByNormalized.has(normalize(tag))) existingByNormalized.set(normalize(tag), tag);
  }
  const provenanceTag = provenanceTagFor(existingTags);
  let droppedCount = 0;

  const entries = [];
  for (const rawEntry of Array.isArray(raw?.entries) ? raw.entries : []) {
    const ref = text(rawEntry?.ref);
    const term = text(rawEntry?.term);
    const gloss = text(rawEntry?.gloss);
    if (!ref || !term || !gloss || entries.some((entry) => entry.ref === ref) || entries.length === MAX_KEEP_ENTRIES) {
      droppedCount += 1;
      continue;
    }
    const duplicateIds = findPersonalHeadingDuplicates(items, "lexical", term).map((item) => item.id);
    // Same strong heading as an earlier proposal (accents kept, so sí and si stay distinct).
    const earlier = findPersonalHeadingDuplicates(
      entries.map((entry) => ({ type: "lexical", term: entry.term, ref: entry.ref })),
      "lexical",
      term
    )[0];
    const usageLabels = [...new Set((Array.isArray(rawEntry.usageLabels) ? rawEntry.usageLabels : [])
      .filter((label) => USAGE_LABELS.includes(label)))];
    entries.push({
      ref,
      term,
      form: rawEntry.form === "phrase" ? "phrase" : "word",
      meaning: { gloss, usageCue: text(rawEntry.usageCue), usageLabels, examples: cleanExamples(rawEntry.examples) },
      note: text(rawEntry.note),
      reason: text(rawEntry.reason),
      tags: proposedTags(rawEntry.tags, existingByNormalized, provenanceTag, existingTags),
      duplicateIds,
      batchDuplicateOf: earlier?.ref ?? null,
      defaultSelected: duplicateIds.length === 0 && !earlier,
    });
  }

  const entriesByRef = new Map(entries.map((entry) => [entry.ref, entry]));
  const candidatesByRef = new Map(candidates.map((candidate) => [candidate.ref, candidate]));
  const endFor = (ref) => {
    const key = text(ref);
    if (entriesByRef.has(key)) return { kind: "new", ref: key, term: entriesByRef.get(key).term };
    if (candidatesByRef.has(key)) {
      const candidate = candidatesByRef.get(key);
      return { kind: "existing", itemId: candidate.itemId, term: candidate.term };
    }
    return null;
  };
  const endKey = (end) => (end.kind === "new" ? `n:${end.ref}` : `e:${end.itemId}`);

  const links = [];
  const seenPairs = new Set();
  for (const rawLink of Array.isArray(raw?.links) ? raw.links : []) {
    const from = endFor(rawLink?.from);
    const to = endFor(rawLink?.to);
    const usable = from && to
      && RELATIONSHIP_TYPES.includes(rawLink.type)
      && endKey(from) !== endKey(to)
      && (from.kind === "new" || to.kind === "new");
    const pair = usable ? [endKey(from), endKey(to)].sort().join("|") : null;
    // One connection per pair: storage keeps only the first edge between two items, so a
    // repeated or contradictory suggestion would look approved but silently vanish.
    if (!usable || seenPairs.has(pair)) {
      droppedCount += 1;
      continue;
    }
    seenPairs.add(pair);
    links.push({ id: `l${links.length + 1}`, from, to, type: rawLink.type, reason: text(rawLink.reason) });
  }

  return { summary: text(raw?.summary), entries, links, droppedCount };
}

/** Every entry ticked unless flagged as a duplicate; every tag and connection ticked. */
export function defaultKeepSelection(proposals) {
  return {
    entries: Object.fromEntries(proposals.entries.map((entry) => [entry.ref, {
      selected: entry.defaultSelected,
      tags: entry.tags.map((tag) => tag.name),
    }])),
    links: Object.fromEntries(proposals.links.map((link) => [link.id, true])),
  };
}

/** A link can be saved only while each new entry it touches is ticked. */
export function linkIsAvailable(link, selection) {
  return [link.from, link.to].every((end) => end.kind !== "new" || selection.entries[end.ref]?.selected === true);
}

/**
 * The owner's ticks as writes: { items, links: [{ ownerId, targetId, relationship }],
 * droppedLinks: [{ id, reason }] }. A link is stored once, on a new item — never on an existing
 * entry the owner did not ask to change.
 */
export function buildKeepWrites(proposals, selection) {
  const idsByRef = new Map();
  const items = [];
  for (const entry of proposals.entries) {
    const choice = selection.entries[entry.ref];
    if (!choice?.selected) continue;
    const chosenTags = entry.tags.map((tag) => tag.name).filter((name) => choice.tags.includes(name));
    const item = newLexical({
      term: entry.term,
      form: entry.form,
      meanings: [entry.meaning],
      notes: entry.note,
      tags: chosenTags,
    });
    idsByRef.set(entry.ref, item.id);
    items.push(item);
  }

  const links = [];
  const droppedLinks = [];
  for (const link of proposals.links) {
    if (!selection.links[link.id]) continue;
    if (!linkIsAvailable(link, selection)) {
      droppedLinks.push({ id: link.id, reason: "endpoint_unselected" });
      continue;
    }
    const idOf = (end) => (end.kind === "new" ? idsByRef.get(end.ref) : end.itemId);
    if (link.from.kind === "new") {
      links.push({ ownerId: idOf(link.from), targetId: idOf(link.to), relationship: { type: link.type, subject: "owner" } });
    } else {
      // Existing → new: stored on the new item, so a directional label flips to keep its meaning.
      links.push({
        ownerId: idOf(link.to),
        targetId: idOf(link.from),
        relationship: reorientRelationship({ type: link.type, subject: "owner" }),
      });
    }
  }
  return { items, links, droppedLinks };
}
