import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllPersonalData, getPref, setPref } from "../db/db.js";
import { PERSISTENCE_PREF, requestPersistence, storageStatus } from "./persistence.js";

beforeEach(clearAllPersonalData);
afterEach(() => vi.unstubAllGlobals());

function browser(storage) {
  vi.stubGlobal("navigator", { storage });
  return storage;
}

describe("storage protection belongs to this browser", () => {
  it("requests protection despite a restored true preference", async () => {
    await setPref(PERSISTENCE_PREF, true);
    const storage = browser({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValue(true) });
    await expect(requestPersistence()).resolves.toBe(true);
    expect(storage.persisted).toHaveBeenCalledOnce();
    expect(storage.persist).toHaveBeenCalledOnce();
    expect(await getPref(PERSISTENCE_PREF)).toBe(true);
  });

  it("records a confirmed current grant without requesting again", async () => {
    await setPref(PERSISTENCE_PREF, false);
    const storage = browser({ persisted: vi.fn().mockResolvedValue(true), persist: vi.fn() });
    await expect(requestPersistence()).resolves.toBe(true);
    expect(storage.persist).not.toHaveBeenCalled();
    expect(await getPref(PERSISTENCE_PREF)).toBe(true);
  });

  it("records denial and permits a later request", async () => {
    await setPref(PERSISTENCE_PREF, true);
    const storage = browser({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true) });
    await expect(requestPersistence()).resolves.toBe(false);
    expect(await getPref(PERSISTENCE_PREF)).toBe(false);
    await expect(requestPersistence()).resolves.toBe(true);
    expect(storage.persist).toHaveBeenCalledTimes(2);
    expect(await getPref(PERSISTENCE_PREF)).toBe(true);
  });

  it.each(["missing", "rejected"])("still requests when the status API is %s", async (kind) => {
    await setPref(PERSISTENCE_PREF, true);
    const storage = browser({
      ...(kind === "rejected" ? { persisted: vi.fn().mockRejectedValue(new Error("status unavailable")) } : {}),
      persist: vi.fn().mockResolvedValue(false),
    });
    await expect(requestPersistence()).resolves.toBe(false);
    expect(storage.persist).toHaveBeenCalledOnce();
    expect(await storageStatus()).toMatchObject({ persisted: null, supported: true });
  });

  it("does not invent a grant when the browser request rejects", async () => {
    browser({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockRejectedValue(new Error("request failed")) });
    await expect(requestPersistence()).rejects.toThrow("request failed");
    expect(await getPref(PERSISTENCE_PREF, null)).toBeNull();
  });

  it.each([undefined, {}])("supports browsers without storage APIs (%j)", async (storage) => {
    await setPref(PERSISTENCE_PREF, true);
    browser(storage);
    await expect(requestPersistence()).resolves.toBeNull();
    expect(await storageStatus()).toMatchObject({ persisted: null, supported: false });
  });

  it("reports current protection and estimates, not the restored grant", async () => {
    await setPref(PERSISTENCE_PREF, true);
    browser({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn(), estimate: vi.fn().mockResolvedValue({ usage: 12, quota: 34 }) });
    expect(await storageStatus()).toEqual({ persisted: false, supported: true, requested: true, usageBytes: 12, quotaBytes: 34 });
  });
});
