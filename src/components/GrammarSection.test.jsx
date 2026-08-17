// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GrammarSection from "./GrammarSection.jsx";
import {
  deleteGrammarExample,
  deleteGrammarSection,
  saveGrammarDetails,
  saveGrammarExample,
  saveGrammarOrganization,
  saveGrammarSection,
} from "../db/pageStructures.js";

vi.mock("../db/pageStructures.js", () => ({
  deleteGrammarExample: vi.fn(),
  deleteGrammarSection: vi.fn(),
  saveGrammarDetails: vi.fn(),
  saveGrammarExample: vi.fn(),
  saveGrammarOrganization: vi.fn(),
  saveGrammarSection: vi.fn(),
}));

const stagedCandidates = [{ kind: "personal", itemId: "user:new-vocabulary" }];

vi.mock("./CollectionAddVocabularySheet.jsx", () => ({
  default: ({ targetLabel, memberLocations, onCancel, onCommit }) => (
    <div aria-label="Test vocabulary picker">
      <div>{targetLabel}</div>
      <div data-testid="existing-location">{memberLocations.get("user:word") || "not attached"}</div>
      <button type="button" onClick={() => onCommit(stagedCandidates)}>Commit vocabulary</button>
      <button type="button" onClick={onCancel}>Cancel vocabulary</button>
    </div>
  ),
}));

const SECTION_ONE = "grammar-section:11111111-1111-4111-8111-111111111111";
const SECTION_TWO = "grammar-section:22222222-2222-4222-8222-222222222222";
const SECTION_CHILD = "grammar-section:33333333-3333-4333-8333-333333333333";
const EXAMPLE_ONE = "grammar-example:11111111-1111-4111-8111-111111111111";
const EXAMPLE_TWO = "grammar-example:22222222-2222-4222-8222-222222222222";
const SAME_CAPTURE = "source-capture:11111111-1111-4111-8111-111111111111";
const EXTERNAL_CAPTURE = "source-capture:22222222-2222-4222-8222-222222222222";
const HIDDEN_CAPTURE = "source-capture:33333333-3333-4333-8333-333333333333";

const exampleOne = {
  id: EXAMPLE_ONE,
  es: "Yo hablaba con ella.",
  en: "I was talking with her.",
  note: "An ongoing background action.",
  itemKeys: ["user:word"],
  sourceCaptureRef: null,
};

const exampleTwo = {
  id: EXAMPLE_TWO,
  es: "Ayer hablé con ella.",
  en: "Yesterday I spoke with her.",
  note: "A bounded event.",
  itemKeys: [],
  sourceCaptureRef: null,
};

function page(overrides = {}) {
  return {
    id: "user:grammar-page",
    type: "page",
    title: "Preterite vs imperfect",
    source: {
      enabled: true,
      captures: [{
        id: SAME_CAPTURE,
        type: "passage",
        text: "Cuando era niña, visitaba a mi abuela.",
        location: "Chapter 2",
        reflection: "",
        itemKeys: [],
      }],
    },
    grammar: {
      enabled: true,
      keyIdea: "Choose a tense by how the speaker frames the past action.",
      sections: [
        {
          id: SECTION_ONE,
          parentId: null,
          name: "Formation",
          explanation: "Use the imperfect for background and repeated actions.",
          pattern: "stem + imperfect ending",
          examples: [exampleOne],
        },
        {
          id: SECTION_TWO,
          parentId: null,
          name: "Comparison",
          explanation: "Compare bounded and ongoing actions.",
          pattern: "preterite ↔ imperfect",
          examples: [exampleTwo],
        },
      ],
    },
    ...overrides,
  };
}

function hierarchicalPage() {
  const current = page();
  const [formation, comparison] = current.grammar.sections;
  return {
    ...current,
    grammar: {
      ...current.grammar,
      sections: [
        formation,
        {
          id: SECTION_CHILD,
          parentId: SECTION_ONE,
          name: "SPOCK",
          explanation: "Speech, perceptions, occurrences, certainty, and knowledge.",
          pattern: "",
          examples: [],
        },
        comparison,
      ],
    },
  };
}

const word = {
  id: "user:word",
  type: "lexical",
  term: "hablar",
  dictKey: "dict:hablar",
};

