// @vitest-environment jsdom
import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pregunta from "./Pregunta.jsx";
import { db, clearAllPersonalData, setPref } from "../db/db.js";
import * as items from "../db/items.js";
import { createItem, newLexical } from "../db/items.js";
import { AI_API_KEY_PREF } from "../lib/aiPrefs.js";
import * as persistence from "../lib/persistence.js";
import { setAttachmentDetail } from "../lib/askGroups.js";
import { emptyCollection } from "../lib/pageKinds.js";

const KEY = "sk-ant-test-key";

const answer = (text = "Use **quedar** for plans.") => ({
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  content: [{ type: "thinking", thinking: "", signature: "sig" }, { type: "text", text }],
  usage: { input_tokens: 900, output_tokens: 600 },
});
const ok = (payload) => ({ ok: true, status: 200, json: async () => payload });
const bodyAt = (index) => JSON.parse(globalThis.fetch.mock.calls[index][1].body);

/** A promise the test settles itself, for orderings around an answer in flight. */
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

let quedar;
let ir;
let reload;
let control;

/** Holds the queue the way App does: additions bump `arrival`; Pregunta removes by key. */
function Harness({ notebookItems, initial = [], onSelect }) {
  const [queue, setQueue] = useState({ attachments: initial, arrival: initial.length ? 1 : 0 });
  control = {
    add: (attachment) => act(() => setQueue((current) => ({
      attachments: [...current.attachments, attachment],
      arrival: current.arrival + 1,
    }))),
    queue: () => queue,
  };
  return (
    <Pregunta
      notebook={{ items: notebookItems, reload }}
      onSelect={onSelect}
      attachments={queue.attachments}
      arrival={queue.arrival}
      onRemoveAttachments={(keys) => setQueue((current) => ({
        ...current,
        attachments: current.attachments.filter((attachment) => !keys.includes(attachment.key)),
      }))}
      onSetAttachmentDetail={(key, detail) => setQueue((current) => setAttachmentDetail(current, key, detail))}
    />
  );
}

const attach = (item, extra = {}) => ({ key: `visit:${item.id}`, itemId: item.id, origin: "entry", review: null, ...extra });

async function renderHarness({ initial = [], onSelect = vi.fn(), wrap = (node) => node } = {}) {
  const notebookItems = await items.allItems();
  const view = render(wrap(<Harness notebookItems={notebookItems} initial={initial} onSelect={onSelect} />));
  return {
    ...view,
    rerenderWith: (nextItems) => view.rerender(wrap(<Harness notebookItems={nextItems} initial={initial} onSelect={onSelect} />)),
  };
}

async function ask(user, text) {
  const composer = screen.getByRole("textbox");
  await user.clear(composer);
  await user.type(composer, text);
  await user.click(screen.getByRole("button", { name: "Ask" }));
}

