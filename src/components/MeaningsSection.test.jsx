// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MeaningsSection from "./MeaningsSection.jsx";
import { newMeaning } from "../lib/meanings.js";

afterEach(cleanup);

function item() {
  return {
    id: "user:sacar",
    type: "lexical",
    term: "sacar",
    notes: "Entry note",
    myExamples: [{ es: "Saca la basura.", en: "Take out the trash." }],
    meanings: [
      newMeaning({
        id: "meaning:take-out",
        gloss: "take out",
        usageCue: "sacar la basura",
        note: "Physical removal",
        examples: [{ es: "Sacó la llave.", en: "She took out the key." }],
      }),
      newMeaning({ id: "meaning:withdraw", gloss: "withdraw", usageCue: "sacar dinero" }),
    ],
  };
}

describe("structured meaning presentation and editing", () => {
  it("shows every gloss and cue while keeping notes collapsed", async () => {
    const user = userEvent.setup();
    render(<MeaningsSection item={item()} onPatch={vi.fn()} />);

    expect(screen.getByText("take out")).toBeTruthy();
    expect(screen.getByText("withdraw")).toBeTruthy();
    expect(screen.getByText("sacar dinero")).toBeTruthy();
    expect(screen.queryByText("Physical removal")).toBeNull();

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[0]);
    expect(screen.getByText("Physical removal")).toBeTruthy();
  });

  it("edits one meaning without changing its personal id", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[1]);
    await user.click(screen.getByRole("button", { name: /Edit this meaning/ }));
    const gloss = screen.getByRole("textbox", { name: "English gloss" });
    await user.clear(gloss);
    await user.type(gloss, "withdraw money");
    await user.click(screen.getByRole("button", { name: "Save meaning" }));

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0][0].meanings[1]).toMatchObject({
      id: "meaning:withdraw",
      gloss: "withdraw money",
    });
  });

  it("keeps organizer changes local until one explicit save", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getByRole("button", { name: /Organize meanings/ }));
    await user.click(screen.getAllByRole("button", { name: "Move meaning down" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onPatch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Organize meanings/ }));
    await user.click(screen.getAllByRole("button", { name: "Move meaning down" })[0]);
    await user.click(screen.getByRole("button", { name: "Save organization" }));
    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0][0].meanings.map((meaning) => meaning.id)).toEqual([
      "meaning:withdraw",
      "meaning:take-out",
    ]);
  });

  it("merges neighbors under the upper id and preserves both examples", async () => {
    const user = userEvent.setup();
    const source = item();
    source.meanings[1].examples = [{ es: "Saco efectivo.", en: "I withdraw cash." }];
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={source} onPatch={onPatch} />);

    await user.click(screen.getByRole("button", { name: /Organize meanings/ }));
    await user.click(screen.getByRole("button", { name: "Merge with next meaning" }));
    await user.click(screen.getByRole("button", { name: /Accept merge/ }));
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    const merged = onPatch.mock.calls[0][0].meanings[0];
    expect(merged.id).toBe("meaning:take-out");
    expect(merged.gloss).toBe("take out; withdraw");
    expect(merged.examples).toHaveLength(2);
  });

  it("can preserve a deleted meaning's note and examples at entry level", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getByRole("button", { name: /Organize meanings/ }));
    await user.click(screen.getAllByRole("button", { name: "Delete meaning" })[0]);
    await user.click(screen.getByRole("button", { name: "Preserve context" }));
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    expect(onPatch.mock.calls[0][0].meanings.map((meaning) => meaning.id)).toEqual(["meaning:withdraw"]);
    expect(onPatch.mock.calls[0][0].notes).toContain("Meaning note — take out (sacar la basura)");
    expect(onPatch.mock.calls[0][0].myExamples).toHaveLength(2);
  });
});
