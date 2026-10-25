// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { emptyCollection } from "./lib/pageKinds.js";
import { db, clearAllPersonalData, setPref } from "./db/db.js";
import { AI_API_KEY_PREF, AI_ENABLED_PREF } from "./lib/aiPrefs.js";
import * as aiPrefs from "./lib/aiPrefs.js";
import { createNavigation, historyStateWithNavigation, pushDestination, selectPrimaryTab } from "./lib/navigation.js";
import * as items from "./db/items.js";
import * as events from "./db/events.js";

const answer = {
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  content: [{ type: "text", text: "Se dice **te extraño**." }],
  usage: { input_tokens: 100, output_tokens: 50 },
};

async function enableAi() {
  await setPref(AI_ENABLED_PREF, true);
  await setPref(AI_API_KEY_PREF, "sk-ant-test-key");
}

function startOnPregunta() {
  const navigation = selectPrimaryTab(createNavigation(), "pregunta");
  window.history.replaceState(historyStateWithNavigation(null, navigation), "", "/");
}

const primaryNav = () => screen.findByRole("navigation", { name: "Primary" });

beforeEach(async () => {
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  await db.open();
  await clearAllPersonalData();
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => answer }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Pregunta tab availability", () => {
  it("is absent while AI is off", async () => {
    render(<App />);
    const primary = await primaryNav();
    await screen.findByRole("textbox", { name: "Search notebook" });
    await waitFor(() => expect(within(primary).getAllByRole("button")).toHaveLength(4));
    expect(within(primary).queryByRole("button", { name: "Pregunta" })).toBeNull();
  });

  it("appears when AI is on with a key", async () => {
    await enableAi();
    render(<App />);
    const primary = await primaryNav();
    expect(await within(primary).findByRole("button", { name: "Pregunta" })).toBeTruthy();
    expect(within(primary).getAllByRole("button").map((b) => b.textContent))
      .toEqual(["Cuaderno", "Diario", "Pregunta", "Repaso", "Ajustes"]);
  });

  it("appears without a reload once AI is turned on in Ajustes", async () => {
    const user = userEvent.setup();
    render(<App />);
    const primary = await primaryNav();
    await user.click(within(primary).getByRole("button", { name: "Ajustes" }));
    await user.click(await screen.findByRole("checkbox", { name: /spend cap/ }));
    await user.type(screen.getByLabelText("Anthropic API key"), "sk-ant-test-key");
    await user.click(screen.getByRole("button", { name: /Save key and turn on/ }));
    expect(await within(primary).findByRole("button", { name: "Pregunta" })).toBeTruthy();
  });

  it("sends a restored Pregunta visit to Cuaderno when AI is off, without a new history entry", async () => {
    startOnPregunta();
    const lengthBefore = window.history.length;
    render(<App />);
    expect(await screen.findByRole("textbox", { name: "Search notebook" })).toBeTruthy();
    await waitFor(() => expect(window.history.state.mcNavigation.activeTab).toBe("cuaderno"));
    expect(window.history.length).toBe(lengthBefore);
    expect(screen.queryByRole("heading", { name: "Pregunta" })).toBeNull();
  });

  it("keeps a restored Pregunta visit while readiness is still being read", async () => {
    await enableAi();
    startOnPregunta();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const real = aiPrefs.aiFeedbackReady;
    vi.spyOn(aiPrefs, "aiFeedbackReady").mockImplementation(async () => {
      await gate;
      return real();
    });
    render(<App />);
    await primaryNav();
    // Unknown is not "off": the route must survive until the read resolves.
    expect(window.history.state.mcNavigation.activeTab).toBe("pregunta");
    release();
    expect(await screen.findByRole("heading", { name: "Pregunta" })).toBeTruthy();
    expect(window.history.state.mcNavigation.activeTab).toBe("pregunta");
  });

  it("lets a newer readiness read win over an older one that resolves later", async () => {
    const user = userEvent.setup();
    await enableAi();
    const releases = [];
    const real = aiPrefs.aiFeedbackReady;
    // Each read captures the setting when it starts and is released by the test.
    vi.spyOn(aiPrefs, "aiFeedbackReady").mockImplementation(() => {
      const value = real();
      return new Promise((resolve) => {
        releases.push(() => resolve(value));
      });
    });
    render(<App />);
    const primary = await primaryNav();
    // A second read starts (turning AI off) before the first (mount) resolves.
    await user.click(within(primary).getByRole("button", { name: "Ajustes" }));
    await user.click(await screen.findByRole("button", { name: /Turn off/ }));
    await waitFor(() => expect(releases.length).toBe(2));
    releases[1]();
    await waitFor(() => expect(within(primary).getAllByRole("button")).toHaveLength(4));
    releases[0]();
    // The older read saw AI on; it must not resurrect the tab.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(within(primary).queryByRole("button", { name: "Pregunta" })).toBeNull();
  });

  it("keeps the conversation across a tab round trip", async () => {
    const user = userEvent.setup();
    await enableAi();
    render(<App />);
    const primary = await primaryNav();
    await user.click(await within(primary).findByRole("button", { name: "Pregunta" }));
    await user.type(await screen.findByLabelText("Your question"), "How do you say I miss you?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("te extraño")).toBeTruthy();

    await user.click(within(primary).getByRole("button", { name: "Cuaderno" }));
    await user.click(within(primary).getByRole("button", { name: "Pregunta" }));
    expect(screen.getByText("te extraño")).toBeTruthy();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("moves off Pregunta and closes the conversation when AI is turned off", async () => {
    const user = userEvent.setup();
    await enableAi();
    render(<App />);
    const primary = await primaryNav();
    await user.click(await within(primary).findByRole("button", { name: "Pregunta" }));
    await user.type(await screen.findByLabelText("Your question"), "¿Qué significa ni modo?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    await screen.findByText("te extraño");

    await user.click(within(primary).getByRole("button", { name: "Ajustes" }));
    await user.click(await screen.findByRole("button", { name: /Turn off/ }));
    await waitFor(() => expect(within(primary).queryByRole("button", { name: "Pregunta" })).toBeNull());
    expect(screen.queryByText("te extraño")).toBeNull();
  });
});

describe("Ask about this", () => {
  async function savedWord(term = "madrugar", { due = false } = {}) {
    const word = await items.createItem(items.newLexical({ term, meanings: [{ gloss: "to get up early" }] }));
    // Marked tricky, a word is due in Repaso at once.
    if (due) await events.logEvent(events.EVENT_TYPES.trickyOn, word.id);
    return word;
  }

  function startOnEntry(id) {
    const navigation = pushDestination(createNavigation(), { tab: "cuaderno", screen: "detail", id });
    window.history.replaceState(historyStateWithNavigation(null, navigation), "", "/");
  }

  const tray = () => screen.findByRole("generic", { name: "Attached to your next question" });

  it("offers no Ask button on an entry while AI is off", async () => {
    const word = await savedWord();
    startOnEntry(word.id);
    render(<App />);
    expect(await screen.findByRole("button", { name: "Historia" })).toBeTruthy();
    // The tab bar settles at four tabs once readiness has been read as "off".
    const primary = await primaryNav();
    await waitFor(() => expect(within(primary).getAllByRole("button")).toHaveLength(4));
    expect(screen.queryByRole("button", { name: "Ask Claude" })).toBeNull();
  });

  it("takes an entry to a Pregunta never visited before, attached and unsent", async () => {
    const user = userEvent.setup();
    await enableAi();
    const word = await savedWord();
    startOnEntry(word.id);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ask Claude" }));

    expect(within(await tray()).getByText("About: madrugar")).toBeTruthy();
    expect(window.history.state.mcNavigation.activeTab).toBe("pregunta");
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // The entry is still where it was in Cuaderno.
    const primary = await primaryNav();
    await user.click(within(primary).getByRole("button", { name: "Cuaderno" }));
    expect(await screen.findByRole("button", { name: "Ask Claude" })).toBeTruthy();
  });

  it("offers Ask on a page too", async () => {
    const user = userEvent.setup();
    await enableAi();
    const page = await items.createItem(items.newPage({ title: "Ser vs estar" }));
    startOnEntry(page.id);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ask Claude about this page" }));
    expect(within(await tray()).getByText("About: Ser vs estar")).toBeTruthy();
  });

  it("attaches a collection page's vocabulary as a group whose detail the owner picks", async () => {
    const user = userEvent.setup();
    await enableAi();
    const quedar = await items.createItem(items.newLexical({
      term: "quedar",
      meanings: [{ gloss: "to remain", examples: [{ es: "Quedamos a las cinco.", en: "Let's meet at five." }] }],
    }));
    const page = await items.createItem({
      ...items.newPage({ title: "Planes" }),
      linkedKeys: [quedar.id],
      collection: emptyCollection({ enabled: true, groups: [{ id: "group:1", name: "Verbos", itemKeys: [quedar.id] }] }),
    });
    startOnEntry(page.id);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ask Claude about this page" }));
    const shown = await tray();
    expect(within(shown).getByText("About: Planes")).toBeTruthy();
    const preview = () => screen.getByLabelText("Sent for Planes").textContent;
    expect(preview()).toContain("Entry: quedar");
    expect(preview()).not.toContain("Quedamos");
    await user.click(within(shown).getByRole("radio", { name: "+ Examples" }));
    expect(preview()).toContain("Example: Quedamos a las cinco.");
  });

  it("attaches a narrowed Words & phrases list as one group from the hub", async () => {
    const user = userEvent.setup();
    await enableAi();
    for (const term of ["cebolla", "picar", "dormir"]) {
      await items.createItem({ ...items.newLexical({ term, meanings: [{ gloss: `meaning of ${term}` }] }), tags: term === "dormir" ? [] : ["cocina"] });
    }
    const navigation = pushDestination(createNavigation(), { tab: "cuaderno", screen: "lexical" });
    window.history.replaceState(historyStateWithNavigation(null, navigation), "", "/");
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /^Refine/ }));
    await user.selectOptions(screen.getByLabelText("Vocabulary tag"), "cocina");
    await user.click(screen.getByRole("button", { name: /^Ask Claude about these 2/ }));

    const shown = await tray();
    expect(window.history.state.mcNavigation.activeTab).toBe("pregunta");
    expect(within(shown).getByText("About: Tagged “cocina”")).toBeTruthy();
    expect(screen.getByLabelText("Sent for Tagged “cocina”").textContent).toContain("Entry: cebolla");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("forgets queued entries when AI is turned off, so turning it on again replays nothing", async () => {
    const user = userEvent.setup();
    await enableAi();
    const word = await savedWord();
    startOnEntry(word.id);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ask Claude" }));
    await tray();

    const primary = await primaryNav();
    await user.click(within(primary).getByRole("button", { name: "Ajustes" }));
    await user.click(await screen.findByRole("button", { name: /Turn off/ }));
    await waitFor(() => expect(within(primary).queryByRole("button", { name: "Pregunta" })).toBeNull());
    await user.click(await screen.findByRole("checkbox", { name: /spend cap/ }));
    await user.click(screen.getByRole("button", { name: /^Turn on/ }));
    await user.click(await within(primary).findByRole("button", { name: "Pregunta" }));

    expect(await screen.findByLabelText("Your question")).toBeTruthy();
    expect(screen.queryByRole("generic", { name: "Attached to your next question" })).toBeNull();
  });

  it("queues a card from Repaso without leaving the session, and Pregunta has it afterwards", async () => {
    const user = userEvent.setup();
    await enableAi();
    await savedWord("madrugar", { due: true });
    render(<App />);
    const primary = await primaryNav();
    await user.click(await within(primary).findByRole("button", { name: "Pregunta" }));
    await user.click(within(primary).getByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: "Start" }));
    const session = await screen.findByRole("region", { name: "Review session" });
    const before = structuredClone(window.history.state);

    await user.click(within(session).getByRole("button", { name: "Tap to see the meaning" }));
    await user.click(within(session).getByRole("button", { name: "Ask Claude later" }));

    expect(within(session).getByRole("button", { name: "Saved for Pregunta" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(window.history.state).toEqual(before);

    await user.click(within(session).getByRole("button", { name: "Good" }));
    await user.click(await screen.findByRole("button", { name: "Go to Pregunta (1 saved)" }));
    expect(within(await tray()).getByText("About: madrugar")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Review session" })).toBeNull();
    expect(window.history.state.mcStudySession).toBeUndefined();
  });

  it("asks now from Repaso by ending the session, and Back returns to Repaso with no dead session entry", async () => {
    const user = userEvent.setup();
    await enableAi();
    await savedWord("madrugar", { due: true });
    render(<App />);
    const primary = await primaryNav();
    await user.click(await within(primary).findByRole("button", { name: "Repaso" }));
    await user.click(await screen.findByRole("button", { name: "Start" }));
    const session = await screen.findByRole("region", { name: "Review session" });

    await user.click(within(session).getByRole("button", { name: "Tap to see the meaning" }));
    await user.click(within(session).getByRole("button", { name: "Ask now" }));
    await user.click(within(session).getByRole("button", { name: "Ask now and end session" }));

    expect(within(await tray()).getByText("About: madrugar")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Review session" })).toBeNull();
    expect(window.history.state.mcStudySession).toBeUndefined();
    expect(window.history.state.mcNavigation.activeTab).toBe("pregunta");

    act(() => window.history.back());
    await waitFor(() => expect(window.history.state.mcNavigation.activeTab).toBe("repaso"));
    expect(window.history.state.mcStudySession).toBeUndefined();
    expect(await screen.findByRole("button", { name: "Start" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Review session" })).toBeNull();
  });
});
