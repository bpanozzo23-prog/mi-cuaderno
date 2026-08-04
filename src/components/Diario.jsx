import { useEffect, useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Button, C, SERIF, dotGrid } from "../theme.jsx";
import { journalEntries } from "../lib/journal.js";
import { createItem, newPage, updateItem } from "../db/items.js";
import { localDate } from "../lib/dates.js";
import JournalHome from "./JournalHome.jsx";

function JournalQuickDraft({ entry, seed, onBack, onChanged, onMaterialized }) {
  const [title, setTitle] = useState(entry?.title || "");
  const [body, setBody] = useState(entry?.body || "");
  const [date, setDate] = useState(entry?.pageDate || seed?.date || localDate());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title || "");
    setBody(entry.body || "");
    setDate(entry.pageDate);
  }, [entry?.id]);

  async function save() {
    if (!date || !body.trim() || saving) return;
    setSaving(true);
    if (entry) {
      await updateItem(entry.id, { title: title.trim(), body, pageDate: date });
    } else {
      const created = await createItem(newPage({
        title: title.trim(),
        body,
        pageDate: date,
        linkedKeys: seed?.linkedEntryId ? [seed.linkedEntryId] : [],
      }));
      onMaterialized(created.id);
    }
    onChanged();
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1 text-sm" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> Diario
      </button>
      <div className="space-y-3">
        <input
          type="date"
          required
          aria-label="Journal date"
          value={date}
          onChange={(event) => { setDate(event.target.value); setSaved(false); }}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ background: C.card, borderColor: C.line, color: C.ink }}
        />
        <input
          aria-label="Journal title"
          value={title}
          onChange={(event) => { setTitle(event.target.value); setSaved(false); }}
          placeholder="Title (optional)"
          className="w-full bg-transparent text-xl font-semibold outline-none"
          style={{ color: C.ink, fontFamily: SERIF }}
        />
        <textarea
          autoFocus
          aria-label="Journal body"
          value={body}
          onChange={(event) => { setBody(event.target.value); setSaved(false); }}
          placeholder="What do you want to remember? Write in Spanish, English, or both."
          className="w-full min-h-72 resize-y rounded-xl border p-3 text-base leading-relaxed outline-none"
          style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
        />
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={!date || !body.trim() || saving}>
            <Check size={15} /> {saving ? "Saving…" : entry ? "Save moment" : "Create moment"}
          </Button>
          {saved && <span role="status" className="text-xs" style={{ color: C.green }}>Saved</span>}
        </div>
      </div>
    </div>
  );
}

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
      <JournalQuickDraft
        entry={selected}
        seed={route.seed}
        onBack={onBack}
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
