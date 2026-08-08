// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SourceSection from "./SourceSection.jsx";
import {
  deleteSourceCapture,
  saveSourceCapture,
  saveSourceCaptureOrder,
  saveSourceDetails,
} from "../db/pageStructures.js";

vi.mock("../db/pageStructures.js", () => ({
  deleteSourceCapture: vi.fn(),
  saveSourceCapture: vi.fn(),
  saveSourceCaptureOrder: vi.fn(),
  saveSourceDetails: vi.fn(),
}));

const capture = (id, type, text, over = {}) => ({
  id,
  type,
  text,
  location: "",
  reflection: "",
  itemKeys: [],
  ...over,
});

const page = (captures = [], over = {}) => {
  const { source: sourceOver, ...pageOver } = over;
  return {
    id: "user:source-page",
    type: "page",
    title: "La casa de las flores",
    body: "",
    pageFocus: "source",
    collection: { enabled: true, groups: [] },
    source: {
      enabled: true,
      format: "",
      creator: "",
      scope: "",
      url: "",
      context: "",
      captures,
      ...(sourceOver || {}),
    },
    grammar: { enabled: false, keyIdea: "", sections: [] },
    tags: [],
    linkedKeys: [],
    mediaLinks: [],
    ...pageOver,
  };
};

const lexical = (id, term) => ({
  id,
  type: "lexical",
  form: "word",
  term,
  meanings: [],
  notes: "",
  tags: [],
  linkedKeys: [],
  mediaLinks: [],
});

function renderSource(sourcePage, over = {}) {
  const props = {
    page: sourcePage,
    items: [sourcePage],
    onOpen: vi.fn(),
    onChanged: vi.fn(),
    onAddVocabulary: vi.fn(),
    ...over,
  };
  return { ...render(<SourceSection {...props} />), props };
}

