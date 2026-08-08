import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  installDictionary, fetchManifest, installedDataset, pendingInstall,
  removeDictionary, discardPendingInstall, checkForUpdate,
} from "./install.js";
import { activeSlot, refDb, setActiveSlot } from "./refdb.js";
import {
  getEntry,
  getConjugation,
  getVerbTablesByLemma,
  resolveVerbEntriesByLemma,
  dictionaryInstalled,
  installedMeta,
  exampleAttribution,
} from "./entries.js";
import { db as personalDb } from "../db.js";
import { createItem } from "../items.js";
import { buildFixtureDictionary, installFetchStub } from "../../test/dictFixture.js";
import { newLexical } from "../items.js";
import { newMeaning } from "../../lib/meanings.js";

const realFetch = globalThis.fetch;

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("installing a dictionary", () => {
  it("installs every chunk and makes the entries readable", async () => {
    const fixture = await buildFixtureDictionary();
    installFetchStub(fixture);

    expect(await dictionaryInstalled()).toBe(false);
    await installDictionary(await fetchManifest());

    expect(await dictionaryInstalled()).toBe(true);
    const sacar = await getEntry("dict:wiktionary-es:sacar:verb");
    expect(sacar.lemma).toBe("sacar");
    expect(sacar.senses[0].gloss).toContain("take out");

    const meta = await installedMeta();
    expect(meta.datasetVersion).toBe("fixture-v1");
    expect(meta.counts.entries).toBe(6);
  });

  it("reports progress in bytes, ending at the total", async () => {
    const fixture = await buildFixtureDictionary();
    installFetchStub(fixture);
    const seen = [];

    await installDictionary(await fetchManifest(), { onProgress: (p) => seen.push(p) });

    expect(seen[0].receivedBytes).toBe(0);
    const last = seen[seen.length - 1];
    expect(last.phase).toBe("done");
    expect(last.receivedBytes).toBe(last.totalBytes);
    // monotonic, never past the total
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i].receivedBytes).toBeGreaterThanOrEqual(seen[i - 1].receivedBytes);
      expect(seen[i].receivedBytes).toBeLessThanOrEqual(seen[i].totalBytes);
    }
  });

  it("composes perfect tenses from the installed haber table", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const conj = await getConjugation("conj:jehle:sacar");
    expect(conj.tenses["Indicative/Preterite"].yo).toBe("saqué");
    expect(conj.tenses["Indicative/Present Perfect"].yo).toBe("he sacado");
  });

  it("resolves curated verbs by exact lemma and batch-loads their tables", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const resolved = await resolveVerbEntriesByLemma(["sacar", "ser", "casa", "missing"]);
    expect(resolved.map(({ entry }) => entry?.lemma || null)).toEqual(["sacar", "ser", null, null]);

    const verbs = await getVerbTablesByLemma(["sacar", "missing"]);
    expect(verbs[0].available).toBe(true);
    expect(verbs[0].conjugation.tenses["Indicative/Present Perfect"].yo).toBe("he sacado");
    expect(verbs[1]).toMatchObject({ lemma: "missing", entry: null, conjugation: null, available: false });
  });

  it("rebuilds each example's full attribution from the manifest constants (§4)", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const casa = await getEntry("dict:wiktionary-es:casa:noun");
    const attribution = exampleAttribution(casa.examples[0], await installedMeta());
    expect(attribution.license).toBe("CC BY 2.0 FR");
    expect(attribution.spanish.contributor).toBe("alice");
    expect(attribution.spanish.url).toBe("https://tatoeba.org/en/sentences/show/1");
    expect(attribution.english.contributor).toBe("bob");
    expect(attribution.english.url).toBe("https://tatoeba.org/en/sentences/show/2");
  });
});

