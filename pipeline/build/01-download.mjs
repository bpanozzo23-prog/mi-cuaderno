/**
 * Step 1 — fetch every source and record its provenance.
 *
 * Downloads land in pipeline/raw/ (gitignored); download date, byte size and sha256 go
 * to raw/_manifest.json, which is the provenance half of the brief §4 requirement.
 * Already-present files are skipped unless --force is passed, so re-running the pipeline
 * costs nothing and the recorded download dates stay truthful.
 *
 * Also runs the standing source re-checks declared in sources.json — currently: is the
 * kaikki file still served, and does its index page still say DEPRECATED? The spike
 * flagged that as a dependency risk to re-check at every refresh, so it is automated
 * here rather than left to memory.
 *
 * Run: node pipeline/build/01-download.mjs [--force] [--skip-recheck]
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ensureDirs, raw, readJson, writeJson, mb, step, done, PIPELINE_DIR } from "../lib/io.mjs";
import path from "node:path";

const force = process.argv.includes("--force");
const skipRecheck = process.argv.includes("--skip-recheck");
const started = step("01 · download sources");
ensureDirs();

const { sources, datasetVersion } = readJson(path.join(PIPELINE_DIR, "sources.json"));
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
    console.log(`  skip   ${src.file} (already downloaded)`);
  } else {
    process.stdout.write(`  fetch  ${src.file} ... `);
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

// ---- standing source re-checks -------------------------------------------
manifest.rechecks = manifest.rechecks || {};
if (skipRecheck) {
  console.log("\n  re-checks skipped (--skip-recheck)");
} else {
  console.log("");
  for (const src of sources) {
    if (!src.recheck) continue;
    const { url, expectPattern } = src.recheck;
    const result = { url, checkedAt: new Date().toISOString(), expectPattern };
    try {
      const res = await fetch(url, { redirect: "follow" });
      const body = res.ok ? await res.text() : "";
      result.httpStatus = res.status;
      result.patternPresent = new RegExp(expectPattern, "i").test(body);
      const state = !res.ok
        ? `HTTP ${res.status} — INVESTIGATE`
        : result.patternPresent
          ? `still says "${expectPattern}" (unchanged since the spike)`
          : `no longer says "${expectPattern}" — CHANGED, re-read the page`;
      console.log(`  check  ${src.key}: ${state}`);
    } catch (err) {
      result.error = String(err.message || err);
      console.log(`  check  ${src.key}: could not reach ${url} (${result.error})`);
    }
    manifest.rechecks[src.key] = result;
  }
}

manifest.datasetVersion = datasetVersion;
manifest.manifestUpdatedAt = new Date().toISOString();
writeJson(manifestPath, manifest);

console.log(`\n  dataset version ${datasetVersion}`);
for (const [key, d] of Object.entries(manifest.downloads)) {
  console.log(`  ${key.padEnd(15)} ${d.size.padStart(9)}  ${d.sha256.slice(0, 12)}…  ${d.downloadedAt.slice(0, 10)}`);
}
done(started);
