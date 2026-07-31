import { getPref, setPref } from "../db/db.js";

/**
 * Brief section 10: on first meaningful use, ask the browser to keep this data.
 * Without persistence, the browser may evict IndexedDB under storage pressure.
 * The answer is recorded so the settings screen can tell the owner plainly.
 */
export const PERSISTENCE_PREF = "storagePersisted";

export async function requestPersistence() {
  if (!navigator?.storage?.persist) return null;
  const alreadyAsked = await getPref(PERSISTENCE_PREF, null);
  if (alreadyAsked === true) return true;
  const granted = await navigator.storage.persist();
  await setPref(PERSISTENCE_PREF, granted);
  return granted;
}

/**
 * `requested` distinguishes "we have never asked" from "we asked and were refused" —
 * on a fresh install persisted() is false simply because nothing has been requested yet,
 * and telling the owner their storage was denied would be wrong.
 */
export async function storageStatus() {
  const recorded = await getPref(PERSISTENCE_PREF, null);
  let persisted = recorded;
  let usageBytes = null;
  let quotaBytes = null;

  if (navigator?.storage?.persisted) {
    try {
      persisted = await navigator.storage.persisted();
    } catch {
      /* keep the recorded answer */
    }
  }
  if (navigator?.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage ?? null;
      quotaBytes = est.quota ?? null;
    } catch {
      /* estimates are optional */
    }
  }
  return {
    persisted,
    requested: recorded !== null,
    supported: Boolean(navigator?.storage?.persist),
    usageBytes,
    quotaBytes,
  };
}
