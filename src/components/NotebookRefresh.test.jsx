// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useNotebook } from "../useNotebook.js";
import { clearAllPersonalData, db } from "../db/db.js";
import * as items from "../db/items.js";
import * as events from "../db/events.js";
import { deferred } from "../test/async.js";
import { JOURNAL_PROMPTS } from "../lib/journalPrompts.js";
import JournalEditor from "./JournalEditor.jsx";
import LinkPicker from "./LinkPicker.jsx";
import ReviewSession from "./ReviewSession.jsx";

let reads, writes, gates, editor;
beforeEach(async () => {
  await clearAllPersonalData();
  reads = [vi.spyOn(items, "allItems"), vi.spyOn(events, "allEvents")];
  writes = [vi.spyOn(items, "createItem"), vi.spyOn(items, "updateItem"),
    vi.spyOn(items, "createKeptPracticeEntry"), vi.spyOn(events, "logPracticeWrite"),
    vi.spyOn(events, "logReview"), vi.spyOn(items, "createAndLinkItem")];
  gates = [];
  editor = null;
});
afterEach(async () => {
  cleanup();
  for (const gate of gates) gate.resolve([]);
  await act(async () => {
    await editor?.flushForTabSwitch();
    await Promise.allSettled([...reads, ...writes].flatMap((spy) => spy.mock.results.map(({ value }) => value)));
  });
  vi.restoreAllMocks();
});

function Notebook({ children }) {
  const notebook = useNotebook();
  return <>
    {notebook.error && <div role="alert">Refresh failed</div>}
    {notebook.hasLoaded && children(notebook)}
  </>;
}
const journalProps = {
  seed: { date: "2026-10-17" }, onBack: () => {}, onMaterialized: () => {}, autosaveMs: 15,
  registerNavigationHandlers: (handlers) => { if (handlers) editor = handlers; },
};
const holdRefresh = () => {
  const gate = deferred();
  gates.push(gate);
  reads[1].mockImplementationOnce(() => gate.promise);
  return gate;
};

it("reports a committed Journal save after a real refresh failure and continues without another creation", async () => {
  render(<Notebook>{(notebook) => <JournalEditor {...journalProps} onChanged={notebook.reload} />}</Notebook>);
  const body = await screen.findByRole("textbox", { name: "Journal body" });
  reads[1].mockRejectedValueOnce(new Error("Read failed after save"));
  fireEvent.change(body, { target: { value: "Mi primera versión." } });
  await screen.findByText(/^Saved, but the screen couldn’t refresh/);
  expect(screen.queryByRole("button", { name: "Retry save" })).toBeNull();
  expect((await db.items.toArray()).map(({ body }) => body)).toEqual(["Mi primera versión."]);
  fireEvent.change(body, { target: { value: "Mi segunda versión." } });
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved"));
  expect((await db.items.toArray()).map(({ body }) => body)).toEqual(["Mi segunda versión."]);
  expect(writes[0]).toHaveBeenCalledTimes(1);
  expect(await db.events.where("type").equals(events.EVENT_TYPES.create).count()).toBe(1);
});

it.each(["keep", "discard"])("freezes a committed Taller %s when its real refresh fails", async (action) => {
  const onBack = vi.fn(), onDrillKept = vi.fn();
  const seed = { date: "2026-10-17", drill: {
    skill: "narrate", prompt: JOURNAL_PROMPTS.find((prompt) => prompt.category === "narrate"), offeredWords: [],
  } };
  render(<Notebook>{(notebook) => <JournalEditor {...journalProps} seed={seed}
    onBack={onBack} onDrillKept={onDrillKept} onChanged={notebook.reload} />}</Notebook>);
  fireEvent.change(await screen.findByRole("textbox", { name: "Journal body" }), { target: { value: "Una práctica." } });
  const gate = holdRefresh();
  const button = screen.getByRole("button", { name: action === "keep" ? "Guardar en el Diario" : "Descartar" });
  fireEvent.click(button);
  if (action === "discard") fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
  await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(2));
  expect(onBack).not.toHaveBeenCalled();
  expect(onDrillKept).not.toHaveBeenCalled();
  await act(async () => { gate.reject(new Error("Refresh unavailable")); });
  await screen.findByText(action === "keep" ? /^Saved in Diario, but/ : /^Practice recorded, but/);
  expect(screen.getByRole("textbox", { name: "Journal body" }).matches(":disabled")).toBe(true);
  expect(onBack).not.toHaveBeenCalled();
  expect(onDrillKept).not.toHaveBeenCalled();
  expect(await db.items.count()).toBe(action === "keep" ? 1 : 0);
  expect(await db.events.where("type").equals(events.EVENT_TYPES.practiceWrite).count()).toBe(1);
});

