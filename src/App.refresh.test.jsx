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
  writes = [vi.spyOn(events, "logView"), vi.spyOn(items, "createKeptPracticeEntry"), vi.spyOn(events, "logPracticeWrite"), vi.spyOn(items, "createItem"), vi.spyOn(items, "updateItem")];
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

async function startJournalSwitch(user, nextTab = "Cuaderno") {
  const view = render(<App />);
  await user.click(await screen.findByRole("button", { name: "Diario" }));
  await user.click(screen.getByRole("button", { name: "Write today" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Journal body" }), {
    target: { value: "Una nota guardada una vez." },
  });
  const readsBefore = reads[1].mock.calls.length;
  reads[1].mockImplementationOnce(() => gate.promise);
  await user.click(screen.getByRole("button", { name: nextTab }));
  await waitFor(() => expect(reads[1]).toHaveBeenCalledTimes(readsBefore + 1));
  expect(await db.items.count()).toBe(1);
  expect(window.history.state.mcNavigation.activeTab).toBe("diario");
  return view;
}

it.each(["loaded", "failed"])("keeps the newer tab choice when an older Journal refresh is %s", async (outcome) => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  const pushes = vi.spyOn(window.history, "pushState");
  await user.click(screen.getByRole("button", { name: "Repaso" }));
  expect(window.history.state.mcNavigation.activeTab).toBe("repaso");
  const navigation = structuredClone(window.history.state.mcNavigation);
  await act(async () => {
    if (outcome === "failed") gate.reject(new Error("delayed refresh failed"));
    else gate.resolve(await db.events.toArray());
  });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
  expect(pushes).toHaveBeenCalledTimes(1);
  expect((await db.items.toArray()).map((item) => item.body)).toEqual(["Una nota guardada una vez."]);
  expect(writes[3]).toHaveBeenCalledTimes(1);
});

it("does not create an intermediate history entry when both tab choices await Journal saves", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  fireEvent.change(screen.getByRole("textbox", { name: "Journal body" }), {
    target: { value: "Una nota con una segunda edición." },
  });
  const pushes = vi.spyOn(window.history, "pushState");
  await user.click(screen.getByRole("button", { name: "Repaso" }));
  expect(window.history.state.mcNavigation.activeTab).toBe("diario");
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(window.history.state.mcNavigation.activeTab).toBe("repaso"));
  expect(pushes.mock.calls.map(([state]) => state.mcNavigation.activeTab)).toEqual(["repaso"]);
  expect((await db.items.toArray()).map((item) => item.body)).toEqual(["Una nota con una segunda edición."]);
  expect(writes[3]).toHaveBeenCalledTimes(1);
});

it("keeps a later Diario reselection after an older Journal switch finishes", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  await user.click(screen.getByRole("button", { name: "Diario" }));
  await screen.findByRole("button", { name: "Write today" });
  const navigation = structuredClone(window.history.state.mcNavigation);
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
});

it("lets the current Diario reselection finish after materializing its own Journal entry", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user, "Diario");
  expect(window.history.state.mcNavigation.stacks.diario.at(-1).id).toBeTruthy();
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await screen.findByRole("button", { name: "Continue" });
  expect(window.history.state.mcNavigation.activeTab).toBe("diario");
  expect(window.history.state.mcNavigation.stacks.diario).toHaveLength(1);
  expect(await db.items.count()).toBe(1);
});

it("cancels an older tab choice when a newer Diario reselection is refused", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  fireEvent.change(screen.getByLabelText("Journal date"), { target: { value: "" } });
  await user.click(screen.getByRole("button", { name: "Diario" }));
  expect(screen.getByRole("status").textContent).toBe("Choose a date before leaving");
  const navigation = structuredClone(window.history.state.mcNavigation);
  const pushes = vi.spyOn(window.history, "pushState");
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
  expect(pushes).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Journal date").value).toBe("");
  expect(await db.items.count()).toBe(1);
});

it("keeps intervening browser Back navigation after an older Journal switch finishes", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  act(() => { window.history.back(); });
  await screen.findByRole("button", { name: "Write today" });
  const navigation = structuredClone(window.history.state.mcNavigation);
  const pushes = vi.spyOn(window.history, "pushState");
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
  expect(pushes).not.toHaveBeenCalled();
  expect(await db.items.count()).toBe(1);
});

it("cancels a pending tab choice even when Back and Forward return to its original visit", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  const visit = window.history.state.mcNavigation.stacks.diario.at(-1).visitKey;
  act(() => { window.history.back(); });
  await screen.findByRole("button", { name: "Write today" });
  act(() => { window.history.forward(); });
  await screen.findByRole("textbox", { name: "Journal body" });
  expect(window.history.state.mcNavigation.stacks.diario.at(-1).visitKey).toBe(visit);
  const navigation = structuredClone(window.history.state.mcNavigation);
  const pushes = vi.spyOn(window.history, "pushState");
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
  expect(pushes).not.toHaveBeenCalled();
});

it("does not push a pending tab choice after App unmounts", async () => {
  const user = userEvent.setup();
  const view = await startJournalSwitch(user);
  const pushes = vi.spyOn(window.history, "pushState");
  await act(async () => { view.unmount(); });
  expect(pushes).not.toHaveBeenCalled();
  await act(async () => { gate.resolve(await db.events.toArray()); });
  expect(pushes).not.toHaveBeenCalled();
  expect(await db.items.count()).toBe(1);
});

it("keeps a different in-app visit opened while a Journal tab switch waits", async () => {
  const user = userEvent.setup();
  await startJournalSwitch(user);
  // Exercise a destination callback without creating another tab request or popstate.
  act(() => { cuadernoProps.onOpenPages(); });
  const navigation = structuredClone(window.history.state.mcNavigation);
  expect(navigation.activeTab).toBe("cuaderno");
  expect(navigation.stacks.cuaderno.at(-1).screen).toBe("pages");
  const pushes = vi.spyOn(window.history, "pushState");
  await act(async () => { gate.resolve(await db.events.toArray()); });
  await waitFor(() => expect(cuadernoProps.notebook.refreshing).toBe(false));
  expect(window.history.state.mcNavigation).toEqual(navigation);
  expect(pushes).not.toHaveBeenCalled();
});
