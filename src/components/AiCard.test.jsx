// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiCard from "./AiCard.jsx";
import { db, clearAllPersonalData, getPref, setPref } from "../db/db.js";
import { AI_ENABLED_PREF, AI_API_KEY_PREF } from "../lib/aiPrefs.js";

const KEY = "sk-ant-owners-key";

const cap = () => screen.getByRole("checkbox");
const keyField = () => screen.getByLabelText(/Anthropic API key/i);
const saveButton = () => screen.getByRole("button", { name: /Save key and turn on/i });

/** Waits out the mount-time preference read, whichever state it lands in. */
const rendered = async () => {
  render(<AiCard />);
  await waitFor(() => expect(screen.getByText("AI feedback")).toBeTruthy());
};

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("turning the feature on", () => {
  it("starts off, and says what gets sent before offering to enable anything", async () => {
    await rendered();

    expect(screen.getByText(/Claude can review a Diario entry/i)).toBeTruthy();
    expect(screen.getByText(/title and text are sent, only to Anthropic/i)).toBeTruthy();
    expect(screen.getByText(/stored in this browser/i)).toBeTruthy();
    expect(await getPref(AI_ENABLED_PREF)).toBe(null);
  });

  it("will not save until the spend cap is acknowledged and a key is typed", async () => {
    const user = userEvent.setup();
    await rendered();

    expect(saveButton().disabled).toBe(true);

    await user.type(keyField(), KEY);
    // A key alone is not enough: §3 makes the cap the condition of the accepted risk.
    expect(saveButton().disabled).toBe(true);

    await user.click(cap());
    expect(saveButton().disabled).toBe(false);
  });

  it("stores the key and the flag, and stops showing the enable form", async () => {
    const user = userEvent.setup();
    await rendered();

    await user.type(keyField(), `  ${KEY}  `);
    await user.click(cap());
    await user.click(saveButton());

    await waitFor(async () => expect(await getPref(AI_ENABLED_PREF)).toBe(true));
    expect(await getPref(AI_API_KEY_PREF)).toBe(KEY);
    expect(screen.getByText(/A Feedback button appears on Diario entries/i)).toBeTruthy();
    // The key is never rendered back — only the fact that one is held.
    expect(document.body.textContent).not.toContain(KEY);
  });
});

describe("once it is on", () => {
  beforeEach(async () => {
    await setPref(AI_API_KEY_PREF, KEY);
    await setPref(AI_ENABLED_PREF, true);
  });

  it("turns off without discarding the key", async () => {
    const user = userEvent.setup();
    await rendered();
    await waitFor(() => expect(screen.getByRole("button", { name: /Turn off/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Turn off/i }));

    await waitFor(async () => expect(await getPref(AI_ENABLED_PREF)).toBe(false));
    expect(await getPref(AI_API_KEY_PREF)).toBe(KEY);
    // Turning it back on asks for the cap again, but not for the key a second time.
    await waitFor(() => expect(screen.getByRole("button", { name: /^Turn on/i })).toBeTruthy());
  });

  it("removes the key on the second tap, leaving no row behind", async () => {
    const user = userEvent.setup();
    await rendered();
    await waitFor(() => expect(screen.getByRole("button", { name: /Remove key/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Remove key/i }));
    // One tap only arms it; the key is still there.
    expect(await getPref(AI_API_KEY_PREF)).toBe(KEY);

    await user.click(screen.getByRole("button", { name: /Tap again to remove/i }));

    await waitFor(async () => expect(await db.prefs.get(AI_API_KEY_PREF)).toBe(undefined));
    expect(await getPref(AI_ENABLED_PREF)).toBe(false);
  });

  it("reports a working key", async () => {
    const user = userEvent.setup();
    await rendered();
    await waitFor(() => expect(screen.getByRole("button", { name: /Test key/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Test key/i }));

    await waitFor(() => expect(screen.getByText(/The key works/i)).toBeTruthy());
  });

  it("reports a rejected key in words the owner can act on", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    const user = userEvent.setup();
    await rendered();
    await waitFor(() => expect(screen.getByRole("button", { name: /Test key/i })).toBeTruthy());

    await user.click(screen.getByRole("button", { name: /Test key/i }));

    await waitFor(() => expect(screen.getByText(/rejected the API key/i)).toBeTruthy());
  });
});

describe("a restored backup", () => {
  it("shows the enable form when the flag survived but the key did not", async () => {
    // Exactly what an import leaves behind: aiEnabled restores, aiApiKey never does.
    await setPref(AI_ENABLED_PREF, true);
    await rendered();

    expect(screen.queryByRole("button", { name: /Test key/i })).toBe(null);
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });
});
