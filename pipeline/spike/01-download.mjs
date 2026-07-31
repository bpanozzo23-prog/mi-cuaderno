/**
 * Downloads every source listed in sources.json into raw/ (gitignored) and records
 * download date, byte size and sha256 in raw/_manifest.json — the provenance half of
 * the section 4 requirement. Already-present files are skipped unless --force is passed.
 *
 * Run: node pipeline/spike/01-download.mjs [--force]
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ensureDirs, raw, readJson, writeJson, mb, SPIKE_DIR } from "./lib/io.mjs";
import path from "node:path";

const force = process.argv.includes("--force");
ensureDirs();

const { sources } = readJson(path.join(SPIKE_DIR, "sources.json"));
const manifestPath = raw("_manifest.json");
const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : { downloads: {} };

function sha256(file) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

for (const src of sources) {
  const dest = raw(src.file);
  const have = fs.existsSync(dest) && fs.statSync(dest).size > 0;

  if (have && !force) {
    console.log(`skip   ${src.file} (already downloaded)`);
  } else {
    process.stdout.write(`fetch  ${src.file} ... `);
    const res = await fetch(src.url, { redirect: "follow" });
    if (!res.ok) throw new Error(`${src.url} returned HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
    console.log(mb(fs.statSync(dest).size));
  }

  const size = fs.statSync(dest).size;
  const prev = manifest.downloads[src.key];
  manifest.downloads[src.key] = {
    file: src.file,
    url: src.url,
    bytes: size,
    size: mb(size),
    sha256: prev && prev.bytes === size && prev.sha256 ? prev.sha256 : sha256(dest),
    downloadedAt: have && !force && prev ? prev.downloadedAt : new Date().toISOString(),
  };
}

manifest.manifestUpdatedAt = new Date().toISOString();
writeJson(manifestPath, manifest);

console.log(`\nManifest written to ${manifestPath}`);
for (const [key, d] of Object.entries(manifest.downloads)) {
  console.log(`  ${key.padEnd(15)} ${d.size.padStart(9)}  ${d.sha256.slice(0, 12)}…  ${d.downloadedAt}`);
}