const tray = () => screen.queryByRole("generic", { name: "Attached to your next question" });

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
  await setPref(AI_API_KEY_PREF, KEY);
  vi.spyOn(persistence, "requestPersistence").mockResolvedValue(null);
  quedar = await createItem(newLexical({
    term: "quedar",
    meanings: [{ gloss: "to remain", examples: [{ es: "Quedamos a las cinco.", en: "Let's meet at five." }] }],
  }));
  ir = await createItem(newLexical({ term: "ir", meanings: [{ gloss: "to go" }] }));
  reload = vi.fn(async () => ({ status: "loaded" }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(answer())));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("attaching an entry", () => {
  it("shows a chip and exactly what will be sent, and sends nothing until Ask", async () => {
    await renderHarness({ initial: [attach(quedar)] });

    expect(within(tray()).getByText("About: quedar")).toBeTruthy();
    const preview = screen.getByLabelText("Sent for quedar");
    expect(preview.textContent).toContain("Entry: quedar (word)");
    expect(preview.textContent).toContain("Example: Quedamos a las cinco. — Let's meet at five.");
    expect(screen.getByText(/and the attached entries \(meanings, examples, notes and the names of linked entries; for a group, its name and\s+each entry's meanings, plus examples if you choose\)/)).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends the snapshot ahead of the question, then clears the chip and labels the question", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    await renderHarness({ initial: [attach(quedar)], onSelect });
    const preview = screen.getByLabelText("Sent for quedar").textContent;

    await ask(user, "More examples?");
    await screen.findByText(/for plans/);

    const sent = bodyAt(0).messages.at(-1).content;
    expect(sent).toBe(`<attached_entry>\n${preview}\n</attached_entry>\n\nMore examples?`);
    expect(globalThis.fetch.mock.calls[0][1].body).not.toContain(quedar.id);
    expect(tray()).toBeNull();
    // The conversation now carries notebook text, so the disclosure keeps saying so.
    expect(screen.getByText(/and the attached entries/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "About: quedar" }));
    expect(onSelect).toHaveBeenCalledWith(quedar.id);

    // A follow-up re-sends the first message exactly as sent, and attaches nothing new.
    await ask(user, "And in the past?");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const followUp = bodyAt(1).messages;
    expect(followUp[0].content).toBe(sent);
    expect(followUp[2].content).toBe("And in the past?");
  });

  it("can be removed before sending", async () => {
    const user = userEvent.setup();
    await renderHarness({ initial: [attach(quedar)] });
    await user.click(screen.getByRole("button", { name: "Remove quedar" }));

    expect(tray()).toBeNull();
    expect(screen.getByText(/Nothing from your notebook is included/)).toBeTruthy();
    await ask(user, "Hola?");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(bodyAt(0).messages.at(-1).content).toBe("Hola?");
  });

  it("offers starter questions that fill the composer without sending", async () => {
    const user = userEvent.setup();
    await renderHarness({ initial: [attach(quedar)] });
    const starters = screen.getByRole("generic", { name: "Starter questions" });

    expect(within(starters).getByRole("button", { name: "Are my examples natural?" })).toBeTruthy();
    await user.click(within(starters).getByRole("button", { name: "How is it different from…" }));

    expect(screen.getByRole("textbox").value).toBe("How is it different from ");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    // Once there is a draft, the starters step aside.
    expect(screen.queryByRole("generic", { name: "Starter questions" })).toBeNull();
  });

  it("sends the entry as it is when Ask is tapped, not as it was when attached", async () => {
    const user = userEvent.setup();
    const view = await renderHarness({ initial: [attach(quedar)] });
    await items.updateItem(quedar.id, { meanings: [{ ...quedar.meanings[0], gloss: "to arrange to meet" }] });
    view.rerenderWith(await items.allItems());

    await ask(user, "Explain");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(bodyAt(0).messages.at(-1).content).toContain("1. to arrange to meet");
  });

  it("drops an entry deleted after attaching, says so, and sends nothing", async () => {
    const user = userEvent.setup();
    const view = await renderHarness({ initial: [attach(quedar), attach(ir)] });
    view.rerenderWith((await items.allItems()).filter((item) => item.id !== quedar.id));

    await ask(user, "Compare");
    expect((await screen.findByRole("alert")).textContent).toMatch(/no longer in your cuaderno, so it was removed\. Nothing was sent/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(within(tray()).queryByText("About: quedar")).toBeNull();
    expect(within(tray()).getByText("About: ir")).toBeTruthy();
    // The question waits in the composer for a second tap.
    expect(screen.getByRole("textbox").value).toBe("Compare");
  });

  it("offers a comparison starter for two entries", async () => {
    await renderHarness({ initial: [attach(quedar), attach(ir)] });
    expect(within(screen.getByRole("generic", { name: "Starter questions" }))
      .getByRole("button", { name: "What's the difference between these?" })).toBeTruthy();
  });

  it("behaves the same under StrictMode's double effects", async () => {
    const user = userEvent.setup();
    await renderHarness({ initial: [attach(quedar)], wrap: (node) => <StrictMode>{node}</StrictMode> });
    expect(within(tray()).getByText("About: quedar")).toBeTruthy();
    await ask(user, "Hola?");
    await screen.findByText(/for plans/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(tray()).toBeNull();
  });
});

describe("arrivals and the conversation on screen", () => {
  it("join an unkept conversation instead of discarding it", async () => {
    const user = userEvent.setup();
    await renderHarness();
    await ask(user, "How do I say I'll stay?");
    await screen.findByText(/for plans/);

    control.add(attach(quedar));

    expect(screen.getByText("How do I say I'll stay?")).toBeTruthy();
    expect(screen.getByText(/This joins your current conversation/)).toBeTruthy();
    await ask(user, "And this one?");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    const messages = bodyAt(1).messages;
    expect(messages).toHaveLength(3);
    expect(messages[2].content).toMatch(/^<attached_entry>\nEntry: quedar/);
  });

  it("switch a paste in progress back to asking", async () => {
    const user = userEvent.setup();
    await renderHarness();
    await user.click(screen.getByRole("radio", { name: "Paste a conversation" }));
    control.add(attach(quedar));
    expect(screen.getByRole("radio", { name: "Ask Claude" }).getAttribute("aria-checked")).toBe("true");
    expect(within(tray()).getByText("About: quedar")).toBeTruthy();
  });

  it("wait while a question is in flight; only what was sent is cleared afterwards", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    globalThis.fetch.mockReset();
    globalThis.fetch.mockReturnValueOnce(pending.promise);
    await renderHarness({ initial: [attach(quedar)] });
    await ask(user, "Explain");

    control.add(attach(ir));
    await act(async () => pending.resolve(ok(answer())));
    await screen.findByText(/for plans/);

    expect(within(tray()).queryByText("About: quedar")).toBeNull();
    expect(within(tray()).getByText("About: ir")).toBeTruthy();
    expect(screen.getByText(/This joins your current conversation/)).toBeTruthy();
  });
});

describe("arrivals after Keep", () => {
  const proposals = {
    summary: "One entry.",
    entries: [{
      ref: "n1", term: "quedarse", form: "word", gloss: "to stay", usageCue: null, usageLabels: [],
      examples: [{ es: "Me quedo aquí.", en: "I'm staying here." }], note: null, tags: [], reason: "Related.",
    }],
    updates: [],
    links: [{ from: "n1", to: "c1", type: "related", reason: "Same root." }],
  };
  const keepResponse = () => ok({
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify(proposals) }],
    usage: { input_tokens: 2000, output_tokens: 1000 },
  });

  it("lists attached entries first for Keep, so proposals link to them", async () => {
    const user = userEvent.setup();
    await renderHarness({ initial: [attach(ir)] });
    await ask(user, "Explain");
    await screen.findByText(/for plans/);

    await user.click(screen.getByRole("button", { name: "Keep" }));
    const keep = screen.getByRole("generic", { name: "Keep" });
    await user.click(within(keep).getByText("Show the entries that will be sent"));
    const listed = within(keep).getAllByRole("listitem").map((row) => row.textContent);
    // "ir" is a stop-length word that matching alone would never send; attached, it leads.
    expect(listed[0]).toBe("ir — to go (attached)");
    expect(listed).toContain("quedar — to remain");
  });

  it("discloses the attached entry in full and sends exactly that, with meaning refs", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer())).mockResolvedValueOnce(keepResponse());
    await renderHarness({ initial: [attach(quedar)] });
    await ask(user, "More examples?");
    await screen.findByText(/for plans/);

    await user.click(screen.getByRole("button", { name: "Keep" }));
    const keep = screen.getByRole("generic", { name: "Keep" });
    expect(keep.textContent).toMatch(/plus the attached entry in full as they are now/);
    const shown = within(keep).getByLabelText("Sent in full for quedar").textContent;
    expect(shown).toContain("m1. to remain");

    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    const content = bodyAt(1).messages[0].content;
    expect(content).toContain(`<attached_entries>\n<attached_entry>\nRef: c1\n${shown}\n</attached_entry>\n</attached_entries>`);
    expect(content).not.toContain(quedar.id);
    expect(content).not.toContain(quedar.meanings[0].id);
  });

  it("start fresh when the conversation was kept, but never reset one with an answer in flight", async () => {
    const user = userEvent.setup();
    const followUp = deferred();
    globalThis.fetch.mockReset();
    globalThis.fetch
      .mockResolvedValueOnce(ok(answer("First answer about quedar.")))
      .mockResolvedValueOnce(keepResponse())
      .mockReturnValueOnce(followUp.promise)
      .mockResolvedValueOnce(keepResponse());
    await renderHarness();
    await ask(user, "First question");
    await screen.findByText("First answer about quedar.");

    // Keep it, so the conversation counts as kept.
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    await user.click(screen.getByRole("button", { name: /Apply 1 entry/ }));
    await screen.findByText(/Saved 1 entry/);
    await user.click(screen.getByRole("button", { name: "Done" }));

    // A follow-up is in flight on the kept conversation when an attachment arrives.
    await ask(user, "Second question");
    control.add(attach(quedar));
    await act(async () => followUp.resolve(ok(answer("Second answer."))));
    await screen.findByText("Second answer.");
    // The late answer landed in its own conversation; nothing was reset under it.
    expect(screen.getByText("First answer about quedar.")).toBeTruthy();
    expect(screen.getByText(/This joins your current conversation/)).toBeTruthy();
  });

  it("start fresh when an attachment arrives after the conversation was kept", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockReset();
    globalThis.fetch
      .mockResolvedValueOnce(ok(answer("First answer about quedar.")))
      .mockResolvedValueOnce(keepResponse());
    await renderHarness();
    await ask(user, "First question");
    await screen.findByText("First answer about quedar.");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    await user.click(screen.getByRole("button", { name: /Apply 1 entry/ }));
    await screen.findByText(/Saved 1 entry/);

    // Arriving while the Keep review is still open leaves it alone…
    control.add(attach(quedar));
    expect(screen.getByText(/Saved 1 entry/)).toBeTruthy();
    expect(screen.getByText("First answer about quedar.")).toBeTruthy();

    // …and once it closes, the kept conversation makes way for the new question.
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByText("First answer about quedar.")).toBeNull());
    expect(within(tray()).getByText("About: quedar")).toBeTruthy();
    expect(screen.queryByText(/This joins your current conversation/)).toBeNull();
  });
});

