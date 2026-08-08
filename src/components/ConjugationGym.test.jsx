// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConjugationGym from "./ConjugationGym.jsx";
import { removeDictionary } from "../db/ref/install.js";
import { META_KEYS, refDb, setActiveSlot } from "../db/ref/refdb.js";
import { FIXTURE_CONJUGATIONS, FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../test/dictFixture.js";
import { makeLexical } from "../test/factories.js";

const SACAR = "dict:wiktionary-es:sacar:verb";

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
  await Promise.all([
    db.entries.bulkPut(FIXTURE_ENTRIES),
    db.conjugations.bulkPut([...FIXTURE_CONJUGATIONS.filter((row) => row.id !== serTable.id), serTable]),
    db.formShards.bulkPut(FIXTURE_FORM_SHARDS),
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
  it("keeps performance available when the dictionary is not installed", async () => {
    const user = userEvent.setup();
    render(<ConjugationGym items={[]} events={[]} onBack={vi.fn()} onOpen={vi.fn()} onGraded={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Dictionary not installed")).toBeTruthy());
    await user.click(screen.getByRole("button", { name: "View conjugation performance" }));
    expect(screen.getByText(/Complete a session/)).toBeTruthy();
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
    expect(screen.getByRole("checkbox", { name: /Subjunctive future\s*· rare/i })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Indicative preterite perfect \(archaic\)\s*· rare/i })).toBeTruthy();
  });
});
