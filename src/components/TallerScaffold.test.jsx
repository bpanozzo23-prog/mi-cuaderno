// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TallerScaffold from "./TallerScaffold.jsx";
import { fetchManifest, installDictionary, removeDictionary } from "../db/ref/install.js";
import { buildFixtureDictionary, installFetchStub } from "../test/dictFixture.js";
import { JOURNAL_PROMPTS } from "../lib/journalPrompts.js";
import * as referenceEntries from "../db/ref/entries.js";
import { deferred, settleAsyncCalls } from "../test/async.js";

const realFetch = globalThis.fetch;
const realDictionaryInstalled = referenceEntries.dictionaryInstalled;
let readiness;
let referenceWork;
let readinessGate;

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  readiness = vi.spyOn(referenceEntries, "dictionaryInstalled");
  referenceWork = [readiness, vi.spyOn(referenceEntries, "getVerbTablesByLemma")];
  readinessGate = null;
});

afterEach(async () => {
  try {
    readinessGate?.resolve();
    cleanup();
    await act(async () => { await settleAsyncCalls(...referenceWork); });
    await removeDictionary();
  } finally {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  }
});

const preteritePrompt = JOURNAL_PROMPTS.find((prompt) => prompt.id === "narrate-routine");
const compositePastPrompt = JOURNAL_PROMPTS.find((prompt) => prompt.id === "narrate-scene");
const redoPrompt = JOURNAL_PROMPTS.find((prompt) => prompt.id === "imagine-redo");
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

  it("shows every active ending set and swaps them when the tier changes", () => {
    const { rerender } = render(<TallerScaffold prompt={compositePastPrompt} />);
    let endings = screen.getByLabelText("Regular endings");
    expect(endings.textContent.toLowerCase()).toContain("preterite");
    expect(endings.textContent.toLowerCase()).toContain("imperfect");
    expect(endings.textContent).toContain("aste");
    expect(endings.textContent).toContain("aba");

    rerender(<TallerScaffold prompt={redoPrompt} tier="standard" />);
    endings = screen.getByLabelText("Regular endings");
    expect(endings.textContent.toLowerCase()).toContain("subjunctive imperfect");
    expect(endings.textContent.toLowerCase()).toContain("indicative conditional");

    rerender(<TallerScaffold prompt={redoPrompt} tier="harder" />);
    endings = screen.getByLabelText("Regular endings");
    expect(endings.textContent.toLowerCase()).toContain("subjunctive past perfect");
    expect(endings.textContent.toLowerCase()).toContain("indicative conditional perfect");
  });

  it.each([false, true])("settles verb lookup availability without hiding the word bank: installed=%s", async (installed) => {
    if (installed) {
      installFetchStub(await buildFixtureDictionary());
      await installDictionary(await fetchManifest());
    }
    readinessGate = deferred();
    readiness.mockImplementationOnce(async () => {
      const result = await realDictionaryInstalled();
      await readinessGate.promise;
      return result;
    });
    const user = userEvent.setup();
    render(<TallerScaffold prompt={untensedPrompt} />);

    await user.click(screen.getByRole("button", { name: "Apoyos" }));
    expect(screen.getByText("aunque")).toBeTruthy();
    expect(screen.getByText("sin embargo")).toBeTruthy();
    expect(readiness).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Look up a verb")).toBeNull();
    await act(async () => {
      readinessGate.resolve();
      await settleAsyncCalls(readiness);
    });
    if (installed) expect(screen.getByLabelText("Look up a verb")).toBeTruthy();
    else expect(screen.queryByLabelText("Look up a verb")).toBeNull();
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

  it("lets a composite prompt choose which target the verb lookup uses", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const user = userEvent.setup();
    render(<TallerScaffold prompt={compositePastPrompt} />);
    await user.click(screen.getByRole("button", { name: "Apoyos" }));

    const tenseSelect = await screen.findByLabelText("Verb lookup tense");
    await user.selectOptions(tenseSelect, "Indicative/Preterite");
    await user.type(screen.getByLabelText("Look up a verb"), "sacar");
    await user.click(screen.getByRole("button", { name: "Search verb" }));

    await waitFor(() => expect(screen.getByText("saqué")).toBeTruthy());
    expect(screen.getByText("sacaste")).toBeTruthy();
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
