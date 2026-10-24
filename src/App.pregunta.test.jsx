// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { db, clearAllPersonalData, setPref } from "./db/db.js";
import { AI_API_KEY_PREF, AI_ENABLED_PREF } from "./lib/aiPrefs.js";
import * as aiPrefs from "./lib/aiPrefs.js";
import { createNavigation, historyStateWithNavigation, selectPrimaryTab } from "./lib/navigation.js";

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
