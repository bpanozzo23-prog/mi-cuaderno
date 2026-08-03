// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageStarterGallery from "./PageStarterGallery.jsx";

afterEach(cleanup);

describe("page starting points", () => {
  it("offers the approved General and Collection starters", () => {
    render(<PageStarterGallery onChoose={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Blank page/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Blank collection/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Conversational function/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Situation\/context/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Register\/usage/ })).toBeTruthy();
    expect(screen.getByText("Questions · Answers · Reactions and follow-ups")).toBeTruthy();
    expect(screen.getByText("Neutral · Formal · Informal · Use with care")).toBeTruthy();
  });

  it("returns only a profile and editable group seeds, never a stored template id", async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<PageStarterGallery onChoose={onChoose} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Situation\/context/ }));

    expect(onChoose).toHaveBeenCalledWith({
      pageProfile: "collection",
      groupNames: [
        "Essentials",
        "Questions and requests",
        "Responses",
        "Problems and follow-up",
      ],
    });
    expect(onChoose.mock.calls[0][0]).not.toHaveProperty("id");
    expect(onChoose.mock.calls[0][0]).not.toHaveProperty("templateId");
  });
});
