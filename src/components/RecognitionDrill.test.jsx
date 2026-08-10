// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import RecognitionDrill from "./RecognitionDrill.jsx";

const card = (overrides = {}) => ({
  id: "usage:preterite-completed",
  skill: "usage",
  prompt: "A completed past action with a clear beginning or end.",
  answer: "Indicative/Preterite",
  contrast: "The preterite is for an action that finished; the imperfect frames an ongoing past.",
  confusables: ["Indicative/Imperfect"],
  options: [
    "Indicative/Present",
    "Indicative/Imperfect",
    "Indicative/Preterite",
    "Indicative/Future",
  ],
  sessionId: "recognition-1",
  promptId: "recognition-1:1",
  cardIndex: 1,
  deckSize: 1,
  ...overrides,
});

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("recognition multiple-choice sessions", () => {
  it("marks objectively and teaches the contrast without an immediate retry", async () => {
    const user = userEvent.setup();
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Indicative imperfect" }));
    await waitFor(() => expect(screen.getByText(/That’s indicative imperfect/)).toBeTruthy());
    expect(screen.getByText(/action that finished/)).toBeTruthy();
    expect(screen.queryByText(/try once more/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("writes only the additive recognition identity and refreshes the event snapshot", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} onGraded={onGraded} />);
    await user.click(screen.getByRole("button", { name: "Indicative imperfect" }));

    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(1));
    const [event] = await allEvents();
    expect(event).toMatchObject({ type: "drill_fail", itemKey: null });
    expect(event.metadata).toEqual({
      skill: "usage",
      cardId: "usage:preterite-completed",
      tense: "Indicative/Preterite",
      mode: "choice",
      chosen: "Indicative/Imperfect",
      sessionId: "recognition-1",
      promptId: "recognition-1:1",
      sessionKind: "recognition",
      stage: "initial",
      cardIndex: 1,
      deckSize: 1,
    });
    expect(event.metadata).not.toHaveProperty("verbKey");
    expect(event.metadata).not.toHaveProperty("slot");
  });

  it("omits chosen on a pass", async () => {
    const user = userEvent.setup();
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Indicative preterite" }));

    const [event] = await allEvents();
    expect(event.type).toBe("drill_pass");
    expect(event.metadata).not.toHaveProperty("chosen");
  });

  it("offers one missed round with the same choices in a different order and reports it separately", async () => {
    const user = userEvent.setup();
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} rng={() => 0.4} />);
    const choices = () => within(screen.getByLabelText("Tense choices"))
      .getAllByRole("button").map((button) => button.textContent);
    const firstOrder = choices();

    await user.click(screen.getByRole("button", { name: "Indicative imperfect" }));
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("0/1")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Practice 1 missed card" }));
    const secondOrder = choices();
    expect(secondOrder).not.toEqual(firstOrder);
    expect([...secondOrder].sort()).toEqual([...firstOrder].sort());

    await user.click(screen.getByRole("button", { name: "Indicative preterite" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.getByText("Missed round complete")).toBeTruthy();
    expect(screen.getByText("Missed round: 1/1")).toBeTruthy();
    expect((await allEvents()).map((event) => [event.type, event.metadata.stage])).toEqual([
      ["drill_fail", "initial"],
      ["drill_pass", "missed"],
    ]);
  });

  it("requires a second tap before a reveal link leaves the session", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <RecognitionDrill
        deck={[card()]}
        onFinish={vi.fn()}
        onOpen={onOpen}
        renderReveal={(_card, _result, controls) => (
          <button type="button" onClick={() => controls.requestOpen("user:guide")}>
            {controls.openArmed === "user:guide" ? "Confirm guide" : "Open guide"}
          </button>
        )}
      />
    );
    await user.click(screen.getByRole("button", { name: "Indicative preterite" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Open guide" })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Open guide" }));
    expect(onOpen).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm guide" }));
    expect(onOpen).toHaveBeenCalledWith("user:guide");
  });
});
