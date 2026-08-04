import { journalEntries } from "../lib/journal.js";
import { emptyItemState } from "../useNotebook.js";
import JournalHome from "./JournalHome.jsx";
import JournalEditor from "./JournalEditor.jsx";
import JournalReader from "./JournalReader.jsx";

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
      <JournalReader
        key={selected.id}
        entry={selected}
        state={notebook.itemState.get(selected.id) || emptyItemState}
        items={notebook.items}
        onBack={onBack}
        backLabel={backLabel}
        onOpen={onSelect}
        onEdit={onEdit}
        onStart={onStart}
        onChanged={notebook.reload}
      />
    );
  }

  return <JournalHome entries={entries} onOpen={onSelect} onEdit={onEdit} onStart={onStart} />;
}
