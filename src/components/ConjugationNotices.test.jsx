// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConjugationNotices from "./ConjugationNotices.jsx";

const entry = (number) => ({
  id: `dict:fixture:verb-${String(number).padStart(2, "0")}`,
  lemma: `verb ${String(number).padStart(2, "0")}`,
  pos: "verb",
});

const currentEntry = { id: "dict:fixture:pedir", lemma: "pedir", pos: "verb" };

const evidence = (form = "pido") => [
  {
    label: "yo",
    form,
    emphasis: [[1, 2]],
    source: "cell",
    tense: "Indicative/Present",
    slot: "yo",
  },
];

const notice = (id, title, priority, form) => ({
  id,
  title,
  explanation: `Plain-language explanation for ${title}.`,
  priority,
  evidence: evidence(form),
});

afterEach(cleanup);

describe("What to notice", () => {
  it("shows two lessons first, reveals the rest locally, and emphasizes exact spans", async () => {
    const user = userEvent.setup();
    const analysis = {
      regular: null,
      notices: [
        notice("stem:e-i", "The stem changes e → i", 10, "pido"),
        notice("spelling:gu-g", "Silent u drops", 20, "sigo"),
        notice("future:dr-stem", "The future uses -dr-", 30, "tendré"),
      ],
    };

    render(
      <ConjugationNotices
        entry={currentEntry}
        analysis={analysis}
        familyRows={[]}
        items={[]}
        previousIds={{}}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("What to notice")).toBeTruthy();
    expect(screen.getByText("The stem changes e → i")).toBeTruthy();
    expect(screen.getByText("Silent u drops")).toBeTruthy();
    expect(screen.queryByText("The future uses -dr-")).toBeNull();
    expect(screen.getAllByText("i", { selector: "strong[data-emphasis='true']" }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/vosotros/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show 1 more notice" }));
    expect(screen.getByText("The future uses -dr-")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Show fewer notices" }));
    expect(screen.queryByText("The future uses -dr-")).toBeNull();
  });

  it("puts direct and aliased cuaderno members first, expands four to 20, and reports the remainder", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const members = Array.from({ length: 25 }, (_, index) => entry(index + 1));
    const direct = members[5];
    const aliased = members[7];
    const analysis = {
      regular: null,
      notices: [notice("stem:e-i", "The stem changes e → i", 10, "pido")],
    };

    const { container } = render(
      <ConjugationNotices
        entry={currentEntry}
        analysis={analysis}
        familyRows={[{
          id: "stem:e-i",
          members: [
            currentEntry,
            { ...currentEntry, id: "dict:fixture:duplicate-pedir", lemma: "PEDIR" },
            ...members,
            { ...entry(1), id: "dict:fixture:duplicate-verb-01", lemma: "VERB 01" },
          ],
        }]}
        items={[{ dictKey: direct.id }, { dictKey: "dict:fixture:old-verb-08" }]}
        previousIds={{ "dict:fixture:old-verb-08": aliased.id }}
        onOpen={onOpen}
      />
    );

    let buttons = [...container.querySelectorAll(".conjugation-family-member")];
    expect(buttons).toHaveLength(4);
    expect(buttons.map((button) => button.textContent)).toEqual([
      "verb 06 In your cuaderno",
      "verb 08 In your cuaderno",
      "verb 01",
      "verb 02",
    ]);
    expect(screen.getAllByText("In your cuaderno")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^pedir$/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show more" }));
    buttons = [...container.querySelectorAll(".conjugation-family-member")];
    expect(buttons).toHaveLength(20);
    expect(screen.getByText("5 more verbs in this family.")).toBeTruthy();

    await user.click(buttons[0]);
    expect(onOpen).toHaveBeenCalledWith(direct.id);
  });

  it("assigns an overlapping sibling only to the higher-priority lesson", () => {
    const shared = entry(1);
    const analysis = {
      regular: null,
      notices: [
        notice("stem:e-i", "Higher lesson", 10, "pido"),
        notice("spelling:gu-g", "Lower lesson", 20, "sigo"),
      ],
    };

    render(
      <ConjugationNotices
        entry={currentEntry}
        analysis={analysis}
        familyRows={[
          { id: "stem:e-i", members: [currentEntry, shared] },
          { id: "spelling:gu-g", members: [currentEntry, shared] },
        ]}
        items={[]}
        previousIds={{}}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getAllByText("Shares this pattern")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "verb 01" })).toHaveLength(1);
  });

  it("uses one quiet anchor for regular verbs and never advertises a regular family", () => {
    const { container } = render(
      <ConjugationNotices
        entry={{ id: "dict:fixture:hablar", lemma: "hablar" }}
        analysis={{ regular: { class: "ar", anchor: "hablar" }, notices: [], patternIds: [] }}
        familyRows={[{ id: "regular:ar", members: [entry(1), entry(2)] }]}
        items={[]}
        previousIds={{}}
        onOpen={vi.fn()}
      />
    );

    expect(container.textContent).toMatch(/Regular -ar pattern; follows hablar\./i);
    expect(screen.queryByText("Shares this pattern")).toBeNull();
  });

  it("teaches a singleton pattern without inventing siblings", () => {
    render(
      <ConjugationNotices
        entry={{ id: "dict:fixture:jugar", lemma: "jugar" }}
        analysis={{
          regular: null,
          notices: [notice("stem:u-ue", "The stem changes u → ue", 10, "juego")],
          patternIds: ["stem:u-ue"],
        }}
        familyRows={[{ id: "stem:u-ue", members: [] }]}
        items={[]}
        previousIds={{}}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("The stem changes u → ue")).toBeTruthy();
    expect(screen.queryByText("Shares this pattern")).toBeNull();
  });
});