describe("Keep adds to an attached entry", () => {
  const update = (extra = {}) => ({
    target: "c1",
    examples: [{ meaning: "m1", es: "Me quedo en casa hoy.", en: "I'm staying home today." }],
    meanings: [],
    note: "Quedar de + infinitive is common in Mexico.",
    tags: [],
    reason: "From the conversation.",
    ...extra,
  });
  const keepWith = (updates, entries = []) => ok({
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ summary: "Additions to quedar.", entries, updates, links: [] }) }],
    usage: { input_tokens: 2000, output_tokens: 1000 },
  });

  async function reviewAdditions(user, updates = [update()]) {
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer())).mockResolvedValueOnce(keepWith(updates));
    const view = await renderHarness({ initial: [attach(quedar)] });
    await ask(user, "More examples?");
    await screen.findByText(/for plans/);
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    return view;
  }

  const editEvents = async () => (await db.events.toArray()).filter((event) => event.type === "edit" && event.itemKey === quedar.id);

  it("shows each addition with its own tick and applies only the ticked ones, once", async () => {
    const user = userEvent.setup();
    await reviewAdditions(user);
    const card = screen.getByRole("generic", { name: "Changes to quedar" });
    expect(within(card).getByText("+ example · to remain")).toBeTruthy();
    expect(within(card).getByText("Me quedo en casa hoy.")).toBeTruthy();
    expect(within(card).getByText("Quedar de + infinitive is common in Mexico.")).toBeTruthy();

    await user.click(within(card).getByRole("checkbox", { name: "Add to notes" }));
    await user.click(screen.getByRole("button", { name: "Apply 1 addition" }));
    await screen.findByText(/Added to 1 entry/);

    const saved = await db.items.get(quedar.id);
    expect(saved.meanings[0].examples).toEqual([
      { es: "Quedamos a las cinco.", en: "Let's meet at five." },
      { es: "Me quedo en casa hoy.", en: "I'm staying home today." },
    ]);
    expect(saved.notes).toBe("");
    expect(saved.tags).toEqual([]);
    expect(await editEvents()).toHaveLength(1);

    // Kept: New question starts fresh with one tap.
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "New question" }));
    expect(screen.queryByText(/for plans/)).toBeNull();
  });

  it("disables the additions when the entry is edited while the review is open", async () => {
    const user = userEvent.setup();
    const view = await reviewAdditions(user);
    await items.updateItem(quedar.id, { notes: "My own edit." });
    view.rerenderWith(await items.allItems());

    const card = screen.getByRole("generic", { name: "Changes to quedar" });
    expect(await within(card).findByText(/You changed this entry after Claude saw it/)).toBeTruthy();
    expect(within(card).getByRole("checkbox", { name: /Add example/ }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /^Apply/ }).disabled).toBe(true);
  });

  it("refuses additions to an entry changed just before Apply, and leaves the conversation unkept", async () => {
    const user = userEvent.setup();
    await reviewAdditions(user);
    // Edited elsewhere without this screen hearing about it yet.
    await items.updateItem(quedar.id, { notes: "My own edit." });
    await user.click(screen.getByRole("button", { name: "Apply 2 additions" }));

    expect(await screen.findByText("Nothing was added to quedar: you changed it after Claude saw it.")).toBeTruthy();
    expect(screen.getByText("Nothing was saved")).toBeTruthy();
    expect((await db.items.get(quedar.id)).notes).toBe("My own edit.");
    expect(await editEvents()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "New question" }));
    expect(screen.getByText(/for plans/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tap again to discard/ })).toBeTruthy();
  });

  it("flags an accent-only match unticked and drops an exact repeat", async () => {
    const user = userEvent.setup();
    await reviewAdditions(user, [update({
      examples: [
        { meaning: "m1", es: "quedamos a las cinco.", en: "exact repeat" },
        { meaning: "m1", es: "Quedámos a las cinco", en: "accent-only" },
      ],
      note: null,
    })]);
    const card = screen.getByRole("generic", { name: "Changes to quedar" });
    expect(within(card).getAllByRole("checkbox")).toHaveLength(1);
    expect(within(card).getByRole("checkbox").checked).toBe(false);
    expect(within(card).getByText("Close to an example it already has.")).toBeTruthy();
    expect(screen.getByText(/One suggestion was left out/)).toBeTruthy();
  });

  it("reports additions refused during the review and leaves the conversation unkept, while saving the rest", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer())).mockResolvedValueOnce(keepWith([update()], [{
      ref: "n1", term: "quedarse", form: "word", gloss: "to stay", usageCue: null, usageLabels: [],
      examples: [], note: null, tags: [], reason: "Related.",
    }]));
    const view = await renderHarness({ initial: [attach(quedar)] });
    await ask(user, "More examples?");
    await screen.findByText(/for plans/);
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });

    await items.updateItem(quedar.id, { notes: "My own edit." });
    view.rerenderWith(await items.allItems());
    await screen.findByText(/You changed this entry after Claude saw it/);
    await user.click(screen.getByRole("button", { name: "Apply 1 entry" }));

    expect(await screen.findByText("Nothing was added to quedar: you changed it after Claude saw it.")).toBeTruthy();
    expect(screen.getByText(/Saved 1 entry/)).toBeTruthy();
    expect((await db.items.get(quedar.id)).notes).toBe("My own edit.");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "New question" }));
    expect(screen.getByRole("button", { name: /Tap again to discard/ })).toBeTruthy();
  });

  it("offers a connection between two attached entries on its own", async () => {
    const user = userEvent.setup();
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer())).mockResolvedValueOnce(ok({
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify({
        summary: "Connect them.", entries: [], updates: [],
        links: [{ from: "c2", to: "c1", type: "related", reason: "Both about plans." }],
      }) }],
      usage: { input_tokens: 2000, output_tokens: 300 },
    }));
    await renderHarness({ initial: [attach(quedar), attach(ir)] });
    await ask(user, "Compare these");
    await screen.findByText(/for plans/);
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });

    expect(screen.queryByText("Claude found nothing new worth keeping here.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Apply 1 connection" }));
    await screen.findByText(/Saved 1 connection/);
    expect((await db.items.get(ir.id)).linkedKeys).toEqual([quedar.id]);
    expect((await db.events.toArray()).filter((event) => event.type === "edit")).toEqual([]);
  });

  it("saves re-ticked additions after the entry is edited and restored, without reporting a refusal", async () => {
    const user = userEvent.setup();
    const view = await reviewAdditions(user);
    await items.updateItem(quedar.id, { notes: "My own edit." });
    view.rerenderWith(await items.allItems());
    await screen.findByText(/You changed this entry after Claude saw it/);
    await items.updateItem(quedar.id, { notes: "" });
    view.rerenderWith(await items.allItems());
    await waitFor(() => expect(screen.queryByText(/You changed this entry after Claude saw it/)).toBeNull());

    const card = screen.getByRole("generic", { name: "Changes to quedar" });
    await user.click(within(card).getByRole("checkbox", { name: /Add example/ }));
    await user.click(screen.getByRole("button", { name: "Apply 1 addition" }));
    await screen.findByText(/Added to 1 entry/);
    expect(screen.queryByText(/Nothing was added to quedar/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Done" }));
    await user.click(screen.getByRole("button", { name: "New question" }));
    expect(screen.queryByText(/for plans/)).toBeNull();
  });
});

