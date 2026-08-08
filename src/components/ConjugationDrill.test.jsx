// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConjugationDrill from "./ConjugationDrill.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { allEvents } from "../db/events.js";

const FORMS = [
  { tense: "Indicative/Preterite", slot: "yo", form: "saqué" },
  { tense: "Indicative/Preterite", slot: "nosotros", form: "sacamos" },
  { tense: "Indicative/Preterite", slot: "ustedes/ellos", form: "sacaron" },
  { tense: "Indicative/Present", slot: "ustedes/ellos", form: "sacan" },
  { tense: "Subjunctive/Present", slot: "yo", form: "saque" },
];

const card = (overrides = {}) => ({
  itemId: "user:sacar",
  itemKey: "user:sacar",
  dictKey: "dict:wiktionary-es:sacar:verb",
  source: "saved",
  curriculum: null,
  lemma: "sacar",
  verbKey: "lemma:sacar",
  term: "sacar",
  tense: "Indicative/Preterite",
  slot: "ustedes/ellos",
  answer: "sacaron",
  forms: FORMS,
  sessionId: "session-1",
  promptId: "session-1:1",
  sessionKind: "focus",
  cardIndex: 1,
  deckSize: 1,
  ...overrides,
});

async function revealAnswer(user, correct) {
  const label = correct ? "Got it" : "Missed it";
  await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
  await user.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(screen.queryByRole("button", { name: label })).toBeNull());
}

async function typeAndCheck(user, text, { retry = false } = {}) {
  const input = screen.getByLabelText(retry ? "Try the form again" : "Type the form");
  if (text) await user.type(input, text);
  await user.click(screen.getByRole("button", { name: retry ? "Check retry" : "Check" }));
}

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("reveal sessions", () => {
  it("asks one mood-qualified cell and hides the form until tapped", async () => {
    const user = userEvent.setup();
    render(<ConjugationDrill deck={[card()]} onFinish={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText(/Indicative preterite/)).toBeTruthy();
    expect(screen.getByText(/ustedes\/ellos/)).toBeTruthy();
    expect(screen.queryByText("sacaron")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    expect(screen.getByText("sacaron")).toBeTruthy();
  });

  it("names the two command tables by polarity", () => {
    render(<ConjugationDrill deck={[card({ tense: "Imperative Affirmative/Present" })]} onFinish={vi.fn()} />);
    expect(screen.getByText(/Affirmative command/)).toBeTruthy();
  });

  it("advances through an immutable deck and finishes", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<ConjugationDrill deck={[
      card({ deckSize: 2 }),
      card({ term: "poner", lemma: "poner", verbKey: "lemma:poner", answer: "pusieron", promptId: "session-1:2", cardIndex: 2, deckSize: 2 }),
    ]} onFinish={onFinish} />);

    await revealAnswer(user, true);
    expect(screen.getByText("poner")).toBeTruthy();
    await revealAnswer(user, true);
    expect(screen.getByText("Session complete")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to Gym" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("writes one drill event per self-grade and no view or review event", async () => {
    const user = userEvent.setup();
    render(<ConjugationDrill deck={[
      card({ deckSize: 2 }),
      card({ promptId: "session-1:2", cardIndex: 2, deckSize: 2 }),
    ]} onFinish={vi.fn()} />);

    await revealAnswer(user, true);
    await revealAnswer(user, false);
    const events = await allEvents();
    expect(events.map((event) => event.type)).toEqual(["drill_pass", "drill_fail"]);
    expect(events.every((event) => event.itemKey === "user:sacar")).toBe(true);
  });

  it("records the complete additive answer context", async () => {
    const user = userEvent.setup();
    render(<ConjugationDrill deck={[card()]} mode="reveal" onFinish={vi.fn()} />);
    await revealAnswer(user, true);

    const [event] = await allEvents();
    expect(event.metadata).toEqual({
      sessionId: "session-1",
      promptId: "session-1:1",
      sessionKind: "focus",
      source: "saved",
      curriculum: null,
      verbKey: "lemma:sacar",
      lemma: "sacar",
      dictKey: "dict:wiktionary-es:sacar:verb",
      tense: "Indicative/Preterite",
      slot: "ustedes/ellos",
      mode: "reveal",
      verdict: "self",
      diagnosis: null,
      stage: "initial",
      cardIndex: 1,
      deckSize: 1,
    });
  });

  it("logs nothing for an unanswered card", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<ConjugationDrill deck={[card()]} onFinish={onFinish} />);
    await user.click(screen.getByRole("button", { name: /Finish/ }));
    expect(await allEvents()).toEqual([]);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("opens personal and unsaved Core targets honestly", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { rerender } = render(<ConjugationDrill deck={[card()]} onFinish={vi.fn()} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Open saved entry" }));
    expect(onOpen).toHaveBeenLastCalledWith("user:sacar");

    rerender(<ConjugationDrill deck={[card({ itemId: null, itemKey: null, source: "core", openKey: "dict:wiktionary-es:sacar:verb" })]} onFinish={vi.fn()} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "Open dictionary entry" }));
    expect(onOpen).toHaveBeenLastCalledWith("dict:wiktionary-es:sacar:verb");
  });

  it("says so plainly when the deck has no answerable cells", () => {
    render(<ConjugationDrill deck={[]} onFinish={vi.fn()} />);
    expect(screen.getByText("Nothing to drill")).toBeTruthy();
  });
});

