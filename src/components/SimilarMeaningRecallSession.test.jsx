// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SimilarMeaningRecallSession from "./SimilarMeaningRecallSession.jsx";
import { clearAllPersonalData, db } from "../db/db.js";
import { allEvents } from "../db/events.js";
import { newMeaning } from "../lib/meanings.js";

const lexical = (term, gloss) => ({
  id: `user:${term}`,
  type: "lexical",
  form: "word",
  term,
  meanings: gloss ? [newMeaning({ id: `meaning:${term}`, gloss })] : [],
});

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(cleanup);

describe("confirmed similar-meaning recall", () => {
  it("reveals direct personal answers, allows one missed round, and writes no history", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const focal = lexical("enojado", "angry");
    const answer = lexical("molesto", "annoyed");
    render(
      <SimilarMeaningRecallSession
        prompts={[{ id: focal.id, focal, neighbors: [answer] }]}
        onFinish={onFinish}
        random={() => 0}
      />
    );

    expect(screen.getByText("enojado")).toBeTruthy();
    expect(screen.queryByText("molesto")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Reveal connected words" }));
    expect(screen.getByText("molesto")).toBeTruthy();
    expect(screen.getByText("annoyed")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Again" }));

    expect(screen.getByText("1 prompt marked Again.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Practice 1 missed prompt" })).toBeTruthy();
    expect(await allEvents()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Practice 1 missed prompt" }));
    expect(screen.getByText("Missed round")).toBeTruthy();
    expect(screen.getByText("enojado")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reveal connected words" }));
    await user.click(screen.getByRole("button", { name: "Again" }));

    expect(screen.getByText("1 prompt still marked Again; no further round is added.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Practice .* missed/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Back to words & phrases" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(await allEvents()).toEqual([]);
  });

  it("can finish before reveal without creating an event", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const focal = lexical("feliz", "happy");
    render(
      <SimilarMeaningRecallSession
        prompts={[{ id: focal.id, focal, neighbors: [lexical("contento", "happy")] }]}
        onFinish={onFinish}
      />
    );

    await user.click(screen.getByRole("button", { name: "Finish" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(await allEvents()).toEqual([]);
  });
});
