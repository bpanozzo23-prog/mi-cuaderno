import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import bz2 from "unbzip2-stream";

export const SPIKE_DIR = path.resolve(fileURLToPath(import.meta.url), "../..");
export const RAW = path.join(SPIKE_DIR, "raw");
export const OUT = path.join(SPIKE_DIR, "out");

export function ensureDirs() {
  for (const d of [RAW, OUT]) fs.mkdirSync(d, { recursive: true });
}

export const raw = (f) => path.join(RAW, f);
export const out = (f) => path.join(OUT, f);

function decompressed(file) {
  const s = fs.createReadStream(file);
  if (file.endsWith(".gz")) return s.pipe(zlib.createGunzip());
  if (file.endsWith(".bz2")) return s.pipe(bz2());
  return s;
}

/**
 * Streams a text file line by line, transparently handling .gz and .bz2.
 * Never loads the whole file into memory — the kaikki extract is ~1 GB.
 * `onLine` may return false to stop early.
 */
export async function eachLine(file, onLine) {
  const rl = readline.createInterface({ input: decompressed(file), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line) continue;
    if (onLine(line, ++n) === false) break;
  }
  rl.close();
  return n;
}

/** Same, for JSONL: parses each line, skipping unparseable ones. */
export async function eachRecord(file, onRecord) {
  let bad = 0;
  const n = await eachLine(file, (line, i) => {
    let rec;
    try { rec = JSON.parse(line); } catch { bad++; return; }
    return onRecord(rec, i);
  });
  return { lines: n, bad };
}

export function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  return file;
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";
export const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";
