// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import UsageRecallDrill from "./UsageRecallDrill.jsx";

const recallCard = (overrides = {}) => ({
  id: "usage:recall:Indicative/Preterite",
  skill: "usage",
  answer: "Indicative/Preterite",
  uses: [
    { id: "usage:one", prompt: "A completed past action.", alsoAcceptable: [] },
    { id: "usage:two", prompt: "A sequence of completed past events.", alsoAcceptable: [] },
  ],
  contrasts: ["The preterite closes the action; the imperfect leaves it open."],
  sessionId: "recall-session",
  promptId: "recall-session:1",
  cardIndex: 1,
  deckSize: 1,
  ...overrides,
});

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("Usage recall sessions", () => {
  it("reveals every curated use and stores only a self-grade identity", async () => {
    const user = userEvent.setup();
    const onGraded = vi.fn();
    render(<UsageRecallDrill deck={[recallCard()]} onFinish={vi.fn()} onGraded={onGraded} />);

    expect(screen.getByText("Recall at least one valid use.")).toBeTruthy();
    expect(screen.queryByText("A completed past action.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show uses" }));
    expect(screen.getByText("A completed past action.")).toBeTruthy();
    expect(screen.getByText("A sequence of completed past events.")).toBeTruthy();
    expect(screen.getByText(/leaves it open/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Recalled one" }));

    await waitFor(() => expect(onGraded).toHaveBeenCalledTimes(1));
    const [event] = await allEvents();
    expect(event).toMatchObject({ type: "drill_pass", itemKey: null });
    expect(event.metadata).toEqual({
      skill: "usage",
      cardId: "usage:recall:Indicative/Preterite",
      tense: "Indicative/Preterite",
      mode: "recall",
      verdict: "self",
      sessionId: "recall-session",
      promptId: "recall-session:1",
      sessionKind: "recognition",
      stage: "initial",
      cardIndex: 1,
      deckSize: 1,
    });
    expect(event.metadata).not.toHaveProperty("chosen");
    expect(event.metadata).not.toHaveProperty("verbKey");
    expect(event.metadata).not.toHaveProperty("source");
  });

  it("de-duplicates a repeatedly missed tense for one optional missed attempt", async () => {
    const user = userEvent.setup();
    const repeated = [
      recallCard({ promptId: "recall-session:1", cardIndex: 1, deckSize: 2 }),
      recallCard({ promptId: "recall-session:2", cardIndex: 2, deckSize: 2 }),
    ];
    render(<UsageRecallDrill deck={repeated} onFinish={vi.fn()} rng={() => 0.4} />);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await user.click(screen.getByRole("button", { name: "Show uses" }));
      await user.click(screen.getByRole("button", { name: "Couldn’t recall" }));
      await user.click(await screen.findByRole("button", { name: attempt === 0 ? "Next" : "Done" }));
    }
    expect(screen.getByRole("button", { name: "Practice 1 missed tense" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Practice 1 missed tense" }));
    expect(screen.getByText("Missed round · recall")).toBeTruthy();
    expect(screen.getByText("1 of 1")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Show uses" }));
    await user.click(screen.getByRole("button", { name: "Recalled one" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect((await allEvents()).map((event) => [event.type, event.metadata.stage])).toEqual([
      ["drill_fail", "initial"],
      ["drill_fail", "initial"],
      ["drill_pass", "missed"],
    ]);
  });

  it("requires a second guide tap before ending the session", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onFinish = vi.fn();
    const items = [{
      id: "user:guide",
      type: "page",
      title: "Pretérito guide",
      pageFocus: "grammar",
      grammar: { enabled: true },
    }];
    render(<UsageRecallDrill deck={[recallCard()]} items={items} onFinish={onFinish} onOpen={onOpen} />);

    await user.click(screen.getByRole("button", { name: "Show uses" }));
    await user.click(screen.getByRole("button", { name: "Open your guide · Pretérito guide" }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByText("Opening this guide ends the session. 1 prompt remains.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Open Pretérito guide and end session" }));
    expect(onOpen).toHaveBeenCalledWith("user:guide");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
