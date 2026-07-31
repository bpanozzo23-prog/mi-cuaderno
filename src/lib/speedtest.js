import { searchDictionary } from "../db/ref/search.js";

/**
 * Brief §12 requires startup and search timing to be "measured on the owner's phone and
 * acceptable". A number measured on a development machine does not answer that question,
 * so the measurement ships in the app and the owner runs it on the device that matters.
 *
 * The queries are the ones §12 names, plus the English path and a prefix search, because
 * those exercise different indexes: form shard, english shard intersection, prefix scan.
 */

export const SPEED_TEST_QUERIES = ["fui", "tuvimos", "casas", "rápidas", "take out", "saca"];

/** Warm the caches first: the first query of any session pays for opening the database. */
const WARMUP = "casa";

export async function runSearchSpeedTest(queries = SPEED_TEST_QUERIES) {
  await searchDictionary(WARMUP);

  const runs = [];
  for (const query of queries) {
    const started = performance.now();
    const results = await searchDictionary(query);
    runs.push({ query, ms: Math.round(performance.now() - started), results: results.length });
  }

  const times = runs.map((r) => r.ms).sort((a, b) => a - b);
  return {
    runs,
    medianMs: times[Math.floor(times.length / 2)],
    slowestMs: times[times.length - 1],
  };
}

/**
 * How long the app took to become interactive, from the browser's own navigation timing.
 * Returns null where the API is unavailable rather than guessing.
 */
export function startupTiming() {
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  if (!nav) return null;
  const paint = performance.getEntriesByType("paint").find((p) => p.name === "first-contentful-paint");
  return {
    interactiveMs: Math.round(nav.domInteractive),
    loadedMs: Math.round(nav.loadEventEnd || nav.duration),
    firstPaintMs: paint ? Math.round(paint.startTime) : null,
  };
}
