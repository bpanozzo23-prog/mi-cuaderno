import { getPref, setPref } from "../db/db.js";

/**
 * Brief section 10: on first meaningful use, ask the browser to keep this data.
 * Without persistence, the browser may evict IndexedDB under storage pressure.
 * The answer is recorded so the settings screen can tell the owner plainly.
 */
export const PERSISTENCE_PREF = "storagePersisted";

export async function requestPersistence() {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persist) return null;
  let persisted = false;
  try {
    persisted = storage.persisted ? await storage.persisted() : false;
  } catch {
    // A failed status check must not let an imported preference suppress the request.
  }
  const granted = persisted === true || await storage.persist();
  await setPref(PERSISTENCE_PREF, granted);
  return granted;
}

/**
 * The saved answer may come from another browser through a backup. It is historical
 * information only: current protection is unknown unless this browser confirms it.
 */
export async function storageStatus() {
  const recorded = await getPref(PERSISTENCE_PREF, null);
  const storage = globalThis.navigator?.storage;
  let persisted = null;
  let usageBytes = null;
  let quotaBytes = null;

  if (storage?.persisted) {
    try {
      persisted = await storage.persisted();
    } catch {
      /* unknown on this browser */
    }
  }
  if (storage?.estimate) {
    try {
      const est = await storage.estimate();
      usageBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    } catch {
      /* estimates are optional */
    }
  }
  return {
    persisted,
    requested: recorded !== null,
    supported: Boolean(storage?.persist),
    usageBytes,
    quotaBytes,
  };
}
