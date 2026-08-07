import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  requestDiarioFeedback,
  testApiKey,
  FEEDBACK_MODEL,
  SYSTEM_PROMPT,
} from "./aiFeedback.js";

const KEY = "sk-ant-test-key";

const review = {
  verdict: "mostly_clear",
  summary: "Readable throughout, with one preposition slip worth fixing.",
  items: [
    { category: "error", quote: "agradecido para", corrected: "agradecido por", explanation: "Spanish uses por for the thing you are grateful for." },
    { category: "praise", quote: "se me olvidó el pan", corrected: null, explanation: "The se-construction is exactly right here." },
  ],
};

/** A successful Messages response carrying `json` as its single text block. */
const envelope = (json = review, overrides = {}) => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: JSON.stringify(json) }],
  ...overrides,
});

const respondWith = (payload, { ok = true, status = 200 } = {}) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => payload });

const call = (extra = {}) =>
  requestDiarioFeedback({ title: "Martes", body: "Hoy estoy agradecido para mi familia.", apiKey: KEY, ...extra });

const requestBody = () => JSON.parse(globalThis.fetch.mock.calls[0][1].body);
const requestInit = () => globalThis.fetch.mock.calls[0][1];

beforeEach(() => {
  vi.stubGlobal("fetch", respondWith(envelope()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the request", () => {
  it("posts once to Anthropic with the headers a browser origin needs", async () => {
    await call();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers["x-api-key"]).toBe(KEY);
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    // Without this header the browser never gets a response at all.
    expect(init.headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  it("asks the named model for structured output and configures no thinking or sampling", async () => {
    await call();
    const body = requestBody();

    expect(body.model).toBe(FEEDBACK_MODEL);
    expect(body.output_config.format).toEqual({ type: "json_schema", schema: expect.any(Object) });
    expect(body.output_config.format.schema.required).toEqual(["verdict", "summary", "items"]);
    expect(body.output_config.effort).toBe("low");
    expect(body.system).toBe(SYSTEM_PROMPT);
    // All three are rejected outright by this model family; sending one would 400 every review.
    expect(body).not.toHaveProperty("thinking");
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
  });

  it("sends the entry's title and body, and nothing else about the notebook", async () => {
    await call();
    const body = requestBody();

    expect(body.messages).toHaveLength(1);
    const sent = body.messages[0].content;
    expect(sent).toContain("Martes");
    expect(sent).toContain("Hoy estoy agradecido para mi familia.");
    // The key travels in the header; it must never be part of what is sent as content.
    expect(requestInit().body).not.toContain(KEY);
  });

  it("names an untitled entry rather than sending an empty title", async () => {
    await call({ title: "   " });
    expect(requestBody().messages[0].content).toContain("(untitled)");
  });

  it("keeps the prompt's load-bearing rules through future rewording", () => {
    // The one omission that would visibly misbehave on day one: entries mix English by design,
    // and a prompt without this rule flags every English word as an error.
    expect(SYSTEM_PROMPT).toContain("Never treat code-switching itself as an error");
    // The tags the prompt promises are the tags the request actually sends.
    expect(SYSTEM_PROMPT).toContain("<entry>");
    // A diary prompt without this line gets sympathy before grammar.
    expect(SYSTEM_PROMPT).toContain("never on the events or feelings described");
  });
});

describe("the reply", () => {
  it("returns the parsed review", async () => {
    await expect(call()).resolves.toEqual(review);
  });

  it("reports a refusal without reading the content array", async () => {
    // A refusal can arrive with content absent entirely; reading content[0] here would throw
    // the wrong error, or crash, instead of saying Claude declined.
    vi.stubGlobal("fetch", respondWith({ stop_reason: "refusal" }));

    await expect(call()).rejects.toMatchObject({
      kind: "refusal",
      message: expect.stringContaining("declined"),
    });
  });

  it("reports a review cut short by the token ceiling", async () => {
    vi.stubGlobal("fetch", respondWith(envelope(review, { stop_reason: "max_tokens" })));
    await expect(call()).rejects.toMatchObject({ kind: "truncated" });
  });

  it("refuses a verdict outside the three the panel can render", async () => {
    vi.stubGlobal("fetch", respondWith(envelope({ ...review, verdict: "perfecto" })));
    await expect(call()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("refuses an item category the panel has no label for", async () => {
    vi.stubGlobal("fetch", respondWith(envelope({
      ...review,
      items: [{ category: "style", quote: "x", corrected: "y", explanation: "z" }],
    })));
    await expect(call()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("accepts a praise item with nothing to correct, and refuses corrected missing entirely", async () => {
    const praised = await call();
    expect(praised.items[1]).toEqual({
      category: "praise",
      quote: "se me olvidó el pan",
      corrected: null,
      explanation: "The se-construction is exactly right here.",
    });

    // null means "nothing to correct"; an undefined field is a shape error, not a praise item.
    vi.stubGlobal("fetch", respondWith(envelope({
      ...review,
      items: [{ category: "praise", quote: "x", explanation: "z" }],
    })));
    await expect(call()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("refuses a reply that is not JSON at all", async () => {
    vi.stubGlobal("fetch", respondWith({ stop_reason: "end_turn", content: [{ type: "text", text: "Looks good!" }] }));
    await expect(call()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("accepts an empty items list", async () => {
    vi.stubGlobal("fetch", respondWith(envelope({ ...review, items: [] })));
    await expect(call()).resolves.toMatchObject({ items: [] });
  });
});

describe("failures the owner has to act on", () => {
  it.each([
    [401, "auth", /API key/],
    [429, "rate", /Wait a moment/],
    [413, "request", /too long/],
    [529, "overloaded", /busy or unavailable/],
  ])("turns HTTP %i into a %s the owner can read", async (status, kind, message) => {
    vi.stubGlobal("fetch", respondWith({}, { ok: false, status }));
    await expect(call()).rejects.toMatchObject({ kind, message: expect.stringMatching(message) });
  });

  it("turns an unreachable network into plain words", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(call()).rejects.toMatchObject({ kind: "network", message: /Check your connection/ });
  });

  it("rethrows a cancel untouched, so callers can tell it apart from a failure", async () => {
    const aborted = new Error("The operation was aborted.");
    aborted.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));

    await expect(call()).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("testing a key", () => {
  it("passes on any reply that is not an auth rejection", async () => {
    vi.stubGlobal("fetch", respondWith({}, { ok: false, status: 429 }));
    // A rate limit says the key reached Anthropic and was accepted — nothing about the key is wrong.
    await expect(testApiKey({ apiKey: KEY })).resolves.toBe(true);
  });

  it("fails on a rejected key", async () => {
    vi.stubGlobal("fetch", respondWith({}, { ok: false, status: 401 }));
    await expect(testApiKey({ apiKey: KEY })).rejects.toMatchObject({ kind: "auth" });
  });

  it("fails when Anthropic cannot be reached, rather than calling the key good", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(testApiKey({ apiKey: KEY })).rejects.toMatchObject({ kind: "network" });
  });

  it("costs a single token", async () => {
    await testApiKey({ apiKey: KEY });
    expect(requestBody().max_tokens).toBe(1);
  });
});
