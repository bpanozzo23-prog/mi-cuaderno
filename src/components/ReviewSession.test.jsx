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
