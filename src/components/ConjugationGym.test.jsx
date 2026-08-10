// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConjugationGym from "./ConjugationGym.jsx";
import * as gymReference from "../db/ref/gym.js";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_CONJUGATIONS, FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../test/dictFixture.js";
import { makeLexical } from "../test/factories.js";

const SACAR = "dict:wiktionary-es:sacar:verb";
const PREFERIR = "dict:fixture:preferir:verb";

async function seedGymDictionary() {
  const db = refDb("a");
  const serTable = {
    ...FIXTURE_CONJUGATIONS.find((row) => row.id === "conj:jehle:ser"),
    tenses: {
      "Indicative/Present": {
        yo: "soy", "tú": "eres", "él/ella/usted": "es",
        nosotros: "somos", "ustedes/ellos": "son",
      },
    },
  };
  const preferirTable = {
    id: "conj:fixture:preferir",
    source: "fixture",
    tenses: {
      "Indicative/Present": {
        yo: "prefiero", "tú": "prefieres", "él/ella/usted": "prefiere",
        nosotros: "preferimos", "ustedes/ellos": "prefieren",
      },
    },
  };
  await Promise.all([
    db.entries.bulkPut([...FIXTURE_ENTRIES, {
      id: PREFERIR, lemma: "preferir", pos: "verb", conjugationId: preferirTable.id, senses: [],
    }]),
    db.conjugations.bulkPut([...FIXTURE_CONJUGATIONS.filter((row) => row.id !== serTable.id), serTable, preferirTable]),
    db.formShards.bulkPut([...FIXTURE_FORM_SHARDS, { id: "pr", terms: { preferir: [PREFERIR] } }]),
    db.meta.put({ key: META_KEYS.dataset, value: { datasetVersion: "gym-fixture", previousIds: {} } }),
  ]);
  setActiveSlot("a");
}

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  await removeDictionary();
  vi.restoreAllMocks();
});

