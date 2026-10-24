/**
 * Pregunta's request: one question, plus the conversation so far, to Claude.
 *
 * The conversation lives only in the Pregunta screen's memory; this module neither reads nor
 * writes the database. Nothing from the notebook is attached — the standing disclosure under the
 * composer says exactly that, so nothing may join the question here.
 */

import {
  aiFailure,
  assertFinished,
  postMessages,
  priceUsage,
  textFromContent,
  usedFallback,
  withRefusalFallback,
} from "./aiRequest.js";

/** One place to change the model. Priced per million tokens; a question costs cents. */
export const ASK_MODEL = "claude-opus-5-5";
/** Opus 5.5 defaults to medium; stated explicitly so a default change can't move it silently. */
export const ASK_EFFORT = "medium";
/** Bounds thinking and answer together. A `truncated` answer means raise this, not retry. */
const ASK_MAX_TOKENS = 16000;
export const MAX_QUESTION_CHARS = 4000;
/** Questions per conversation. Long threads cost more each turn and drift; Keep, then start fresh. */
export const MAX_TURNS = 12;

export const ASK_SYSTEM_PROMPT = `You answer Spanish-language questions for an intermediate learner of Latin American Spanish. Prefer Mexican Spanish wherever regional variation matters.

Questions arrive in English or Spanish. Typical ones: how to say a word or phrase in Spanish; other ways to say a sentence; whether a Spanish equivalent of an English expression exists; what a phrase the learner heard means and when it is used.

How to answer:
- Explain in English. Write Spanish in **bold**.
- Lead with the direct answer, then give the most useful natural options (usually two to five). For each, add a short note on register (formal, informal, slang, vulgar) or region when it matters, and one short example sentence with its English translation.
- Mark anything Spain-only, vulgar, offensive or dated.
- When no true equivalent exists, say so plainly and offer the closest natural ways to express the idea instead of inventing an idiom.
- If the learner's own Spanish appears in the question, correct it briefly when it is wrong.
- Be concise: short paragraphs and "- " lists only. No tables, headings, images or links.`;

const isString = (v) => typeof v === "string";

/**
 * The request body for one turn. `history` is [{ question, content }], where `content` is the
 * assistant's content array exactly as the API returned it — thinking blocks included. Echoing it
 * unchanged keeps the history append-only, which current models require for their earlier
 * reasoning to stay valid.
 */
export function buildAskRequest({ history = [], question }) {
  const messages = [];
  for (const turn of history) {
    messages.push({ role: "user", content: turn.question });
    messages.push({ role: "assistant", content: structuredClone(turn.content) });
  }
  messages.push({ role: "user", content: question });
  return withRefusalFallback({
    model: ASK_MODEL,
    max_tokens: ASK_MAX_TOKENS,
    // No `thinking`, `temperature` or `top_p`: thinking is always on for this model and any of
    // the three in the request is rejected. Effort is the only depth control.
    output_config: { effort: ASK_EFFORT },
    system: ASK_SYSTEM_PROMPT,
    messages,
  });
}

/** Problems caught before anything is sent, so a refusal costs nothing. */
export function questionProblem(question, history = []) {
  if (!isString(question) || question.trim() === "") return "Type a question first.";
  if (question.length > MAX_QUESTION_CHARS) {
    return `Questions are limited to ${MAX_QUESTION_CHARS.toLocaleString("en-US")} characters.`;
  }
  if (history.length >= MAX_TURNS) return "This conversation is full. Keep what you need, then start a new question.";
  return null;
}

/**
 * Asks one question. Resolves with { text, content, model, usage, fallback, cost }, throws an
 * AiError carrying a readable `message`, or rethrows an AbortError when cancelled.
 */
export async function requestAskTurn({ history = [], question, apiKey, signal } = {}) {
  const problem = questionProblem(question, history);
  if (problem) throw aiFailure("input", problem);
  const { body, betas } = buildAskRequest({ history, question: question.trim() });
  const data = await postMessages(body, { apiKey, signal, betas });
  assertFinished(data, {
    refusal: "Claude declined to answer this.",
    truncated: "The answer was cut short before it finished. Try again.",
  });
  const text = textFromContent(data?.content).trim();
  if (!text) throw aiFailure("invalid", "The answer came back empty.");
  const model = isString(data?.model) ? data.model : ASK_MODEL;
  return {
    text,
    content: data.content,
    model,
    usage: data.usage ?? null,
    fallback: usedFallback(data),
    cost: priceUsage(model, data.usage),
  };
}
