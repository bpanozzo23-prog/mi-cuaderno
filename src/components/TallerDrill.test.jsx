// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JournalEditor from "./JournalEditor.jsx";
import JournalHome from "./JournalHome.jsx";
import { clearAllPersonalData, db, getPref } from "../db/db.js";
import { TALLER_TEMAS_PREF } from "../lib/taller.js";
import { allItems, createItem, newLexical, newPage } from "../db/items.js";
import { allEvents, EVENT_TYPES, logPracticeWrite } from "../db/events.js";
import { JOURNAL_PROMPTS } from "../lib/journalPrompts.js";

beforeEach(async () => {
  await db.open();
  await clearAllPersonalData();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const tieredPrompt = JOURNAL_PROMPTS.find((prompt) => prompt.category === "narrate" && prompt.easier && prompt.harder);

const drillSeed = (overrides = {}) => ({
  date: "2026-08-20",
  draftKey: "visit-1",
  drill: {
    skill: "narrate",
    prompt: tieredPrompt,
    offeredWords: [],
    ...overrides,
  },
});

const drillProps = (seed, overrides = {}) => ({
  entry: null,
  seed,
  onBack: vi.fn(),
  onChanged: vi.fn(),
  onMaterialized: vi.fn(),
  onDrillKept: vi.fn(),
  autosaveMs: 15,
  ...overrides,
});

const practiceEvents = async () =>
  (await allEvents()).filter((event) => event.type === EVENT_TYPES.practiceWrite);

describe("Taller drill flow", () => {
  it("persists nothing while writing: no page, no events, past the autosave window", async () => {
    const user = userEvent.setup();
    render(<JournalEditor {...drillProps(drillSeed())} />);

    expect(screen.getByText("Nada se guarda hasta que decidas")).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Hoy caminé al mercado.");
    // Well past the 15ms autosave used by the ordinary editor tests.
    await new Promise((resolve) => setTimeout(resolve, 120));

    expect(await allItems()).toEqual([]);
    expect(await allEvents()).toEqual([]);
  });

  it("discard writes no page but logs exactly one subject-less practice event", async () => {
    const user = userEvent.setup();
    const props = drillProps(drillSeed());
    render(<JournalEditor {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Texto que se perderá.");
    await user.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.getByText(/El texto se pierde/)).toBeTruthy();
    // Nothing is logged by merely arming the confirm.
    expect(await allEvents()).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(async () => expect((await practiceEvents()).length).toBe(1));

    const [logged] = await practiceEvents();
    expect(logged.itemKey).toBeNull();
    expect(logged.metadata).toMatchObject({
      skill: "narrate",
      promptId: tieredPrompt.id,
      tier: "standard",
      kept: false,
      offeredWordIds: [],
      tema: null,
    });
    expect(await allItems()).toEqual([]);
    expect(props.onBack).toHaveBeenCalledWith({ editorPrepared: true });
  });

  it("keep without the tap includes no prompt text; the tap prepends one quote block", async () => {
    const user = userEvent.setup();
    const props = drillProps(drillSeed());
    render(<JournalEditor {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Fui al mercado.");
    await user.click(screen.getByRole("button", { name: "Guardar en el Diario" }));

    await waitFor(async () => expect((await allItems()).length).toBe(1));
    const [plain] = await allItems();
    expect(plain.body).toBe("Fui al mercado.");
    expect(plain.body).not.toContain(tieredPrompt.es);
    expect(plain.pageDate).toBe("2026-08-20");
    expect(props.onDrillKept).toHaveBeenCalledWith(plain.id);

    const [logged] = await practiceEvents();
    expect(logged.itemKey).toBe(plain.id);
    expect(logged.metadata.kept).toBe(true);

    cleanup();
    await clearAllPersonalData();

    render(<JournalEditor {...drillProps(drillSeed())} />);
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Fui al mercado.");
    await user.click(screen.getByRole("button", { name: "Incluir la pregunta al guardar" }));
    await user.click(screen.getByRole("button", { name: "Guardar en el Diario" }));

    await waitFor(async () => expect((await allItems()).length).toBe(1));
    const [included] = await allItems();
    expect(included.body).toBe(`> ${tieredPrompt.es}\n\nFui al mercado.`);
  });

  it("offered words render as chips and create no links and no events against the words", async () => {
    const user = userEvent.setup();
    const casa = await createItem(newLexical({ term: "casa", form: "word" }));
    const hogar = await createItem(newLexical({ term: "hogar", form: "word" }));
    const eventsBefore = await allEvents();

    const seed = drillSeed({ offeredWords: [
      { id: casa.id, term: casa.term },
      { id: hogar.id, term: hogar.term },
    ] });
    render(<JournalEditor {...drillProps(seed)} />);

    expect(screen.getByText("casa")).toBeTruthy();
    expect(screen.getByText("hogar")).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Mi casa es mi hogar.");
    await user.click(screen.getByRole("button", { name: "Guardar en el Diario" }));
    await waitFor(async () => expect((await practiceEvents()).length).toBe(1));

    const page = (await allItems()).find((item) => item.type === "page");
    expect(page.linkedKeys).toEqual([]);
    for (const word of await allItems()) {
      if (word.type !== "lexical") continue;
      expect(word.linkedKeys || []).toEqual([]);
    }
    // The words gained no events beyond their own creation.
    const wordEvents = (await allEvents()).filter(
      (event) => event.itemKey === casa.id || event.itemKey === hogar.id
    );
    expect(wordEvents).toEqual(eventsBefore.filter(
      (event) => event.itemKey === casa.id || event.itemKey === hogar.id
    ));
    // But the practice event remembers what was offered.
    const [logged] = await practiceEvents();
    expect([...logged.metadata.offeredWordIds].sort()).toEqual([casa.id, hogar.id].sort());
  });

  it("records the tier in use and hides the toggle for a prompt without variants", async () => {
    const user = userEvent.setup();
    render(<JournalEditor {...drillProps(drillSeed())} />);

    await user.click(screen.getByRole("button", { name: "Más fácil" }));
    expect(screen.getByText(tieredPrompt.easier.es)).toBeTruthy();
    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Algo corto.");
    await user.click(screen.getByRole("button", { name: "Guardar en el Diario" }));
    await waitFor(async () => expect((await practiceEvents()).length).toBe(1));
    expect((await practiceEvents())[0].metadata.tier).toBe("easier");

    cleanup();
    const untiered = { id: "test-prompt", category: "reflect", es: "¿Qué importa?", en: "What matters?" };
    render(<JournalEditor {...drillProps(drillSeed({ skill: "reflect", prompt: untiered }))} />);
    expect(screen.queryByRole("button", { name: "Más fácil" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Más difícil" })).toBeNull();
  });

  it("shows the tema as a nudge, shuffles to another, and records the one in use", async () => {
    const user = userEvent.setup();
    const seed = drillSeed({ tema: "cocina", temas: ["cocina", "escalada"] });
    render(<JournalEditor {...drillProps(seed)} />);

    expect(screen.getByText("Tema: cocina")).toBeTruthy();
    // Excluding the current tema with one alternative makes the shuffle deterministic.
    await user.click(screen.getByRole("button", { name: "Shuffle tema" }));
    expect(screen.getByText("Tema: escalada")).toBeTruthy();

    await user.type(screen.getByRole("textbox", { name: "Journal body" }), "Escalé una pared.");
    await user.click(screen.getByRole("button", { name: "Guardar en el Diario" }));
    await waitFor(async () => expect((await practiceEvents()).length).toBe(1));
    expect((await practiceEvents())[0].metadata.tema).toBe("escalada");

    cleanup();
    render(<JournalEditor {...drillProps(drillSeed())} />);
    expect(screen.queryByText(/^Tema:/)).toBeNull();
  });

  it("leaves silently with a blank body: no confirm, no event", async () => {
    const user = userEvent.setup();
    const props = drillProps(drillSeed());
    render(<JournalEditor {...props} />);

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    expect(screen.queryByText(/El texto se pierde/)).toBeNull();
    expect(props.onBack).toHaveBeenCalledWith({ editorPrepared: true });
    expect(await allEvents()).toEqual([]);
  });

  it("hides the ordinary editor furniture in drill mode", () => {
    render(<JournalEditor {...drillProps(drillSeed())} />);
    expect(screen.queryByLabelText("Journal date")).toBeNull();
    expect(screen.queryByRole("button", { name: /Need a prompt/i })).toBeNull();
    expect(screen.queryByLabelText("Apuntes")).toBeNull();
  });
});

describe("Diario timeline badge", () => {
  it("shows the skill beside a kept practice entry and nothing beside ordinary entries", async () => {
    const practiced = await createItem(newPage({ title: "Práctica", body: "Texto.", pageDate: "2026-08-18" }));
    const ordinary = await createItem(newPage({ title: "Reflexión", body: "Texto.", pageDate: "2026-08-17" }));
    await logPracticeWrite(practiced.id, { skill: "narrate", promptId: "narrate-scene", tier: "standard", kept: true, offeredWordIds: [], tema: null });

    render(
      <JournalHome
        entries={[practiced, ordinary]}
        events={await allEvents()}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        now={new Date(2026, 7, 20, 12)}
      />
    );

    expect(screen.getByText(/· Narrate/)).toBeTruthy();
    const ordinaryCard = screen.getByRole("button", { name: "Open Reflexión" });
    expect(ordinaryCard.textContent).not.toContain("Narrate");
  });
});

describe("Taller door and proposal panel", () => {
  it("opens from a quiet door and starts a drill seed for the proposed skill", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <JournalHome
        entries={[]}
        events={[]}
        items={[]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={onStart}
        now={new Date(2026, 0, 1, 12)}
        random={() => 0}
      />
    );

    await user.click(screen.getByRole("button", { name: "Taller" }));
    // 2026-01-01 rotates to Narrate with no practice data.
    expect(screen.getByText("Narrate")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Empezar" }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const seed = onStart.mock.calls[0][0];
    expect(seed.drill.skill).toBe("narrate");
    expect(seed.drill.prompt.category).toBe("narrate");
    expect(Array.isArray(seed.drill.offeredWords)).toBe(true);
  });

  it("edits the owner's tema list inside Taller and seeds the drill with one tema", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(
      <JournalHome
        entries={[]}
        events={[]}
        items={[]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={onStart}
        now={new Date(2026, 0, 1, 12)}
        random={() => 0}
      />
    );

    await user.click(screen.getByRole("button", { name: "Taller" }));
    await user.click(screen.getByRole("button", { name: /Mis temas/ }));
    await user.type(screen.getByRole("textbox", { name: "New tema" }), "escalada");
    await user.click(screen.getByRole("button", { name: "Add tema" }));
    await waitFor(async () => expect(await getPref(TALLER_TEMAS_PREF)).toEqual(["escalada"]));

    await user.click(screen.getByRole("button", { name: "Empezar" }));
    const seed = onStart.mock.calls[0][0];
    expect(seed.drill.tema).toBe("escalada");
    expect(seed.drill.temas).toEqual(["escalada"]);

    // Removal persists too.
    cleanup();
    render(
      <JournalHome
        entries={[]} events={[]} items={[]}
        onOpen={vi.fn()} onEdit={vi.fn()} onStart={vi.fn()}
        now={new Date(2026, 0, 1, 12)}
      />
    );
    await user.click(screen.getByRole("button", { name: "Taller" }));
    await user.click(screen.getByRole("button", { name: /Mis temas/ }));
    await user.click(await screen.findByRole("button", { name: "Remove tema escalada" }));
    await waitFor(async () => expect(await getPref(TALLER_TEMAS_PREF)).toEqual([]));
  });

  it("keeps all seven categories one tap away", async () => {
    const user = userEvent.setup();
    render(
      <JournalHome
        entries={[]}
        events={[]}
        items={[]}
        onOpen={vi.fn()}
        onEdit={vi.fn()}
        onStart={vi.fn()}
        now={new Date(2026, 0, 1, 12)}
      />
    );
    await user.click(screen.getByRole("button", { name: "Taller" }));
    await user.click(screen.getByRole("button", { name: "Cambiar" }));
    for (const label of ["Notice", "Reflect", "Spanish", "Grow", "Narrate", "Imagine", "Connect"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});
