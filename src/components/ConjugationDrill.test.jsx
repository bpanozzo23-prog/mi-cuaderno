// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("advances through the deck and finishes", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <ConjugationDrill
        deck={[card(), card({ term: "poner", answer: "pusieron" })]}
        onFinish={onFinish}
        onOpen={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("poner")).toBeTruthy();
    // The answer of the previous card must not carry over to the next one.
    expect(screen.queryByText("pusieron")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByText("¡Ya está!")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Back to Repaso" }));
    expect(onFinish).toHaveBeenCalled();
  });

  it("writes nothing to the log — not a review, and not a view either", async () => {
    const user = userEvent.setup();
    render(
      <ConjugationDrill
        deck={[card(), card({ term: "poner", answer: "pusieron" })]}
        onFinish={vi.fn()}
        onOpen={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));
    await user.click(screen.getByRole("button", { name: "Done" }));

    // Brief §14 defers practice history; a drilled verb must also not gain lookup counts
    // that would quietly change what Repaso enrolls.
    expect(await allEvents()).toEqual([]);
  });

  it("offers no grading buttons at all", async () => {
    const user = userEvent.setup();
    render(<ConjugationDrill deck={[card()]} onFinish={vi.fn()} onOpen={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Tap to see the form" }));

    expect(screen.queryByRole("button", { name: "Got it" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Missed it" })).toBeNull();
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
