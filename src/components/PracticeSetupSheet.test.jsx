// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PracticeSetupSheet from "./PracticeSetupSheet.jsx";
import { PRACTICE_ORDERS } from "../lib/practice.js";

afterEach(cleanup);

describe("free-practice preflight", () => {
  it("defaults to 20 shuffled and offers 10, All, and current hub order", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <PracticeSetupSheet
        eligibleCount={25}
        omittedCount={3}
        onClose={vi.fn()}
        onStart={onStart}
      />
    );

    expect(screen.getByText("Practice 20 of 25 eligible cards. 3 entries need a meaning.")).toBeTruthy();
    expect(screen.getByText("Free practice stays in this session and does not change your Repaso schedule.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Shuffled" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "10" }));
    expect(screen.getByText("Practice 10 of 25 eligible cards. 3 entries need a meaning.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Hub order" }));
    await user.click(screen.getByRole("button", { name: "Start 10-card practice" }));

    expect(onStart).toHaveBeenCalledWith({
      limit: 10,
      order: PRACTICE_ORDERS.current,
      direction: "forward",
      mode: "reveal",
    });
  });

  it("passes through the All choice", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <PracticeSetupSheet
        eligibleCount={25}
        omittedCount={0}
        onClose={vi.fn()}
        onStart={onStart}
      />
    );

    await user.click(screen.getByRole("button", { name: "All 25" }));
    await user.click(screen.getByRole("button", { name: "Start 25-card practice" }));

    expect(onStart).toHaveBeenCalledWith({
      limit: "all",
      order: PRACTICE_ORDERS.shuffled,
      direction: "forward",
      mode: "reveal",
    });
  });

  it("can ask English first and mark typed answers without remembering either choice", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <PracticeSetupSheet
        eligibleCount={12}
        omittedCount={0}
        onClose={vi.fn()}
        onStart={onStart}
      />
    );

    await user.click(screen.getByRole("radio", { name: "en→es" }));
    await user.click(screen.getByRole("radio", { name: "Type" }));
    await user.click(screen.getByRole("button", { name: "Start 12-card practice" }));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ direction: "reverse", mode: "typed" }));
  });
});
