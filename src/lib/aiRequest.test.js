import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AiError,
  assertFinished,
  formatCost,
  httpFailure,
  postMessages,
  priceUsage,
  responseCost,
  REFUSAL_FALLBACK_BETA,
  textFromContent,
  usedFallback,
  withRefusalFallback,
} from "./aiRequest.js";

const KEY = "sk-ant-test-key";

const respondWith = (payload, { ok = true, status = 200 } = {}) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => payload });

const init = () => globalThis.fetch.mock.calls[0][1];

beforeEach(() => {
  vi.stubGlobal("fetch", respondWith({ stop_reason: "end_turn", content: [] }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postMessages", () => {
  it("sends the browser-origin headers and keeps the key out of the body", async () => {
    await postMessages({ model: "m", messages: [] }, { apiKey: KEY });
    const { headers, body, method } = init();
    expect(method).toBe("POST");
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(body).not.toContain(KEY);
  });

  it("adds an anthropic-beta header only when betas are named", async () => {
    await postMessages({}, { apiKey: KEY });
    expect(init().headers).not.toHaveProperty("anthropic-beta");

    vi.stubGlobal("fetch", respondWith({}));
    await postMessages({}, { apiKey: KEY, betas: ["one", "two"] });
    expect(init().headers["anthropic-beta"]).toBe("one,two");
  });

  it("rethrows a cancel untouched", async () => {
    const aborted = new Error("aborted");
    aborted.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(aborted));
    await expect(postMessages({}, { apiKey: KEY })).rejects.toBe(aborted);
  });

  it("turns an unreachable network into plain words", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(postMessages({}, { apiKey: KEY })).rejects.toMatchObject({
      name: "AiError",
      kind: "network",
    });
  });

  it("reads the error body to recognise a spend limit", async () => {
    vi.stubGlobal("fetch", respondWith(
      { type: "error", error: { type: "invalid_request_error", message: "You have reached your specified API usage limits." } },
      { ok: false, status: 400 }
    ));
    await expect(postMessages({}, { apiKey: KEY })).rejects.toMatchObject({ kind: "spend_limit" });
  });

  it("still maps the status when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 529,
      json: async () => { throw new SyntaxError("not json"); },
    }));
    await expect(postMessages({}, { apiKey: KEY })).rejects.toMatchObject({ kind: "overloaded" });
  });
});

describe("httpFailure", () => {
  it.each([
    [401, null, "auth"],
    [403, null, "auth"],
    [429, null, "rate"],
    [429, { error: { details: { error_code: "enforced_spend_limit_reached" } } }, "spend_limit"],
    [400, { error: { message: "messages: too long" } }, "request"],
    [400, { error: { message: "You have reached your specified API usage limits." } }, "spend_limit"],
    [413, null, "request"],
    [500, null, "overloaded"],
    [529, null, "overloaded"],
    [418, null, "request"],
  ])("maps HTTP %i to %s", (status, body, kind) => {
    const err = httpFailure(status, body);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe(kind);
    expect(err.message.length).toBeGreaterThan(10);
  });

  it("words a too-long request generically, so it fits a question as well as an entry", () => {
    expect(httpFailure(413).message).toMatch(/too long/);
    expect(httpFailure(413).message).not.toMatch(/entry/);
  });
});

describe("responses", () => {
  const messages = { refusal: "declined", truncated: "cut short" };

  it("reports a refusal before anything reads the content", () => {
    expect(() => assertFinished({ stop_reason: "refusal" }, messages)).toThrow(
      expect.objectContaining({ kind: "refusal", message: "declined" })
    );
  });

  it("reports a response cut short by the token ceiling", () => {
    expect(() => assertFinished({ stop_reason: "max_tokens", content: [] }, messages)).toThrow(
      expect.objectContaining({ kind: "truncated" })
    );
  });

  it("lets a finished response through", () => {
    expect(() => assertFinished({ stop_reason: "end_turn" }, messages)).not.toThrow();
  });

  it("shows only text blocks, never thinking or fallback blocks", () => {
    const content = [
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "fallback", from: { model: "a" }, to: { model: "b" } },
      { type: "text", text: "Hola " },
      { type: "text", text: "mundo" },
    ];
    expect(textFromContent(content)).toBe("Hola mundo");
    expect(textFromContent(undefined)).toBe("");
  });

  it("notices when the fallback model answered", () => {
    expect(usedFallback({ content: [{ type: "text", text: "x" }] })).toBe(false);
    expect(usedFallback({ content: [{ type: "fallback" }] })).toBe(true);
    expect(usedFallback({ content: [], usage: { iterations: [{ type: "fallback_message" }] } })).toBe(true);
  });
});

describe("refusal fallback", () => {
  it("adds the default fallback and names its beta", () => {
    const { body, betas } = withRefusalFallback({ model: "m" });
    expect(body).toEqual({ model: "m", fallbacks: "default" });
    expect(betas).toEqual([REFUSAL_FALLBACK_BETA]);
  });
});

describe("cost", () => {
  it("prices a response from its usage", () => {
    const dollars = priceUsage("claude-opus-5-5", { input_tokens: 1_000_000, output_tokens: 100_000 });
    expect(dollars).toBeCloseTo(4 + 2, 6);
  });

  it("gives up on an unknown model or malformed usage rather than guessing", () => {
    expect(priceUsage("claude-unknown", { input_tokens: 1 })).toBeNull();
    expect(priceUsage("claude-opus-5-5", { input_tokens: -1 })).toBeNull();
    expect(priceUsage("claude-opus-5-5", null)).toBeNull();
  });

  it("gives no figure when the fallback answered, since the declined attempt is billed separately", () => {
    const usage = { input_tokens: 1000, output_tokens: 1000 };
    expect(responseCost("claude-opus-5-5", { content: [], usage })).toBeGreaterThan(0);
    expect(responseCost("claude-opus-5", { content: [{ type: "fallback" }], usage })).toBeNull();
  });

  it("formats approximately", () => {
    expect(formatCost(0.004)).toBe("< 1¢");
    expect(formatCost(0.023)).toBe("≈ 2¢");
    expect(formatCost(1.234)).toBe("≈ $1.23");
    expect(formatCost(Number.NaN)).toBe("");
  });
});
