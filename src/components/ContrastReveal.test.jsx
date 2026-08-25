// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CONTRAST_CARDS } from "../lib/contrastContent.js";
import ContrastReveal from "./ContrastReveal.jsx";

const byId = (id) => CONTRAST_CARDS.find((card) => card.id === id);
const guide = (id, title) => ({ id, type: "page", title, pageFocus: "grammar", grammar: { enabled: true } });

afterEach(cleanup);

describe("Contrast reveal", () => {
  it("shows the completed sentence and its gloss after answering", () => {
    render(<ContrastReveal card={byId("contrast:ser-estar:profession")} />);
    expect(screen.getByText(/Mi hermana es médica\./)).toBeTruthy();
    expect(screen.getByText("My sister is a doctor.")).toBeTruthy();
    expect(screen.queryByText("Also natural")).toBeNull();
  });

  it("names a legitimately acceptable alternative that was kept out of the distractors", () => {
    render(<ContrastReveal card={byId("contrast:por-para:destination")} />);
    expect(screen.getByText("Also natural")).toBeTruthy();
    expect(screen.getByText(/«a» can also be natural here/)).toBeTruthy();
  });

  it("links Grammar guides on multi-word terms only, so 'para' never matches Comparativos", async () => {
    const user = userEvent.setup();
    const requestOpen = vi.fn();
    const items = [
      guide("user:ser", "Ser y estar"),
      guide("user:por", "Por vs. para"),
      guide("user:comp", "Comparativos"),
      guide("user:obs", "Observaciones"),
    ];
    const controls = { requestOpen, openArmed: null, remaining: 3 };

    const porPara = render(<ContrastReveal card={byId("contrast:por-para:gift")} items={items} controls={controls} />);
    expect(screen.getAllByRole("button", { name: /Open your guide/ }).map((button) => button.textContent))
      .toEqual(["Open your guide · Por vs. para"]);
    await user.click(screen.getByRole("button", { name: /Por vs\. para/ }));
    expect(requestOpen).toHaveBeenCalledWith("user:por");
    porPara.unmount();

    const serEstar = render(<ContrastReveal card={byId("contrast:ser-estar:keys")} items={items} controls={{ ...controls, openArmed: "user:ser" }} />);
    expect(screen.getByRole("button", { name: "Open Ser y estar and end session" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/ends the session\. 3 prompts remain/);
    expect(screen.queryByText(/Observaciones/)).toBeNull();
    serEstar.unmount();

    render(
      <ContrastReveal
        card={byId("contrast:connectors:cause-party")}
        items={[...items, guide("user:con", "Conectores: pero, aunque, sin embargo")]}
        controls={controls}
      />
    );
    expect(screen.getAllByRole("button", { name: /Open your guide/ }).map((button) => button.textContent))
      .toEqual(["Open your guide · Conectores: pero, aunque, sin embargo"]);
    expect(screen.getByText(/¿Por qué no viniste a la fiesta\? — porque estaba enfermo\./)).toBeTruthy();
  });
});
