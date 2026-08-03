import { useState } from "react";
import { Download, ShieldAlert, Check } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { buildPreupgradeV1Backup } from "../db/preupgrade.js";
import { backupFilename } from "../db/backup.js";
import { downloadJson } from "../lib/file.js";

export default function SchemaUpgradeGate({ onContinue }) {
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function downloadBackup() {
    setBusy(true);
    setError("");
    try {
      const envelope = await buildPreupgradeV1Backup();
      downloadJson(`before-meaning-upgrade-${backupFilename(envelope)}`, envelope);
      setDownloaded(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The backup could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto">
        <Card className="p-5" style={{ borderColor: C.pen }}>
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" style={{ color: C.pen }} />
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: SERIF }}>
                Back up before meanings are upgraded
              </h1>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: C.mut }}>
                This update turns each line of an existing meaning into a personal meaning block.
                Download the untouched version of your notebook first so you can always return to it.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Button onClick={downloadBackup} disabled={busy}>
              <Download size={15} /> {busy ? "Preparing…" : downloaded ? "Download again" : "Download backup"}
            </Button>
            {downloaded && (
              <div className="text-xs flex items-start gap-2 rounded-lg p-2.5" style={{ background: C.greenPale, color: C.green }}>
                <Check size={14} className="shrink-0" /> Backup requested. Check that the JSON file is in your downloads.
              </div>
            )}
            {error && (
              <div className="text-xs rounded-lg p-2.5" style={{ background: "#F8E8E4", color: C.red }}>
                {error} Nothing was upgraded.
              </div>
            )}
          </div>

          {downloaded && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
              <p className="text-xs mb-2" style={{ color: C.mut }}>
                Continue only after confirming the file was saved. The upgrade itself is automatic and keeps your
                entry IDs, notes, examples, links and review history.
              </p>
              <Button onClick={onContinue}>I saved it — upgrade my notebook</Button>
            </div>
          )}

          <div className="mt-4 text-[11px]" style={{ fontFamily: MONO, color: C.mut }}>
            personal data schema 1 → 2
          </div>
        </Card>
      </div>
    </div>
  );
}
