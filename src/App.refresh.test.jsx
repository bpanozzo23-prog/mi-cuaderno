// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { clearAllPersonalData, db } from "./db/db.js";
import * as items from "./db/items.js";
import * as events from "./db/events.js";
import { removeDictionary } from "./db/ref/install.js";
import { deferred } from "./test/async.js";

let cuadernoProps;
vi.mock("./components/Cuaderno.jsx", async (importOriginal) => {
  const { default: Cuaderno } = await importOriginal();
  return { default: (props) => { cuadernoProps = props; return <Cuaderno {...props} />; } };
});
let reads, gate, writes;
beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  await clearAllPersonalData();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), configurable: true });
  reads = [vi.spyOn(items, "allItems"), vi.spyOn(events, "allEvents")];
  writes = [vi.spyOn(events, "logView"), vi.spyOn(items, "createKeptPracticeEntry"), vi.spyOn(events, "logPracticeWrite")];
  gate = deferred();
});
afterEach(async () => {
  cleanup();
  gate.resolve([]);
  await act(async () => {
    await Promise.allSettled([...reads, ...writes].flatMap((spy) => spy.mock.results.map(({ value }) => value)));
  });
  await removeDictionary();
  vi.restoreAllMocks();
});

it("opens a new Journal entry in Diario through a handler captured before awaited refresh", async () => {
  render(<App />);
  await screen.findByRole("button", { name: "Add" });
  const { onSelect, notebook } = cuadernoProps;
  const page = await items.createItem(items.newPage({ title: "A new day", body: "Hoy aprendí.", pageDate: "2026-10-17" }));
  const done = vi.fn();
  act(() => { notebook.reload().then(done); });
  await waitFor(() => expect(done).toHaveBeenCalledWith({ status: "loaded" }));
  const pushes = vi.spyOn(window.history, "pushState");
  act(() => { onSelect(page.id); });
  // Assert the first destination, before route canonicalization could repair it.
  expect(pushes.mock.calls[0][0].mcNavigation.activeTab).toBe("diario");
  await waitFor(() => expect(window.history.state.mcNavigation.activeTab).toBe("diario"));
  expect(window.history.state.mcNavigation.stacks.diario.at(-1)).toMatchObject({ screen: "read", id: page.id });
  await screen.findByRole("button", { name: "Edit journal entry" });
  await waitFor(() => expect(writes[0]).toHaveBeenCalledTimes(1));
});

it.each(["keep", "discard"])("does not navigate away from a chosen tab when Taller %s finishes refreshing", async (action) => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole("button", { name: "Diario" }));
  await user.click(await screen.findByRole("button", { name: "Taller" }));
  await user.click(screen.getByRole("button", { name: "Empezar" }));
  fireEvent.change(await screen.findByRole("textbox", { name: "Journal body" }), { target: { value: "Una práctica guardada una vez." } });
  const readsBefore = reads[1].mock.calls.length;
  reads[1].mockImplementationOnce(() => gate.promise);
  await user.click(screen.getByRole("button", { name: action === "keep" ? "Guardar en el Diario" : "Descartar" }));
  if (action === "discard") await user.click(screen.getByRole("button", { name: "Descartar" }));
  await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(readsBefore + 1));
  await user.click(screen.getByRole("button", { name: "Cuaderno" }));
  expect(window.history.state.mcNavigation.activeTab).toBe("cuaderno");
  const navigation = structuredClone(window.history.state.mcNavigation);
  const back = vi.spyOn(window.history, "back");
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
  expect(back).not.toHaveBeenCalled();
  expect(await db.items.count()).toBe(action === "keep" ? 1 : 0);
  expect(await db.events.where("type").equals(events.EVENT_TYPES.practiceWrite).count()).toBe(1);
});
