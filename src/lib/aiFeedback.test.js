import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  requestDiarioFeedback,
  testApiKey,
  FEEDBACK_MODEL,
  SYSTEM_PROMPT,
} from "./aiFeedback.js";

const KEY = "sk-ant-test-key";

const review = {
  comprehensibility: { verdict: "mostly_clear", notes: "The second paragraph is hard to follow." },
  naturalness: "«Estoy agradecido para» would be «agradecido por» to a native ear.",
  examples: [{ quote: "agradecido para", issue: "Wrong preposition.", suggestion: "agradecido por" }],
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
    expect(body.output_config.format.schema.required).toEqual([
      "comprehensibility",
      "naturalness",
      "examples",
    ]);
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
    vi.stubGlobal("fetch", respondWith(envelope({ ...review, comprehensibility: { verdict: "perfecto", notes: "" } })));
    await expect(call()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("refuses a reply that is not JSON at all", async () => {
    vi.stubGlobal("fetch", respondWith({ stop_reason: "end_turn", content: [{ type: "text", text: "Looks good!" }] }));
    await expect(call()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("accepts an empty examples list", async () => {
    vi.stubGlobal("fetch", respondWith(envelope({ ...review, examples: [] })));
    await expect(call()).resolves.toMatchObject({ examples: [] });
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
