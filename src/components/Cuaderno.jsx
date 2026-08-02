import { useEffect, useMemo, useState } from "react";
import { Plus, BookOpen, FileText, X } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Chip, Card } from "../theme.jsx";
import ItemCard from "./ItemCard.jsx";
import AddSheet from "./AddSheet.jsx";
import Detail from "./Detail.jsx";
import DictCard from "./DictCard.jsx";
import DictDetail from "./DictDetail.jsx";
import SearchBar from "./SearchBar.jsx";
import EmptyState from "./EmptyState.jsx";
import { searchItems, mergeResults } from "../lib/search.js";
import { searchDictionary } from "../db/ref/search.js";
import { isDictKey, installedMeta } from "../db/ref/entries.js";
import { TYPE_FILTERS, FILTERS, matchesTypeFilter, wantsDictionary } from "../lib/filters.js";
import { emptyItemState } from "../useNotebook.js";

/** Long enough that a fast typist does not fire a query per keystroke, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 140;

export default function Cuaderno({ notebook, selectedId, onSelect, onBack, hasDetailOrigin, onOpenSettings }) {
  const { items, itemState, reload } = notebook;
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(FILTERS.all);
  const [tagFilter, setTagFilter] = useState(null);
  const [addKind, setAddKind] = useState(null);
  const [askKind, setAskKind] = useState(false);
  const [dictionary, setDictionary] = useState(null);

  const searching = query.trim() !== "";

  // Whether this device has the dictionary changes what an empty screen should say, and
  // what the search box should promise. It is per-device by design (§11).
  useEffect(() => {
    installedMeta().then(setDictionary);
  }, [selectedId]);

  const allTags = useMemo(() => {
    const set = new Set();
    items.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(
    () => items.filter((i) => matchesTypeFilter(i, typeFilter) && (!tagFilter || i.tags.includes(tagFilter))),
    [items, typeFilter, tagFilter]
  );

  // Searching ranks across everything the filters allow, so a tag filter narrows
  // the search rather than being silently ignored by it.
  const personalResults = useMemo(
    () => (searching ? searchItems(filtered, query) : filtered.map((item) => ({ item, reason: null }))),
    [filtered, query, searching]
  );

  /**
   * The dictionary half of the seam (§8). It is asynchronous — the reference layer lives
   * in IndexedDB — so it is debounced and guarded against out-of-order replies: a slow
   * query for "sac" must never overwrite the results for "sacar" typed after it.
   *
   * Dictionary results are shown only when nothing is filtered to a type the dictionary
   * cannot satisfy; filtering to "páginas" means the owner is looking through their own
   * pages, and reference words would be noise.
   */
  const [dictResults, setDictResults] = useState([]);
  const [dictPending, setDictPending] = useState(false);
  const dictionaryWanted = searching && wantsDictionary(typeFilter, tagFilter);

  useEffect(() => {
    if (!dictionaryWanted) {
      setDictResults([]);
      setDictPending(false);
      return;
    }
    let current = true;
    setDictPending(true);
    const timer = setTimeout(async () => {
      const found = await searchDictionary(query);
      if (!current) return;
      setDictResults(found);
      setDictPending(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, dictionaryWanted]);

  const visible = useMemo(
    () =>
      searching
        ? mergeResults(personalResults, dictResults, items)
        : personalResults.map((r) => ({ ...r, kind: "item", key: r.item.id })),
    [personalResults, dictResults, items, searching]
  );

  const selected = items.find((i) => i.id === selectedId) || null;

  if (selectedId && isDictKey(selectedId)) {
    return (
      <DictDetail
        // Each destination owns its drafts and async lookup state. Remounting on a trail
        // hop prevents either from flashing or being saved against the next entry.
        key={selectedId}
        entryId={selectedId}
        items={items}
        onBack={onBack}
        backLabel={hasDetailOrigin ? "Atrás" : "Todo el cuaderno"}
        onOpen={onSelect}
        onChanged={reload}
      />
    );
  }

  if (selected) {
    return (
      <Detail
        // Optional example/media drafts are intentionally local to one detail screen.
        key={selected.id}
        item={selected}
        state={itemState.get(selected.id) || emptyItemState}
        items={items}
        onBack={onBack}
        backLabel={hasDetailOrigin ? "Atrás" : "Todo el cuaderno"}
        onOpen={onSelect}
        onChanged={reload}
      />
    );
  }

  return (
    <>
      <div className="px-4 pt-3" style={{ background: C.paper }}>
        {/*
          The miss count is the COMBINED one: a query the dictionary answers is not a
          word the owner could not find (§7), so it must not become a search_miss.
        */}
        <SearchBar
          value={query}
          onChange={setQuery}
          resultCount={visible.length}
          pending={dictPending}
          onMissLogged={reload}
          placeholder={dictionary ? "Search the dictionary and your notes…" : "Search words, meanings, notes, pages…"}
        />
        <div className="flex gap-1.5 items-center mt-2">
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
          <EmptyState
            hasItems={items.length > 0}
            searching={searching}
            query={query}
            dictionary={dictionary}
            onOpenSettings={onOpenSettings}
          />
        )}
        {visible.map((result) =>
          result.kind === "entry" ? (
            <DictCard key={result.key} entry={result.entry} reason={result.reason} onOpen={onSelect} />
          ) : (
            <ItemCard
              key={result.key}
              item={result.item}
              state={itemState.get(result.item.id) || emptyItemState}
              onOpen={onSelect}
              reason={result.reason}
            />
          )
        )}
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
          items={items}
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
