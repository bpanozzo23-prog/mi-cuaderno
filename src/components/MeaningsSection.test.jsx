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

  it("separates examples from the note and keeps their actions in one quiet menu", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    const onAddPhraseFromExample = vi.fn();
    render(
      <MeaningsSection
        item={item()}
        onPatch={onPatch}
        onAddPhraseFromExample={onAddPhraseFromExample}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[0]);

    const exampleGroup = screen.getByRole("group", { name: "Examples for take out" });
    expect(exampleGroup.className).toContain("border-t");
    expect(screen.queryByRole("combobox", { name: "Move example from take out" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add “Sacó la llave.” as a phrase" })).toBeNull();

    const actions = screen.getByRole("button", { name: "Actions for “Sacó la llave.”" });
    expect(actions.className).toContain("min-h-11");
    await user.click(actions);
    expect(screen.getByRole("dialog", { name: "Actions for “Sacó la llave.”" })).toBeTruthy();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Move example from take out" }),
      "meaning:withdraw"
    );
    expect(onPatch).toHaveBeenCalledWith({
      meanings: [
        expect.objectContaining({ id: "meaning:take-out", examples: [] }),
        expect.objectContaining({
          id: "meaning:withdraw",
          examples: [{ es: "Sacó la llave.", en: "She took out the key." }],
        }),
      ],
    });
    expect(screen.queryByRole("dialog", { name: "Actions for “Sacó la llave.”" })).toBeNull();

    await user.click(actions);
    await user.click(screen.getByRole("button", { name: "Add “Sacó la llave.” as a phrase" }));
    expect(onAddPhraseFromExample).toHaveBeenCalledWith({ es: "Sacó la llave.", en: "She took out the key." });
    expect(screen.queryByRole("dialog", { name: "Actions for “Sacó la llave.”" })).toBeNull();
  });

  it("edits one meaning-assigned example in place without changing its assignment or order", async () => {
    const user = userEvent.setup();
    const source = item();
    source.meanings[0].examples.push({ es: "Sacó dos entradas.", en: "She got two tickets." });
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={source} onPatch={onPatch} />);

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[0]);
    await user.click(screen.getByRole("button", { name: "Actions for “Sacó la llave.”" }));
    const edit = screen.getByRole("button", { name: "Edit example “Sacó la llave.”" });
    expect(edit.textContent).toBe("Edit example…");
    await user.click(edit);

    const spanish = screen.getByRole("textbox", { name: "Example in Spanish" });
    const english = screen.getByRole("textbox", { name: "Example in English" });
    expect(spanish.value).toBe("Sacó la llave.");
    expect(english.value).toBe("She took out the key.");

    await user.clear(spanish);
    expect(screen.getByRole("button", { name: "Save example" }).disabled).toBe(true);
    await user.type(spanish, "Sacó las llaves.");
    await user.clear(english);
    await user.type(english, "She took out the keys.");
    await user.click(screen.getByRole("button", { name: "Save example" }));

    expect(onPatch).toHaveBeenCalledTimes(1);
    expect(onPatch.mock.calls[0][0].meanings[0]).toMatchObject({
      id: "meaning:take-out",
      examples: [
        { es: "Sacó las llaves.", en: "She took out the keys." },
        { es: "Sacó dos entradas.", en: "She got two tickets." },
      ],
    });
    expect(onPatch.mock.calls[0][0].meanings[1].id).toBe("meaning:withdraw");
  });

  it("cancels a meaning-example edit without writing", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[0]);
    await user.click(screen.getByRole("button", { name: "Actions for “Sacó la llave.”" }));
    await user.click(screen.getByRole("button", { name: "Edit example “Sacó la llave.”" }));
    await user.type(screen.getByRole("textbox", { name: "Example in Spanish" }), " Unsaved");
    await user.click(screen.getByRole("button", { name: "Cancel example edit" }));

    expect(onPatch).not.toHaveBeenCalled();
    expect(screen.getByText("Sacó la llave.")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Example in Spanish" })).toBeNull();
  });

  it("edits one meaning without changing its personal id", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[1]);
    await user.click(screen.getByRole("button", { name: "Edit meaning withdraw" }));
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

  it("saves interjection as a meaning-level part-of-speech override", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getAllByRole("button", { name: "Expand meaning" })[0]);
    await user.click(screen.getByRole("button", { name: "Edit meaning take out" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Meaning part of speech override" }),
      "interjection"
    );
    await user.click(screen.getByRole("button", { name: "Save meaning" }));

    expect(onPatch.mock.calls[0][0].meanings[0]).toMatchObject({
      id: "meaning:take-out",
      posOverride: "interjection",
    });
  });

  it("keeps organizer changes local until one explicit save", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn().mockResolvedValue(undefined);
    render(<MeaningsSection item={item()} onPatch={onPatch} />);

    await user.click(screen.getByRole("button", { name: /^Organize$/ }));
    await user.click(screen.getAllByRole("button", { name: "Move meaning down" })[0]);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onPatch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Organize$/ }));
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

    await user.click(screen.getByRole("button", { name: /^Organize$/ }));
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

    await user.click(screen.getByRole("button", { name: /^Organize$/ }));
    await user.click(screen.getAllByRole("button", { name: "Delete meaning" })[0]);
    await user.click(screen.getByRole("button", { name: "Preserve context" }));
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    expect(onPatch.mock.calls[0][0].meanings.map((meaning) => meaning.id)).toEqual(["meaning:withdraw"]);
    expect(onPatch.mock.calls[0][0].notes).toContain("Meaning note — take out (sacar la basura)");
    expect(onPatch.mock.calls[0][0].myExamples).toHaveLength(2);
  });
});
