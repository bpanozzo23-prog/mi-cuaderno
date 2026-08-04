import { ChevronLeft } from "lucide-react";
import { C, SERIF, dotGrid } from "../theme.jsx";
import { journalEntries } from "../lib/journal.js";
import JournalHome from "./JournalHome.jsx";
import JournalEditor from "./JournalEditor.jsx";

export default function Diario({
  notebook,
  route,
  onSelect,
  onBack,
  backLabel = "Diario",
  onEdit,
  onStart,
  onMaterialized,
}) {
  const entries = journalEntries(notebook.items);
  const selected = entries.find((entry) => entry.id === route?.id) || null;

  if (route?.screen === "edit") {
    return (
      <JournalEditor
        key={route.seed?.draftKey || route.id}
        entry={selected}
        seed={route.seed}
        onBack={onBack}
        backLabel={backLabel}
        onChanged={notebook.reload}
        onMaterialized={onMaterialized}
      />
    );
  }

  if (selected) {
    return (
      <div className="px-4 py-4 pb-28" style={dotGrid}>
        <button
          type="button"
          onClick={onBack}
          aria-label={`Back to ${backLabel}`}
          className="mb-3 flex items-center gap-1 text-sm"
          style={{ color: C.pen }}
        >
          <ChevronLeft size={16} /> {backLabel}
        </button>
        <div className="mb-2 text-xs" style={{ color: C.mut }}>{selected.pageDate}</div>
        {selected.title && <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>{selected.title}</h1>}
        <div className="mt-4 whitespace-pre-wrap break-words" style={{ color: C.ink, fontFamily: SERIF }}>
          {selected.body || "Esta entrada está vacía."}
        </div>
      </div>
    );
  }

  return <JournalHome entries={entries} onOpen={onSelect} onEdit={onEdit} onStart={onStart} />;
}
