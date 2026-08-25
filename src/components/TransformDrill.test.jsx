// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import { TRANSFORM_CARDS } from "../lib/transformContent.js";
import TransformDrill from "./TransformDrill.jsx";

const card = (id, overrides = {}) => ({
  ...TRANSFORM_CARDS.find((row) => row.id === id),
  sessionId: "transform-session",
  promptId: "transform-session:1",
  cardIndex: 1,
  deckSize: 1,
  ...overrides,
});

const VENIR = {
  tenses: {
    "Indicative/Present": { yo: "vengo", "tú": "vienes", "él/ella/usted": "viene", nosotros: "venimos", "ustedes/ellos": "vienen" },
    "Subjunctive/Present": { yo: "venga", "tú": "vengas", "él/ella/usted": "venga", nosotros: "vengamos", "ustedes/ellos": "vengan" },
  },
};
const withVenir = { saved: [], core: [{ lemma: "venir", conjugation: VENIR }] };
const noDictionary = { saved: [], core: [] };

async function typeAndCheck(user, text, { retry = false } = {}) {
  await user.type(screen.getByLabelText(retry ? "Try the form again" : "Type the form"), text);
  await user.click(screen.getByRole("button", { name: retry ? "Check retry" : "Check" }));
}

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("Transform sessions", () => {
  it("grades an exact form without a dictionary, reveals the sentence, and stores no typed text or verb identity", async () => {
    const user = userEvent.setup();
    const frame = card("transform:doubt:venir-viene");
    render(<TransformDrill deck={[frame]} library={noDictionary} onFinish={vi.fn()} />);

    expect(screen.getByText("Transform · Doubt & denial")).toBeTruthy();
    expect(screen.getByText("Sé que viene mañana.")).toBeTruthy();
    expect(screen.getByText("Dudo que")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check" }).disabled).toBe(true);
    await typeAndCheck(user, "venga");

    expect(await screen.findByText("Exactly right.")).toBeTruthy();
    expect(screen.getByText("Dudo que venga mañana.")).toBeTruthy();
    expect(screen.getByText("I doubt he's coming tomorrow.")).toBeTruthy();
    expect(screen.queryByText(/present subjunctive/)).toBeNull();
    const [event] = await allEvents();
    expect(event).toMatchObject({ type: "drill_pass", itemKey: null });
    expect(event.metadata).toEqual({
      skill: "transform",
      cardId: "transform:doubt:venir-viene",
      tense: "Subjunctive/Present",
      mode: "typed",
      verdict: "exact",
      diagnosis: "exact",
      sessionId: "transform-session",
      promptId: "transform-session:1",
      sessionKind: "recognition",
      stage: "initial",
      cardIndex: 1,
      deckSize: 1,
    });
    for (const key of ["typed", "verbKey", "slot", "lemma", "source", "curriculum"]) {
      expect(event.metadata).not.toHaveProperty(key);
    }
  });

  it("diagnoses a kept indicative with the table, allows one unrevealed retry, shows the paradigm, and replays the miss", async () => {
    const user = userEvent.setup();
    const frame = card("transform:doubt:venir-viene");
    render(<TransformDrill deck={[frame]} library={withVenir} onFinish={vi.fn()} rng={() => 0.4} />);

    await typeAndCheck(user, "viene");
    expect(await screen.findByText(/That form belongs to another tense — the trigger asks for the subjunctive\. Try once more\./)).toBeTruthy();
    expect(screen.queryByText("Dudo que venga mañana.")).toBeNull();
    expect(screen.getByLabelText("Try the form again").value).toBe("");

    await typeAndCheck(user, "venga", { retry: true });
    expect(await screen.findByText("Exactly right.")).toBeTruthy();
    expect(screen.getByText("venir · present subjunctive")).toBeTruthy();
    expect(screen.getByText("vengamos")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));
    // The initial miss stands: a recovered retry never inflates first-attempt accuracy.
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.getByText(/1 immediate recovery/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Practice 1 missed frame" }));
    expect(screen.getByText("Missed round")).toBeTruthy();
    await typeAndCheck(user, "vengas");
    expect(await screen.findByText("That is the subjunctive of another person.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByText("Missed round complete")).toBeTruthy();
    expect(screen.getByText("Missed round: 0/1")).toBeTruthy();

    const events = await allEvents();
    expect(events.map((event) => [event.type, event.metadata.stage, event.metadata.diagnosis])).toEqual([
      ["drill_fail", "initial", "wrong_tense"],
      ["drill_pass", "retry", "exact"],
      ["drill_fail", "missed", "wrong_person"],
    ]);
    expect(events.every((event) => !Object.values(event.metadata).includes("viene"))).toBe(true);
  });

  it("accepts a non-colliding accent slip and names it", async () => {
    const user = userEvent.setup();
    render(<TransformDrill deck={[card("transform:wish:dar-da")]} library={noDictionary} onFinish={vi.fn()} />);

    await typeAndCheck(user, "de");
    expect(await screen.findByText("Right form — mind the accent.")).toBeTruthy();
    expect(screen.getByText("Espero que me dé su número.")).toBeTruthy();
    const [event] = await allEvents();
    expect(event.type).toBe("drill_pass");
    expect(event.metadata).toMatchObject({ verdict: "accents", diagnosis: "accents" });
  });

  it("offers a Grammar guide after the reveal and needs a second tap to leave the session", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onFinish = vi.fn();
    const items = [
      { id: "user:subj", type: "page", title: "El subjuntivo", pageFocus: "grammar", grammar: { enabled: true } },
      { id: "user:other", type: "page", title: "Comparativos", pageFocus: "grammar", grammar: { enabled: true } },
    ];
    render(<TransformDrill deck={[card("transform:wish:hacer-haces")]} library={noDictionary} items={items} onFinish={onFinish} onOpen={onOpen} />);

    expect(screen.queryByRole("button", { name: /Open your guide/ })).toBeNull();
    await typeAndCheck(user, "hagas");
    await waitFor(() => expect(screen.getByRole("button", { name: "Open your guide · El subjuntivo" })).toBeTruthy());
    expect(screen.queryByText(/Comparativos/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open your guide · El subjuntivo" }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/ends the session\. 1 prompt remains/);
    await user.click(screen.getByRole("button", { name: "Open El subjuntivo and end session" }));
    expect(onOpen).toHaveBeenCalledWith("user:subj");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
