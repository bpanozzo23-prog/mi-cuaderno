import { useMemo, useState } from "react";
import { Plus, BookOpen, FileText, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Chip, Card } from "../theme.jsx";
import ItemCard from "./ItemCard.jsx";
import AddSheet from "./AddSheet.jsx";
import Detail from "./Detail.jsx";
import { emptyItemState } from "../useNotebook.js";

const TYPE_FILTERS = [
  { id: "all", label: "todo" },
  { id: "lexical", label: "palabras" },
  { id: "page", label: "páginas" },
];

export default function Cuaderno({ notebook, selectedId, onSelect }) {
  const { items, itemState, reload } = notebook;
  const [typeFilter, setTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);
  const [addKind, setAddKind] = useState(null);
  const [askKind, setAskKind] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set();
    items.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  const visible = useMemo(
    () =>
      items.filter(
        (i) => (typeFilter === "all" || i.type === typeFilter) && (!tagFilter || i.tags.includes(tagFilter))
      ),
    [items, typeFilter, tagFilter]
  );

  const selected = items.find((i) => i.id === selectedId) || null;

  if (selected) {
    return (
      <Detail
        item={selected}
        state={itemState.get(selected.id) || emptyItemState}
        onBack={() => onSelect(null)}
        onChanged={reload}
      />
    );
  }

  return (
    <>
      <div className="px-4 pt-3" style={{ background: C.paper }}>
        <div className="flex gap-1.5 items-center">
          {TYPE_FILTERS.map((f) => (
            <Chip key={f.id} active={typeFilter === f.id} onClick={() => setTypeFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
          <span className="ml-auto text-xs" style={{ fontFamily: MONO, color: C.mut }}>
            {visible.length}
          </span>
        </div>
        {allTags.length > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <Chip active={!tagFilter} onClick={() => setTagFilter(null)}>
              all tags
            </Chip>
            {allTags.map((t) => (
              <Chip key={t} active={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)}>
                {t}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-2.5 pb-28" style={dotGrid}>
        {visible.length === 0 && (
          <div className="text-sm text-center py-16" style={{ color: C.mut }}>
            {items.length === 0
              ? "Nothing here yet. Add your first word or page with the + button."
              : "Nothing matches that filter."}
          </div>
        )}
        {visible.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            state={itemState.get(item.id) || emptyItemState}
            onOpen={onSelect}
          />
        ))}
      </div>

      <button
        onClick={() => setAskKind(true)}
        aria-label="Add"
        className="fixed z-30 rounded-full p-4 shadow-lg"
        style={{ background: C.pen, color: "#fff", bottom: 84, right: "max(16px, calc(50% - 208px))" }}
      >
        <Plus size={22} />
      </button>

      {askKind && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ background: "rgba(33,42,61,0.35)" }}
          onClick={() => setAskKind(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl p-4 pb-6 space-y-2"
            style={{ background: C.paper }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold" style={{ fontFamily: SERIF, color: C.ink, fontSize: 18 }}>
                ¿Qué añadimos?
              </div>
              <button onClick={() => setAskKind(false)} aria-label="Close">
                <X size={18} style={{ color: C.mut }} />
              </button>
            </div>
            {[
              { kind: "lexical", icon: BookOpen, title: "Word or phrase", sub: "With a meaning, notes and your own examples" },
              { kind: "page", icon: FileText, title: "Page", sub: "A grammar topic, a film or podcast, or today's journal entry" },
            ].map(({ kind, icon: Icon, title, sub }) => (
              <button
                key={kind}
                onClick={() => {
                  setAskKind(false);
                  setAddKind(kind);
                }}
                className="w-full text-left"
              >
                <Card className="flex items-start gap-3 p-4">
                  <Icon size={18} style={{ color: C.pen, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>{title}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.mut }}>
                      {sub}
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {addKind && (
        <AddSheet
          kind={addKind}
          onClose={() => setAddKind(null)}
          onCreated={(id) => {
            setAddKind(null);
            reload();
            onSelect(id);
          }}
        />
      )}
    </>
  );
}
