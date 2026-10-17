import { useState } from "react";
import { Download } from "lucide-react";
import { C, Button } from "../theme.jsx";
import { rescueFilename } from "../db/backupSnapshot.js";
import { downloadJson } from "../lib/file.js";

/** Shared by Settings and the pre-open gate; downloading a rescue grants no write permission. */
export default function BackupExportProblem({ problem, disabled = false }) {
  const [notice, setNotice] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const rescue = problem?.rescue;
  const details = problem?.validationErrors || [];

  function downloadRescue() {
    setNotice("");
    setDownloadError("");
    try {
      downloadJson(rescueFilename(rescue), rescue);
      setNotice("Rescue download requested. Check that the file is in your downloads and keep it for repair.");
    } catch {
      setDownloadError("The rescue file could not be downloaded. Please try again.");
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg p-3 text-xs break-words" style={{ background: C.redPale, color: C.red }}>
      <div role="alert">
        <p>{rescue
          ? "A normal backup could not be created because the notebook did not pass its checks. Your saved notebook has not been changed."
          : problem instanceof Error ? problem.message : "The backup could not be created. Please try again."}</p>
        {details.length > 0 && (
          <ul className="mt-2 list-disc pl-4">
            {details.slice(0, 3).map((detail, index) => <li key={index}>{detail}</li>)}
            {details.length > 3 && <li>…and {details.length - 3} more. The rescue file includes every detail.</li>}
          </ul>
        )}
      </div>
      {rescue && (
        <>
          <p>Save a rescue file to keep the original records, without your API key. It needs repair before it can be restored and does not count as a normal backup.</p>
          <Button onClick={downloadRescue} disabled={disabled}>
            <Download size={15} /> Download rescue file
          </Button>
          {notice && <p role="status">{notice}</p>}
          {downloadError && <p role="alert">{downloadError}</p>}
        </>
      )}
    </div>
  );
}
