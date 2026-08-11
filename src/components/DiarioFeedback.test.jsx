// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiarioFeedback from "./DiarioFeedback.jsx";
import { db, clearAllPersonalData, setPref } from "../db/db.js";
import { createItem, getItem, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES } from "../db/events.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import { makeStoredFeedback } from "../lib/diarioReview.js";

const review = {
  verdict: "mostly_clear",
  summary: "Readable throughout; one preposition slip is worth fixing.",
  items: [
    { category: "error", quote: "agradecido para", corrected: "agradecido por", explanation: "Wrong preposition after agradecido." },
    { category: "praise", quote: "se me olvidó el pan", corrected: null, explanation: "The se-construction is exactly right." },
  ],
};

const respondWith = (payload, { ok = true, status = 200 } = {}) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => payload });

const succeeds = (json = review) =>
  respondWith({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(json) }] });

let entry;

const shown = (overrides = {}, props = {}) =>
  render(<DiarioFeedback entry={{ ...entry, ...overrides }} onClose={() => {}} {...props} />);
const sendButton = () => screen.getByRole("button", { name: /Send and review/i });

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  await setPref(AI_API_KEY_PREF, "sk-ant-owners-key");
  entry = await createItem(newPage({
    title: "Martes",
    body: "Hoy estoy agradecido para mi familia.",
    pageDate: "2026-08-01",
  }));
  vi.stubGlobal("fetch", succeeds());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("before anything is sent", () => {
  it("names what leaves the device and sends nothing until the owner agrees", async () => {
    shown();

    expect(screen.getByText(/title and text — nothing else from your notebook/i)).toBeTruthy();
    expect(screen.getByText(/latest review is kept with this entry/i)).toBeTruthy();
    // §9: the disclosure comes before the request, not alongside it.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends on confirmation", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  it("sends the visible journal text without Markdown markers", async () => {
    const user = userEvent.setup();
    shown({ body: "Hoy estoy **muy agradecido** por ==mi familia==." });

    await user.click(sendButton());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    const requestBody = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(requestBody.messages[0].content).toContain("Hoy estoy muy agradecido por mi familia.");
    expect(requestBody.messages[0].content).not.toContain("**");
    expect(requestBody.messages[0].content).not.toContain("==");
  });

  it("offers no send action when the AI feature is not usable", () => {
    shown({}, { canAsk: false });

    expect(screen.queryByRole("button", { name: /Send and review/i })).toBe(null);
  });
});

