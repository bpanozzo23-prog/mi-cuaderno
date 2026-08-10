// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudySessionFrame, { StudySessionProvider } from "./StudySessionFrame.jsx";

afterEach(cleanup);

function Harness() {
  const [active, setActive] = useState(false);
  const [showSession, setShowSession] = useState(true);

  return (
    <StudySessionProvider onActiveChange={setActive}>
      {!active && <div data-testid="app-chrome">Mi cuaderno</div>}
      {showSession && (
        <StudySessionFrame
          title="Review"
          stageLabel="Missed round"
          current={2}
          total={5}
          onFinish={() => setShowSession(false)}
          actions={<button type="button">Next</button>}
        >
          <div>Question card</div>
        </StudySessionFrame>
      )}
    </StudySessionProvider>
  );
}

describe("StudySessionFrame", () => {
  it("owns focus mode, exact progress, stage context, and the action dock", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await waitFor(() => expect(screen.queryByTestId("app-chrome")).toBeNull());
    expect(screen.getByRole("region", { name: "Review session" })).toBeTruthy();
    expect(screen.getByText("2 of 5")).toBeTruthy();
    expect(screen.getByText("Missed round")).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Session progress" }).getAttribute("aria-valuenow")).toBe("2");
    expect(screen.getByRole("button", { name: "Next" }).closest("[data-study-actions]")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(screen.getByTestId("app-chrome")).toBeTruthy());
    expect(screen.queryByRole("region", { name: "Review session" })).toBeNull();
  });

  it("clamps progress rather than exposing an impossible position", () => {
    render(
      <StudySessionFrame title="Forms" current={9} total={3} actions={<span>Done</span>}>
        Card
      </StudySessionFrame>
    );

    const progress = screen.getByRole("progressbar", { name: "Session progress" });
    expect(progress.getAttribute("aria-valuenow")).toBe("3");
    expect(screen.getByText("3 of 3")).toBeTruthy();
  });
});
