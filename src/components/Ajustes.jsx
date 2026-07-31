import { useEffect, useState } from "react";
import { Download, Upload, HardDrive, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { C, SERIF, MONO, dotGrid, SectionTitle, Card, Button } from "../theme.jsx";
import { db, getPref } from "../db/db.js";
import {
  buildBackup,
  backupFilename,
  validateBackup,
  importBackup,
  recordBackupTaken,
  LAST_BACKUP_PREF,
} from "../db/backup.js";
import { storageStatus } from "../lib/persistence.js";
import { downloadJson, readFileAsText } from "../lib/file.js";
import { daysSince } from "../lib/dates.js";
import { APP_VERSION, SCHEMA_VERSION } from "../version.js";

function backupAgeLabel(iso) {
  if (!iso) return "never";
  const days = daysSince(iso);
  if (days === null) return "never";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default function Ajustes({ onDataReplaced }) {
  const [storage, setStorage] = useState(null);
  const [lastBackup, setLastBackup] = useState(null);
  const [counts, setCounts] = useState({ items: 0, events: 0 });
  const [pending, setPending] = useState(null); // { envelope, summary }
  const [problems, setProblems] = useState([]);
  const [note, setNote] = useState("");

  async function refresh() {
    const [status, last, items, events] = await Promise.all([
      storageStatus(),
      getPref(LAST_BACKUP_PREF, null),
      db.items.count(),
      db.events.count(),
    ]);
    setStorage(status);
    setLastBackup(last);
    setCounts({ items, events });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleExport() {
    const envelope = await buildBackup();
    downloadJson(backupFilename(envelope), envelope);
    await recordBackupTaken(envelope.exportedAt);
    setNote("Backup downloaded. Keep it somewhere off this phone.");
    refresh();
  }

  async function handleFilePicked(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be picked again after a cancel
    if (!file) return;
    setNote("");
    setProblems([]);
    setPending(null);

    const text = await readFileAsText(file);
    const { ok, errors, envelope, summary } = validateBackup(text);
    if (!ok) {
      setProblems(errors);
      return;
    }
    setPending({ envelope, summary });
  }

  async function confirmImport() {
    const { envelope, summary } = pending;
    // Auto-export the current database first, so the pre-import state is recoverable.
    const safety = await buildBackup();
    downloadJson(`before-import-${backupFilename(safety)}`, safety);

    await importBackup(envelope);
    setPending(null);
    setNote(
      `Restored ${summary.items} items and ${summary.events} events. Your previous data was downloaded as a "before-import" file first.`
    );
    await refresh();
    onDataReplaced?.();
  }

  const persisted = storage?.persisted === true;
  const refused = storage?.requested && storage?.persisted === false;

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <SectionTitle>Backup</SectionTitle>
      <Card>
        <div className="text-sm" style={{ color: C.ink }}>
          Your notebook lives only on this device. Exporting is how you keep it.
        </div>
        <div className="mt-2 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
          {counts.items} items · {counts.events} events · last backup: {backupAgeLabel(lastBackup)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleExport}>
            <Download size={15} /> Export backup
          </Button>
          <label>
            <input type="file" accept="application/json,.json" className="hidden" onChange={handleFilePicked} />
            <span
              className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium cursor-pointer"
              style={{ background: C.card, color: C.ink, borderColor: C.line }}
            >
              <Upload size={15} /> Import backup
            </span>
          </label>
        </div>
        {note && (
          <div className="mt-3 text-xs rounded-lg p-2.5" style={{ background: C.greenPale, color: C.green }}>
            {note}
          </div>
        )}
      </Card>

      {problems.length > 0 && (
        <Card className="mt-2" style={{ borderColor: "#E5C4BC" }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.red }}>
            <AlertTriangle size={15} /> That file was not imported
          </div>
          <ul className="mt-1.5 text-xs list-disc pl-5 space-y-0.5" style={{ color: C.ink }}>
            {problems.slice(0, 8).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
            {problems.length > 8 && <li>…and {problems.length - 8} more.</li>}
          </ul>
          <div className="mt-2 text-xs" style={{ color: C.mut }}>
            Nothing was written — your notebook is untouched.
          </div>
        </Card>
      )}

      {pending && (
        <Card className="mt-2" style={{ borderColor: C.pen }}>
          <div className="text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            Replace everything with this backup?
          </div>
          <div className="mt-1.5 text-xs space-y-0.5" style={{ color: C.ink }}>
            <div>
              {pending.summary.items} items ({pending.summary.lexical} words/phrases, {pending.summary.pages} pages)
            </div>
            <div>{pending.summary.events} events</div>
            {pending.summary.skippedEvents > 0 && (
              <div style={{ color: C.mut }}>{pending.summary.skippedEvents} duplicate events will be skipped</div>
            )}
            <div style={{ color: C.mut }}>
              Exported {pending.summary.exportedAt?.slice(0, 10) ?? "unknown"} · app {pending.summary.appVersion ?? "?"}
            </div>
          </div>
          <div className="mt-2 text-xs" style={{ color: C.red }}>
            This replaces your current {counts.items} items and {counts.events} events. They will be downloaded as a
            "before-import" file first.
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={confirmImport}>Replace and restore</Button>
            <Button tone="quiet" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <SectionTitle>Storage</SectionTitle>
      <Card>
        <div className="flex items-start gap-2">
          {persisted ? (
            <ShieldCheck size={16} style={{ color: C.green, marginTop: 2 }} />
          ) : (
            <ShieldAlert size={16} style={{ color: refused ? C.red : C.mut, marginTop: 2 }} />
          )}
          <div className="text-sm" style={{ color: C.ink }}>
            {persisted && "The browser has agreed to keep this data (persistent storage granted)."}
            {refused &&
              "The browser refused persistent storage — it may evict this data if the device runs low on space. Export more often."}
            {!persisted && !refused && "Persistent storage will be requested when you add your first item."}
          </div>
        </div>
        <div className="mt-3 text-xs leading-relaxed" style={{ color: C.mut }}>
          Either way: clearing browser data, uninstalling the app, or losing the phone destroys this notebook. That is
          why export is one tap away — do it regularly.
        </div>
        {storage?.usageBytes != null && (
          <div className="mt-2 text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            <HardDrive size={11} className="inline mr-1" />
            {(storage.usageBytes / 1024).toFixed(0)} KB used
            {storage.quotaBytes ? ` of ${(storage.quotaBytes / 1048576).toFixed(0)} MB available` : ""}
          </div>
        )}
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <div className="text-xs space-y-1" style={{ fontFamily: MONO, color: C.mut }}>
          <div>app version {APP_VERSION}</div>
          <div>data schema v{SCHEMA_VERSION}</div>
          <div>dictionary: not installed (Phase 2)</div>
        </div>
      </Card>
    </div>
  );
}
