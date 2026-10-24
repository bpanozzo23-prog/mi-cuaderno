// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pregunta from "./Pregunta.jsx";
import { db, clearAllPersonalData, setPref } from "../db/db.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";

const KEY = "sk-ant-test-key";

const answer = (text) => ({
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  content: [{ type: "thinking", thinking: "", signature: "sig" }, { type: "text", text }],
  usage: { input_tokens: 1000, output_tokens: 800 },
});

const respondWith = (payload, { ok = true, status = 200 } = {}) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => payload });

/** A fetch that never settles until its signal aborts. */
const hangingFetch = () => vi.fn((_url, init) => new Promise((_resolve, reject) => {
  init.signal.addEventListener("abort", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    reject(err);
  });
}));

const bodyOf = (call) => JSON.parse(call[1].body);

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  await setPref(AI_API_KEY_PREF, KEY);
  vi.stubGlobal("fetch", respondWith(answer("Se dice **te extraño**.")));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function ask(user, text) {
  const composer = screen.getByRole("textbox");
  await user.clear(composer);
  await user.type(composer, text);
  await user.click(screen.getByRole("button", { name: "Ask" }));
}

describe("Pregunta", () => {
  it("states what is sent and sends nothing until Ask", async () => {
    const user = userEvent.setup();
    render(<Pregunta />);
    expect(screen.getByText(/sends your question and this conversation so far to Anthropic/)).toBeTruthy();
    expect(screen.getByText(/Nothing from your notebook is included/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ask" }).disabled).toBe(true);
    await user.type(screen.getByRole("textbox"), "   ");
    expect(screen.getByRole("button", { name: "Ask" }).disabled).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows the answer with its cost and clears the composer", async () => {
    const user = userEvent.setup();
    render(<Pregunta />);
    await ask(user, "How do you say I miss you?");
    expect(await screen.findByText("te extraño")).toBeTruthy();
    expect(screen.getByText("How do you say I miss you?")).toBeTruthy();
    expect(screen.getByText(/≈ \d+¢/)).toBeTruthy();
    expect(screen.getByRole("textbox").value).toBe("");
    expect(globalThis.fetch.mock.calls[0][1].headers["x-api-key"]).toBe(KEY);
  });

  it("sends the earlier exchange with a follow-up", async () => {
    const user = userEvent.setup();
    render(<Pregunta />);
    await ask(user, "How do you say I miss you?");
    await screen.findByText("te extraño");
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => answer("**Me haces falta**.") });
    await ask(user, "And another way?");
    expect(await screen.findByText("Me haces falta")).toBeTruthy();
    const { messages } = bodyOf(globalThis.fetch.mock.calls[1]);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(messages[1].content[0]).toMatchObject({ type: "thinking", signature: "sig" });
  });

  it("Stop cancels quietly and gives the question back", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", hangingFetch());
    render(<Pregunta />);
    await ask(user, "¿Qué significa ni modo?");
    expect(await screen.findByText(/Claude is thinking/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(screen.queryByText(/Claude is thinking/)).toBeNull());
    expect(screen.getByRole("textbox").value).toBe("¿Qué significa ni modo?");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the question when the request fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respondWith({}, { ok: false, status: 529 }));
    render(<Pregunta />);
    await ask(user, "¿Qué significa ni modo?");
    expect((await screen.findByRole("alert")).textContent).toMatch(/busy or unavailable/);
    expect(screen.getByRole("textbox").value).toBe("¿Qué significa ni modo?");
  });

  it("needs a second tap to discard a conversation", async () => {
    const user = userEvent.setup();
    render(<Pregunta />);
    await ask(user, "How do you say I miss you?");
    await screen.findByText("te extraño");
    await user.click(screen.getByRole("button", { name: /New question/ }));
    expect(screen.getByText("te extraño")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Tap again to discard/ }));
    expect(screen.queryByText("te extraño")).toBeNull();
  });

  it("renders no raw HTML and loads no images from an answer", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respondWith(answer(
      "Hola <script>alert(1)</script><b>raw</b>\n\n![tracker](https://example.com/pixel.png?q=secret)"
    )));
    const { container } = render(<Pregunta />);
    await ask(user, "q");
    await screen.findByText(/Hola/);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("[tracker]")).toBeTruthy();
  });

  it("aborts a request in flight when the screen goes away", async () => {
    const user = userEvent.setup();
    const fetch = hangingFetch();
    vi.stubGlobal("fetch", fetch);
    const { unmount } = render(<Pregunta />);
    await ask(user, "q");
    await screen.findByText(/Claude is thinking/);
    unmount();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