describe("integrity and interruption (§11)", () => {
  it("refuses a chunk whose hash does not match", async () => {
    const fixture = await buildFixtureDictionary();
    installFetchStub(fixture, { corrupt: "chunk-001.json" });

    await expect(installDictionary(await fetchManifest())).rejects.toThrow(/integrity check/i);
    expect(await dictionaryInstalled()).toBe(false);
  });

  it("leaves the previous version serving when a download fails halfway", async () => {
    // install v1 the normal way
    installFetchStub(await buildFixtureDictionary("fixture-v1"));
    await installDictionary(await fetchManifest());
    const slotBefore = activeSlot();

    // v2 dies after one chunk
    const v2 = await buildFixtureDictionary("fixture-v2");
    installFetchStub(v2, { failAfter: 1 });
    await expect(installDictionary(v2.manifest)).rejects.toThrow();

    expect(activeSlot()).toBe(slotBefore);
    expect((await installedDataset()).datasetVersion).toBe("fixture-v1");
    expect((await getEntry("dict:wiktionary-es:sacar:verb")).lemma).toBe("sacar");
  });

  it("resumes an interrupted install instead of starting over", async () => {
    const v1 = await buildFixtureDictionary();
    const failing = installFetchStub(v1, { failAfter: 1 });
    await expect(installDictionary(v1.manifest)).rejects.toThrow();

    const pending = await pendingInstall();
    expect(pending.datasetVersion).toBe("fixture-v1");
    expect(pending.completedChunks).toEqual(["chunk-000.json"]);

    const resumed = installFetchStub(v1);
    await installDictionary(v1.manifest);

    // the already-downloaded chunk is not fetched again
    expect(resumed.requests).not.toContain("chunk-000.json");
    expect(resumed.requests).toContain("chunk-001.json");
    expect(await dictionaryInstalled()).toBe(true);
    expect((await getEntry("dict:wiktionary-es:casa:noun")).lemma).toBe("casa");
  });

  it("starts fresh rather than resuming when the pending install is a different version", async () => {
    const v1 = await buildFixtureDictionary("fixture-v1");
    installFetchStub(v1, { failAfter: 1 });
    await expect(installDictionary(v1.manifest)).rejects.toThrow();

    const v2 = await buildFixtureDictionary("fixture-v2");
    const stub = installFetchStub(v2);
    await installDictionary(v2.manifest);

    expect(stub.requests).toContain("chunk-000.json");
    expect((await installedDataset()).datasetVersion).toBe("fixture-v2");
  });

  it("discards a pending install without disturbing the live one", async () => {
    installFetchStub(await buildFixtureDictionary("fixture-v1"));
    await installDictionary(await fetchManifest());

    const v2 = await buildFixtureDictionary("fixture-v2");
    installFetchStub(v2, { failAfter: 1 });
    await expect(installDictionary(v2.manifest)).rejects.toThrow();

    await discardPendingInstall();
    expect(await pendingInstall()).toBeNull();
    expect((await installedDataset()).datasetVersion).toBe("fixture-v1");
  });
});

describe("version swap (§11)", () => {
  it("swaps atomically into the other slot and frees the old one", async () => {
    installFetchStub(await buildFixtureDictionary("fixture-v1"));
    await installDictionary(await fetchManifest());
    const first = activeSlot();

    const v2 = await buildFixtureDictionary("fixture-v2");
    installFetchStub(v2);
    await installDictionary(v2.manifest);

    const second = activeSlot();
    expect(second).not.toBe(first);
    expect((await installedDataset()).datasetVersion).toBe("fixture-v2");
    expect(await refDb(first).entries.count()).toBe(0);
  });

  it("reports whether an update is available", async () => {
    installFetchStub(await buildFixtureDictionary("fixture-v1"));
    await installDictionary(await fetchManifest());

    expect((await checkForUpdate()).updateAvailable).toBe(false);

    installFetchStub(await buildFixtureDictionary("fixture-v2"));
    const check = await checkForUpdate();
    expect(check.updateAvailable).toBe(true);
    expect(check.manifest.datasetVersion).toBe("fixture-v2");
  });
});

describe("the seam between the layers (§5)", () => {
  it("removing the dictionary leaves personal data untouched", async () => {
    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    const item = await createItem(newLexical({ term: "sacar", meanings: [newMeaning({ gloss: "to take out" })], dictKey: "dict:wiktionary-es:sacar:verb" }));

    await removeDictionary();

    expect(await dictionaryInstalled()).toBe(false);
    expect(await getEntry("dict:wiktionary-es:sacar:verb")).toBeNull();
    const survivor = await personalDb.items.get(item.id);
    expect(survivor.term).toBe("sacar");
    expect(survivor.dictKey).toBe("dict:wiktionary-es:sacar:verb");
  });

  it("installing a dictionary does not touch personal data", async () => {
    const item = await createItem(newLexical({ term: "chamba", meanings: [newMeaning({ gloss: "work" })] }));
    const eventsBefore = await personalDb.events.count();

    installFetchStub(await buildFixtureDictionary());
    await installDictionary(await fetchManifest());

    expect((await personalDb.items.get(item.id)).term).toBe("chamba");
    expect(await personalDb.events.count()).toBe(eventsBefore);
  });

  it("reads return empty rather than throwing when nothing is installed", async () => {
    expect(await dictionaryInstalled()).toBe(false);
    expect(await getEntry("dict:wiktionary-es:sacar:verb")).toBeNull();
    expect(await getConjugation("conj:jehle:sacar")).toBeNull();
    expect(await installedMeta()).toBeNull();
  });

  it("ignores an active-slot pointer left behind by a removed database", async () => {
    setActiveSlot("a");
    expect(await getEntry("dict:wiktionary-es:sacar:verb")).toBeNull();
    expect(await dictionaryInstalled()).toBe(false);
  });
});
