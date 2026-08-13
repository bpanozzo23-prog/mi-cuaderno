// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SimilarMeaningRecallSetupSheet from "./SimilarMeaningRecallSetupSheet.jsx";

afterEach(cleanup);

describe("similar-meaning recall setup", () => {
  it("collapses redundant size choices when the confirmed graph is small", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <SimilarMeaningRecallSetupSheet eligibleCount={8} onClose={vi.fn()} onStart={onStart} />
    );

    expect(screen.getByRole("dialog", { name: "Set up similar-meaning recall" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "All 8" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("button", { name: "10" })).toBeNull();
    expect(screen.queryByRole("button", { name: "20" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Start 8-prompt recall" }));
    expect(onStart).toHaveBeenCalledWith({ limit: "all" });
  });

  it("defaults a larger graph to 20 while retaining 10 and All", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <SimilarMeaningRecallSetupSheet eligibleCount={25} onClose={vi.fn()} onStart={onStart} />
    );

    expect(screen.getByRole("button", { name: "20" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "10" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "All 25" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "10" }));
    await user.click(screen.getByRole("button", { name: "Start 10-prompt recall" }));
    expect(onStart).toHaveBeenCalledWith({ limit: 10 });
  });
});