describe("attaching a group", () => {
  const listGroup = (memberIds, extra = {}) => ({
    key: `group:${memberIds.join(",")}`,
    kind: "group",
    label: "Tagged “planes”",
    memberIds,
    detail: "meanings",
    ...extra,
  });

  it("shows the group, lets the owner pick its detail, and sends exactly the preview", async () => {
    const user = userEvent.setup();
    await renderHarness({ initial: [listGroup([quedar.id, ir.id])] });

    expect(within(tray()).getByText("About: Tagged “planes”")).toBeTruthy();
    expect(within(tray()).getByText(/2 entries · about \d[\d,]* characters/)).toBeTruthy();
    const preview = () => screen.getByLabelText("Sent for Tagged “planes”").textContent;
    expect(preview()).toContain("Group: My words and phrases — Tagged “planes” (2 entries; meanings only)");
    expect(preview()).not.toContain("Quedamos");
    expect(within(tray()).getByRole("button", { name: "Quiz me on these" })).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "+ Examples" }));
    expect(preview()).toContain("Example: Quedamos a las cinco. — Let's meet at five.");
    const shown = preview();

    await ask(user, "Quiz me on these");
    await screen.findByText("quedar");
    const sent = bodyAt(0).messages.at(-1).content;
    expect(sent).toBe(`<attached_group>\n${shown}\n</attached_group>\n\nQuiz me on these`);
    expect(sent).not.toMatch(/user:/);
    expect(screen.getByText(/About: Tagged “planes” · 2 entries/)).toBeTruthy();
    expect(tray()).toBeNull();
  });

  it("sends a collection page's vocabulary as a group after the page", async () => {
    const user = userEvent.setup();
    const page = await createItem({
      ...items.newPage({ title: "Planes", body: "Making plans." }),
      linkedKeys: [quedar.id, ir.id],
      collection: emptyCollection({ enabled: true, groups: [{ id: "group:1", name: "Verbos", itemKeys: [quedar.id, ir.id] }] }),
    });
    await renderHarness({ initial: [attach(page, { origin: "page" })] });

    expect(within(tray()).getByText("About: Planes")).toBeTruthy();
    expect(within(tray()).getByText(/^: 2 entries/)).toBeTruthy();
    await ask(user, "Quiz me");
    await screen.findByText("quedar");
    const sent = bodyAt(0).messages.at(-1).content;
    expect(sent).toMatch(/^<attached_entry>\nPage: Planes\nMaking plans\.\n<\/attached_entry>\n\n<attached_group>\nGroup: Vocabulary on the page “Planes” \(2 entries; meanings only\)\nSection: Verbos\nEntry: quedar/);
  });

  it("sends an entry attached on its own in full, and leaves it out of the group", async () => {
    const user = userEvent.setup();
    await renderHarness({ initial: [listGroup([quedar.id, ir.id]), attach(quedar)] });
    await ask(user, "Compare");
    await screen.findByText("quedar");
    const sent = bodyAt(0).messages.at(-1).content;
    const group = sent.slice(sent.indexOf("<attached_group>"), sent.indexOf("</attached_group>"));
    expect(group).not.toContain("quedar");
    expect(group).toContain("Entry: ir");
    expect(sent).toContain("<attached_entry>\nEntry: quedar");
  });

  it("refuses a group whose entries were all deleted, and sends nothing", async () => {
    const user = userEvent.setup();
    const view = await renderHarness({ initial: [listGroup([ir.id]), attach(quedar)] });
    await items.deleteItem(ir.id);
    view.rerenderWith(await items.allItems());
    await ask(user, "Compare");
    expect((await screen.findByRole("alert")).textContent).toMatch(/no longer in your cuaderno, so it was removed\. Nothing was sent/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(within(tray()).queryByText("About: Tagged “planes”")).toBeNull();
    expect(within(tray()).getByText("About: quedar")).toBeTruthy();
  });

  it("warns before a conversation carries too much group text, and refuses to send it", async () => {
    const user = userEvent.setup();
    const long = "a meaning long enough to fill the group quickly ".repeat(5);
    const many = [];
    for (let index = 0; index < 45; index += 1) {
      many.push(await createItem(newLexical({ term: `palabra${index}`, meanings: [{ gloss: `${long}${index}` }] })));
    }
    await renderHarness({ initial: [listGroup(many.map((item) => item.id))] });
    const group = () => listGroup(many.map((item) => item.id), { key: `again-${Math.random()}` });

    await ask(user, "First");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(tray()).toBeNull());
    control.add(group());
    await ask(user, "Second");
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(tray()).toBeNull());
    control.add(group());

    expect(await within(await waitFor(() => tray())).findByText(/already carries a lot of notebook text/)).toBeTruthy();
    await ask(user, "Third");
    expect((await screen.findByRole("alert")).textContent).toMatch(/a lot of notebook text/);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("keeping from a group conversation", () => {
  const keepJson = (json) => ok({
    model: "claude-opus-5-5",
    stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ summary: "s", entries: [], updates: [], links: [], ...json }) }],
    usage: { input_tokens: 2000, output_tokens: 1000 },
  });

  it("sends group members in short form, then saves the examples ticked for each", async () => {
    const user = userEvent.setup();
    const members = [];
    for (const term of ["picar", "hervir", "freír", "asar", "hornear", "batir"]) {
      members.push(await createItem(newLexical({ term, meanings: [{ gloss: `cook: ${term}` }], notes: `NOTE ${term}` })));
    }
    const updates = members.map((item, index) => ({
      target: `c${index + 1}`,
      examples: [{ meaning: "m1", es: `Ejemplo con ${item.term}.`, en: "An example." }],
      meanings: [{ gloss: "a new sense", usageCue: null, usageLabels: [], examples: [] }],
      note: "Not allowed here.",
      tags: [],
      reason: "r",
    }));
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer("Here is one sentence each.")))
      .mockResolvedValueOnce(keepJson({ updates }));
    await renderHarness({ initial: [{ key: "g", kind: "group", label: "Tagged “cocina”", memberIds: members.map((item) => item.id), detail: "meanings" }] });
    await ask(user, "Give me a sentence using each");
    await screen.findByText("Here is one sentence each.");

    await user.click(screen.getByRole("button", { name: "Keep" }));
    const keep = screen.getByRole("generic", { name: "Keep" });
    expect(keep.textContent).toMatch(/plus 6 entries from attached groups in short form as they are now/);
    expect(within(keep).getByLabelText("Sent in short form for picar").textContent).not.toContain("NOTE");

    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });
    const content = bodyAt(1).messages[0].content;
    expect(content).toContain("Ref: c1\nShort form (from a group; meanings only): examples, tags and links only\nEntry: picar (word)\nm1. cook: picar");
    expect(content).not.toMatch(/NOTE|user:/);
    expect(bodyAt(1).max_tokens).toBe(32000);

    // Meanings and notes for short-form members were left out; one example per entry remains.
    expect(screen.queryByRole("checkbox", { name: /Add meaning/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Add to notes" })).toBeNull();
    expect(screen.getAllByRole("checkbox", { name: /Add example/ })).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: "Untick all" }));
    expect(screen.getAllByRole("checkbox", { name: /Add example/ }).every((box) => !box.checked)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Tick all" }));
    await user.click(screen.getByRole("checkbox", { name: "Add example: Ejemplo con batir." }));
    await user.click(screen.getByRole("button", { name: /Apply 5 additions/ }));
    await screen.findByText(/Added to 5 entries/);

    const saved = await items.getItem(members[0].id);
    expect(saved.meanings[0].examples).toEqual([expect.objectContaining({ es: "Ejemplo con picar." })]);
    expect(saved.notes).toBe("NOTE picar");
    expect((await items.getItem(members[5].id)).meanings[0].examples || []).toEqual([]);
  });

  it("Tick all leaves an example flagged as close to an existing one as the owner set it", async () => {
    const user = userEvent.setup();
    const members = [];
    for (const term of ["uno", "dos", "tres", "cuatro", "cinco", "seis"]) {
      members.push(await createItem(newLexical({
        term,
        meanings: [{ gloss: `number ${term}`, examples: term === "seis" ? [{ es: "Tengo seis años.", en: "" }] : [] }],
      })));
    }
    const updates = members.map((item, index) => ({
      target: `c${index + 1}`,
      examples: [{ meaning: "m1", es: item.term === "seis" ? "Tengo séis años." : `Frase con ${item.term}.`, en: "" }],
      meanings: [], note: null, tags: [], reason: "r",
    }));
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer("Numbers.")))
      .mockResolvedValueOnce(keepJson({ updates }));
    await renderHarness({ initial: [{ key: "g", kind: "group", label: "N", memberIds: members.map((item) => item.id), detail: "meanings" }] });
    await ask(user, "Sentences");
    await screen.findByText("Numbers.");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });

    const flagged = () => screen.getByRole("checkbox", { name: "Add example: Tengo séis años." });
    expect(flagged().checked).toBe(false);
    await user.click(screen.getByRole("button", { name: "Untick all" }));
    await user.click(screen.getByRole("button", { name: "Tick all" }));
    expect(flagged().checked).toBe(false);
    expect(screen.getAllByRole("checkbox", { name: /Add example/ }).filter((box) => box.checked)).toHaveLength(5);
    await user.click(flagged());
    await user.click(screen.getByRole("button", { name: "Tick all" }));
    expect(flagged().checked).toBe(true);
  });

  it("Tick all never ticks an entry changed after Claude saw it", async () => {
    const user = userEvent.setup();
    const members = [];
    for (const term of ["uno", "dos", "tres", "cuatro", "cinco", "seis"]) {
      members.push(await createItem(newLexical({ term, meanings: [{ gloss: `number ${term}` }] })));
    }
    const updates = members.map((item, index) => ({
      target: `c${index + 1}`,
      examples: [{ meaning: "m1", es: `Frase con ${item.term}.`, en: "" }],
      meanings: [], note: null, tags: [], reason: "r",
    }));
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer("Numbers.")))
      .mockResolvedValueOnce(keepJson({ updates }));
    const view = await renderHarness({ initial: [{ key: "g", kind: "group", label: "N", memberIds: members.map((item) => item.id), detail: "meanings" }] });
    await ask(user, "Sentences");
    await screen.findByText("Numbers.");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });

    await items.updateItem(members[0].id, { meanings: [{ ...members[0].meanings[0], gloss: "the number one" }] });
    view.rerenderWith(await items.allItems());
    await screen.findByText(/You changed this entry after Claude saw it/);
    await user.click(screen.getByRole("button", { name: "Untick all" }));
    await user.click(screen.getByRole("button", { name: "Tick all" }));
    const save = vi.spyOn(items, "applyKeep");
    await user.click(screen.getByRole("button", { name: /Apply 5 additions/ }));
    await screen.findByText(/Added to 5 entries/);
    // The changed entry never reaches the save; Apply's own check would refuse it anyway.
    const sentIds = save.mock.calls[0][0].updates.map((update) => update.itemId);
    expect(sentIds).toHaveLength(5);
    expect(sentIds).not.toContain(members[0].id);
  });

  it("leaves out group members past Keep's limit, and never matches them back in", async () => {
    const user = userEvent.setup();
    const created = [];
    for (let index = 0; index < 62; index += 1) {
      created.push(await createItem(newLexical({ term: `vocablo${String(index).padStart(2, "0")}`, meanings: [{ gloss: `gloss ${index}` }] })));
    }
    const everyTerm = created.map((item) => item.term).join(", ");
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer(`First: ${everyTerm}`))).mockResolvedValueOnce(ok(answer(`Second: ${everyTerm}`)));
    await renderHarness({ initial: [{ key: "a", kind: "group", label: "A", memberIds: created.slice(0, 50).map((item) => item.id), detail: "meanings" }] });
    await ask(user, "First");
    await screen.findByText(/^First:/);
    control.add({ key: "b", kind: "group", label: "B", memberIds: created.slice(50).map((item) => item.id), detail: "meanings" });
    await ask(user, "Second");
    await screen.findByText(/^Second:/);

    await user.click(screen.getByRole("button", { name: "Keep" }));
    const keep = screen.getByRole("generic", { name: "Keep" });
    expect(keep.textContent).toMatch(/plus 60 entries from attached groups in short form/);
    expect(keep.textContent).toMatch(/2 more group entries were left out/);
    await user.click(within(keep).getByText("Show the entries that will be sent"));
    const listed = within(keep).getAllByRole("listitem").map((row) => row.textContent);
    expect(listed.filter((row) => row.endsWith("(from a group)"))).toHaveLength(60);
    expect(listed.some((row) => row.startsWith("vocablo60") || row.startsWith("vocablo61"))).toBe(false);
  });

  it("refuses additions to a group member changed after Keep froze it", async () => {
    const user = userEvent.setup();
    const picar = await createItem(newLexical({ term: "picar", meanings: [{ gloss: "to chop" }] }));
    const asar = await createItem(newLexical({ term: "asar", meanings: [{ gloss: "to roast" }] }));
    globalThis.fetch.mockReset();
    globalThis.fetch.mockResolvedValueOnce(ok(answer("Sentences.")))
      .mockResolvedValueOnce(keepJson({ updates: [{ target: "c1", examples: [{ meaning: "m1", es: "Pica todo.", en: "" }], meanings: [], note: null, tags: [], reason: "r" }] }));
    const view = await renderHarness({ initial: [{ key: "g", kind: "group", label: "L", memberIds: [picar.id, asar.id], detail: "meanings" }] });
    await ask(user, "Sentences please");
    await screen.findByText("Sentences.");
    await user.click(screen.getByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: "Send and propose" }));
    await screen.findByRole("region", { name: "Keep proposals" });

    await items.updateItem(picar.id, { meanings: [{ ...picar.meanings[0], gloss: "to chop finely" }] });
    view.rerenderWith(await items.allItems());
    expect(await screen.findByText(/You changed this entry after Claude saw it/)).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Add example: Pica todo." }).disabled).toBe(true);
  });
});