describe("Conjugation Gym setup", () => {
  it("offers recognition lanes without a dictionary and hides form-only controls", async () => {
    const user = userEvent.setup();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: "Tense usage" }));
    expect(screen.getByText("What is it for?")).toBeTruthy();
    expect(screen.queryByText("Dictionary not installed")).toBeNull();
    expect(screen.queryByText("Verb pool")).toBeNull();
    expect(screen.queryByRole("radio", { name: "Type" })).toBeNull();
    expect(screen.queryByText("People")).toBeNull();
    expect(screen.getByRole("button", { name: "Start tense usage" })).toBeTruthy();
  });

  it("starts default all-selected Usage recall and permits a one-tense custom scope", async () => {
    const user = userEvent.setup();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: "Tense usage" }));
    await user.click(screen.getByRole("radio", { name: "Recall uses" }));
    expect(screen.getByLabelText("Prompts").value).toBe("all");
    expect(screen.getByText("6 tenses available for these choices.")).toBeTruthy();

    await user.selectOptions(screen.getByLabelText("Tense pack"), "customize");
    for (const tense of [
      "Indicative preterite",
      "Indicative imperfect",
      "Indicative future",
      "Indicative conditional",
      "Subjunctive present",
    ]) {
      await user.click(screen.getByRole("checkbox", { name: tense }));
    }
    expect(screen.getByText("1 tense available for these choices.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Start tense usage" }));
    expect(screen.getByText("Indicative present")).toBeTruthy();
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(screen.getByText("Recall at least one valid use.")).toBeTruthy();
  });

  it("keeps performance available when the dictionary is not installed", async () => {
    const user = userEvent.setup();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Dictionary not installed")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "View conjugation performance" }));
    expect(screen.getByText(/No typed first attempts/)).toBeTruthy();
    expect(screen.getByText(/Coverage and practice actions are unavailable/)).toBeTruthy();
  });

  it("defaults to Type and can run a Quick session from saved verbs", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    const saved = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    render(<ConjugationGym items={[saved]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("radio", { name: "Saved" })).toBeTruthy());
    expect(screen.getByRole("radio", { name: "Type" }).getAttribute("aria-checked")).toBe("true");
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.click(screen.getByRole("button", { name: "Start quick session" }));

    expect(screen.getByLabelText("Type the form")).toBeTruthy();
    expect(screen.getByText(/Indicative (present|preterite)/)).toBeTruthy();
  });

  it("can practise Core verbs with no saved vocabulary", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/2 of 20 core verbs available/)).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Start quick session" }));
    expect(screen.getByLabelText("Type the form")).toBeTruthy();
  });

  it("finishes loading its verb library under React Strict Mode", async () => {
    await seedGymDictionary();
    render(
      <StrictMode>
        <ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />
      </StrictMode>
    );

    await waitFor(() => expect(screen.getByText(/2 of 20 core verbs available/)).toBeTruthy());
  });

  it("offers the two curated pattern packs as reference-only pools", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("radio", { name: "Stem changers" })).toBeTruthy());
    await user.click(screen.getByRole("radio", { name: "Stem changers" }));
    expect(screen.getByText("1 of 17 stem changers available")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Irregular preterites" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Start quick session" }));
    expect(screen.getByText("preferir")).toBeTruthy();
    expect(screen.getByLabelText("Type the form")).toBeTruthy();
  });

  it("exposes Focus packs, exact persisted person strings, and rare custom labels", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Focus/ })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Focus/ }));
    expect(screen.getByText("él/ella/usted")).toBeTruthy();
    expect(screen.getByText("ustedes/ellos")).toBeTruthy();
    expect(screen.queryByText("vosotros")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Tense pack"), "customize");
    expect(screen.getByRole("checkbox", { name: /Subjunctive imperfect \(-se\)\s*· alternative \/ less common/i })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /Subjunctive imperfect \(-se\)\s*· rare/i })).toBeNull();
    expect(screen.getByRole("checkbox", { name: /Subjunctive future\s*· rare/i })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Indicative preterite perfect \(archaic\)\s*· rare/i })).toBeTruthy();
  });

  it("turns Practice next into a prefilled Focus session", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    const saved = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    const events = [1, 2, 3].map((number) => ({
      id: `drill-${number}`,
      type: "drill_fail",
      itemKey: "user:sacar",
      at: `2026-08-07T12:0${number}:00.000Z`,
      localDate: "2026-08-07",
      metadata: {
        sessionId: "session-1",
        promptId: `prompt-${number}`,
        sessionKind: "focus",
        source: "saved",
        curriculum: null,
        verbKey: "lemma:sacar",
        lemma: "sacar",
        dictKey: SACAR,
        tense: "Indicative/Present",
        slot: "yo",
        mode: "typed",
        verdict: "wrong",
        diagnosis: "wrong_tense",
        stage: "initial",
        cardIndex: number,
        deckSize: 3,
      },
    }));
    render(<ConjugationGym items={[saved]} events={events} initialView="stats" onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Practice next" })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "Practice next" }));

    expect(screen.getByRole("button", { name: /Focus/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("radio", { name: "Saved" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("Tense pack").value).toBe("everyday");
    expect(screen.getByLabelText("One verb (optional)").value).toBe("");
    expect(screen.getByText("sacar · Indicative present · yo")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "yo" }).checked).toBe(true);
    expect(screen.getByRole("checkbox", { name: "tú" }).checked).toBe(true);
    await user.click(screen.getByRole("button", { name: "Clear target" }));
    expect(screen.queryByText("sacar · Indicative present · yo")).toBeNull();
    await user.click(screen.getByRole("button", { name: "View conjugation performance" }));
    await user.click(screen.getByRole("button", { name: "Practice next" }));
    await user.click(screen.getByRole("button", { name: "Start focus session" }));
    expect(screen.getByText(/Indicative present · yo/)).toBeTruthy();
    expect(screen.getByText("1 / 10")).toBeTruthy();
  });

  it("previews a short unique-form supply and starts the shorter deck without blocking", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    const saved = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    render(<ConjugationGym items={[saved]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Focus/ })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Focus/ }));
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    for (const slot of ["tú", "él/ella/usted", "nosotros", "ustedes/ellos"]) {
      await user.click(screen.getByRole("checkbox", { name: slot }));
    }

    expect(screen.getByText("2 unique forms available for these choices.")).toBeTruthy();
    expect(screen.getByText("Only 2 forms are available, so this 10-prompt session will use all 2.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Start focus session" }));
    expect(screen.getByText("1 / 2")).toBeTruthy();
  });

  it("resets every setup choice before applying a performance practice action", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    const saved = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    render(<ConjugationGym items={[saved]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("button", { name: /Focus/ })).toBeTruthy());
    await user.click(screen.getByRole("button", { name: /Focus/ }));
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.click(screen.getByRole("radio", { name: "Reveal" }));
    await user.selectOptions(screen.getByLabelText("Tense pack"), "commands");
    await user.click(screen.getByRole("checkbox", { name: "yo" }));
    await user.selectOptions(screen.getByLabelText("Prompts"), "20");
    await user.selectOptions(screen.getByLabelText("One verb (optional)"), "user:sacar");
    await user.click(screen.getByRole("button", { name: "View conjugation performance" }));
    await user.click(screen.getByRole("button", { name: "Practice next" }));

    expect(screen.getByRole("radio", { name: "Core 20" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Type" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("Tense pack").value).toBe("everyday");
    expect(screen.getByLabelText("Prompts").value).toBe("10");
    expect(screen.getByLabelText("One verb (optional)").value).toBe("");
    expect(screen.getByRole("checkbox", { name: "yo" }).checked).toBe(true);
  });

  it("feeds persisted initial misses into an Adaptive session", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    const saved = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    const missed = {
      id: "adaptive-miss",
      type: "drill_fail",
      itemKey: "user:sacar",
      at: "2026-08-07T12:00:00.000Z",
      localDate: "2026-08-07",
      metadata: {
        sessionId: "old-session",
        promptId: "old-prompt",
        sessionKind: "focus",
        source: "saved",
        curriculum: null,
        verbKey: "lemma:sacar",
        lemma: "sacar",
        dictKey: SACAR,
        tense: "Indicative/Preterite",
        slot: "yo",
        mode: "typed",
        verdict: "wrong",
        diagnosis: "wrong_tense",
        stage: "initial",
        cardIndex: 1,
        deckSize: 10,
      },
    };
    render(<ConjugationGym items={[saved]} events={[missed]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("radio", { name: "Saved" })).toBeTruthy());
    await user.click(screen.getByRole("radio", { name: "Saved" }));
    await user.click(screen.getByRole("button", { name: /Adaptive/ }));
    await user.click(screen.getByRole("button", { name: "Start adaptive session" }));

    expect(screen.getByText(/Indicative preterite · yo/)).toBeTruthy();
  });

  it("defers a changed library snapshot until an active session returns to setup", async () => {
    const user = userEvent.setup();
    await seedGymDictionary();
    const loadSpy = vi.spyOn(gymReference, "loadGymLibrary");
    const props = { events: [], onBack: vi.fn(), onOpen: vi.fn(), onGraded: vi.fn() };
    const { rerender } = render(<ConjugationGym items={[]} {...props} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Start quick session" })).toBeTruthy());
    expect(loadSpy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Start quick session" }));
    const saved = makeLexical({ id: "user:sacar", term: "sacar", dictKey: SACAR });
    await act(async () => {
      rerender(<ConjugationGym items={[saved]} {...props} />);
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(loadSpy).toHaveBeenCalledTimes(2));
  });
});
