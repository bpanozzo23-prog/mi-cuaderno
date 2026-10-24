/**
 * The shared plumbing for every request this app makes to Anthropic (brief §9): the Diario
 * review, Pregunta's questions and Keep's proposals.
 *
 * A raw `fetch` rather than Anthropic's SDK (DECISIONS 2026-08-06): every call is a single,
 * non-streaming, tool-free request, so nothing the SDK adds would be exercised — and its weight
 * would be paid by every install of the PWA. Direct browser calls need the
 * `anthropic-dangerous-direct-browser-access` header, which is what the SDK's
 * `dangerouslyAllowBrowser` flag sets underneath.
 *
 * Nothing in this module reads or writes the database. Callers pass the key in and take the
 * result away.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/**
 * Server-side refusal fallback: when a safety classifier declines a request, the API re-runs it
 * on a fallback model inside the same call. One switch, so it can be turned off in one place if
 * the beta is ever withdrawn or rejected from a browser origin.
 */
export const USE_REFUSAL_FALLBACK = true;
export const REFUSAL_FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Carries a `kind` so callers can react without matching on message text. */
export class AiError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
  }
}

export const aiFailure = (kind, message) => new AiError(kind, message);

const NETWORK_MESSAGE = "Could not reach Anthropic. Check your connection and try again.";

/**
 * Anthropic's spend-limit rejections arrive either as a 400 naming the usage limits or as a 429
 * carrying `enforced_spend_limit_reached`. Told apart from an ordinary rate limit because waiting
 * a moment will not help — the owner has to raise the cap or wait for the next month.
 */
function isSpendLimit(status, errorBody) {
  const error = errorBody?.error;
  if (status === 400 && typeof error?.message === "string") {
    return error.message.includes("specified API usage limits");
  }
  if (status === 429) return error?.details?.error_code === "enforced_spend_limit_reached";
  return false;
}

/**
 * Everything the owner might see when a request does not come back with an answer. Written as
 * sentences rather than status codes because these surface in the app, not a console.
 */
export function httpFailure(status, errorBody = null) {
  if (status === 401 || status === 403) {
    return aiFailure("auth", "Anthropic rejected the API key. Check it in Ajustes.");
  }
  if (isSpendLimit(status, errorBody)) {
    return aiFailure(
      "spend_limit",
      "Your Anthropic spend limit has been reached. Raise it in the console, or wait for next month."
    );
  }
  if (status === 429) {
    return aiFailure("rate", "Too many requests just now. Wait a moment and try again.");
  }
  if (status === 400 || status === 413) {
    return aiFailure("request", "Anthropic refused the request — the text may be too long.");
  }
  if (status >= 500) {
    return aiFailure("overloaded", "Anthropic is busy or unavailable right now. Try again shortly.");
  }
  return aiFailure("request", `The request failed (HTTP ${status}).`);
}

async function readErrorBody(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Posts one Messages request. Resolves with the parsed response, throws an AiError, or rethrows
 * an AbortError untouched so callers can tell a cancel apart from a failure.
 */
export async function postMessages(body, { apiKey, signal, betas = [] } = {}) {
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": API_VERSION,
    // Required for a browser origin; without it the request never leaves the page.
    "anthropic-dangerous-direct-browser-access": "true",
  };
  if (betas.length > 0) headers["anthropic-beta"] = betas.join(",");
  let res;
  try {
    res = await fetch(API_URL, { method: "POST", signal, headers, body: JSON.stringify(body) });
  } catch (err) {
    // A cancel is the owner's own doing and is not an error — let the caller recognise it.
    if (err?.name === "AbortError") throw err;
    throw aiFailure("network", NETWORK_MESSAGE);
  }
  if (!res.ok) throw httpFailure(res.status, await readErrorBody(res));
  return res.json();
}

/** Adds the refusal fallback to a request body; returns the body and the betas it needs. */
export function withRefusalFallback(body) {
  if (!USE_REFUSAL_FALLBACK) return { body, betas: [] };
  return { body: { ...body, fallbacks: "default" }, betas: [REFUSAL_FALLBACK_BETA] };
}

/**
 * Checked before `content` is read: on a refusal the content array can be empty, and a response
 * cut off by `max_tokens` is incomplete however well-formed it looks.
 */
export function assertFinished(data, { refusal, truncated }) {
  if (data?.stop_reason === "refusal") throw aiFailure("refusal", refusal);
  if (data?.stop_reason === "max_tokens") throw aiFailure("truncated", truncated);
}

/**
 * The visible answer: text blocks only. Thinking blocks (opaque on current models) and fallback
 * markers are part of the response but never shown.
 */
export function textFromContent(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
}

/** True when the refusal fallback answered instead of the requested model. */
export function usedFallback(data) {
  if (Array.isArray(data?.content) && data.content.some((block) => block?.type === "fallback")) {
    return true;
  }
  const iterations = data?.usage?.iterations;
  return Array.isArray(iterations) && iterations.some((entry) => entry?.type === "fallback_message");
}

/**
 * US dollars per million tokens, checked 2026-10-24. Each row: input, 5-minute cache write,
 * cache read, output. Used only for a transient cost line; nothing is stored or totalled.
 */
export const PRICES = Object.freeze({
  "claude-opus-5-5": [4, 5, 0.2, 20],
  "claude-opus-5": [5, 6.25, 0.5, 25],
  "claude-sonnet-5-5": [2, 2.5, 0.2, 10],
});

const USAGE_FIELDS = ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"];

/** Dollars for one response, or null when the model or usage is unknown. */
export function priceUsage(model, usage) {
  if (!Object.hasOwn(PRICES, model) || !usage || typeof usage !== "object") return null;
  const counts = USAGE_FIELDS.map((field) => usage[field] ?? 0);
  if (!counts.every((count) => Number.isFinite(count) && count >= 0)) return null;
  return counts.reduce((total, count, index) => total + count * PRICES[model][index], 0) / 1_000_000;
}

/**
 * Dollars for a whole response, or null when it cannot be known: when the fallback answered, the
 * declined attempt is billed too but reported separately, so a partial figure would understate it.
 */
export function responseCost(model, data) {
  if (usedFallback(data)) return null;
  return priceUsage(model, data?.usage);
}

/** "≈ 2¢", "< 1¢" or "≈ $0.12" — deliberately approximate. */
export function formatCost(dollars) {
  if (!Number.isFinite(dollars) || dollars < 0) return "";
  const cents = dollars * 100;
  if (cents < 1) return "< 1¢";
  if (cents < 100) return `≈ ${Math.round(cents)}¢`;
  return `≈ $${dollars.toFixed(2)}`;
}

/** Every tag an AI request uses to mark data, so no piece of data can close another's block. */
export const DATA_TAG_NAMES = Object.freeze(["conversation", "turn", "owner_tags", "existing_entries", "attached_entry"]);

/**
 * Keeps text from closing the tags that mark it as data: `</turn` becomes `<\/turn`. Only the
 * named tags are touched, so a request can neutralise its own tags while leaving a nested block
 * that was already made safe readable.
 */
export function neutralizeTags(text, names = DATA_TAG_NAMES) {
  if (names.length === 0) return String(text ?? "");
  const pattern = new RegExp(`<\\/(${names.join("|")})`, "gi");
  return String(text ?? "").replace(pattern, "<\\/$1");
}
