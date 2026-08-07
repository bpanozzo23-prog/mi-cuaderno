// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConjugationDrill from "./ConjugationDrill.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { allEvents } from "../db/events.js";

const card = (overrides = {}) => ({
  itemId: "user:sacar",
  term: "sacar",
  tense: "Indicative/Preterite",
  slot: "ustedes/ellos",
  answer: "sacaron",
  ...overrides,
});

/**
 * Reveal, then grade — the two taps every answered card now takes.
 *
 * The wait is load-bearing, not politeness. `grade()` writes to the log before it advances,
 * and `user.click` resolves when the handler is invoked rather than when its promise
 * settles, so asserting straight after the click races the write. Waiting for the grade
 * button to go tells us the advance actually happened; on the last card the same button
 * disappears into the summary, so one rule covers both. This is the Phase 4c lesson in the
 * guide — a test that passes by winning a race passes against a broken build too.
 *
 * `waitFor` on the absence rather than `waitForElementToBeRemoved`, which throws when the
 * element is already gone — the very outcome being waited for, and the reason it raced
 * both ways depending on how fast the write settled.
 */
async function answer(user, correct) {
  const label = correct ? "Got it" : "Missed it";
  await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
  await user.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(screen.queryByRole("button", { name: label })).toBeNull());
}

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("drilling a conjugation", () => {
  it("asks for one cell and hides the form until it is tapped", async () => {
    const user = userEvent.setup();
    render(<ConjugationDrill deck={[card()]} onFinish={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText(/Preterite/)).toBeTruthy();
    expect(screen.getByText(/ustedes\/ellos/)).toBeTruthy();
    expect(screen.getByText("sacar")).toBeTruthy();
    expect(screen.queryByText("sacaron")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));

    expect(screen.getByText("sacaron")).toBeTruthy();
  });

  it("names the imperative by its mood, where the tense alone would not tell them apart", () => {
    render(
      <ConjugationDrill
        deck={[card({ tense: "Imperative Affirmative/Present" })]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText(/Affirmative/)).toBeTruthy();
  });

  it("advances through the deck as each card is graded, and finishes", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <ConjugationDrill
        deck={[card(), card({ term: "poner", answer: "pusieron" })]}
        onFinish={onFinish}
        onOpen={vi.fn()}
      />
    );

    await answer(user, true);

    expect(screen.getByText("poner")).toBeTruthy();
    // The answer of the previous card must not carry over to the next one.
    expect(screen.queryByText("pusieron")).toBeNull();

    await answer(user, true);

    expect(screen.getByText("¡Ya está!")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to Repaso" }));
    expect(onFinish).toHaveBeenCalled();
  });

  it("grades cannot be offered before the form is shown", async () => {
    render(<ConjugationDrill deck={[card()]} onFinish={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Missed it" })).toBeNull();
  });

  /**
   * Phase 13 reverses Phase 10c's "writes nothing", but only that far: the drill still must
   * not log a `view`, which would inflate the lookup counts that decide what Repaso enrolls,
   * and must not log a `review_*`, which would move a Leitner box on a fact that box does
   * not describe. Asserting the exact set is what makes this catch either mistake.
   */
  it("writes one drill event per graded card, and nothing else", async () => {
    const user = userEvent.setup();
    render(
      <ConjugationDrill
        deck={[card(), card({ term: "poner", answer: "pusieron" })]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    await answer(user, true);
    await answer(user, false);

    const events = await allEvents();
    expect(events.map((event) => event.type)).toEqual(["drill_pass", "drill_fail"]);
    expect(events.every((event) => event.itemKey === "user:sacar")).toBe(true);
  });

  it("records the tense, slot, mode and verdict of each answer", async () => {
    const user = userEvent.setup();
    render(<ConjugationDrill deck={[card()]} mode="reveal" onFinish={vi.fn()} onOpen={vi.fn()} />);

    await answer(user, true);

    const [event] = await allEvents();
    expect(event.metadata).toMatchObject({
      tense: "Indicative/Preterite",
      slot: "ustedes/ellos",
      mode: "reveal",
      verdict: "self",
    });
  });

  it("logs nothing for cards left unanswered when the drill is abandoned", async () => {
    const user = userEvent.setup();
    render(
      <ConjugationDrill
        deck={[card(), card({ term: "poner", answer: "pusieron" })]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    await answer(user, true);
    await user.click(screen.getByRole("button", { name: /Finish/ }));

    expect((await allEvents()).length).toBe(1);
  });

  it("counts the session up on the way out", async () => {
    const user = userEvent.setup();
    render(
      <ConjugationDrill
        deck={[card(), card({ term: "poner", answer: "pusieron" })]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    await answer(user, true);
    await answer(user, false);

    expect(screen.getByText("1/2")).toBeTruthy();
  });

  it("opens the owner's entry from the revealed card", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<ConjugationDrill deck={[card()]} onFinish={vi.fn()} onOpen={onOpen} />);

    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Open the full entry" }));

    expect(onOpen).toHaveBeenCalledWith("user:sacar");
  });

  it("says so plainly when there is nothing to drill", () => {
    render(<ConjugationDrill deck={[]} onFinish={vi.fn()} onOpen={vi.fn()} />);

    expect(screen.getByText("Nothing to drill")).toBeTruthy();
  });
});
