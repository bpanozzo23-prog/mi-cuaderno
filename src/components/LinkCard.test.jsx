// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryLinkCard, ItemLinkCard } from "./LinkCard.jsx";

afterEach(cleanup);

const page = {
  id: "user:page",
  type: "page",
  title: "Grammar source",
  body: "This generic body preview should be hidden.",
  linkedKeys: [],
  linkAnnotations: [],
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("connection cards", () => {
  it("edits an anchored Similar connection back to Whole entry", async () => {
    const user = userEvent.setup();
    const focal = { id: "user:a", type: "lexical", term: "banco", meanings: [
      { id: "meaning:bank", gloss: "bank" },
    ] };
    const target = { id: "user:b", type: "lexical", term: "entidad", meanings: [
      { id: "meaning:institution", gloss: "institution" },
    ], linkedKeys: [], linkAnnotations: [], updatedAt: "2026-08-01T00:00:00.000Z" };
    const onSaveRelationship = vi.fn();
    render(<ItemLinkCard
      item={target}
      focalItem={focal}
      connection={{
        type: "similar_meaning", subject: "owner", note: "",
        relationship: { type: "similar_meaning", subject: "owner", note: "" },
        focalMeaningId: "meaning:bank", connectedMeaningId: "meaning:institution",
      }}
      onOpen={vi.fn()}
      onSaveRelationship={onSaveRelationship}
    />);

    await user.click(screen.getByRole("button", { name: "Edit connection to entidad" }));
    expect(screen.getByRole("radio", { name: "Individual meanings" }).checked).toBe(true);
    await user.click(screen.getByRole("radio", { name: "Whole entry" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSaveRelationship).toHaveBeenCalledWith({
      type: "similar_meaning", subject: "owner", note: "",
    }, null);
  });

  it("falls through a blank General note to the first canonical named lexical note", () => {
    render(
      <ItemLinkCard
        item={{
          id: "user:word",
          type: "lexical",
          form: "word",
          term: "quedar",
          meanings: [],
          notes: "",
          noteSections: [{
            id: "note-section:13131313-1313-4313-8313-131313131313",
            parentId: null,
            name: "Usage",
            body: "Arrange to meet.",
          }],
          linkedKeys: [],
          linkAnnotations: [],
          updatedAt: "2026-08-21T00:00:00.000Z",
        }}
        onOpen={vi.fn()}
      />
    );

    expect(screen.getByText("Usage: Arrange to meet.")).toBeTruthy();
  });

  it("clamps a shared note, suppresses the target preview, and edits inline", async () => {
    const user = userEvent.setup();
    const onSaveRelationship = vi.fn();
    const onRemove = vi.fn();
    const connection = {
      type: "contrast",
      subject: "owner",
      note: "A shared explanation that belongs to the connection.",
      relationship: {
        type: "contrast",
        subject: "owner",
        note: "A shared explanation that belongs to the connection.",
      },
    };

    render(
      <ItemLinkCard
        item={page}
        connection={connection}
        onOpen={vi.fn()}
        onSaveRelationship={onSaveRelationship}
        onRemove={onRemove}
      />
    );

    const note = screen.getByText(/A shared explanation/);
    expect(note.className).toContain("line-clamp-2");
    expect(screen.queryByText(/generic body preview/)).toBeNull();

    const more = screen.getByRole("button", { name: "Edit connection to Grammar source" });
    expect(more.className).toContain("min-h-11");
    expect(more.className).toContain("min-w-11");
    await user.click(more);

    expect(screen.getByText("Edit connection")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Connection note" }).value).toBe(connection.note);
    await user.selectOptions(screen.getByRole("combobox", { name: "Relationship" }), "explained_by:target");
    const editor = screen.getByRole("textbox", { name: "Connection note" });
    await user.clear(editor);
    await user.type(editor, "Explains this rule");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSaveRelationship).toHaveBeenCalledWith({
      type: "explained_by",
      subject: "target",
      note: "Explains this rule",
    });
    expect(screen.queryByText("Edit connection")).toBeNull();
  });

  it("offers removal inside the editor rather than as an easy-to-hit card control", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <ItemLinkCard
        item={page}
        connection={{ type: "related", subject: "owner", note: "" }}
        onOpen={vi.fn()}
        onSaveRelationship={vi.fn()}
        onRemove={onRemove}
      />
    );

    expect(screen.queryByRole("button", { name: /Unlink/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit connection to Grammar source" }));
    await user.click(screen.getByRole("button", { name: "Remove connection" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("accepts a specialized heading, meta line, preview rule, and accessible edit label", () => {
    render(
      <ItemLinkCard
        item={{
          ...page,
          title: "",
          body: "The first line normally identifies this untitled journal moment.",
          pageDate: "2026-08-01",
        }}
        connection={{ type: "related", subject: "owner", note: "" }}
        onOpen={vi.fn()}
        onSaveRelationship={vi.fn()}
        displayHeading="The first line normally identifies this moment"
        displayMeta="August 1, 2026"
        suppressPreview
        editLabel="Edit connection to August 1 moment"
      />
    );

    expect(screen.getByText("The first line normally identifies this moment")).toBeTruthy();
    expect(screen.getByText("August 1, 2026")).toBeTruthy();
    expect(screen.queryByText(/normally identifies this untitled journal moment/)).toBeNull();
    expect(screen.getByRole("button", { name: "Edit connection to August 1 moment" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit connection to Untitled page" })).toBeNull();
  });
});

describe("the personal-twin offer on a dictionary connection", () => {
  const entry = {
    id: "dict:wiktionary-es:sacar:verb",
    lemma: "sacar",
    pos: "verb",
    senses: [{ gloss: "to take out" }],
  };
  const twin = (id, overrides = {}) => ({
    id: `user:${id}`,
    type: "lexical",
    form: "word",
    term: "sacar",
    dictKey: entry.id,
    linkedKeys: [],
    linkAnnotations: [],
    ...overrides,
  });
  const merge = (twins) => ({ canonicalKey: entry.id, entry, twins });
  const baseProps = () => ({
    entry,
    connection: { type: "related", subject: "owner", note: "" },
    onOpen: vi.fn(),
  });

  it("renders exactly as before when no twin props are given", () => {
    render(<EntryLinkCard {...baseProps()} />);
    expect(screen.getByText("sacar")).toBeTruthy();
    expect(screen.queryByText(/personal entr/)).toBeNull();
  });

  it("offers one tap per twin and reports the merge through the surface handler", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn().mockResolvedValue({ merged: true });
    render(
      <EntryLinkCard
        {...baseProps()}
        twinMerge={merge([
          { twin: twin("first"), conflict: null },
          { twin: twin("second", { term: "sacar (mío)" }), conflict: null },
        ])}
        onMerge={onMerge}
      />
    );

    expect(screen.getByText("You now have personal entries for this word.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Point this link at “sacar”/ }));
    await waitFor(() => expect(onMerge).toHaveBeenCalledWith("user:first", undefined));
    expect(screen.getByRole("button", { name: /sacar \(mío\)/ })).toBeTruthy();
  });

  it("expands the resolver for a conflicting twin instead of merging on the spot", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn().mockResolvedValue({ merged: true });
    render(
      <EntryLinkCard
        {...baseProps()}
        twinMerge={merge([{
          twin: twin("twin"),
          conflict: {
            candidates: [
              {
                source: "dictionary",
                explicit: true,
                relationship: { type: "found_in", subject: "owner", note: "The interview." },
              },
              {
                source: "personal",
                explicit: true,
                relationship: { type: "contrast", subject: "owner", note: "My note." },
              },
            ],
          },
        }])}
        onMerge={onMerge}
      />
    );

    await user.click(screen.getByRole("button", { name: /Point this link at “sacar”/ }));
    expect(onMerge).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Point this link at “sacar”" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Merge into my entry" }));
    await waitFor(() => expect(onMerge).toHaveBeenCalledWith(
      "user:twin",
      { type: "found_in", subject: "owner", note: "The interview." }
    ));
    // The resolver collapses after a successful merge; the surface refresh removes the card.
    expect(screen.queryByRole("heading", { name: "Point this link at “sacar”" })).toBeNull();
  });

  it("surfaces a failed merge without hiding the offer", async () => {
    const user = userEvent.setup();
    const onMerge = vi.fn().mockRejectedValue(new Error("The connection changed."));
    render(
      <EntryLinkCard
        {...baseProps()}
        twinMerge={merge([{ twin: twin("twin"), conflict: null }])}
        onMerge={onMerge}
      />
    );

    await user.click(screen.getByRole("button", { name: /Point this link at “sacar”/ }));
    expect((await screen.findByRole("alert")).textContent).toBe("The connection changed.");
    expect(screen.getByRole("button", { name: /Point this link at “sacar”/ })).toBeTruthy();
  });
});
