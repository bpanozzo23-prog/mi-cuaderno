/**
 * Keep's proposals, made safe to review and to save.
 *
 * `normalizeKeepProposals` turns what Claude returned into review cards: blanks dropped,
 * examples the backup format could not hold removed, tags matched to the owner's own spellings,
 * the `ia` provenance tag added, duplicates flagged, and links reduced to ones that can actually
 * be stored. Additions to attached entries become one card per entry with a tick per addition;
 * they never carry the `ia` tag (the owner adopts what they tick). `buildKeepWrites` turns the
 * owner's ticks into the items, additions and links `applyKeep` saves. Both are pure; nothing
 * here reads or writes the database.
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
export const MAX_ADDED_EXAMPLES = 3;
export const MAX_ADDED_MEANINGS = 2;
export const MAX_ADDED_TAGS = 3;
export const MAX_NOTE_CHARS = 1000;

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

/** Tag names as the owner spells them, never `ia`, without `skip`, at most `limit`. */
function matchedTagNames(rawTags, existingByNormalized, { limit, skip = [] } = {}) {
  const skipped = new Set(skip.map(normalize));
  const names = [];
  for (const raw of Array.isArray(rawTags) ? rawTags : []) {
    const typed = text(raw);
    if (!typed || normalize(typed) === PROVENANCE_TAG || skipped.has(normalize(typed))) continue;
    const name = existingByNormalized.get(normalize(typed)) || typed;
    if (!names.includes(name)) names.push(name);
    if (names.length === limit) break;
  }
  return names;
}

