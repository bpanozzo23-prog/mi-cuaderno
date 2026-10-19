// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LessonPlayer from "./LessonPlayer.jsx";
import { lesson1917 } from "./content1917.js";

let scroll;
function open() {
  return render(<StrictMode><LessonPlayer lesson={lesson1917} /></StrictMode>);
}
async function jump(user, title) {
  await user.click(screen.getByRole("button", { name: "Índice del capítulo" }));
  await user.click(screen.getByRole("button", { name: new RegExp(title) }));
}
beforeEach(() => {
  scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("isolated lesson reader", () => {
  it("reaches the conclusion and finishes without exercises or writing", async () => {
    const user = userEvent.setup();
    open();
    expect(screen.getByRole("button", { name: "Anterior" }).disabled).toBe(true);
    for (let i = 1; i < 10; i++) await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Lo que cambió, lo que quedaba abierto");
    expect(screen.queryByRole("textbox")).toBeNull();
    const liveRegion = screen.getByRole("status");
    expect(liveRegion.textContent).toBe("");
    await user.click(screen.getByRole("button", { name: "Terminar sin escribir" }));
    expect(screen.getByRole("status").textContent).toContain("Fin del capítulo");
    expect(screen.getByRole("status")).toBe(liveRegion);
    const finishedButton = screen.getByRole("button", { name: "Capítulo terminado" });
    expect(document.activeElement).toBe(finishedButton);
    expect(finishedButton.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByRole("link", { name: /1920/ })).toBeNull();
  });
  it("opens English and glosses in place, with no navigation or scroll", async () => {
    const user = userEvent.setup();
    open();
    const title = screen.getByRole("heading", { level: 2 });
    expect(screen.getByText("English help").lang).toBe("en");
    await user.click(screen.getByRole("button", { name: "English help" }));
    expect(screen.getByText(lesson1917.steps[0].english).lang).toBe("en");
    await user.click(screen.getByRole("button", { name: "Palabras de esta página" }));
    expect(screen.getByText("un derecho")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 })).toBe(title);
    expect(scroll).not.toHaveBeenCalled();
  });
  it.each([
    ["Una petición no es un resultado", "Investigar las pruebas", "c1917-evidence", "c1917-branch-evidence"],
    ["Ocho horas, por escrito", "Mirar el español", "c1917-workday", "c1917-branch-language"],
  ])("returns from %s with help, scroll and launch focus preserved", async (title, launch, origin, branchId) => {
    const user = userEvent.setup();
    open();
    await jump(user, title);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
    await user.click(screen.getByRole("button", { name: "English help" }));
    if (origin === "c1917-workday") await user.click(screen.getByRole("button", { name: "Traducción al inglés" }));
    vi.spyOn(window, "scrollY", "get").mockReturnValue(345);
    await user.click(screen.getByRole("button", { name: new RegExp(launch) }));
    const branch = lesson1917.steps.find((step) => step.id === branchId);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(branch.title);
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
    await user.click(screen.getByRole("button", { name: "Volver a la lectura" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: new RegExp(launch) }));
    expect(scroll).toHaveBeenLastCalledWith({ top: 345, behavior: "instant" });
    expect(screen.getByRole("button", { name: "English help" }).getAttribute("aria-expanded")).toBe("true");
    if (origin === "c1917-workday") expect(screen.getByText("The maximum working day shall be eight hours.")).toBeTruthy();
  });
  it("allows outline jumps from a branch without losing the next reading destination", async () => {
    const user = userEvent.setup();
    open();
    await jump(user, "Una petición no es un resultado");
    await user.click(screen.getByRole("button", { name: /Investigar las pruebas/ }));
    await jump(user, "La escuela y la autoridad");
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2 }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("¿Quién puede participar?");
  });
  it("offers every explanation immediately and keeps temporary choice feedback on return", async () => {
    const user = userEvent.setup();
    open();
    await jump(user, "Ocho horas, por escrito");
    await user.click(screen.getByRole("button", { name: /Mirar el español/ }));
    await user.click(screen.getByRole("button", { name: "Ver explicaciones" }));
    const activity = lesson1917.steps.find((step) => step.id === "c1917-branch-language").activity;
    const liveRegion = screen.getByRole("status");
    expect(liveRegion.textContent).toBe("");
    for (const option of activity.options) expect(screen.getByText(option.feedback)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: activity.options[0].text }));
    expect(screen.getByRole("status").textContent).toBe(activity.options[0].feedback);
    expect(screen.getByRole("status")).toBe(liveRegion);
    await user.click(screen.getByRole("button", { name: "Volver a la lectura" }));
    await user.click(screen.getByRole("button", { name: /Mirar el español/ }));
    expect(screen.getByRole("button", { name: activity.options[0].text }).getAttribute("aria-pressed")).toBe("true");
  });
  it("offers the reflection model without requiring a response", async () => {
    const user = userEvent.setup();
    open();
    await jump(user, "Lo que cambió, lo que quedaba abierto");
    await user.click(screen.getByRole("button", { name: "Ver un modelo" }));
    expect(screen.getByText(lesson1917.steps.find((step) => step.id === lesson1917.endId).reflection.model)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
  it("keeps source layers distinct and opens cited sources separately before finishing", async () => {
    const user = userEvent.setup();
    open();
    await jump(user, "Ocho horas, por escrito");
    expect(screen.getByText("Texto original · artículo 123, fracción I · 1917")).toBeTruthy();
    expect(screen.getByText("Explicación en español actual · no es el texto histórico")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Traducción al inglés" }));
    expect(screen.getByText("English translation · prepared for this lesson")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fuentes y notas" }));
    for (const link of screen.getAllByRole("link")) {
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noreferrer");
      expect(link.href).toMatch(/^https:/);
    }
    expect(screen.getByText(/también contiene reglas sobre trabajo nocturno/)).toBeTruthy();
  });
  it("starts fresh on remount and does not write browser storage while reading", () => {
    const db = vi.spyOn(indexedDB, "open");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const clear = vi.spyOn(Storage.prototype, "clear");
    const remove = vi.spyOn(Storage.prototype, "removeItem");
    const view = open();
    for (let i = 1; i < 10; i++) fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Ver un modelo" }));
    view.unmount();
    open();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Querétaro, 1917");
    expect(db).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(within(screen.getByRole("main")).queryByRole("textbox")).toBeNull();
  });
});
