import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadGymLibrary } from "./gym.js";
import { removeDictionary } from "./install.js";
import { META_KEYS, refDb, setActiveSlot } from "./refdb.js";
import { FIXTURE_CONJUGATIONS, FIXTURE_ENTRIES, FIXTURE_FORM_SHARDS } from "../../test/dictFixture.js";
import { makeLexical } from "../../test/factories.js";

const SER = "dict:wiktionary-es:ser:verb";
const PREFERIR = "dict:fixture:preferir:verb";

async function seed() {
  const db = refDb("a");
  const serTable = {
    ...FIXTURE_CONJUGATIONS.find((row) => row.id === "conj:jehle:ser"),
    tenses: { "Indicative/Present": { yo: "soy", "tú": "eres" } },
  };
  const preferirTable = {
    id: "conj:fixture:preferir",
    source: "fixture",
    tenses: { "Indicative/Present": { yo: "prefiero", "tú": "prefieres" } },
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
});

afterEach(async () => {
  await removeDictionary();
});

describe("loading the Conjugation Gym library", () => {
  it("keeps the Gym readable without a dictionary", async () => {
    await expect(loadGymLibrary([])).resolves.toMatchObject({ installed: false, saved: [], core: [] });
  });

  it("loads saved and curated tables only after being called", async () => {
    await seed();
    const item = makeLexical({ id: "user:ser", term: "ser", dictKey: SER });
    const library = await loadGymLibrary([item]);

    expect(library.installed).toBe(true);
    expect(library.saved.find((verb) => verb.lemma === "ser")).toMatchObject({
      itemKey: "user:ser", verbKey: "lemma:ser", openKey: "user:ser",
    });
    expect(library.core.find((verb) => verb.lemma === "ser")).toMatchObject({
      itemKey: "user:ser", verbKey: "lemma:ser", openKey: "user:ser",
    });
    expect(library.core.find((verb) => verb.lemma === "preferir")).toMatchObject({
      itemKey: null, verbKey: "lemma:preferir", openKey: PREFERIR,
    });
    expect(library.unavailableCore).toContain("estar");
  });

  it("leaves a Core event unattached when multiple personal items resolve to the entry", async () => {
    await seed();
    const items = [
      makeLexical({ id: "user:ser-1", term: "ser", dictKey: SER }),
      makeLexical({ id: "user:ser-2", term: "ser", dictKey: SER }),
    ];
    const coreSer = (await loadGymLibrary(items)).core.find((verb) => verb.lemma === "ser");

    expect(coreSer.itemKey).toBeNull();
    expect(coreSer.openKey).toBe(SER);
  });
});