beforeEach(() => {
  saveSourceDetails.mockResolvedValue({});
  saveSourceCapture.mockResolvedValue({});
  saveSourceCaptureOrder.mockResolvedValue({});
  deleteSourceCapture.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Source identity and quick capture", () => {
  it("edits optional identity fields only after an explicit Save", async () => {
    const user = userEvent.setup();
    const sourcePage = page();
    const { props } = renderSource(sourcePage);

    expect(screen.getByRole("button", { name: "Expand Source notebook section" }).getAttribute("aria-expanded")).toBe("false");
    await user.click(screen.getByRole("button", { name: "Expand Source notebook section" }));
    await user.click(screen.getByRole("button", { name: "Edit source details" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Source format" }), "audio");
    await user.type(screen.getByRole("textbox", { name: "Source creator" }), "Radio Ambulante");
    await user.type(screen.getByRole("textbox", { name: "Source scope" }), "Episode 240");
    await user.type(screen.getByRole("textbox", { name: "Source URL" }), "https://example.com/episode");
    await user.type(screen.getByRole("textbox", { name: "Source context" }), "Listening practice");

    expect(saveSourceDetails).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() => expect(saveSourceDetails).toHaveBeenCalledWith(sourcePage.id, {
      format: "audio",
      creator: "Radio Ambulante",
      scope: "Episode 240",
      url: "https://example.com/episode",
      context: "Listening practice",
    }));
    expect(props.onChanged).toHaveBeenCalledOnce();
  });

  it("offers all four capture types, writes nothing on cancel, and saves a completed draft", async () => {
    const user = userEvent.setup();
    const attached = lexical("user:nomas", "nomás");
    const sourcePage = page([], { linkedKeys: [attached.id] });
    const { props } = renderSource(sourcePage, { items: [sourcePage, attached] });

    await user.click(screen.getByRole("button", { name: "Capture" }));
    for (const name of ["Passage", "Reflection", "Language note", "Question"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: "Passage" }));
    await user.click(screen.getByRole("button", { name: "Choose page vocabulary" }));
    await user.click(screen.getByRole("button", { name: "Attach vocabulary nomás to capture" }));
    await user.type(screen.getByRole("textbox", { name: "Capture text" }), "This draft is discarded.");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(saveSourceCapture).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Capture" }));
    await user.click(screen.getByRole("button", { name: "Language note" }));
    await user.click(screen.getByRole("button", { name: "Choose page vocabulary" }));
    await user.click(screen.getByRole("button", { name: "Attach vocabulary nomás to capture" }));
    await user.type(screen.getByRole("textbox", { name: "Capture text" }), "Nomás softens the request.");
    await user.type(screen.getByRole("textbox", { name: "Capture location" }), "18:42");
    await user.type(screen.getByRole("textbox", { name: "Capture reflection" }), "Listen for this with strangers.");
    await user.click(screen.getByRole("button", { name: "Save capture" }));

    await waitFor(() => expect(saveSourceCapture).toHaveBeenCalledWith(sourcePage.id, {
      type: "language_note",
      text: "Nomás softens the request.",
      location: "18:42",
      reflection: "Listen for this with strangers.",
      itemKeys: [attached.id],
    }));
    expect(props.onChanged).toHaveBeenCalledOnce();
  });
});

describe("Source capture reading and maintenance", () => {
  it("attaches existing page vocabulary while editing a capture", async () => {
    const user = userEvent.setup();
    const attached = lexical("user:nomas", "nomás");
    const passage = capture("capture:passage", "passage", "Nomás dígame.");
    const sourcePage = page([passage], { linkedKeys: [attached.id] });
    const { props } = renderSource(sourcePage, { items: [sourcePage, attached] });

    await user.click(screen.getByRole("button", { name: "Edit Passage capture" }));
    await user.click(screen.getByRole("button", { name: "Choose page vocabulary" }));
    await user.click(screen.getByRole("button", { name: "Attach vocabulary nomás to capture" }));
    await user.click(screen.getByRole("button", { name: "Save capture" }));

    await waitFor(() => expect(saveSourceCapture).toHaveBeenCalledWith(sourcePage.id, {
      ...passage,
      itemKeys: [attached.id],
    }));
    expect(props.onChanged).toHaveBeenCalledOnce();
  });

  it("detaches vocabulary from a capture without removing page-level membership", async () => {
    const user = userEvent.setup();
    const attached = lexical("user:nomas", "nomás");
    const passage = capture("capture:passage", "passage", "Nomás dígame.", {
      itemKeys: [attached.id],
    });
    const sourcePage = page([passage], { linkedKeys: [attached.id] });
    const { props } = renderSource(sourcePage, { items: [sourcePage, attached] });

    await user.click(screen.getByRole("button", {
      name: "Detach vocabulary nomás from Passage capture",
    }));

    await waitFor(() => expect(saveSourceCapture).toHaveBeenCalledWith(sourcePage.id, {
      ...passage,
      itemKeys: [],
    }));
    expect(sourcePage.linkedKeys).toEqual([attached.id]);
    expect(props.onChanged).toHaveBeenCalledOnce();
  });

  it("searches normalized capture content without collapsing ñ, filters by type, and expands a long passage", async () => {
    const user = userEvent.setup();
    const longText = `${"El año terminó con una conversación inesperada. ".repeat(7)}Fin.`;
    const sourcePage = page([
      capture("capture:passage", "passage", longText, { location: "p. 81" }),
      capture("capture:reflection", "reflection", "The speaker sounds more confident now."),
      capture("capture:question", "question", "Is ano ever acceptable here?"),
    ]);
    renderSource(sourcePage);

    const passageText = screen.getByText(longText);
    expect(passageText.className).toContain("line-clamp-4");

    await user.type(screen.getByRole("textbox", { name: "Search source captures" }), "año");
    expect(screen.getByText(longText)).toBeTruthy();
    expect(screen.queryByText("Is ano ever acceptable here?")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show full passage" }));
    expect(screen.getByText(longText).className).not.toContain("line-clamp-4");

    await user.clear(screen.getByRole("textbox", { name: "Search source captures" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Capture type filter" }), "reflection");
    expect(screen.getByText("The speaker sounds more confident now.")).toBeTruthy();
    expect(screen.queryByText(longText)).toBeNull();
    expect(screen.queryByText("Is ano ever acceptable here?")).toBeNull();
  });

  it("edits with vocabulary intact and keeps armed deletion inside the editor", async () => {
    const user = userEvent.setup();
    const note = capture("capture:note", "language_note", "Nomás can soften a request.", {
      location: "18:42",
      reflection: "Notice the intonation.",
      itemKeys: ["user:nomas"],
    });
    const question = capture("capture:question", "question", "Would this work with a friend?");
    const sourcePage = page([note, question]);
    const { props } = renderSource(sourcePage);

    await user.click(screen.getByRole("button", { name: "Edit Language note capture" }));
    const text = screen.getByRole("textbox", { name: "Capture text" });
    await user.clear(text);
    await user.type(text, "Nomás often softens a request.");
    await user.click(screen.getByRole("button", { name: "Save capture" }));

    await waitFor(() => expect(saveSourceCapture).toHaveBeenCalledWith(sourcePage.id, {
      id: note.id,
      type: "language_note",
      text: "Nomás often softens a request.",
      location: "18:42",
      reflection: "Notice the intonation.",
      itemKeys: ["user:nomas"],
    }));

    expect(screen.queryByRole("button", { name: "Delete Question capture" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit Question capture" }));
    await user.click(screen.getByRole("button", { name: "Delete capture" }));
    expect(deleteSourceCapture).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(deleteSourceCapture).toHaveBeenCalledWith(sourcePage.id, question.id));
    expect(props.onChanged).toHaveBeenCalledTimes(2);
  });

  it("opens attached vocabulary and stages new contextual candidates in the reusable picker", async () => {
    const user = userEvent.setup();
    const attached = lexical("user:nomas", "nomás");
    const candidate = lexical("user:salir", "salir adelante");
    const sourceCapture = capture("capture:passage", "passage", "Vamos a salir adelante.", {
      itemKeys: [attached.id],
    });
    const sourcePage = page([sourceCapture]);
    const onAddVocabulary = vi.fn().mockResolvedValue({});
    const { props } = renderSource(sourcePage, {
      items: [sourcePage, attached, candidate],
      onAddVocabulary,
    });

    await user.click(screen.getByRole("button", { name: "Open vocabulary nomás" }));
    expect(props.onOpen).toHaveBeenCalledWith(attached.id);

    await user.click(screen.getByRole("button", { name: "Add vocabulary" }));
    const pickerSearch = screen.getByPlaceholderText(/Search words, phrases, or the dictionary/);
    await user.type(pickerSearch, "brand new phrase");
    expect(screen.getByRole("button", { name: /Create .*brand new phrase.* for this source capture/i })).toBeTruthy();

    await user.clear(pickerSearch);
    await user.type(pickerSearch, "salir adelante");
    const rows = screen.getAllByRole("button", { name: /salir adelante/i });
    await user.click(rows.find((row) => row.hasAttribute("aria-pressed")));
    await user.click(screen.getByRole("button", { name: "Add 1" }));

    await waitFor(() => expect(onAddVocabulary).toHaveBeenCalledWith(sourceCapture.id, [{
      kind: "personal",
      itemId: candidate.id,
    }]));
    expect(props.onChanged).toHaveBeenCalledOnce();
  });

  it("keeps reordering as a discardable draft and saves the complete ID order", async () => {
    const user = userEvent.setup();
    const passage = capture("capture:passage", "passage", "First");
    const reflection = capture("capture:reflection", "reflection", "Second");
    const question = capture("capture:question", "question", "Third");
    const sourcePage = page([passage, reflection, question]);
    const { props } = renderSource(sourcePage);

    await user.click(screen.getByRole("button", { name: "Organize" }));
    expect(screen.getByRole("button", { name: "Save organization" }).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Move Passage capture 1 down" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(saveSourceCaptureOrder).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Organize" }));
    await user.click(screen.getByRole("button", { name: "Move Passage capture 1 down" }));
    await user.click(screen.getByRole("button", { name: "Save organization" }));

    await waitFor(() => expect(saveSourceCaptureOrder).toHaveBeenCalledWith(sourcePage.id, [
      reflection.id,
      passage.id,
      question.id,
    ]));
    expect(props.onChanged).toHaveBeenCalledOnce();
  });
});
