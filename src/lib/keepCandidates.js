import { normalize } from "./normalize.js";
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

/**
 * Returns up to `limit` lexical items related to `text`, best first:
 * [{ ref: "c1", itemId, term, form, gloss, matchedBy: "term" | "gloss", score }].
 */
export function findKeepCandidates(items = [], text = "", { limit = DEFAULT_CANDIDATE_LIMIT } = {}) {
  const tokens = tokensOf(text);
  if (tokens.length === 0) return [];
  const prepared = { tokens, counts: runCounts(tokens), tokenSet: new Set(tokens) };
  const matches = [];
  for (const item of items) {
    if (item?.type !== "lexical" || typeof item.term !== "string") continue;
    const byTerm = termMatch(item, prepared);
    const byGloss = byTerm ? null : glossMatch(item, prepared);
    const match = byTerm || byGloss;
    if (!match) continue;
    matches.push({
      itemId: item.id,
      term: item.term.trim(),
      form: item.form === "phrase" ? "phrase" : "word",
      gloss: String(item.meanings?.[0]?.gloss || "").trim(),
      updatedAt: item.updatedAt,
      ...match,
    });
  }
  return matches
    .sort(byRank)
    .slice(0, Math.max(0, limit))
    .map(({ updatedAt: _updatedAt, count: _count, ...candidate }, index) => ({
      ref: `c${index + 1}`,
      ...candidate,
    }));
}

const oneLine = (value) => String(value || "").replace(/[\s|]+/g, " ").trim();

/** What leaves the device for each candidate: "c1 | echar de menos | phrase | to miss (someone)". */
export function candidateLinesForRequest(candidates = []) {
  return candidates.map((candidate) => {
    const gloss = oneLine(candidate.gloss);
    const shortGloss = gloss.length > GLOSS_LINE_CHARS ? `${gloss.slice(0, GLOSS_LINE_CHARS - 1)}…` : gloss;
    return `${candidate.ref} | ${oneLine(candidate.term)} | ${candidate.form} | ${shortGloss || "(no meaning)"}`;
  }).join("\n");
}
