// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pregunta from "./Pregunta.jsx";
import { db, clearAllPersonalData, setPref } from "../db/db.js";
import * as items from "../db/items.js";
import { createItem, newLexical } from "../db/items.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import * as persistence from "../lib/persistence.js";

const KEY = "sk-ant-test-key";

const answer = {
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  content: [{ type: "text", text: "Use **extrañar** (Mexico) or **echar de menos**." }],
  usage: { input_tokens: 500, output_tokens: 400 },
};

const proposals = {
  summary: "Two ways to say I miss you.",
  entries: [
    {
      ref: "n1", term: "extrañar", form: "word", gloss: "to miss", usageCue: "everyday in Mexico",
      usageLabels: ["informal"], examples: [{ es: "Te extraño.", en: "I miss you." }], note: null,
      tags: ["emociones"], reason: "The everyday Mexican verb.",
    },
    {
      ref: "n2", term: "hacer falta", form: "phrase", gloss: "to be missed", usageCue: null,
      usageLabels: [], examples: [{ es: "Me haces falta.", en: "I miss you." }], note: null,
      tags: [], reason: "A warmer alternative.",
    },
    {
      ref: "n3", term: "Echar de menos", form: "phrase", gloss: "to miss", usageCue: null,
      usageLabels: [], examples: [], note: null, tags: [], reason: "Already discussed.",
    },
  ],
  links: [
    { from: "n1", to: "c1", type: "similar_meaning", reason: "Same idea." },
    { from: "n2", to: "n1", type: "similar_meaning", reason: "Same idea." },
  ],
};

const keepResponse = (json = proposals) => ({
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  content: [{ type: "text", text: JSON.stringify(json) }],
  usage: { input_tokens: 2000, output_tokens: 1500 },
});

const ok = (payload) => ({ ok: true, status: 200, json: async () => payload });

let existing;
let reload;

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  await setPref(AI_API_KEY_PREF, KEY);
  vi.spyOn(persistence, "requestPersistence").mockResolvedValue(null);
  existing = await createItem(newLexical({
    term: "echar de menos", form: "phrase", meanings: [{ gloss: "to miss (someone)" }], tags: ["emociones"],
  }));
  reload = vi.fn(async () => ({ status: "loaded" }));
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(ok(answer))
    .mockResolvedValueOnce(ok(keepResponse())));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderWithAnswer(user, { onSelect = vi.fn() } = {}) {
  const notebook = { items: await items.allItems(), reload };
  const view = render(<Pregunta notebook={notebook} onSelect={onSelect} />);
  expect(screen.queryByRole("button", { name: "Keep" })).toBeNull();
  await user.type(screen.getByLabelText("Your question"), "How do you say I miss you?");
  await user.click(screen.getByRole("button", { name: "Ask" }));
  await screen.findByText("extrañar");
  return view;
}

async function openReview(user) {
  await user.click(screen.getByRole("button", { name: "Keep" }));
  await user.click(screen.getByRole("button", { name: "Send and propose" }));
  return screen.findByRole("region", { name: "Keep proposals" });
}

const proposalCard = (term) => screen.getByRole("generic", { name: `Proposal: ${term}` });

