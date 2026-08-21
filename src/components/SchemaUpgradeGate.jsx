import { useState } from "react";
import { Download, ShieldAlert, Check } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { buildPreupgradeBackup } from "../db/preupgrade.js";
import { backupFilename } from "../db/backup.js";
import { downloadJson } from "../lib/file.js";
import { SCHEMA_VERSION } from "../version.js";

function legacyVersionLabel() {
  const versions = Array.from({ length: SCHEMA_VERSION - 1 }, (_, index) => String(index + 1));
  if (versions.length <= 1) return versions[0] ?? "older";
  return `${versions.slice(0, -1).join(", ")}, or ${versions[versions.length - 1]}`;
}

export default function SchemaUpgradeGate({ fromVersion = null, onContinue }) {
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sourceVersion = fromVersion ?? legacyVersionLabel();
  const knownVersion = Number.isInteger(fromVersion) ? fromVersion : null;
  const changes = [];
  if (knownVersion === null || knownVersion < 6) {
    changes.push("adds one level of Grammar subsections while keeping every existing guide section as a top-level section");
  }
  if (knownVersion === null || knownVersion < 7) {
    changes.push("adds an empty structured Notes outline to every Page while leaving every existing Page body unchanged");
  }
  if (knownVersion === null || knownVersion < 10) {
    changes.push("adds an empty structured Notes outline to every Word and Phrase while leaving every existing note unchanged");
  }
  const upgradeDescription = changes.length
    ? `It ${changes.join(" and ")}. IDs, prose, links, timestamps, events, and preferences are unchanged.`
    : "It brings the notebook up to the current personal-data format without changing owner content.";

  async function downloadBackup() {
    setBusy(true);
    setError("");
    try {
      const envelope = await buildPreupgradeBackup();
      downloadJson(`before-schema-v${SCHEMA_VERSION}-upgrade-${backupFilename(envelope)}`, envelope);
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
                Back up before your notebook is upgraded
              </h1>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: C.mut }}>
                Your notebook uses personal-data schema {sourceVersion}; this update needs schema {SCHEMA_VERSION}.
                {" "}{upgradeDescription} Download the untouched version of your notebook first so you can always
                return to it.
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
              <div className="text-xs rounded-lg p-2.5" style={{ background: C.redPale, color: C.red }}>
                {error} Nothing was upgraded.
              </div>
            )}
          </div>

          {downloaded && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
              <p className="text-xs mb-2" style={{ color: C.mut }}>
                Continue only after confirming the file was saved. The upgrade itself is automatic and keeps your
                entry IDs, notes, vocabulary groups, examples, links and review history.
              </p>
              <Button onClick={onContinue}>I saved it — upgrade my notebook</Button>
            </div>
          )}

          <div className="mt-4 text-[11px]" style={{ fontFamily: MONO, color: C.mut }}>
            personal data schema {sourceVersion} → {SCHEMA_VERSION}
          </div>
        </Card>
      </div>
    </div>
  );
}
