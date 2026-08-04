import { ChevronLeft, PenLine } from "lucide-react";
import { C, SERIF, dotGrid, Card } from "../theme.jsx";
import { journalEntries } from "../lib/journal.js";

/**
 * Phase 4p shell. The richer home, editor and reading views arrive in the following subphases;
 * this keeps the new canonical surface usable while App's cross-tab navigation is established.
 */
export default function Diario({ notebook, selectedId, onSelect, onBack, backLabel = "Diario" }) {
  const entries = journalEntries(notebook.items);
  const selected = entries.find((entry) => entry.id === selectedId) || null;

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

  return (
    <div className="px-4 py-5 pb-28" style={dotGrid}>
      <div className="mb-5 flex items-center gap-2">
        <PenLine size={19} style={{ color: C.pen }} />
        <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Diario</h1>
      </div>
      {entries.length === 0 ? (
        <div className="text-sm italic" style={{ color: C.mut }}>Todavía no hay entradas.</div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <button key={entry.id} type="button" onClick={() => onSelect(entry.id)} className="w-full text-left">
              <Card>
                <div className="text-xs" style={{ color: C.mut }}>{entry.pageDate}</div>
                <div className="mt-1 font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                  {entry.title || "Entrada sin título"}
                </div>
                {entry.body && <div className="mt-1 line-clamp-2 text-sm" style={{ color: C.mut }}>{entry.body}</div>}
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