describe("Keep", () => {
  it("names what will be sent and sends nothing until confirmed", async () => {
    const user = userEvent.setup();
    await renderWithAnswer(user);
    await user.click(screen.getByRole("button", { name: "Keep" }));
    const keep = screen.getByRole("generic", { name: "Keep" });
    expect(keep.textContent).toMatch(
      /Sent to Anthropic: this conversation \(≈ \d+ characters\), your 1 tag name, and 1 related entry from your cuaderno \(term and first meaning only\)\./
    );
    expect(within(keep).getByText(/echar de menos — to miss \(someone\)/)).toBeTruthy();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await user.click(within(keep).getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    const body = JSON.parse(globalThis.fetch.mock.calls[1][1].body);
    expect(body.messages[0].content).toContain("c1 | echar de menos | phrase | to miss (someone)");
    expect(globalThis.fetch.mock.calls[1][1].body).not.toContain(existing.id);
  });

  it("starts duplicates unticked, lets ia be unticked, and ties links to their entries", async () => {
    const user = userEvent.setup();
    await renderWithAnswer(user);
    await openReview(user);

    expect(within(proposalCard("Echar de menos")).getByRole("checkbox", { name: "Keep Echar de menos" }).checked).toBe(false);
    expect(within(proposalCard("Echar de menos")).getByText("Already in your cuaderno.")).toBeTruthy();
    expect(within(proposalCard("extrañar")).getByRole("checkbox", { name: "Keep extrañar" }).checked).toBe(true);

    const ia = within(proposalCard("extrañar")).getByRole("button", { name: /Tag ia/ });
    expect(ia.getAttribute("aria-pressed")).toBe("true");
    await user.click(ia);
    expect(ia.getAttribute("aria-pressed")).toBe("false");

    const link = screen.getByRole("checkbox", { name: "Connect hacer falta and extrañar" });
    expect(link.disabled).toBe(false);
    await user.click(within(proposalCard("extrañar")).getByRole("checkbox", { name: "Keep extrañar" }));
    expect(link.disabled).toBe(true);
    expect(screen.getAllByText("Needs extrañar ticked.")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^Apply 1 entry$/ })).toBeTruthy();
  });

  it("applies only what is ticked, refreshes, and opens a new entry", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    await renderWithAnswer(user, { onSelect });
    await openReview(user);
    await user.click(within(proposalCard("extrañar")).getByRole("button", { name: /Tag ia/ }));
    await user.click(screen.getByRole("button", { name: /Apply 2 entries, 2 connections/ }));

    expect(await screen.findByText(/Saved 2 entries and 2 connections/)).toBeTruthy();
    expect(reload).toHaveBeenCalledTimes(1);
    const saved = (await items.allItems()).filter((item) => item.id !== existing.id);
    const extranar = saved.find((item) => item.term === "extrañar");
    const hacerFalta = saved.find((item) => item.term === "hacer falta");
    expect(saved).toHaveLength(2);
    expect(extranar.tags).toEqual(["emociones"]);
    expect(hacerFalta.tags).toEqual(["ia"]);
    expect(extranar.linkedKeys).toEqual([existing.id]);
    expect(hacerFalta.linkedKeys).toEqual([extranar.id]);
    expect((await items.getItem(existing.id)).linkedKeys).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Open extrañar" }));
    expect(onSelect).toHaveBeenCalledWith(extranar.id);
  });

  it("keeps the review when saving fails, and a retry saves once", async () => {
    const user = userEvent.setup();
    await renderWithAnswer(user);
    await openReview(user);
    vi.spyOn(items, "createItemsWithLinks").mockRejectedValueOnce(new Error("disk full"));
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn't save — nothing was changed/);
    expect(screen.getByRole("checkbox", { name: "Keep extrañar" }).checked).toBe(true);

    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    await screen.findByText(/Saved 2 entries/);
    expect((await items.allItems())).toHaveLength(3);
  });

  it("after a failed refresh, offers a refresh — never a second save", async () => {
    const user = userEvent.setup();
    reload.mockResolvedValueOnce({ status: "failed", error: new Error("read failed") });
    await renderWithAnswer(user);
    await openReview(user);
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't refresh/);
    expect(screen.getByRole("button", { name: "Open extrañar" }).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: /Apply/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open extrañar" }).disabled).toBe(false));
    expect(reload).toHaveBeenCalledTimes(2);
    expect((await items.allItems())).toHaveLength(3);
  });

  it("lets a kept conversation start over in one tap", async () => {
    const user = userEvent.setup();
    await renderWithAnswer(user);
    await openReview(user);
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    await screen.findByText(/Saved 2 entries/);
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: /New question/ }));
    expect(screen.queryByText("extrañar")).toBeNull();
  });

  it("keeps from a pasted conversation without any Pregunta history", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockReset().mockResolvedValueOnce(ok(keepResponse()));
    render(<Pregunta notebook={{ items: await items.allItems(), reload }} onSelect={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: "Paste a conversation" }));
    const paste = screen.getByLabelText("Paste a conversation from another app");
    expect(Number(paste.getAttribute("maxLength"))).toBe(40000);
    await user.click(paste);
    await user.paste("Gemini: In Mexico people say extrañar.");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.getByText(/the pasted conversation/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });

    const content = JSON.parse(globalThis.fetch.mock.calls[0][1].body).messages[0].content;
    expect(content).toContain('<conversation source="pasted">\nGemini: In Mexico people say extrañar.\n</conversation>');
    expect(content).not.toContain("How do you say");
  });
});

