// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TallerScaffold from "./TallerScaffold.jsx";
import { fetchManifest, installDictionary, removeDictionary } from "../db/ref/install.js";
import { buildFixtureDictionary, installFetchStub } from "../test/dictFixture.js";
import { JOURNAL_PROMPTS } from "../lib/journalPrompts.js";

const realFetch = globalThis.fetch;

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  globalThis.fetch = realFetch;
  await removeDictionary();
  vi.restoreAllMocks();
});

const preteritePrompt = JOURNAL_PROMPTS.find((prompt) => prompt.tense === "Indicative/Preterite");
const negativeCommandPrompt = JOURNAL_PROMPTS.find((prompt) => prompt.tense === "Imperative Negative/Present");
const untensedPrompt = JOURNAL_PROMPTS.find((prompt) => prompt.category === "connect" && !prompt.tense);

describe("TallerScaffold", () => {
  it("keeps the target tense's regular endings always visible, and shows none untargeted", async () => {
    render(<TallerScaffold prompt={preteritePrompt} />);
    const endings = screen.getByLabelText("Regular endings");
    expect(endings.textContent.toLowerCase()).toContain("preterite");
    expect(endings.textContent).toContain("aste");
    cleanup();

    render(<TallerScaffold prompt={untensedPrompt} />);
    expect(screen.queryByLabelText("Regular endings")).toBeNull();
  });

  it("discloses the category word bank, and offers no verb lookup without a dictionary", async () => {
    const user = userEvent.setup();
    render(<TallerScaffold prompt={untensedPrompt} />);

    await user.click(screen.getByRole("button", { name: "Apoyos" }));
    expect(screen.getByText("aunque")).toBeTruthy();
    expect(screen.getByText("sin embargo")).toBeTruthy();
    // "Not installed" is not "orphaned": the lookup is simply absent.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByLabelText("Look up a verb")).toBeNull();
  });

  it("looks up a shipped verb's exact forms for the target tense, read-only", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const user = userEvent.setup();
    render(<TallerScaffold prompt={preteritePrompt} />);
    await user.click(screen.getByRole("button", { name: "Apoyos" }));

    const input = await screen.findByLabelText("Look up a verb");
    await user.type(input, "sacar");
    await user.click(screen.getByRole("button", { name: "Search verb" }));

    await waitFor(() => expect(screen.getByText("saqué")).toBeTruthy());
    expect(screen.getByText("sacaste")).toBeTruthy();
    expect(screen.getByText(/sacar · /)).toBeTruthy();
  });

  it("uses the exact imperative table for a command prompt", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const user = userEvent.setup();
    render(<TallerScaffold prompt={negativeCommandPrompt} />);
    expect(screen.queryByLabelText("Regular endings")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Apoyos" }));

    const input = await screen.findByLabelText("Look up a verb");
    await user.type(input, "quejarse");
    await user.click(screen.getByRole("button", { name: "Search verb" }));

    await waitFor(() => expect(screen.getByText("no te quejes")).toBeTruthy());
    expect(screen.getByText(/quejarse · negative command/i)).toBeTruthy();
  });

  it("says plainly when a verb is not in the installed dictionary", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const user = userEvent.setup();
    render(<TallerScaffold prompt={preteritePrompt} />);
    await user.click(screen.getByRole("button", { name: "Apoyos" }));

    const input = await screen.findByLabelText("Look up a verb");
    await user.type(input, "inventarverbo");
    await user.click(screen.getByRole("button", { name: "Search verb" }));

    await waitFor(() => expect(screen.getByText(/No hay un verbo «inventarverbo»/)).toBeTruthy());
  });
});
