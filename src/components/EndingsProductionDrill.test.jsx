// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import { GYM_SLOTS } from "../lib/conjugationGym.js";
import { TENSE_ENDINGS } from "../lib/recognitionContent.js";
import EndingsProductionDrill from "./EndingsProductionDrill.jsx";

const card = (id, overrides = {}) => ({
  ...TENSE_ENDINGS.find((row) => row.id === id),
  sessionId: "endings-session",
  promptId: "endings-session:1",
  cardIndex: 1,
  deckSize: 1,
  ...overrides,
});

async function fillRow(user, endings) {
  for (let index = 0; index < GYM_SLOTS.length; index += 1) {
    await user.type(screen.getByLabelText(`${GYM_SLOTS[index]} ending`), endings[index]);
  }
}

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("Typed Endings sessions", () => {
  it("requires all five fields, works without a dictionary, and stores no typed text", async () => {
    const user = userEvent.setup();
    const row = card("endings:indicative-present-ar");
    render(<EndingsProductionDrill deck={[row]} library={{ saved: [], core: [] }} onFinish={vi.fn()} />);

    expect(screen.getAllByRole("textbox")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Check endings" }).disabled).toBe(true);
    await fillRow(user, row.endings);
    expect(screen.getByRole("button", { name: "Check endings" }).disabled).toBe(false);
    await user.click(screen.getByRole("button", { name: "Check endings" }));

    expect(await screen.findByText("Every ending is exact.")).toBeTruthy();
    expect(screen.getByText("Complete pattern")).toBeTruthy();
    expect(screen.getByText(/Install the offline dictionary/)).toBeTruthy();
    const [event] = await allEvents();
    expect(event).toMatchObject({ type: "drill_pass", itemKey: null });
    expect(event.metadata).toEqual({
      skill: "endings",
      cardId: "endings:indicative-present-ar",
      tense: "Indicative/Present",
      mode: "typed",
      verdict: "exact",
      slotVerdicts: Object.fromEntries(GYM_SLOTS.map((slot) => [slot, "exact"])),
      sessionId: "endings-session",
      promptId: "endings-session:1",
      sessionKind: "recognition",
      stage: "initial",
      cardIndex: 1,
      deckSize: 1,
    });
    expect(event.metadata).not.toHaveProperty("typed");
    expect(event.metadata).not.toHaveProperty("verbKey");
    expect(event.metadata).not.toHaveProperty("slot");
    expect(event.metadata).not.toHaveProperty("source");
    expect(event.metadata).not.toHaveProperty("curriculum");
  });

  it("locks passing fields, retries only failures unrevealed, and still offers the row later", async () => {
    const user = userEvent.setup();
    const row = card("endings:indicative-preterite-ar");
    render(<EndingsProductionDrill deck={[row]} library={{ saved: [], core: [] }} onFinish={vi.fn()} rng={() => 0.4} />);

    await fillRow(user, ["é", "not-it", "ó", "amos", "aron"]);
    await user.click(screen.getByRole("button", { name: "Check endings" }));
    expect(await screen.findByText("Keep the passing endings. Try the failed endings once more.")).toBeTruthy();
    expect(screen.queryByText("Complete pattern")).toBeNull();
    expect(screen.getByLabelText("yo ending").disabled).toBe(true);
    expect(screen.getByLabelText("yo ending").value).toBe("é");
    expect(screen.getByLabelText("tú ending").disabled).toBe(false);
    expect(screen.getByLabelText("tú ending").value).toBe("");

    await user.type(screen.getByLabelText("tú ending"), "aste");
    await user.click(screen.getByRole("button", { name: "Check retry" }));
    expect(await screen.findByText("Every ending is exact.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("button", { name: "Practice 1 missed row" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Practice 1 missed row" }));
    expect(screen.getByText("Missed round · production")).toBeTruthy();
    expect(screen.getByText("1 of 1")).toBeTruthy();
    await fillRow(user, row.endings);
    await user.click(screen.getByRole("button", { name: "Check endings" }));
    await user.click(await screen.findByRole("button", { name: "Done" }));
    expect(screen.getByText("Missed round complete")).toBeTruthy();
    expect(screen.getByText("Missed round: 1/1")).toBeTruthy();

    const events = await allEvents();
    expect(events.map((event) => [event.type, event.metadata.stage])).toEqual([
      ["drill_fail", "initial"],
      ["drill_pass", "retry"],
      ["drill_pass", "missed"],
    ]);
    expect(events.every((event) => !Object.values(event.metadata).includes("not-it"))).toBe(true);
  });

  it("names an accent-assisted row and asks for haber on a perfect row", async () => {
    const user = userEvent.setup();
    const imperfect = card("endings:indicative-imperfect-er-ir");
    const { unmount } = render(<EndingsProductionDrill deck={[imperfect]} library={{ saved: [], core: [] }} onFinish={vi.fn()} />);
    await fillRow(user, ["ia", "ias", "ia", "iamos", "ian"]);
    await user.click(screen.getByRole("button", { name: "Check endings" }));
    expect(await screen.findByText("Correct — accent slip accepted.")).toBeTruthy();
    expect((await allEvents())[0].metadata.verdict).toBe("accents");
    unmount();

    const perfect = card("endings:indicative-present-perfect");
    render(<EndingsProductionDrill deck={[perfect]} library={{ saved: [], core: [] }} onFinish={vi.fn()} />);
    expect(screen.getByText(/five tense-specific forms of/)).toBeTruthy();
    expect(screen.getByText("haber", { selector: "em" })).toBeTruthy();
  });
});