const externalSource = {
  id: "user:audio-source",
  type: "page",
  title: "Audio source",
  source: {
    enabled: true,
    captures: [{
      id: EXTERNAL_CAPTURE,
      type: "passage",
      text: "Estaba hablando cuando llegó.",
      location: "12:05",
      reflection: "",
      itemKeys: [],
    }],
  },
};

const hiddenSource = {
  id: "user:hidden-source",
  type: "page",
  title: "Hidden source",
  source: {
    enabled: false,
    captures: [{
      id: HIDDEN_CAPTURE,
      type: "passage",
      text: "Hidden passage",
      location: "p. 9",
      reflection: "",
      itemKeys: [],
    }],
  },
};

function baseProps(overrides = {}) {
  return {
    page: page(),
    items: [word, externalSource, hiddenSource],
    onOpen: vi.fn(),
    onChanged: vi.fn().mockResolvedValue(undefined),
    onAddVocabulary: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  saveGrammarDetails.mockResolvedValue({});
  saveGrammarSection.mockResolvedValue({});
  saveGrammarExample.mockResolvedValue({});
  saveGrammarOrganization.mockResolvedValue({});
  deleteGrammarSection.mockResolvedValue({});
  deleteGrammarExample.mockResolvedValue({});
});

afterEach(cleanup);

