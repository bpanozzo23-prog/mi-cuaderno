// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictionaryCard from "./DictionaryCard.jsx";
import {
  fetchManifest,
  installDictionary,
  installedDataset,
  removeDictionary,
} from "../db/ref/install.js";
import { activeSlot, refDb } from "../db/ref/refdb.js";
import { buildFixtureDictionary, installFetchStub } from "../test/dictFixture.js";

const realFetch = globalThis.fetch;

beforeEach(async () => {
  await removeDictionary();
  localStorage.clear();
});

afterEach(async () => {
  cleanup();
  globalThis.fetch = realFetch;
  await removeDictionary();
  vi.restoreAllMocks();
});

describe("dictionary family-store repair", () => {
  it("offers an explicit same-version repair and restores the missing store", async () => {
    const user = userEvent.setup();
    const onInstalled = vi.fn();
    const fixture = await buildFixtureDictionary({ datasetVersion: "fixture-r3" });
    installFetchStub(fixture);
    await installDictionary(await fetchManifest());
    await refDb(activeSlot()).patternFamilies.clear();
    installFetchStub(fixture);

    render(<DictionaryCard onInstalled={onInstalled} />);

    expect(await screen.findByText(/conjugation-family files are incomplete/i)).toBeTruthy();
    await user.click(await screen.findByRole("button", { name: /repair dictionary/i }));

    expect(await screen.findByText(/was repaired and works offline/i)).toBeTruthy();
    await waitFor(async () => {
      expect((await installedDataset()).familyIndexStatus).toBe("complete");
    });
    expect(await refDb(activeSlot()).patternFamilies.count()).toBe(1);
    expect(onInstalled).toHaveBeenCalledOnce();
    expect(screen.queryByText(/conjugation-family files are incomplete/i)).toBeNull();
  });
});
