// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import RecognitionDrill from "./RecognitionDrill.jsx";
import * as eventApi from "../db/events.js";
import { deferred, settleAsyncCalls } from "../test/async.js";

const realLogDrill = eventApi.logDrill;
let logging;
let logGate;

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
  logging = vi.spyOn(eventApi, "logDrill");
  logGate = null;
});

afterEach(async () => {
  try {
    logGate?.resolve();
    cleanup();
    await act(async () => { await settleAsyncCalls(logging); });
  } finally {
    vi.restoreAllMocks();
  }
});

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
    const onGraded = vi.fn();
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} onGraded={onGraded} />);
    await user.click(screen.getByRole("button", { name: "Indicative preterite" }));

    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(1));
    const [event] = await allEvents();
    expect(event.type).toBe("drill_pass");
    expect(event.metadata).not.toHaveProperty("chosen");
  });

  it("offers one missed round with the same choices in a different order and reports it separately", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} onGraded={onGraded} rng={() => 0.4} />);
    const choices = () => within(screen.getByLabelText("Tense choices"))
      .getAllByRole("button").map((button) => button.textContent);
    const firstOrder = choices();

    await user.click(screen.getByRole("button", { name: "Indicative imperfect" }));
    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.getByText("0/1")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Practice 1 missed card" }));
    const secondOrder = choices();
    expect(secondOrder).not.toEqual(firstOrder);
    expect([...secondOrder].sort()).toEqual([...firstOrder].sort());

    await user.click(screen.getByRole("button", { name: "Indicative preterite" }));
    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(2));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.getByText("Missed round complete")).toBeTruthy();
    expect(screen.getByText("Missed round: 1/1")).toBeTruthy();
    expect((await allEvents()).map((event) => [event.type, event.metadata.stage])).toEqual([
      ["drill_fail", "initial"],
      ["drill_pass", "missed"],
    ]);
  });

  it("keeps grading pending until the real event write finishes, without accepting a second answer", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    logGate = deferred();
    logging.mockImplementationOnce(async (...args) => {
      await logGate.promise;
      return realLogDrill(...args);
    });
    render(<RecognitionDrill deck={[card()]} onFinish={vi.fn()} onGraded={onGraded} />);

    await user.click(screen.getByRole("button", { name: "Indicative imperfect" }));
    expect(logging).toHaveBeenCalledTimes(1);
    expect(onGraded).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(await allEvents()).toEqual([]);
    expect(within(screen.getByLabelText("Tense choices")).getAllByRole("button")
      .every((button) => button.disabled)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Indicative preterite" }));
    expect(logging).toHaveBeenCalledTimes(1);

    await act(async () => {
      logGate.resolve();
      await settleAsyncCalls(logging);
    });
    expect(onGraded).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
    expect((await allEvents()).map((event) => event.type)).toEqual(["drill_fail"]);
  });

  it("labels Contrasts options verbatim, teaches the rule, and persists pair + answer without a tense", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    const contrastCard = card({
      id: "contrast:ser-estar:profession",
      skill: "contrast",
      pair: "ser-estar",
      prompt: "Mi hermana ___ médica.",
      gloss: "My sister is a doctor.",
      answer: "es",
      contrast: "Professions and identity take ser.",
      confusables: ["está", "son", "era"],
      alsoAcceptable: [],
      vocabulary: ["es", "está", "son", "era"],
      options: ["está", "es", "era", "son"],
    });
    render(<RecognitionDrill deck={[contrastCard]} title="Contrasts" onFinish={vi.fn()} onGraded={onGraded} />);

    expect(screen.getByText("Which verb?")).toBeTruthy();
    expect(screen.getByText("Mi hermana ___ médica.")).toBeTruthy();
    expect(within(screen.getByLabelText("Choices")).getAllByRole("button").map((button) => button.textContent))
      .toEqual(["está", "es", "era", "son"]);

    await user.click(screen.getByRole("button", { name: "está" }));
    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/That’s «está»\. Professions and identity take ser\./)).toBeTruthy();
    expect(screen.getByRole("button", { name: "está" }).disabled).toBe(true);

    const [event] = await allEvents();
    expect(event).toMatchObject({ type: "drill_fail", itemKey: null });
    expect(event.metadata).toEqual({
      skill: "contrast",
      cardId: "contrast:ser-estar:profession",
      pair: "ser-estar",
      answer: "es",
      mode: "choice",
      chosen: "está",
      sessionId: "recognition-1",
      promptId: "recognition-1:1",
      sessionKind: "recognition",
      stage: "initial",
      cardIndex: 1,
      deckSize: 1,
    });
    expect(event.metadata).not.toHaveProperty("tense");
    expect(event.metadata).not.toHaveProperty("verbKey");
    expect(event.metadata).not.toHaveProperty("slot");

    // The missed round keeps the same four forms in a new order.
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "Practice 1 missed card" }));
    const again = within(screen.getByLabelText("Choices")).getAllByRole("button").map((button) => button.textContent);
    expect([...again].sort()).toEqual(["era", "es", "está", "son"]);
    expect(again).not.toEqual(["está", "es", "era", "son"]);
  });

  it("requires a second tap before a reveal link leaves the session", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onFinish = vi.fn();
    render(
      <RecognitionDrill
        deck={[card()]}
        onFinish={onFinish}
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
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