describe("typed attempts, retry, and missed round", () => {
  const renderTyped = (cards, props = {}) =>
    render(<ConjugationDrill deck={cards} mode="typed" onFinish={vi.fn()} {...props} />);

  it("accepts an exact initial answer and persists it before Next", async () => {
    const user = userEvent.setup();
    renderTyped([card()]);
    await typeAndCheck(user, "sacaron");

    await waitFor(() => expect(screen.getByText("Exactly right.")).toBeTruthy());
    const [event] = await allEvents();
    expect(event.type).toBe("drill_pass");
    expect(event.metadata).toMatchObject({ verdict: "exact", diagnosis: "exact", stage: "initial" });
    expect(JSON.stringify(event.metadata)).not.toContain("sacaron");
  });

  it("passes an accent slip but keeps it distinct", async () => {
    const user = userEvent.setup();
    renderTyped([card({ term: "hablar", lemma: "hablar", verbKey: "lemma:hablar", answer: "habló", forms: [] })]);
    await typeAndCheck(user, "hablo");
    await waitFor(() => expect(screen.getByText("Right form — mind the accent.")).toBeTruthy());
    const [event] = await allEvents();
    expect(event.type).toBe("drill_pass");
    expect(event.metadata).toMatchObject({ verdict: "accents", diagnosis: "accents", stage: "initial" });
  });

  it("logs and diagnoses the first miss immediately, clears input, and hides the answer", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    renderTyped([card()], { onGraded });
    await typeAndCheck(user, "saqué");

    await waitFor(() => expect(screen.getByText("That form belongs to another person.")).toBeTruthy());
    expect(screen.getByText("Try once more.")).toBeTruthy();
    expect(screen.getByLabelText("Try the form again").value).toBe("");
    expect(screen.queryByText("sacaron")).toBeNull();
    const [event] = await allEvents();
    expect(event.type).toBe("drill_fail");
    expect(event.metadata).toMatchObject({ verdict: "wrong", diagnosis: "wrong_person", stage: "initial" });
    expect(JSON.stringify(event.metadata)).not.toContain("saqué");
    expect(onGraded).toHaveBeenCalledTimes(1);
  });

  it("allows exactly one immediate retry and reports recovery without inflating the score", async () => {
    const user = userEvent.setup();
    renderTyped([card()]);
    await typeAndCheck(user, "saqué");
    await waitFor(() => expect(screen.getByLabelText("Try the form again")).toBeTruthy());
    await typeAndCheck(user, "sacaron", { retry: true });
    await waitFor(() => expect(screen.getByText("Exactly right.")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.getByText(/1 immediate recovery/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Practice 1 missed form" })).toBeTruthy();
    const events = await allEvents();
    expect(events.map((event) => [event.type, event.metadata.stage])).toEqual([
      ["drill_fail", "initial"],
      ["drill_pass", "retry"],
    ]);
  });

  it("reveals after the retry also misses and offers no third retry", async () => {
    const user = userEvent.setup();
    renderTyped([card()]);
    await typeAndCheck(user, "saqué");
    await waitFor(() => expect(screen.getByLabelText("Try the form again")).toBeTruthy());
    await typeAndCheck(user, "sacan", { retry: true });

    await waitFor(() => expect(screen.getByText("sacaron")).toBeTruthy());
    expect(screen.queryByLabelText("Try the form again")).toBeNull();
    expect((await allEvents()).map((event) => event.metadata.stage)).toEqual(["initial", "retry"]);
  });

  it("includes an immediately recovered miss once in the optional missed round", async () => {
    const user = userEvent.setup();
    renderTyped([card()]);
    await typeAndCheck(user, "saqué");
    await waitFor(() => expect(screen.getByLabelText("Try the form again")).toBeTruthy());
    await typeAndCheck(user, "sacaron", { retry: true });
    await waitFor(() => expect(screen.getByText("Exactly right.")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "Practice 1 missed form" }));

    expect(screen.getByText(/Missed · 1 \/ 1/)).toBeTruthy();
    await typeAndCheck(user, "sacaron");
    await waitFor(() => expect(screen.getByText("Exactly right.")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByText("Missed round complete")).toBeTruthy();
    expect(screen.getByText("0/1")).toBeTruthy();
    expect((await allEvents()).map((event) => event.metadata.stage)).toEqual(["initial", "retry", "missed"]);
  });

  it("never offers self-grading over a typed verdict", async () => {
    const user = userEvent.setup();
    renderTyped([card()]);
    await typeAndCheck(user, "sacaron");
    await waitFor(() => expect(screen.getByText("Exactly right.")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Missed it" })).toBeNull();
  });

  it("clears local answer state between prompts", async () => {
    const user = userEvent.setup();
    renderTyped([
      card({ deckSize: 2 }),
      card({ term: "poner", lemma: "poner", verbKey: "lemma:poner", answer: "pusieron", forms: [], promptId: "session-1:2", cardIndex: 2, deckSize: 2 }),
    ]);
    await typeAndCheck(user, "sacaron");
    await waitFor(() => expect(screen.getByText("Exactly right.")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("poner")).toBeTruthy();
    expect(screen.getByLabelText("Type the form").value).toBe("");
  });
});
