import {
  refDb, activeSlot, inactiveSlot, setActiveSlot, clearActiveSlot,
  wipeSlot, deleteSlot, getMeta, setMeta, META_KEYS, SLOTS,
} from "./refdb.js";

/**
 * Downloading and installing the dictionary (brief §11).
 *
 * The rules §11 sets, and how each is met:
 *
 *  - "explicit, versioned, chunked, with visible progress" — the owner taps Download; the
 *    manifest names the chunks; progress is reported in bytes, not chunk counts, so the
 *    bar moves smoothly rather than in fourteen jumps.
 *  - "version swaps are atomic" — chunks are written into the INACTIVE database and the
 *    active-slot pointer flips only after the last one verifies.
 *  - "a failed or interrupted download leaves the previous version intact and usable" —
 *    nothing touches the live database at any point, and progress is recorded so a
 *    resumed install skips the chunks it already has.
 *
 * Each chunk's sha256 is checked against the manifest before it is written. A truncated
 * or corrupted download should fail loudly here rather than become a dictionary with a
 * hole in it that only shows up as a word mysteriously not being found.
 */

/** Where the chunks live, relative to the app. Vite rewrites BASE_URL for GitHub Pages. */
const base = () => `${import.meta.env.BASE_URL}dict/`;
export const manifestUrl = () => `${base()}manifest.json`;
const chunkUrl = (manifest, file) => `${base()}${manifest.path}/${file}`;

const STORES = ["entries", "conjugations", "formShards", "englishShards"];

export async function fetchManifest({ signal } = {}) {
  // cache: no-store so "check for updates" asks the network, not the service worker.
  const res = await fetch(manifestUrl(), { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read the dictionary manifest (HTTP ${res.status}).`);
  const manifest = await res.json();
  if (manifest.format !== "mi-cuaderno-dictionary") throw new Error("That is not a Mi cuaderno dictionary manifest.");
  return manifest;
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** What is installed right now, or null. */
export async function installedDataset() {
  const slot = activeSlot();
  if (!slot) return null;
  const dataset = await getMeta(refDb(slot), META_KEYS.dataset, null);
  return dataset ? { ...dataset, slot } : null;
}

/** A half-finished install waiting to be resumed, or null. */
export async function pendingInstall() {
  const slot = inactiveSlot();
  const progress = await getMeta(refDb(slot), META_KEYS.progress, null);
  return progress ? { ...progress, slot } : null;
}

/**
 * Downloads and installs `manifest`, calling `onProgress` as it goes.
 *
 * onProgress receives { phase, receivedBytes, totalBytes, chunk, chunks } — phase is
 * "downloading" while chunks arrive and "done" at the end.
 */
export async function installDictionary(manifest, { onProgress, signal } = {}) {
  const slot = inactiveSlot();
  const db = refDb(slot);

  // Resume only if the interrupted install was of this exact dataset; otherwise the slot
  // holds a different version's rows and must be cleared before anything is written.
  const previous = await getMeta(db, META_KEYS.progress, null);
  const resuming = previous?.datasetVersion === manifest.datasetVersion;
  const completed = new Set(resuming ? previous.completedChunks : []);
  if (!resuming) await wipeSlot(slot);

  const totalBytes = manifest.chunks.reduce((n, c) => n + c.bytes, 0);
  let receivedBytes = manifest.chunks.filter((c) => completed.has(c.file)).reduce((n, c) => n + c.bytes, 0);

  const report = (phase, chunkIndex) =>
    onProgress?.({ phase, receivedBytes, totalBytes, chunk: chunkIndex, chunks: manifest.chunks.length });

  report("downloading", completed.size);

  for (const [index, chunk] of manifest.chunks.entries()) {
    if (completed.has(chunk.file)) continue;
    if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");

    const res = await fetch(chunkUrl(manifest, chunk.file), { signal });
    if (!res.ok) throw new Error(`Chunk ${chunk.file} failed to download (HTTP ${res.status}).`);
    const buffer = await res.arrayBuffer();

    if (buffer.byteLength !== chunk.bytes) {
      throw new Error(`Chunk ${chunk.file} is the wrong size — the download was truncated.`);
    }
    const digest = await sha256Hex(buffer);
    if (digest !== chunk.sha256) {
      throw new Error(`Chunk ${chunk.file} failed its integrity check — the download was corrupted.`);
    }

    const parsed = JSON.parse(new TextDecoder().decode(buffer));

    // One transaction per chunk: a chunk is either fully in or fully out, so a crash
    // mid-write cannot leave a half-applied chunk that `completed` then claims is done.
    await db.transaction("rw", db.entries, db.conjugations, db.formShards, db.englishShards, db.meta, async () => {
      for (const store of STORES) {
        const rows = parsed.stores?.[store];
        if (rows?.length) await db[store].bulkPut(rows);
      }
      completed.add(chunk.file);
      await db.meta.put({
        key: META_KEYS.progress,
        value: { datasetVersion: manifest.datasetVersion, completedChunks: [...completed], startedAt: previous?.startedAt || new Date().toISOString() },
      });
    });

    receivedBytes += chunk.bytes;
    report("downloading", index + 1);
  }

  // Everything is present and verified. Record the dataset, then flip the pointer — the
  // one write that makes this version live.
  await setMeta(db, META_KEYS.dataset, {
    datasetVersion: manifest.datasetVersion,
    formatVersion: manifest.formatVersion,
    path: manifest.path,
    counts: manifest.counts,
    bytes: manifest.bytes,
    attribution: manifest.attribution,
    previousIds: manifest.previousIds || {},
    installedAt: new Date().toISOString(),
  });
  await db.meta.delete(META_KEYS.progress);

  const replaced = activeSlot();
  setActiveSlot(slot);

  // The old version is only discarded once the new one is serving.
  if (replaced && replaced !== slot) await wipeSlot(replaced);

  report("done", manifest.chunks.length);
  return { slot, datasetVersion: manifest.datasetVersion };
}

/** Throws away an interrupted install without touching whatever is live. */
export async function discardPendingInstall() {
  await wipeSlot(inactiveSlot());
}

/** Removes the dictionary entirely. Personal data is in another database and is untouched. */
export async function removeDictionary() {
  clearActiveSlot();
  for (const slot of SLOTS) await deleteSlot(slot);
}

/**
 * Is there a newer dataset than the installed one? Returns the manifest either way, so
 * the caller can show what is available without fetching twice.
 */
export async function checkForUpdate({ signal } = {}) {
  const [manifest, installed] = await Promise.all([fetchManifest({ signal }), installedDataset()]);
  return {
    manifest,
    installed,
    updateAvailable: Boolean(installed) && installed.datasetVersion !== manifest.datasetVersion,
  };
}