it("keeps quick-create committed and disabled after a real refresh failure", async () => {
  const source = items.newPage({ title: "Notes" });
  await db.items.put(source);
  render(<Notebook>{(notebook) => <LinkPicker item={notebook.items[0]} items={notebook.items}
    linkedKeys={[]} onCancel={() => {}} onSaved={notebook.reload}
    onCreate={(_, term) => items.createAndLinkItem(source.id, items.newLexical({ term }))} />}</Notebook>);
  fireEvent.change(await screen.findByPlaceholderText(/Link a word, phrase, page or dictionary entry/), {
    target: { value: "madrugar" },
  });
  reads[1].mockRejectedValueOnce(new Error("Read failed"));
  const create = screen.getByRole("button", { name: /Create word .*madrugar.* and link it/ });
  fireEvent.click(create);
  await screen.findByText(/^Saved, but the screen couldn’t refresh/);
  expect(create.disabled).toBe(true);
  fireEvent.click(create);
  expect(writes[5]).toHaveBeenCalledTimes(1);
  expect(await db.items.count()).toBe(2);
  expect((await db.items.get(source.id)).linkedKeys).toHaveLength(1);
});

it.each(["loaded", "failed"])("advances a committed review grade exactly once when refresh is %s", async (outcome) => {
  const card = items.newLexical({ term: "madrugar" });
  await db.items.put(card);
  render(<Notebook>{(notebook) => <ReviewSession cards={[card]} onGraded={notebook.reload} />}</Notebook>);
  fireEvent.click(await screen.findByRole("button", { name: "Tap to see the meaning" }));
  const gate = holdRefresh();
  const good = screen.getByRole("button", { name: "Good" });
  fireEvent.click(good);
  await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(2));
  expect(good.disabled).toBe(true);
  expect(screen.queryByText("¡Ya está!")).toBeNull();
  fireEvent.click(good);
  await act(async () => {
    if (outcome === "failed") gate.reject(new Error("Read failed"));
    else gate.resolve(await db.events.toArray());
  });
  await screen.findByText("¡Ya está!");
  expect(writes[4]).toHaveBeenCalledTimes(1);
  expect(await db.events.where("type").equals(events.EVENT_TYPES.reviewPass).count()).toBe(1);
});

it("unlocks a wrong typed answer after refresh failure without grading it again", async () => {
  const card = { ...items.newLexical({ term: "madrugar", meanings: [{ id: "meaning:early", gloss: "get up early" }] }), direction: "reverse" };
  await db.items.put(card);
  render(<Notebook>{(notebook) => <ReviewSession cards={[card]} mode="typed" onGraded={notebook.reload} />}</Notebook>);
  fireEvent.change(await screen.findByRole("textbox", { name: "Type the Spanish word" }), { target: { value: "levantarse" } });
  const gate = holdRefresh();
  fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
  await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(2));
  const next = screen.getByRole("button", { name: "Continue" });
  expect(next.disabled).toBe(true);
  await act(async () => { gate.reject(new Error("Read failed")); });
  await waitFor(() => expect(next.disabled).toBe(false));
  fireEvent.click(next);
  await screen.findByText("¡Ya está!");
  expect(writes[4]).toHaveBeenCalledTimes(1);
  expect(await db.events.where("type").equals(events.EVENT_TYPES.reviewFail).count()).toBe(1);
});
