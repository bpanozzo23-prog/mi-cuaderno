// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewSession from "./ReviewSession.jsx";
import { db, clearAllPersonalData } from "../db/db.js";
import { allEvents } from "../db/events.js";
import { newMeaning } from "../lib/meanings.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("entry-level review with structured meanings", () => {
  it("grades the lexical entry id once, never an individual meaning id", async () => {
    const user = userEvent.setup();
    const card = {
      id: "user:sacar",
      term: "sacar",
      form: "word",
      pos: "verb",
      meanings: [
        newMeaning({ id: "meaning:remove", gloss: "take out", usageCue: "sacar la basura" }),
        newMeaning({ id: "meaning:withdraw", gloss: "withdraw", usageCue: "sacar dinero" }),
      ],
      notes: "",
      myExamples: [],
      box: 1,
      reason: "tricky",
      tricky: true,
    };
    render(
      <ReviewSession
        cards={[card]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
        onGraded={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tap to see the meaning" }));
    await user.click(screen.getByRole("button", { name: "Got it" }));

    await waitFor(async () => expect(await allEvents()).toHaveLength(1));
    expect((await allEvents())[0]).toMatchObject({ type: "review_pass", itemKey: "user:sacar" });
    expect((await allEvents())[0].itemKey).not.toMatch(/^meaning:/);
  });
});

describe("Phase 7a: reverse cards", () => {
  const reverseCard = (overrides = {}) => ({
    id: "user:madrugar",
    term: "madrugar",
    form: "word",
    pos: "verb",
    direction: "reverse",
    meanings: [
      newMeaning({ id: "meaning:early", gloss: "to get up early", usageCue: "madrugar el lunes" }),
    ],
    notes: "",
    myExamples: [],
    box: 2,
    reason: "reviewing",
    tricky: false,
    ...overrides,
  });

  it("hides the term and its Spanish cue until the answer is revealed", async () => {
    const user = userEvent.setup();
    render(<ReviewSession cards={[reverseCard()]} onFinish={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    // The gloss is the question; everything Spanish is the answer.
    expect(screen.getByText("to get up early")).toBeTruthy();
    expect(screen.queryByText("madrugar")).toBeNull();
    expect(screen.queryByText("madrugar el lunes")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Tap to see the word" }));

    expect(screen.getByText("madrugar")).toBeTruthy();
    expect(screen.getByText("madrugar el lunes")).toBeTruthy();
  });

  it("records the direction on the review event, so the history knows how it was asked", async () => {
    const user = userEvent.setup();
    render(<ReviewSession cards={[reverseCard()]} onFinish={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Tap to see the word" }));
    await user.click(screen.getByRole("button", { name: "Got it" }));

    await waitFor(async () => expect(await allEvents()).toHaveLength(1));
    expect((await allEvents())[0].metadata).toEqual({ direction: "reverse", face: "plain", grade: 2 });
  });

  it("stamps forward on an ordinary card without being told", async () => {
    const user = userEvent.setup();
    const card = reverseCard({ direction: undefined });
    render(<ReviewSession cards={[card]} onFinish={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Tap to see the meaning" }));
    await user.click(screen.getByRole("button", { name: "Missed it" }));

    await waitFor(async () => expect(await allEvents()).toHaveLength(1));
    expect((await allEvents())[0].metadata).toEqual({ direction: "forward", face: "plain", grade: 0 });
  });

  it("shows the ordinary face when a reverse card has no gloss to ask with", () => {
    render(
      <ReviewSession
        cards={[reverseCard({ meanings: [] })]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
        onGraded={vi.fn()}
      />
    );

    expect(screen.getByText("madrugar")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tap to see the meaning" })).toBeTruthy();
  });
});
