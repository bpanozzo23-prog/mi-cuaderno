// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiarioFeedback from "./DiarioFeedback.jsx";
import { db, clearAllPersonalData, setPref } from "../db/db.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";

const entry = {
  id: "user:entry",
  title: "Martes",
  body: "Hoy estoy agradecido para mi familia.",
};

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

const shown = () => render(<DiarioFeedback entry={entry} onClose={() => {}} />);
const sendButton = () => screen.getByRole("button", { name: /Send and review/i });

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  await setPref(AI_API_KEY_PREF, "sk-ant-owners-key");
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
    expect(screen.getByText(/Nothing here is saved/i)).toBeTruthy();
    // §9: the disclosure comes before the request, not alongside it.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends on confirmation", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
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

  it("can be asked for again", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());
    await waitFor(() => expect(screen.getByRole("button", { name: /Ask again/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Ask again/i }));

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
  });

  it("is never written to the notebook", async () => {
    const user = userEvent.setup();
    shown();

    await user.click(sendButton());
    await waitFor(() => expect(screen.getByText("Mostly clear")).toBeTruthy());

    // §7 has exactly two content types and the event log is the source of truth: a review is
    // neither, so it must leave no trace behind at all.
    expect(await db.items.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
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
