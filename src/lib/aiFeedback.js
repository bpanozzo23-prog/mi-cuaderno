/**
 * The one request this app makes to an AI provider (brief §9).
 *
 * A raw `fetch` rather than Anthropic's SDK: there is exactly one call site, it is neither
 * streaming nor tool-using, and none of what the SDK adds would be exercised — so its weight would
 * be paid by every install of a PWA that ships with four runtime dependencies. Direct browser
 * calls need the `anthropic-dangerous-direct-browser-access` header, which is what the SDK's
 * `dangerouslyAllowBrowser` flag sets underneath. `db/ref/install.js` already establishes the
 * hand-rolled-fetch-with-status-messages shape used here.
 *
 * Nothing in this module reads or writes the database. The caller passes the key in and takes the
 * result away; the feedback is never stored (§7 has exactly two content types, and this is not a
 * third).
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/** One place to change the model. Priced per million tokens; a review costs cents at this size. */
export const FEEDBACK_MODEL = "claude-opus-5";

/**
 * `max_tokens` bounds thinking and answer together on this model, so it is generously above what
 * the schema below can produce. A `truncated` result means this needs raising, not retrying.
 */
const MAX_TOKENS = 4096;

export const SYSTEM_PROMPT = `You are an experienced, encouraging Spanish tutor reviewing one private journal entry by an adult learner. Entries deliberately mix Spanish and English: English words stand in for vocabulary the learner does not have yet. Never treat code-switching itself as an error — evaluate only the Spanish.

Write all feedback in English. When quoting the entry, quote the Spanish exactly as written, character for character.

Produce exactly three things:
1. Comprehensibility: a verdict — "clear" (a native reader follows everything), "mostly_clear" (followable with effort, or with isolated breakdowns), or "hard_to_follow" — plus notes saying where comprehension breaks down, or confirming it does not.
2. Naturalness: where the Spanish is grammatically correct but a native speaker would phrase it differently, explain what a native would say instead and why. If the Spanish already sounds natural, say so.
3. Examples: the three to six most instructive concrete issues. Each quotes a short exact span from the entry, names the issue in one sentence, and gives a natural rewrite. Prefer patterns the learner can reuse over one-off slips. If the entry is too short or too clean to yield examples, return an empty list rather than inventing problems.

Be specific and warm; this is a private diary, not an exam.`;

export const VERDICTS = ["clear", "mostly_clear", "hard_to_follow"];

/** Numeric and length constraints are not supported in this schema dialect; count lives in the prompt. */
export const FEEDBACK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["comprehensibility", "naturalness", "examples"],
  properties: {
    comprehensibility: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "notes"],
      properties: {
        verdict: { type: "string", enum: VERDICTS },
        notes: { type: "string" },
      },
    },
    naturalness: { type: "string" },
    examples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "issue", "suggestion"],
        properties: {
          quote: { type: "string" },
          issue: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
  },
};

/** Carries a `kind` so callers can react without matching on message text. */
class FeedbackError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "FeedbackError";
    this.kind = kind;
  }
}

const failure = (kind, message) => new FeedbackError(kind, message);

/**
 * Everything the owner might see when a request does not come back with a review. Written as
 * sentences rather than status codes because this surfaces inside a journal entry, not a console.
 */
function httpFailure(status) {
  if (status === 401 || status === 403) {
    return failure("auth", "Anthropic rejected the API key. Check it in Ajustes.");
  }
  if (status === 429) {
    return failure("rate", "Too many requests just now. Wait a moment and try again.");
  }
  if (status === 400 || status === 413) {
    return failure("request", "Anthropic refused the request — this entry may be too long to review.");
  }
  if (status >= 500) {
    return failure("overloaded", "Anthropic is busy or unavailable right now. Try again shortly.");
  }
  return failure("request", `The request failed (HTTP ${status}).`);
}

const NETWORK_MESSAGE = "Could not reach Anthropic. Check your connection and try again.";

async function postMessages(body, { apiKey, signal }) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        // Required for a browser origin; without it the request never leaves the page.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // A cancel is the owner's own doing and is not an error — let the caller recognise it.
    if (err?.name === "AbortError") throw err;
    throw failure("network", NETWORK_MESSAGE);
  }
  if (!res.ok) throw httpFailure(res.status);
  return res.json();
}

const isString = (v) => typeof v === "string";

/** Guards against a well-formed envelope carrying a shape the panel cannot render. */
function parseFeedback(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw failure("invalid", "The review came back in a form this app could not read.");
  }
  const ok =
    parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
    parsed.comprehensibility && typeof parsed.comprehensibility === "object" &&
    VERDICTS.includes(parsed.comprehensibility.verdict) &&
    isString(parsed.comprehensibility.notes) &&
    isString(parsed.naturalness) &&
    Array.isArray(parsed.examples) &&
    parsed.examples.every((e) =>
      e && typeof e === "object" && isString(e.quote) && isString(e.issue) && isString(e.suggestion)
    );
  if (!ok) throw failure("invalid", "The review came back in a form this app could not read.");
  return {
    comprehensibility: {
      verdict: parsed.comprehensibility.verdict,
      notes: parsed.comprehensibility.notes,
    },
    naturalness: parsed.naturalness,
    examples: parsed.examples.map(({ quote, issue, suggestion }) => ({ quote, issue, suggestion })),
  };
}

/**
 * Asks for one review of one entry. Only `title` and `body` are sent — the disclosure the owner
 * confirms beforehand names exactly these, so nothing else may join them here.
 *
 * Resolves with { comprehensibility: { verdict, notes }, naturalness, examples: [...] }, throws a
 * FeedbackError carrying a readable `message`, or rethrows an AbortError when cancelled.
 */
export async function requestDiarioFeedback({ title, body, apiKey, signal } = {}) {
  const entryText = isString(body) ? body : "";
  const data = await postMessages(
    {
      model: FEEDBACK_MODEL,
      max_tokens: MAX_TOKENS,
      // No `thinking`: it is on by default on this model and any explicit configuration is
      // rejected. No temperature or top_p either — both were removed from this model family.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: FEEDBACK_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          // Tagged so the entry cannot be read as further instructions.
          content: `Review this journal entry.\n\n<title>${isString(title) && title.trim() ? title : "(untitled)"}</title>\n<entry>\n${entryText}\n</entry>`,
        },
      ],
    },
    { apiKey, signal }
  );

  // Checked before `content` is read: on a refusal the content array can be empty.
  if (data?.stop_reason === "refusal") {
    throw failure("refusal", "Claude declined to review this entry.");
  }
  if (data?.stop_reason === "max_tokens") {
    throw failure("truncated", "The review was cut short before it finished. Try again.");
  }
  const text = (data?.content || []).find((block) => block?.type === "text")?.text;
  if (!isString(text)) throw failure("invalid", "The review came back empty.");
  return parseFeedback(text);
}

/**
 * Cheapest possible round trip, so a mistyped or revoked key is caught in Ajustes rather than
 * mid-entry. Anything that is not an auth rejection counts as a working key: a rate limit or an
 * outage says nothing about the key itself.
 */
export async function testApiKey({ apiKey, signal } = {}) {
  try {
    await postMessages(
      { model: FEEDBACK_MODEL, max_tokens: 1, messages: [{ role: "user", content: "Hi" }] },
      { apiKey, signal }
    );
  } catch (err) {
    if (err?.kind === "auth" || err?.kind === "network") throw err;
    if (err?.name === "AbortError") throw err;
  }
  return true;
}