describe("the review", () => {
  it("shows the verdict, the summary and each margin note with its category", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(screen.getByText("Mostly clear")).toBeTruthy());
    expect(screen.getByText(/one preposition slip/i)).toBeTruthy();
    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.getByText("agradecido para")).toBeTruthy();
    expect(screen.getByText(/→ agradecido por/)).toBeTruthy();
    expect(screen.getByText(/Wrong preposition/i)).toBeTruthy();
  });

  it("renders praise as a note with no correction arrow", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(screen.getByText("Well done")).toBeTruthy());
    expect(screen.getByText("se me olvidó el pan")).toBeTruthy();
    // corrected is null: praise has nothing to fix, so no arrow row may appear for it.
    expect(screen.getAllByText(/→ /)).toHaveLength(1);
  });

  it("says so plainly when there is nothing to flag", async () => {
    vi.stubGlobal("fetch", succeeds({ ...review, items: [] }));
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(screen.getByText(/Nothing to flag/i)).toBeTruthy());
  });

  it("can be asked for again, back through the disclosure", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());
    await waitFor(() => expect(screen.getByRole("button", { name: /Ask again/i })).toBeTruthy());

    // The replacement goes back through the §9 disclosure rather than straight to the network.
    await user.click(screen.getByRole("button", { name: /Ask again/i }));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    await user.click(sendButton());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
  });

  it("keeps the latest review with the entry without moving updatedAt or logging events", async () => {
    const onChanged = vi.fn();
    const user = userEvent.setup();
    shown({}, { onChanged });

    await user.click(sendButton());
    await waitFor(() => expect(screen.getByText("Mostly clear")).toBeTruthy());

    const stored = await getItem(entry.id);
    expect(stored.feedback).toMatchObject(review);
    expect(typeof stored.feedback.reviewedAt).toBe("string");
    expect(typeof stored.feedback.reviewedHash).toBe("string");
    expect(stored.updatedAt).toBe(entry.updatedAt);
    expect((await allEvents()).map((event) => event.type)).toEqual([EVENT_TYPES.create]);
    expect(onChanged).toHaveBeenCalled();
  });

  it("opens straight into a stored review without any request", async () => {
    const stored = makeStoredFeedback(review, entry);
    shown({ feedback: stored });

    expect(screen.getByText("Mostly clear")).toBeTruthy();
    expect(screen.getByText("agradecido para")).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    // Fresh against the entry it reviewed: no staleness warning.
    expect(screen.queryByText(/text has changed since this review/i)).toBe(null);
  });

  it("marks a stored review as stale once the entry text has moved on", () => {
    const stored = makeStoredFeedback(review, entry);
    shown({ feedback: stored, body: "Hoy estoy agradecido por mi familia." });

    expect(screen.getByText(/From before your last edit/i)).toBeTruthy();
  });

  it("hides the request actions but keeps a stored review readable when AI is off", () => {
    const stored = makeStoredFeedback(review, entry);
    shown({ feedback: stored }, { canAsk: false });

    expect(screen.getByText("Mostly clear")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Ask again/i })).toBe(null);
    expect(screen.getByRole("button", { name: /Remove/i })).toBeTruthy();
  });

  it("removes the stored review and returns to the disclosure", async () => {
    const onChanged = vi.fn();
    const stored = makeStoredFeedback(review, entry);
    await db.items.update(entry.id, { feedback: stored });
    const user = userEvent.setup();
    shown({ feedback: stored }, { onChanged });

    await user.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => expect(sendButton()).toBeTruthy());
    expect((await getItem(entry.id)).feedback).toBeNull();
    expect(onChanged).toHaveBeenCalled();
    expect((await allEvents()).map((event) => event.type)).toEqual([EVENT_TYPES.create]);
  });
});

describe("when it does not work", () => {
  it("reports a rejected key and offers another go", async () => {
    vi.stubGlobal("fetch", respondWith({}, { ok: false, status: 401 }));
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(screen.getByText(/rejected the API key/i)).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Try again/i }));
    expect(sendButton()).toBeTruthy();
  });

  it("keeps the stored review when a replacement request fails", async () => {
    const stored = makeStoredFeedback(review, entry);
    await db.items.update(entry.id, { feedback: stored });
    vi.stubGlobal("fetch", respondWith({}, { ok: false, status: 500 }));
    const user = userEvent.setup();
    shown({ feedback: stored });

    await user.click(screen.getByRole("button", { name: /Ask again/i }));
    await user.click(sendButton());

    await waitFor(() => expect(screen.getByText(/busy or unavailable/i)).toBeTruthy());
    expect((await getItem(entry.id)).feedback).toEqual(stored);
  });

  it("reports a refusal as itself rather than as a broken app", async () => {
    vi.stubGlobal("fetch", respondWith({ stop_reason: "refusal" }));
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(screen.getByText(/declined to review this entry/i)).toBeTruthy());
  });

  it("returns to the disclosure when the owner stops it, showing no error", async () => {
    // A request that only settles when aborted, so Stop is the thing that ends it.
    vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    })));
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());
    await waitFor(() => expect(screen.getByRole("button", { name: /Stop/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Stop/i }));

    await waitFor(() => expect(sendButton()).toBeTruthy());
    expect(screen.queryByText(/aborted/i)).toBe(null);
  });
});
