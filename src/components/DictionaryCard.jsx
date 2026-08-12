import { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, Download, RefreshCw, Trash2, AlertTriangle, Check, X, WifiOff, Gauge } from "lucide-react";
import { C, MONO, SectionTitle, Card, Button } from "../theme.jsx";
import {
  fetchManifest, installDictionary, installedDataset, pendingInstall,
  discardPendingInstall, removeDictionary, repairDictionary,
} from "../db/ref/install.js";
import { forgetCaches } from "../db/ref/entries.js";
import { runSearchSpeedTest, startupTiming } from "../lib/speedtest.js";

/**
 * The §11 download flow: an explicit, versioned, chunked download with visible progress,
 * an atomic swap, and an interrupted download that resumes rather than restarting.
 *
 * The card is a small state machine over what is actually on the device — installed,
 * partially downloaded, or nothing — rather than a set of independent flags, because
 * those three states are mutually exclusive and every button depends on which one holds.
 */

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

const countText = (value, singular, plural = `${singular}s`) =>
  Number.isFinite(value) ? `${value.toLocaleString()} ${value === 1 ? singular : plural}` : null;

export default function DictionaryCard({ onInstalled }) {
  const [installed, setInstalled] = useState(null);
  const [pending, setPending] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [checking, setChecking] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [speed, setSpeed] = useState(null);
  const abort = useRef(null);

  async function runSpeedTest() {
    setSpeed("running");
    const result = await runSearchSpeedTest();
    setSpeed({ ...result, startup: startupTiming() });
  }

  const refresh = useCallback(async () => {
    const [dataset, half] = await Promise.all([installedDataset(), pendingInstall()]);
    setInstalled(dataset);
    setPending(half);
    return dataset;
  }, []);

  useEffect(() => {
    (async () => {
      const dataset = await refresh();
      // The manifest is what the app ships with, so reading it needs no network when the
      // service worker has the app cached — but a failure here must not break Ajustes.
      try {
        setManifest(await fetchManifest());
      } catch {
        if (!dataset) setError("Could not reach the dictionary files. Check your connection and try again.");
      }
    })();
  }, [refresh]);

  async function download(target, { repair = false } = {}) {
    setError("");
    setNote("");
    abort.current = new AbortController();
    setProgress({ phase: "downloading", repair, receivedBytes: 0, totalBytes: target.bytes.total, chunk: 0, chunks: target.chunks.length });
    try {
      const onProgress = (next) => setProgress({ ...next, repair });
      const operation = repair ? repairDictionary : installDictionary;
      await operation(target, { onProgress, signal: abort.current.signal });
      forgetCaches();
      setNote(
        repair
          ? `Dictionary ${target.datasetVersion} was repaired and works offline.`
          : `Dictionary ${target.datasetVersion} is installed and works offline.`
      );
      await refresh();
      onInstalled?.();
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "Download stopped. What already arrived is kept — tap Resume to finish it."
          : `${err.message} Your installed dictionary, if any, was not touched.`
      );
      await refresh();
    } finally {
      setProgress(null);
      abort.current = null;
    }
  }

  async function checkForUpdates() {
    setChecking(true);
    setError("");
    setNote("");
    try {
      const latest = await fetchManifest();
      setManifest(latest);
      setNote(
        latest.datasetVersion === installed?.datasetVersion
          ? installed?.familyIndexStatus === "incomplete"
            ? "This dictionary version needs a repair download."
            : "You have the current dictionary."
          : `Dictionary ${latest.datasetVersion} is available.`
      );
    } catch {
      setError("Could not check for updates — you appear to be offline.");
    } finally {
      setChecking(false);
    }
  }

  async function remove() {
    await removeDictionary();
    forgetCaches();
    setConfirmRemove(false);
    setNote("Dictionary removed. Your notebook is untouched.");
    await refresh();
    onInstalled?.();
  }

  const downloading = Boolean(progress);
  const updateAvailable = installed && manifest && manifest.datasetVersion !== installed.datasetVersion;
  const repairAvailable = installed?.familyIndexStatus === "incomplete"
    && manifest?.datasetVersion === installed.datasetVersion;
  const pct = progress?.totalBytes ? Math.round((progress.receivedBytes / progress.totalBytes) * 100) : 0;
  const installedCountSummary = [
    countText(installed?.counts?.entries, "word"),
    countText(installed?.counts?.conjugations, "verb table"),
    countText(installed?.counts?.examples, "example"),
  ].filter(Boolean).join(" · ");

  return (
    <>
      <SectionTitle>Dictionary</SectionTitle>
      <Card>
        {downloading ? (
          <>
            <div className="text-sm" style={{ color: C.ink }}>
              {progress.repair ? "Repairing the dictionary…" : "Downloading the dictionary…"}
            </div>
            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: C.penPale }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.pen, transition: "width 120ms linear" }} />
            </div>
            <div className="mt-1.5 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              {pct}% · {mb(progress.receivedBytes)} of {mb(progress.totalBytes)} · part {progress.chunk} of {progress.chunks}
            </div>
            <div className="mt-3">
              <Button tone="quiet" onClick={() => abort.current?.abort()}>
                <X size={15} /> Stop
              </Button>
            </div>
          </>
        ) : installed ? (
          <>
            <div className="flex items-start gap-2">
              <BookMarked size={16} style={{ color: C.green, marginTop: 2 }} />
              <div className="text-sm" style={{ color: C.ink }}>
                Installed and working offline.
              </div>
            </div>
            <div className="mt-2 text-xs leading-relaxed" style={{ fontFamily: MONO, color: C.mut }}>
              <div>version {installed.datasetVersion}</div>
              <div>{installedCountSummary || "Entry counts unavailable for this older install"}</div>
            </div>
            {updateAvailable && (
              <div className="mt-3 text-xs rounded-lg p-2.5" style={{ background: C.penPale, color: C.penDark }}>
                Version {manifest.datasetVersion} is available.
              </div>
            )}
            {installed.familyIndexStatus === "incomplete" && (
              <div className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5" style={{ background: C.amberPale, color: C.amber }}>
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>
                  The conjugation-family files are incomplete. Re-download this dictionary version to repair them;
                  your notebook is untouched.
                </span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {updateAvailable && (
                <Button onClick={() => download(manifest)}>
                  <Download size={15} /> Update
                </Button>
              )}
              {repairAvailable && !updateAvailable && (
                <Button onClick={() => download(manifest, { repair: true })}>
                  <Download size={15} /> Repair dictionary
                </Button>
              )}
              <Button tone="quiet" onClick={checkForUpdates} disabled={checking}>
                <RefreshCw size={15} className={checking ? "animate-spin" : ""} /> Check for updates
              </Button>
              <Button
                tone={confirmRemove ? "dangerArmed" : "danger"}
                onClick={() => (confirmRemove ? remove() : setConfirmRemove(true))}
              >
                <Trash2 size={14} /> {confirmRemove ? "Tap again to remove" : "Remove"}
              </Button>
            </div>

            {/*
              §12 asks for startup and search timing measured on the owner's phone. A number
              from a development machine cannot answer that, so the measurement ships here.
            */}
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <Button tone="quiet" onClick={runSpeedTest} disabled={speed === "running"}>
                <Gauge size={15} className={speed === "running" ? "animate-pulse" : ""} /> Test speed on this device
              </Button>
              {speed && speed !== "running" && (
                <div className="mt-2 text-xs leading-relaxed" style={{ fontFamily: MONO, color: C.mut }}>
                  {speed.startup && (
                    <div>
                      app ready in {speed.startup.interactiveMs} ms
                      {speed.startup.firstPaintMs != null && ` · first paint ${speed.startup.firstPaintMs} ms`}
                    </div>
                  )}
                  <div>
                    search: {speed.medianMs} ms median, {speed.slowestMs} ms slowest
                  </div>
                  <div className="mt-1">
                    {speed.runs.map((r) => (
                      <span key={r.query} className="inline-block mr-2">
                        {r.query} {r.ms}ms
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : pending && manifest && pending.datasetVersion === manifest.datasetVersion ? (
          <>
            <div className="flex items-start gap-2">
              <WifiOff size={16} style={{ color: C.mut, marginTop: 2 }} />
              <div className="text-sm" style={{ color: C.ink }}>
                A download was interrupted with {pending.completedChunks.length} of {manifest.chunks.length} parts
                finished. Resuming picks up where it stopped.
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => download(manifest)}>
                <Download size={15} /> Resume
              </Button>
              <Button
                tone="quiet"
                onClick={async () => {
                  await discardPendingInstall();
                  await refresh();
                  setNote("Partial download discarded.");
                }}
              >
                Start over
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm" style={{ color: C.ink }}>
              Download the dictionary once and it works offline forever — {manifest?.counts?.entries?.toLocaleString?.() || "10,000"} words
              with meanings, verb conjugations and example sentences.
            </div>
            {manifest && (
              <div className="mt-2 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
                version {manifest.datasetVersion} · about {mb(manifest.bytes.gzipped || manifest.bytes.total)} to download
              </div>
            )}
            <div className="mt-3">
              <Button onClick={() => download(manifest)} disabled={!manifest}>
                <Download size={15} /> Download dictionary for offline use
              </Button>
            </div>
            <div className="mt-3 text-xs leading-relaxed" style={{ color: C.mut }}>
              Your notebook works without it. The dictionary only adds lookups.
            </div>
          </>
        )}

        {note && (
          <div className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5" style={{ background: C.greenPale, color: C.green }}>
            <Check size={13} className="shrink-0 mt-0.5" /> {note}
          </div>
        )}
        {error && (
          <div className="mt-3 text-xs rounded-lg p-2.5 flex items-start gap-1.5" style={{ background: C.redPale, color: C.red }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}
      </Card>
    </>
  );
}