describe("Keep while the notebook changes", () => {
  function deferredKeepFetch() {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    globalThis.fetch.mockReset()
      .mockResolvedValueOnce(ok(answer))
      .mockImplementationOnce(async () => { await gate; return ok(keepResponse()); });
    return () => release();
  }

  it("unticks a proposal whose entry was saved elsewhere while Claude was working", async () => {
    const user = userEvent.setup();
    const release = deferredKeepFetch();
    const view = await renderWithAnswer(user);
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByText(/Claude is choosing/);

    await createItem(newLexical({ term: "extrañar" }));
    view.rerender(<Pregunta notebook={{ items: await items.allItems(), reload }} onSelect={vi.fn()} />);
    release();
    await screen.findByRole("region", { name: "Keep proposals" });
    expect(screen.getByRole("checkbox", { name: "Keep extrañar" }).checked).toBe(false);
  });

  it("unticks a proposal that becomes a duplicate during the review, once", async () => {
    const user = userEvent.setup();
    const view = await renderWithAnswer(user);
    await openReview(user);
    expect(screen.getByRole("checkbox", { name: "Keep hacer falta" }).checked).toBe(true);

    await createItem(newLexical({ term: "hacer falta", form: "phrase" }));
    view.rerender(<Pregunta notebook={{ items: await items.allItems(), reload }} onSelect={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Keep hacer falta" }).checked).toBe(false));
    // The owner can still choose to keep it deliberately.
    await user.click(screen.getByRole("checkbox", { name: "Keep hacer falta" }));
    view.rerender(<Pregunta notebook={{ items: await items.allItems(), reload }} onSelect={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Keep hacer falta" }).checked).toBe(true);
  });

  it("still refreshes the notebook when the screen goes away while Apply is saving", async () => {
    const user = userEvent.setup();
    const view = await renderWithAnswer(user);
    await openReview(user);
    const real = items.createItemsWithLinks;
    let finish;
    vi.spyOn(items, "createItemsWithLinks").mockImplementationOnce((writes) => new Promise((resolve) => {
      finish = () => resolve(real(writes));
    }));
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    view.unmount();
    finish();
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(await items.allItems()).toHaveLength(3);
  });

  it("stores a saved note without image syntax", async () => {
    const user = userEvent.setup();
    const withPixel = structuredClone(proposals);
    withPixel.entries[0].note = "Look ![x](https://example.com/p?q=private)";
    globalThis.fetch.mockReset().mockResolvedValueOnce(ok(answer)).mockResolvedValueOnce(ok(keepResponse(withPixel)));
    await renderWithAnswer(user);
    await openReview(user);
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    await screen.findByText(/Saved 2 entries/);
    const saved = (await items.allItems()).find((item) => item.term === "extrañar");
    expect(saved.notes).toBe("Look [x](https://example.com/p?q=private)");
  });
});

describe("what counts as kept", () => {
  it("needs two taps again once a follow-up arrives after Keep", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockResolvedValueOnce(ok({ ...answer, content: [{ type: "text", text: "Follow-up answer" }] }));
    await renderWithAnswer(user);
    await openReview(user);
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    await screen.findByText(/Saved 2 entries/);
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.type(screen.getByLabelText("Follow-up question"), "And formally?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    await screen.findByText("Follow-up answer");

    await user.click(screen.getByRole("button", { name: /New question/ }));
    expect(screen.getByText("Follow-up answer")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tap again to discard/ })).toBeTruthy();
  });

  it("does not count a pasted Keep as keeping the Pregunta conversation", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockReset().mockResolvedValueOnce(ok(answer)).mockResolvedValueOnce(ok(keepResponse()));
    await renderWithAnswer(user);
    await user.click(screen.getByRole("radio", { name: "Paste a conversation" }));
    await user.click(screen.getByLabelText("Paste a conversation from another app"));
    await user.paste("Gemini: extrañar.");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    await user.click(screen.getByRole("button", { name: /Apply 2 entries/ }));
    await screen.findByText(/Saved 2 entries/);
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("radio", { name: "Ask Claude" }));

    await user.click(screen.getByRole("button", { name: /New question/ }));
    expect(screen.getByRole("button", { name: /Tap again to discard/ })).toBeTruthy();
  });
});
