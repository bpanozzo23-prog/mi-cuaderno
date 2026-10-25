import { normalize } from "./normalize.js";
import { scrubText } from "./askContext.js";
import { CONTAINMENT_STOP_WORDS } from "./phraseContainment.js";
import { GLOSS_STOP_WORDS, glossContentTokens } from "./meaningSuggestions.js";

/**
 * Which of the owner's words and phrases a Keep request may mention to Claude, so proposals can
 * link to them instead of re-creating them. Found here, on the device, from the conversation
 * text alone: only the entries this returns leave the device, and only as term, form and first
 * gloss under an opaque `c#` reference — never their `user:` IDs, notes, tags or examples.
 *
 * Matching goes through `normalize` (accent-insensitive, ñ preserved: año never matches ano) on
 * whole-token runs, so "mar" does not match "marzo".
 */

const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
const MAX_NGRAM = 6;
export const DEFAULT_CANDIDATE_LIMIT = 40;
/** Group members Keep sends, besides the 40 related entries. */
export const MAX_KEEP_GROUP_MEMBERS = 60;
const GLOSS_LINE_CHARS = 80;

function tokensOf(text) {
  return [...normalize(text).matchAll(WORD)].map((match) => match[0].replaceAll("’", "'"));
}

/** Every run of 1..MAX_NGRAM tokens in the text, with how often it occurs. */
function runCounts(tokens) {
  const counts = new Map();
  for (let start = 0; start < tokens.length; start += 1) {
    let run = "";
    for (let length = 1; length <= MAX_NGRAM && start + length <= tokens.length; length += 1) {
      run = length === 1 ? tokens[start] : `${run} ${tokens[start + length - 1]}`;
      counts.set(run, (counts.get(run) || 0) + 1);
    }
  }
  return counts;
}

/** Occurrences of a token run; long runs fall back to a scan. */
function occurrences(runTokens, text) {
  if (runTokens.length <= MAX_NGRAM) return text.counts.get(runTokens.join(" ")) || 0;
  let found = 0;
  for (let start = 0; start + runTokens.length <= text.tokens.length; start += 1) {
    if (runTokens.every((token, offset) => text.tokens[start + offset] === token)) found += 1;
  }
  return found;
}

/** Single words this short or this common say nothing about what the conversation is about. */
function isNoiseWord(token) {
  return token.length <= 2 || CONTAINMENT_STOP_WORDS.has(token) || GLOSS_STOP_WORDS.has(token);
}

const ARTICLES = new Set(["a", "an", "the"]);

/** A gloss reduced to the words that name its meaning: "to miss (someone)" → ["miss"]. */
function glossRun(gloss) {
  const tokens = tokensOf(String(gloss || "").replace(/\([^)]*\)/g, " "));
  if (tokens[0] === "to" && tokens.length > 1) tokens.shift();
  if (ARTICLES.has(tokens[0]) && tokens.length > 1) tokens.shift();
  return tokens;
}

function termMatch(item, text) {
  const termTokens = tokensOf(item.term);
  if (termTokens.length === 0) return null;
  if (termTokens.length === 1 && isNoiseWord(termTokens[0])) return null;
  const count = occurrences(termTokens, text);
  if (count === 0) return null;
  const score = termTokens.length > 1 ? 100 + termTokens.length : 60 + termTokens[0].length;
  return { matchedBy: "term", score, count };
}

function glossMatch(item, text) {
  let best = null;
  for (const meaning of item.meanings || []) {
    const run = glossRun(meaning?.gloss);
    const runIsMeaningful = run.length > 1 || (run.length === 1 && !isNoiseWord(run[0]));
    if (runIsMeaningful && run.join(" ").length >= 4) {
      const count = occurrences(run, text);
      if (count > 0) {
        const candidate = { matchedBy: "gloss", score: 40 + run.length, count };
        if (!best || candidate.score > best.score) best = candidate;
        continue;
      }
    }
    // Every content word of a longer gloss present somewhere — never just one shared word.
    const content = glossContentTokens(meaning?.gloss);
    if (content.length >= 2 && content.every((token) => text.tokenSet.has(token))) {
      const candidate = { matchedBy: "gloss", score: 20, count: 1 };
      if (!best || candidate.score > best.score) best = candidate;
    }
  }
  return best;
}

function byRank(a, b) {
  return b.score - a.score
    || b.count - a.count
    || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    || String(a.itemId).localeCompare(String(b.itemId));
}