function proposedTags(rawTags, existingByNormalized, provenanceTag, existingTags) {
  const names = matchedTagNames(rawTags, existingByNormalized, { limit: MAX_TAGS_PER_ENTRY });
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

/** Same sentence: whitespace and case aside, accents kept — "si" and "sí" stay different. */
const exactKey = (value) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
/** Close enough to show a warning: accents folded too (ñ kept), and closing punctuation. */
const looseKey = (value) => normalize(exactKey(value)).replace(/[\s.!?¡¿,;:"'«»…]+/g, " ").trim();

function usageLabelsFrom(raw) {
  return [...new Set((Array.isArray(raw) ? raw : []).filter((label) => USAGE_LABELS.includes(label)))];
}

/**
 * One attached entry's additions as tickable rows, checked against what it already holds.
 * Returns { additions, dropped }. Exact repeats are dropped; accent-only matches are kept but
 * flagged and left unticked.
 */
function additionsFor(rawUpdate, item, snapshot, ctx) {
  const additions = [];
  let dropped = 0;
  const add = (addition) => additions.push({ id: `${snapshot.ref}.a${additions.length + 1}`, ...addition });

  const examples = [...(item.meanings || []).flatMap((meaning) => meaning.examples || []), ...(item.myExamples || [])];
  const exact = new Set(examples.map((example) => exactKey(example.es)));
  const loose = new Set(examples.map((example) => looseKey(example.es)));
  const glossOf = new Map((item.meanings || []).map((meaning) => [meaning.id, meaning.gloss]));

  const rawExamples = Array.isArray(rawUpdate.examples) ? rawUpdate.examples : [];
  const rawMeanings = Array.isArray(rawUpdate.meanings) ? rawUpdate.meanings : [];
  const note = text(rawUpdate.note);
  // Claude did not see all of a shortened entry, so it may only tag and link it.
  if (snapshot.truncated) {
    dropped += rawExamples.length + rawMeanings.length + (note ? 1 : 0);
  } else {
    let count = 0;
    for (const raw of rawExamples) {
      const es = text(raw?.es);
      const meaningRef = raw?.meaning === null ? null : text(raw?.meaning);
      // A meaning ref that does not exist is dropped, never moved to My examples.
      // Own keys only: "constructor" must not resolve to something inherited.
      const meaningId = meaningRef === null
        ? null
        : Object.hasOwn(snapshot.meaningIds, meaningRef) ? snapshot.meaningIds[meaningRef] : undefined;
      if (!es || meaningId === undefined || count === MAX_ADDED_EXAMPLES || exact.has(exactKey(es))) {
        dropped += 1;
        continue;
      }
      const similar = loose.has(looseKey(es));
      exact.add(exactKey(es));
      loose.add(looseKey(es));
      count += 1;
      add({
        kind: "example",
        meaningId,
        meaningRef,
        meaningGloss: meaningId ? glossOf.get(meaningId) || "" : "",
        example: { es, en: text(raw?.en) },
        flag: similar ? "similar_example" : null,
      });
    }

    const glosses = new Set((item.meanings || []).map((meaning) => normalize(String(meaning.gloss || "").trim())));
    let meanings = 0;
    for (const raw of rawMeanings) {
      const gloss = text(raw?.gloss);
      if (!gloss || meanings === MAX_ADDED_MEANINGS) {
        dropped += 1;
        continue;
      }
      const similar = glosses.has(normalize(gloss));
      glosses.add(normalize(gloss));
      meanings += 1;
      add({
        kind: "meaning",
        meaning: {
          gloss,
          usageCue: text(raw.usageCue),
          usageLabels: usageLabelsFrom(raw.usageLabels),
          examples: cleanExamples(raw.examples),
        },
        flag: similar ? "similar_meaning" : null,
      });
    }

    if (note) {
      // "Keep again" must not append the same paragraph twice.
      const already = exactKey(item.notes).includes(exactKey(note));
      if (already || note.length > MAX_NOTE_CHARS) dropped += 1;
      else add({ kind: "note", note, flag: null });
    }
  }

  const tags = matchedTagNames(rawUpdate.tags, ctx.existingByNormalized, { limit: MAX_ADDED_TAGS, skip: item.tags || [] });
  for (const name of tags) add({ kind: "tag", tag: { name, isNew: !ctx.existingTags.includes(name) }, flag: null });
  return { additions, dropped };
}

/**
 * Returns { summary, entries, updates, links, attachedIds, droppedCount }.
 *
 * entries: [{ ref, term, form, meaning: { gloss, usageCue, usageLabels, examples }, note, reason,
 *   tags: [{ name, isNew, provenance }], duplicateIds, batchDuplicateOf, defaultSelected }]
 * updates: [{ ref, itemId, term, fingerprint, reason, additions: [{ id, kind, flag, … }] }] where
 *   kind is "example" ({ meaningId|null, meaningRef, meaningGloss, example }), "meaning"
 *   ({ meaning }), "note" ({ note }) or "tag" ({ tag: { name, isNew } }).
 * links: [{ id, from, to, type, reason }] where an end is { kind: "new", ref, term } or
 *   { kind: "existing", itemId, term }.
 *
 * `attached` are the `keepAttachedSnapshots` Keep sent; only they can receive additions, and an
 * existing-to-existing link needs one of them at an end.
 */
export function normalizeKeepProposals(raw, { candidates = [], items = [], attached = [] } = {}) {
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

  const attachedByRef = new Map(attached.map((snapshot) => [snapshot.ref, snapshot]));
  const attachedIds = new Set(attached.map((snapshot) => snapshot.itemId));
  const itemsById = new Map(items.map((item) => [item?.id, item]));
  const updates = [];
  for (const rawUpdate of Array.isArray(raw?.updates) ? raw.updates : []) {
    const snapshot = attachedByRef.get(text(rawUpdate?.target));
    const item = snapshot && itemsById.get(snapshot.itemId);
    if (!snapshot || item?.type !== "lexical" || updates.some((update) => update.ref === snapshot.ref)) {
      droppedCount += 1;
      continue;
    }
    const { additions, dropped } = additionsFor(rawUpdate, item, snapshot, { existingByNormalized, existingTags });
    droppedCount += dropped;
    if (additions.length === 0) continue;
    updates.push({
      ref: snapshot.ref,
      itemId: snapshot.itemId,
      term: snapshot.term,
      fingerprint: snapshot.fingerprint,
      reason: text(rawUpdate.reason),
      additions,
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
      && (from.kind === "new" || to.kind === "new" || attachedIds.has(from.itemId) || attachedIds.has(to.itemId));
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

  return { summary: text(raw?.summary), entries, updates, links, attachedIds: [...attachedIds], droppedCount };
}

/** Every entry and addition ticked unless flagged; every tag and connection ticked. */
export function defaultKeepSelection(proposals) {
  return {
    entries: Object.fromEntries(proposals.entries.map((entry) => [entry.ref, {
      selected: entry.defaultSelected,
      tags: entry.tags.map((tag) => tag.name),
    }])),
    additions: Object.fromEntries((proposals.updates || []).flatMap((update) =>
      update.additions.map((addition) => [addition.id, addition.flag === null])
    )),
    links: Object.fromEntries(proposals.links.map((link) => [link.id, true])),
  };
}

/**
 * The ticked additions grouped per entry, the shape `applyKeep` merges:
 * [{ itemId, fingerprint, examplesByMeaningId: { [meaningId]: [example] }, myExamples, meanings,
 * note, tags }]. Entries with nothing ticked are left out, so no empty edit is ever written.
 */
export function buildKeepUpdates(proposals, selection) {
  const updates = [];
  for (const update of proposals.updates || []) {
    const chosen = update.additions.filter((addition) => selection.additions?.[addition.id]);
    if (chosen.length === 0) continue;
    const write = { itemId: update.itemId, fingerprint: update.fingerprint, examplesByMeaningId: {}, myExamples: [], meanings: [], note: null, tags: [] };
    for (const addition of chosen) {
      if (addition.kind === "example" && addition.meaningId) {
        (write.examplesByMeaningId[addition.meaningId] ||= []).push({ ...addition.example });
      } else if (addition.kind === "example") {
        write.myExamples.push({ ...addition.example });
      } else if (addition.kind === "meaning") {
        write.meanings.push({ ...addition.meaning, examples: addition.meaning.examples.map((example) => ({ ...example })) });
      } else if (addition.kind === "note") {
        write.note = addition.note;
      } else if (addition.kind === "tag") {
        write.tags.push(addition.tag.name);
      }
    }
    updates.push(write);
  }
  return updates;
}

/** A link can be saved only while each new entry it touches is ticked. */
export function linkIsAvailable(link, selection) {
  return [link.from, link.to].every((end) => end.kind !== "new" || selection.entries[end.ref]?.selected === true);
}

/**
 * The owner's ticks as writes: { items, updates, attachedIds, links: [{ ownerId, targetId,
 * relationship }], droppedLinks: [{ id, reason }] }. A link is stored once: on its new item when
 * it has one, otherwise (two existing entries, one of them attached) on its `from` end.
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
    if (link.from.kind === "new" || link.to.kind === "existing") {
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
  return { items, updates: buildKeepUpdates(proposals, selection), attachedIds: proposals.attachedIds || [], links, droppedLinks };
}
