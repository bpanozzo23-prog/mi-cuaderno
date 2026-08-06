// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SpeakButton from "./SpeakButton.jsx";

/** A stand-in for the browser's synthesis, which jsdom does not provide. */
function installSynthesis(voices) {
  const spoken = [];
  const listeners = new Set();
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: (utterance) => spoken.push(utterance),
    cancel: vi.fn(),
    addEventListener: (_type, handler) => listeners.add(handler),
    removeEventListener: (_type, handler) => listeners.delete(handler),
  };
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  return { spoken, fireVoicesChanged: () => listeners.forEach((handler) => handler()) };
}

afterEach(() => {
  cleanup();
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
});

describe("the speak button", () => {
  it("speaks the Spanish in a Spanish voice", async () => {
    const user = userEvent.setup();
    const { spoken } = installSynthesis([{ lang: "es-MX", name: "Paulina" }]);
    render(<SpeakButton text="sacar" />);

    await user.click(await screen.findByRole("button", { name: "Play sacar" }));

    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe("sacar");
    expect(spoken[0].voice.lang).toBe("es-MX");
  });

  it("renders nothing at all when the device has no Spanish voice", async () => {
    installSynthesis([{ lang: "en-US", name: "Samantha" }]);
    render(<SpeakButton text="sacar" />);

    // A disabled control would promise something the browser cannot deliver.
    await waitFor(() => expect(screen.queryByRole("button")).toBeNull());
  });

  it("renders nothing when the browser has no speech synthesis at all", () => {
    render(<SpeakButton text="sacar" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("appears once the voice list arrives late, as it usually does", async () => {
    const voices = [];
    const { fireVoicesChanged } = installSynthesis(voices);
    render(<SpeakButton text="sacar" />);

    expect(screen.queryByRole("button")).toBeNull();

    voices.push({ lang: "es-MX", name: "Paulina" });
    fireVoicesChanged();

    expect(await screen.findByRole("button", { name: "Play sacar" })).toBeTruthy();
  });

  it("renders nothing for empty text", () => {
    installSynthesis([{ lang: "es-MX", name: "Paulina" }]);
    render(<SpeakButton text="   " />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not trigger the row it sits inside", async () => {
    const user = userEvent.setup();
    installSynthesis([{ lang: "es-MX", name: "Paulina" }]);
    const onRowClick = vi.fn();
    render(
      <button onClick={onRowClick}>
        <SpeakButton text="sacar" />
      </button>
    );

    await user.click(await screen.findByRole("button", { name: "Play sacar" }));

    // Hearing a word must never also navigate away from it.
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
