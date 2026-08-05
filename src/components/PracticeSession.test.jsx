// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PracticeSession from "./PracticeSession.jsx";
import { allEvents } from "../db/events.js";
import { clearAllPersonalData, db } from "../db/db.js";
import { newMeaning } from "../lib/meanings.js";

const card = (id, over = {}) => ({
  id: `user:${id}`,
  type: "lexical",
  form: "word",
  term: id,
  pos: "",
  meanings: [newMeaning({ id: `meaning:${id}`, gloss: `meaning of ${id}` })],
  notes: "",
  myExamples: [],
  ...over,
});
beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("session-only free practice", () => {
  it("reveals the shared answer, opens optional context, and writes no event", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(
      <PracticeSession
        cards={[card("sacar", {
          meanings: [newMeaning({
            id: "meaning:sacar",
            gloss: "take out",
            usageCue: "sacar la basura",
            note: "Often used for removing something.",
            examples: [{ es: "Saca la basura.", en: "Take out the trash." }],
          })],
        })]}
        onFinish={vi.fn()}
        onOpen={onOpen}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reveal meanings" }));
    expect(screen.getByText("take out")).toBeTruthy();
    expect(screen.getByText("sacar la basura")).toBeTruthy();
    expect(screen.queryByText("Often used for removing something.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show meaning notes and examples" }));
    expect(screen.getByText("Often used for removing something.")).toBeTruthy();
    expect(screen.getByText("Saca la basura.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Open the full entry" }));
    expect(onOpen).toHaveBeenCalledWith("user:sacar");
    expect(await allEvents()).toEqual([]);
  });

  it("offers a shuffled missed-only round and keeps every answer session-local", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <PracticeSession
        cards={[card("uno"), card("dos")]}
        onFinish={onFinish}
        onOpen={vi.fn()}
        random={() => 0}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reveal meanings" }));
    await user.click(screen.getByRole("button", { name: "Got it" }));
    await user.click(screen.getByRole("button", { name: "Reveal meanings" }));
    await user.click(screen.getByRole("button", { name: "Again" }));

    expect(screen.getByText("Round complete")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByText("1 card marked Again.")).toBeTruthy();
    expect(await allEvents()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Practice 1 again" }));
    expect(screen.getByText("dos")).toBeTruthy();
    expect(screen.getByText("Free practice · round 2")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reveal meanings" }));
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.getByText("1/1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Practice .* again/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Back to words & phrases" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(await allEvents()).toEqual([]);
  });

  it("can finish early without answering the current card", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PracticeSession cards={[card("salir")]} onFinish={onFinish} onOpen={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(await allEvents()).toEqual([]);
  });
});