/** The candidate shape for one lexical item, before it is ranked and given a `c#` ref. */
export function candidateFromItem(item, match = { matchedBy: "attached", score: 0 }) {
  return {
    itemId: item.id,
    term: item.term.trim(),
    form: item.form === "phrase" ? "phrase" : "word",
    gloss: String(item.meanings?.[0]?.gloss || "").trim(),
    ...match,
  };
}

/**
 * Which members of attached groups Keep sends: { members: [{ itemId, detail }], omitted }, in
 * first-sent order. Entries attached on their own go in full instead; deleted ones are skipped.
 */
export function selectGroupMembers(items = [], groupMembers = [], singleIds = [], limit = MAX_KEEP_GROUP_MEMBERS) {
  const byId = new Map(items.map((item) => [item?.id, item]));
  const singles = new Set(singleIds);
  const eligible = groupMembers.filter((member) =>
    !singles.has(member.itemId) && byId.get(member.itemId)?.type === "lexical" && typeof byId.get(member.itemId).term === "string");
  return { members: eligible.slice(0, limit), omitted: Math.max(0, eligible.length - limit) };
}

/**
 * Returns up to `limit` lexical items related to `text`, best first:
 * [{ ref: "c1", itemId, term, form, gloss, matchedBy: "attached" | "term" | "gloss", score }].
 *
 * Entries the owner attached to the conversation (`attachedIds`) come first, in that order,
 * whatever their spelling — an attached "ir" counts although a matched one would not. Attached
 * IDs that are missing or not words/phrases are skipped. Group members (`groupIds`, already
 * chosen by `selectGroupMembers`) follow them with `matchedBy: "group"`, outside `limit`, which
 * still covers attached entries and matches together. `excludeIds` are never matched: group
 * members Keep left out stay out rather than returning as related entries.
 */
export function findKeepCandidates(items = [], text = "", { limit = DEFAULT_CANDIDATE_LIMIT, attachedIds = [], groupIds = [], excludeIds = [] } = {}) {
  const max = Math.max(0, limit);
  const byId = new Map(items.map((item) => [item?.id, item]));
  const attached = [];
  const attachedSet = new Set();
  for (const id of attachedIds) {
    const item = byId.get(id);
    if (attachedSet.has(id) || item?.type !== "lexical" || typeof item.term !== "string") continue;
    attachedSet.add(id);
    attached.push(candidateFromItem(item));
  }

  const grouped = [];
  for (const id of groupIds) {
    const item = byId.get(id);
    if (attachedSet.has(id) || item?.type !== "lexical" || typeof item.term !== "string") continue;
    attachedSet.add(id);
    grouped.push(candidateFromItem(item, { matchedBy: "group", score: 0 }));
  }

  const excluded = new Set(excludeIds);
  const tokens = tokensOf(text);
  const matches = [];
  if (tokens.length > 0) {
    const prepared = { tokens, counts: runCounts(tokens), tokenSet: new Set(tokens) };
    for (const item of items) {
      if (item?.type !== "lexical" || typeof item.term !== "string" || attachedSet.has(item.id) || excluded.has(item.id)) continue;
      const byTerm = termMatch(item, prepared);
      const byGloss = byTerm ? null : glossMatch(item, prepared);
      const match = byTerm || byGloss;
      if (!match) continue;
      matches.push({ ...candidateFromItem(item, match), updatedAt: item.updatedAt });
    }
  }
  const ranked = matches
    .sort(byRank)
    .map(({ updatedAt: _updatedAt, count: _count, ...candidate }) => candidate);
  const kept = [...attached, ...ranked].slice(0, max);
  return [...kept.slice(0, attached.length), ...grouped, ...kept.slice(attached.length)]
    .map((candidate, index) => ({ ref: `c${index + 1}`, ...candidate }));
}

/** One line, with links and internal keys removed — the same scrub attachments get. */
const oneLine = (value) => scrubText(String(value || "").replace(/[\s|]+/g, " ")).trim();

/** What leaves the device for each candidate: "c1 | echar de menos | phrase | to miss (someone)". */
export function candidateLinesForRequest(candidates = []) {
  return candidates.map((candidate) => {
    const gloss = oneLine(candidate.gloss);
    const shortGloss = gloss.length > GLOSS_LINE_CHARS ? `${gloss.slice(0, GLOSS_LINE_CHARS - 1)}…` : gloss;
    return `${candidate.ref} | ${oneLine(candidate.term)} | ${candidate.form} | ${shortGloss || "(no meaning)"}`;
  }).join("\n");
}