describe("GrammarSection editing", () => {
  it("keeps key-idea changes draft-local until explicit save", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    expect(screen.getByText(/Choose a tense by how the speaker frames/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit grammar key idea" }));
    const firstDraft = screen.getByRole("textbox", { name: "Grammar key idea" });
    await user.clear(firstDraft);
    await user.type(firstDraft, "Discard this");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(saveGrammarDetails).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Edit grammar key idea" }));
    const savedDraft = screen.getByRole("textbox", { name: "Grammar key idea" });
    await user.clear(savedDraft);
    await user.type(savedDraft, "Frame the action as complete or in progress.");
    await user.click(screen.getByRole("button", { name: "Save key idea" }));

    await waitFor(() => expect(saveGrammarDetails).toHaveBeenCalledWith(
      "user:grammar-page",
      { keyIdea: "Frame the action as complete or in progress." }
    ));
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it("removes and restores the optional Key idea without changing the Grammar shape", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    const view = render(<GrammarSection {...props} />);

    await user.click(screen.getByRole("button", { name: "Edit grammar key idea" }));
    await user.click(screen.getByRole("button", { name: "Remove key idea" }));
    expect(screen.getByRole("alertdialog", { name: "Confirm remove key idea" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Confirm remove" }));
    await waitFor(() => expect(saveGrammarDetails).toHaveBeenCalledWith("user:grammar-page", { keyIdea: "" }));

    view.unmount();
    const withoutKeyIdea = page();
    withoutKeyIdea.grammar = { ...withoutKeyIdea.grammar, keyIdea: "" };
    render(<GrammarSection {...baseProps({ page: withoutKeyIdea })} />);

    expect(screen.queryByText("Summarize the main rule, contrast, or construction.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Key idea" }));
    const draft = screen.getByRole("textbox", { name: "Grammar key idea" });
    expect(screen.getByRole("button", { name: "Save key idea" }).disabled).toBe(true);
    await user.type(draft, "  Use the infinitive after the conjugated modal.  ");
    await user.click(screen.getByRole("button", { name: "Save key idea" }));
    await waitFor(() => expect(saveGrammarDetails).toHaveBeenLastCalledWith(
      "user:grammar-page",
      { keyIdea: "Use the infinitive after the conjugated modal." }
    ));
  });

  it("creates and edits named sections with explanations and patterns", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    expect(screen.queryByText(/Section 1 · 1 example/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete section Formation" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit section Formation" }));
    const explanation = screen.getByRole("textbox", { name: "Grammar section overview" });
    await user.clear(explanation);
    await user.type(explanation, "The imperfect describes an action from the inside.");
    const pattern = screen.getByRole("textbox", { name: "Grammar section pattern" });
    await user.clear(pattern);
    await user.type(pattern, "stem + aba/ía");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    await waitFor(() => expect(saveGrammarSection).toHaveBeenCalledWith(
      "user:grammar-page",
      expect.objectContaining({
        id: SECTION_ONE,
        name: "Formation",
        explanation: "The imperfect describes an action from the inside.",
        pattern: "stem + aba/ía",
      })
    ));

    const addSection = screen.getByRole("button", { name: "Add grammar section" });
    expect(addSection.textContent).toBe("");
    await user.click(addSection);
    await user.type(screen.getByRole("textbox", { name: "Grammar section name" }), "  Exceptions  ");
    await user.type(screen.getByRole("textbox", { name: "Grammar section overview" }), "Signals that change the framing.");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    await waitFor(() => expect(saveGrammarSection).toHaveBeenLastCalledWith(
      "user:grammar-page",
      expect.objectContaining({ name: "Exceptions", explanation: "Signals that change the framing." })
    ));
    expect(props.onChanged).toHaveBeenCalledTimes(2);
  });

  it("formats section Overviews and offers a labeled Note callout action", async () => {
    const user = userEvent.setup();
    const formatted = page();
    formatted.grammar = {
      ...formatted.grammar,
      sections: formatted.grammar.sections.map((section) => section.id === SECTION_ONE
        ? {
            ...section,
            explanation: `## Definition

The **indicative mood** describes what the speaker treats as certain.

> It does not matter whether the belief is actually true.`,
          }
        : section),
    };
    const { container } = render(<GrammarSection {...baseProps({ page: formatted })} />);

    expect(screen.getByRole("heading", { name: "Definition", level: 2 })).toBeTruthy();
    expect(container.querySelector("strong")?.textContent).toBe("indicative mood");
    expect(screen.getByRole("note", { name: "Note" }).textContent).toContain("actually true");

    await user.click(screen.getByRole("button", { name: "Edit section Formation" }));
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Note callout" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blank line" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inline code" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Link" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Block quote" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tip callout" })).toBeNull();
    expect(screen.queryByRole("button", { name: "¡Ojo! callout" })).toBeNull();
  });

  it("saves example pairs with an exact enabled Source capture, including one on the same page", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    await user.click(screen.getAllByRole("button", { name: "Add example" })[0]);
    expect(screen.getByRole("option", { name: /Preterite vs imperfect — Chapter 2/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Audio source — 12:05/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Hidden source/ })).toBeNull();

    await user.type(screen.getByRole("textbox", { name: "Spanish example" }), "Mientras hablaba, llegó Ana.");
    await user.type(screen.getByRole("textbox", { name: "English example" }), "While I was talking, Ana arrived.");
    await user.type(screen.getByRole("textbox", { name: "Example explanation" }), "Background interrupted by a bounded event.");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Related Source capture" }),
      `user:grammar-page|${SAME_CAPTURE}`
    );
    await user.click(screen.getByRole("button", { name: "Save example" }));

    await waitFor(() => expect(saveGrammarExample).toHaveBeenCalledWith(
      "user:grammar-page",
      SECTION_ONE,
      expect.objectContaining({
        es: "Mientras hablaba, llegó Ana.",
        en: "While I was talking, Ana arrived.",
        note: "Background interrupted by a bounded event.",
        itemKeys: [],
        sourceCaptureRef: { pageId: "user:grammar-page", captureId: SAME_CAPTURE },
      })
    ));
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it("shows a hidden exact Source reference without exposing its capture", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const hiddenExample = {
      ...exampleOne,
      sourceCaptureRef: { pageId: hiddenSource.id, captureId: HIDDEN_CAPTURE },
    };
    const hiddenPage = page({
      grammar: {
        ...page().grammar,
        sections: [{ ...page().grammar.sections[0], examples: [hiddenExample] }],
      },
    });
    render(<GrammarSection {...baseProps({ page: hiddenPage, onOpen })} />);

    const hiddenLink = screen.getByRole("button", { name: /Hidden source · Source notebook hidden/ });
    expect(screen.queryByText("Hidden passage")).toBeNull();
    await user.click(hiddenLink);
    expect(onOpen).toHaveBeenCalledWith(hiddenSource.id);
  });

  it("adds vocabulary to a saved example through the contextual callback", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    const formation = screen.getByRole("heading", { name: "Formation" }).closest(".rounded-xl");
    await user.click(within(formation).getByRole("button", { name: "Add vocabulary" }));
    expect(screen.getByText("Formation example")).toBeTruthy();
    expect(screen.getByTestId("existing-location").textContent).toBe("this example");
    await user.click(screen.getByRole("button", { name: "Commit vocabulary" }));

    await waitFor(() => expect(props.onAddVocabulary).toHaveBeenCalledWith(
      SECTION_ONE,
      EXAMPLE_ONE,
      stagedCandidates
    ));
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it("detaches vocabulary from an example and reloads without removing page membership", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    await user.click(screen.getByRole("button", { name: "Detach vocabulary hablar from this example" }));

    await waitFor(() => expect(saveGrammarExample).toHaveBeenCalledWith(
      "user:grammar-page",
      SECTION_ONE,
      { ...exampleOne, itemKeys: [] }
    ));
    expect(props.onAddVocabulary).not.toHaveBeenCalled();
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it("asks the mutation API to enforce nonempty-section deletion and surfaces its explanation", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    deleteGrammarSection.mockRejectedValueOnce(new Error("Move or delete this section’s examples first."));
    render(<GrammarSection {...props} />);

    expect(screen.queryByRole("button", { name: "Delete section Formation" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit section Formation" }));
    await user.click(screen.getByRole("button", { name: "Delete section" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(deleteGrammarSection).toHaveBeenCalledWith("user:grammar-page", SECTION_ONE));
    expect(screen.getByRole("alert").textContent).toMatch(/Move or delete this section’s examples first/);
    expect(props.onChanged).not.toHaveBeenCalled();
  });

  it("confirms example deletion and reloads only after the API succeeds", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    expect(screen.queryByRole("button", { name: `Delete example ${exampleOne.es}` })).toBeNull();
    await user.click(screen.getByRole("button", { name: `Edit example ${exampleOne.es}` }));
    await user.click(screen.getByRole("button", { name: "Delete example" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => expect(deleteGrammarExample).toHaveBeenCalledWith(
      "user:grammar-page",
      SECTION_ONE,
      EXAMPLE_ONE
    ));
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });
});

describe("GrammarSection organization", () => {
  it("discards a draft, then saves section order, names, and cross-section example moves together", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    await user.click(screen.getByRole("button", { name: "Organize" }));
    await user.selectOptions(screen.getByRole("combobox", { name: `Move ${exampleOne.es} to section` }), SECTION_TWO);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(saveGrammarOrganization).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Organize" }));
    await user.selectOptions(screen.getByRole("combobox", { name: `Move ${exampleOne.es} to section` }), SECTION_TWO);
    await user.click(screen.getByRole("button", { name: "Move section Formation down" }));
    const formationName = screen.getByDisplayValue("Formation");
    await user.clear(formationName);
    await user.type(formationName, "Background uses");
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    await waitFor(() => expect(saveGrammarOrganization).toHaveBeenCalledWith(
      "user:grammar-page",
      [
        {
          id: SECTION_TWO,
          parentId: null,
          name: "Comparison",
          examples: [{ id: EXAMPLE_TWO }, { id: EXAMPLE_ONE }],
        },
        {
          id: SECTION_ONE,
          parentId: null,
          name: "Background uses",
          examples: [],
        },
      ]
    ));
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it("adds a named section with one stable fresh ID inside the organization draft", async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<GrammarSection {...props} />);

    await user.click(screen.getByRole("button", { name: "Organize" }));
    await user.click(screen.getByRole("button", { name: "Add section to organizer" }));
    await user.type(screen.getByRole("textbox", { name: "Section 3 name" }), "Exceptions");
    await user.click(screen.getByRole("button", { name: "Move section Exceptions up" }));
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    await waitFor(() => expect(saveGrammarOrganization).toHaveBeenCalledTimes(1));
    const [pageId, organized] = saveGrammarOrganization.mock.calls[0];
    expect(pageId).toBe("user:grammar-page");
    expect(organized.map(({ id }) => id)).toEqual([
      SECTION_ONE,
      expect.stringMatching(/^grammar-section:/),
      SECTION_TWO,
    ]);
    expect(organized[1]).toMatchObject({ name: "Exceptions", examples: [] });
    expect(props.onChanged).toHaveBeenCalledTimes(1);
  });

  it("blocks organization save when section names are blank or duplicated", async () => {
    const user = userEvent.setup();
    render(<GrammarSection {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: "Organize" }));
    const secondName = screen.getByRole("textbox", { name: "Section 2 name" });
    await user.clear(secondName);
    await user.type(secondName, "formation");

    expect(screen.getByRole("alert").textContent).toMatch(/nonblank and unique/i);
    expect(screen.getByRole("button", { name: "Save organization" }).disabled).toBe(true);
  });

  it("renders root-owned subtrees with independent subsection disclosure", async () => {
    const user = userEvent.setup();
    const { container } = render(<GrammarSection {...baseProps({ page: hierarchicalPage() })} />);

    expect(screen.getByText("2 sections · 1 subsection · 2 examples")).toBeTruthy();
    const childHeading = screen.getByRole("heading", { name: "SPOCK" });
    const childNode = childHeading.closest(".grammar-guide-subsection");
    expect(childNode).toBeTruthy();
    expect(childNode.querySelector(".rounded-xl")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Collapse grammar section Formation" }));
    expect(screen.queryByRole("heading", { name: "SPOCK" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Expand grammar section Formation" }));
    await user.click(screen.getByRole("button", { name: "Collapse grammar subsection SPOCK" }));
    expect(screen.getByRole("button", { name: "Collapse grammar section Formation" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Expand grammar subsection SPOCK" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("summarizes named empty structure instead of hiding it behind Empty", () => {
    const emptyStructure = hierarchicalPage();
    emptyStructure.grammar = {
      ...emptyStructure.grammar,
      keyIdea: "",
      sections: emptyStructure.grammar.sections.map((section) => ({
        ...section,
        explanation: "",
        pattern: "",
        examples: [],
      })),
    };

    render(<GrammarSection {...baseProps({ page: emptyStructure })} />);

    expect(screen.getByText("2 sections · 1 subsection")).toBeTruthy();
    expect(screen.queryByText(/0 examples/)).toBeNull();
    expect(screen.getByRole("button", { name: "Expand Grammar guide section" })).toBeTruthy();
  });

  it("adds a subsection from a root and never offers a third level", async () => {
    const user = userEvent.setup();
    render(<GrammarSection {...baseProps({ page: hierarchicalPage() })} />);

    expect(screen.queryByRole("button", { name: "Add subsection to SPOCK" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Add subsection to Formation" }));
    await user.type(screen.getByRole("textbox", { name: "Grammar section name" }), "Triggers");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    await waitFor(() => expect(saveGrammarSection).toHaveBeenCalledWith(
      "user:grammar-page",
      expect.objectContaining({ parentId: SECTION_ONE, name: "Triggers" })
    ));
  });

  it("labels a subsection’s contextual vocabulary action with its breadcrumb", async () => {
    const user = userEvent.setup();
    const nested = hierarchicalPage();
    nested.grammar = {
      ...nested.grammar,
      sections: nested.grammar.sections.map((section) => section.id === SECTION_CHILD
        ? { ...section, examples: [{ ...exampleOne, id: "grammar-example:33333333-3333-4333-8333-333333333333" }] }
        : section),
    };
    render(<GrammarSection {...baseProps({ page: nested })} />);

    const child = screen.getByRole("heading", { name: "SPOCK" }).closest(".grammar-guide-subsection");
    await user.click(within(child).getByRole("button", { name: "Add vocabulary" }));

    expect(screen.getByText("Formation › SPOCK example")).toBeTruthy();
  });

  it("reparents a subsection in the organizer while blocking a root that owns children", async () => {
    const user = userEvent.setup();
    render(<GrammarSection {...baseProps({ page: hierarchicalPage() })} />);

    await user.click(screen.getByRole("button", { name: "Organize" }));
    expect(screen.getByRole("combobox", { name: "Parent for Formation" }).disabled).toBe(true);
    await user.selectOptions(screen.getByRole("combobox", { name: "Parent for SPOCK" }), SECTION_TWO);
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    await waitFor(() => expect(saveGrammarOrganization).toHaveBeenCalledWith(
      "user:grammar-page",
      [
        { id: SECTION_ONE, parentId: null, name: "Formation", examples: [{ id: EXAMPLE_ONE }] },
        { id: SECTION_TWO, parentId: null, name: "Comparison", examples: [{ id: EXAMPLE_TWO }] },
        { id: SECTION_CHILD, parentId: SECTION_TWO, name: "SPOCK", examples: [] },
      ]
    ));
  });
});
