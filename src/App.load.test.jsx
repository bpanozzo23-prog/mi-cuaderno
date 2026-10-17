// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { db, clearAllPersonalData } from "./db/db.js";
import * as items from "./db/items.js";
import * as events from "./db/events.js";
import { removeDictionary } from "./db/ref/install.js";
import { historyStateWithNavigation, initializeNavigation, pushDestination } from "./lib/navigation.js";
import { deferred } from "./test/async.js";
import { makeEvent, makeLexical } from "./test/factories.js";

let reads;
let gate;
let word;
beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await clearAllPersonalData();
  word = makeLexical({ id: "user:load-screen", term: "madrugar", notes: "Original note" });
  await db.items.put(word);
  // Opening this detail has already been recorded, so it needs no background write.
  await db.events.put(makeEvent({ itemKey: word.id }));
  const navigation = pushDestination(initializeNavigation().navigation, { tab: "cuaderno", screen: "detail", id: word.id });
  window.history.replaceState(historyStateWithNavigation(null, navigation), "", "/");
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
  reads = [vi.spyOn(items, "allItems"), vi.spyOn(events, "allEvents"), vi.spyOn(events, "logView")];
  gate = deferred();
});

afterEach(async () => {
  cleanup();
  gate.resolve();
  await act(async () => {
    await Promise.allSettled(reads.flatMap((spy) => spy.mock.results.map((result) => result.value)));
  });
  await removeDictionary();
  vi.restoreAllMocks();
});

it("offers Retry after an initial failure and preserves the restored detail destination", async () => {
  const user = userEvent.setup();
  reads[0].mockRejectedValueOnce(new Error("read failed"));
  render(<App />);
  expect(await screen.findByText(/Couldn’t open your cuaderno/)).toBeTruthy();
  expect(screen.queryByText(/Opening your cuaderno/)).toBeNull();
  expect(window.history.state.mcNavigation.stacks.cuaderno.at(-1).id).toBe(word.id);
  await user.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(await screen.findByRole("button", { name: "Edit note" })).toBeTruthy();
  expect(screen.getByText("Original note")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(window.history.state.mcNavigation.stacks.cuaderno.at(-1).id).toBe(word.id);
});

it("retains an open draft through a failed refresh and a pending successful retry", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Edit note" }));
  const editor = screen.getByRole("textbox", { name: "Note" });
  fireEvent.change(editor, { target: { value: "My unsaved draft" } });
  reads[1].mockRejectedValueOnce(new Error("refresh failed"));
  await user.click(screen.getByRole("button", { name: "Highlight as tricky" }));
  expect(await screen.findByText(/Couldn’t refresh your cuaderno/)).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Note" })).toBe(editor);
  expect(editor.value).toBe("My unsaved draft");
  expect((await db.items.get(word.id)).notes).toBe("Original note");
  reads[1].mockImplementationOnce(async () => { await gate.promise; return db.events.toArray(); });
  await user.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(screen.getByRole("textbox", { name: "Note" })).toBe(editor);
  expect(editor.value).toBe("My unsaved draft");
  await act(async () => gate.resolve());
  await waitFor(() => expect(screen.getByRole("button", { name: "Marked tricky" })).toBeTruthy());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("textbox", { name: "Note" })).toBe(editor);
  expect(editor.value).toBe("My unsaved draft");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
});

it("keeps a newly created destination while retry still holds the older snapshot", async () => {
  const user = userEvent.setup();
  window.history.replaceState(historyStateWithNavigation(null, initializeNavigation().navigation), "", "/");
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Add" }));
  await user.click(screen.getByRole("button", { name: /^Word or phrase/ }));
  fireEvent.change(screen.getByPlaceholderText("Spanish word or phrase *"), { target: { value: "amanecer" } });
  reads[1].mockRejectedValueOnce(new Error("refresh failed after creation"));
  await user.click(screen.getByRole("button", { name: "Add to cuaderno" }));
  await screen.findByText(/Couldn’t refresh your cuaderno/);
  const created = (await db.items.toArray()).find((item) => item.term === "amanecer");
  expect(created).toBeTruthy();
  expect(window.history.state.mcNavigation.stacks.cuaderno.at(-1).id).toBe(created.id);
  reads[1].mockImplementationOnce(async () => { await gate.promise; return db.events.toArray(); });
  await user.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(window.history.state.mcNavigation.stacks.cuaderno.at(-1).id).toBe(created.id);
  await act(async () => gate.resolve());
  await screen.findByRole("button", { name: "Highlight as tricky" });
  expect(window.history.state.mcNavigation.stacks.cuaderno.at(-1).id).toBe(created.id);
  // Opening the new detail logs one view and then performs its own final refresh.
  await waitFor(async () => expect((await db.events.where("itemKey").equals(created.id).toArray())
    .filter((event) => event.type === events.EVENT_TYPES.view)).toHaveLength(1));
  await act(async () => {
    await Promise.allSettled(reads.flatMap((spy) => spy.mock.results.map((result) => result.value)));
  });
});
