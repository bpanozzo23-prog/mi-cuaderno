import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import bz2 from "unbzip2-stream";

/**
 * Shared plumbing for the Phase 2 build pipeline.
 *
 * Two directories, on purpose:
 *   raw/  downloads and large intermediates — gitignored, rebuildable
 *   out/  small reports and stats — committed, because they are the record of what ran
 */
export const PIPELINE_DIR = path.resolve(fileURLToPath(import.meta.url), "../..");
export const REPO_DIR = path.resolve(PIPELINE_DIR, "..");
export const RAW = path.join(PIPELINE_DIR, "raw");
export const OUT = path.join(PIPELINE_DIR, "out");

export function ensureDirs() {
  for (const d of [RAW, OUT]) fs.mkdirSync(d, { recursive: true });
}

export const raw = (f) => path.join(RAW, f);
export const out = (f) => path.join(OUT, f);
export const repo = (...f) => path.join(REPO_DIR, ...f);

function decompressed(file) {
  const s = fs.createReadStream(file);
  if (file.endsWith(".gz")) return s.pipe(zlib.createGunzip());
  if (file.endsWith(".bz2")) return s.pipe(bz2());
  return s;
}

/**
 * Streams a text file line by line, transparently handling .gz and .bz2.
 * Never loads the whole file into memory — the kaikki extract is ~1 GB decompressed.
 * `onLine` may return false to stop early.
 */
export async function eachLine(file, onLine, { progressEvery = 0, label = "" } = {}) {
  const rl = readline.createInterface({ input: decompressed(file), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line) continue;
    n++;
    if (progressEvery && n % progressEvery === 0) {
      process.stdout.write(`\r  ${label}${n.toLocaleString()} lines …`);
    }
    if (onLine(line, n) === false) break;
  }
  rl.close();
  if (progressEvery) process.stdout.write(`\r  ${label}${n.toLocaleString()} lines\n`);
  return n;
}

/** Same, for JSONL: parses each line, skipping unparseable ones. */
export async function eachRecord(file, onRecord, opts) {
  let bad = 0;
  const n = await eachLine(
    file,
    (line, i) => {
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        bad++;
        return;
      }
      return onRecord(rec, i);
    },
    opts
  );
  return { lines: n, bad };
}

export function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  return file;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * JSONL writer for the big intermediates. The form index has ~1.5 million rows;
 * as one JSON object it must be parsed in full before a single lookup, which costs
 * both time and a multi-hundred-MB heap. One row per line means the next script can
 * stream it and keep only what it needs.
 */
export function openJsonl(file) {
  const stream = fs.createWriteStream(file, { encoding: "utf8" });
  let rows = 0;
  return {
    write(value) {
      rows++;
      return stream.write(JSON.stringify(value) + "\n");
    },
    async close() {
      await new Promise((resolve, reject) => {
        stream.end((err) => (err ? reject(err) : resolve()));
      });
      return { file, rows, bytes: fs.statSync(file).size };
    },
  };
}

export async function eachJsonl(file, onValue, opts) {
  return eachLine(file, (line, i) => onValue(JSON.parse(line), i), opts);
}

export const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";
export const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";
export const gzipSize = (data) =>
  zlib.gzipSync(Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8"), { level: 9 }).length;

/** Uniform script banner, so a run's output says which step produced it. */
export function step(title) {
  const line = "─".repeat(Math.max(0, 66 - title.length));
  console.log(`\n${title} ${line}`);
  return Date.now();
}

export function done(startedAt) {
  console.log(`\n  done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}
