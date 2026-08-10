import { useEffect, useLayoutEffect, useState } from "react";
import { BookOpen, BarChart3, Settings, Loader2, PenLine } from "lucide-react";
import { C, SERIF, MONO, Hi } from "./theme.jsx";
import Cuaderno from "./components/Cuaderno.jsx";
import PageHub from "./components/PageHub.jsx";
import LexicalHub from "./components/LexicalHub.jsx";
import Diario from "./components/Diario.jsx";
import Repaso from "./components/Repaso.jsx";
import Ajustes from "./components/Ajustes.jsx";
import { useNotebook } from "./useNotebook.js";
import { isJournalEntry } from "./lib/journal.js";
import { isDictKey } from "./db/ref/entries.js";
import { getPinnedPageIds, setPagePinned } from "./db/collections.js";
import { getPinnedLexicalIds, setLexicalPinned } from "./db/items.js";
import { getPref, setPref } from "./db/db.js";
import { FILTERS } from "./lib/filters.js";
import { allTagsIn } from "./lib/tags.js";
import { DEFAULT_SWATCH, TAG_COLORS_PREF, normalizeTagColors } from "./lib/tagColors.js";
import { TagColorProvider } from "./components/TagChip.jsx";

/**
 * Spanish pluralization for the header counts: only 1 takes the singular, 0 takes the plural.
 * Worth the three lines in a notebook for learning Spanish — and splitting phrases out gave the
 * counts a line that will often read exactly 1, where the wrong plural is most visible.
 */
const count = (n, singular) => `${n} ${n === 1 ? singular : `${singular}s`}`;

const TABS = [
  { id: "cuaderno", label: "Cuaderno", icon: BookOpen },
  { id: "diario", label: "Diario", icon: PenLine },
  { id: "repaso", label: "Repaso", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

const baseRoute = (tab) => ({ tab, screen: "list", id: null });
const isHubRoute = (route) => route?.tab === "cuaderno"
  && (route.screen === "pages" || route.screen === "lexical");

export default function App() {
  // Every destination, including a list, is part of one session-only trail. This preserves
  // Cuaderno → Diario → word → Back without a URL router or any stored navigation state.
  const [routeTrail, setRouteTrail] = useState([baseRoute("cuaderno")]);
  const [pinnedPageIds, setPinnedPageIds] = useState([]);
  const [pinnedLexicalIds, setPinnedLexicalIds] = useState([]);
  const [tagColors, setTagColors] = useState({});
  const notebook = useNotebook();
  const route = routeTrail[routeTrail.length - 1];
  const tab = route.tab;
  const selectedId = route.id;

  // Counted the way the tabs divide things, since a single "palabras" total that quietly
  // included phrases stopped being true the moment they got their own tab.
  const lexical = notebook.items.filter((i) => i.type === "lexical");
  const phraseCount = lexical.filter((i) => i.form === "phrase").length;
  const wordCount = lexical.length - phraseCount;
  const pageCount = notebook.items.filter((item) => item.type === "page" && !isJournalEntry(item)).length;

  useEffect(() => {
    let current = true;
    const pageIds = new Set(notebook.items.filter((item) => item.type === "page").map((item) => item.id));
    getPinnedPageIds()
      .then((ids) => {
        if (current) setPinnedPageIds(ids.filter((id) => pageIds.has(id)));
      })
      .catch(() => {
        if (current) setPinnedPageIds([]);
      });
    return () => {
      current = false;
    };
  }, [notebook.items]);

  // The lexical pin list is hoisted for the same reason as the page one: hub cards and the
  // preference stay synchronized without a schema, event or timestamp change (Phase 4z).
  useEffect(() => {
    let current = true;
    const lexicalIds = new Set(
      notebook.items.filter((item) => item.type === "lexical").map((item) => item.id)
    );
    getPinnedLexicalIds()
      .then((ids) => {
        if (current) setPinnedLexicalIds(ids.filter((id) => lexicalIds.has(id)));
      })
      .catch(() => {
        if (current) setPinnedLexicalIds([]);
      });
    return () => {
      current = false;
    };
  }, [notebook.items]);

  // Hoisted for the same reason as the pin lists: five unrelated places render a tag, and they all
  // have to agree. Pruning happens in memory only — a write on every launch is the kind of thing
  // that is hard to explain later, and a colour left behind by a deleted tag harms nothing.
  useEffect(() => {
    let current = true;
    const known = allTagsIn(notebook.items);
    getPref(TAG_COLORS_PREF, {})
      .then((stored) => {
        if (current) setTagColors(normalizeTagColors(stored, known));
      })
      .catch(() => {
        if (current) setTagColors({});
      });
    return () => {
      current = false;
    };
  }, [notebook.items]);

  async function changeTagColor(tag, swatchId) {
    const next = { ...tagColors };
    if (swatchId === DEFAULT_SWATCH.id) delete next[tag];
    else next[tag] = swatchId;
    setTagColors(next);
    await setPref(TAG_COLORS_PREF, next);
  }

  async function changePagePinned(pageId, pinned) {
    await setPagePinned(pageId, pinned);
    setPinnedPageIds((ids) =>
      pinned ? [...ids.filter((id) => id !== pageId), pageId] : ids.filter((id) => id !== pageId)
    );
  }

  async function changeLexicalPinned(itemId, pinned) {
    await setLexicalPinned(itemId, pinned);
    setPinnedLexicalIds((ids) =>
      pinned ? [...ids.filter((id) => id !== itemId), itemId] : ids.filter((id) => id !== itemId)
    );
  }

  function switchTab(next) {
    setRouteTrail([baseRoute(next)]);
  }

  function openItem(id) {
    if (!id) return;
    const originScrollY = window.scrollY;
    const item = notebook.items.find((candidate) => candidate.id === id);
    const targetTab = !isDictKey(id) && isJournalEntry(item) ? "diario" : "cuaderno";
    const next = { tab: targetTab, screen: targetTab === "diario" ? "read" : "detail", id };
    setRouteTrail((trail) => {
      const current = trail[trail.length - 1];
      if (current.id === id && current.tab === targetTab) return trail;
      const origin = isHubRoute(current)
        ? { ...current, returnScrollY: originScrollY }
        : current;
      return [...trail.slice(0, -1), origin, next];
    });
  }

  function openPages() {
    setRouteTrail((trail) => {
      const current = trail[trail.length - 1];
      return current.tab === "cuaderno" && current.screen === "pages"
        ? trail
        : [...trail, { tab: "cuaderno", screen: "pages", id: null }];
    });
  }

  /**
   * The Words & phrases hub. The tapped chip travels as a keyed request rather than a bare value,
   * so choosing *frases* twice still selects Phrases even after the owner changed the chip inside
   * the hub — the same idiom the journal draft seed uses below.
   */
  function openLexical(form = FILTERS.all) {
    setRouteTrail((trail) => {
      const current = trail[trail.length - 1];
      const formRequest = { form, key: Date.now() };
      return current.tab === "cuaderno" && current.screen === "lexical"
        ? [...trail.slice(0, -1), { ...current, formRequest }]
        : [...trail, { tab: "cuaderno", screen: "lexical", id: null, formRequest }];
    });
  }

  /**
   * The hub searches personal vocabulary only, so a miss there is not proof the word does not
   * exist. This carries the query back to the one list that spans both layers (§8), where the
   * dictionary can answer and a genuine miss can be logged.
   */
  function searchEverything(text) {
    setRouteTrail((trail) => [
      ...trail,
      { tab: "cuaderno", screen: "list", id: null, seedQuery: { text, key: Date.now() } },
    ]);
  }

  function backFromDetail() {
    setRouteTrail((trail) => (trail.length > 1 ? trail.slice(0, -1) : [baseRoute(trail[0].tab)]));
  }

  function editJournal(id) {
    if (!id) return;
    setRouteTrail((trail) => [...trail, { tab: "diario", screen: "edit", id, seed: null }]);
  }

  function startJournal(seed = {}) {
    setRouteTrail((trail) => [
      ...trail,
      { tab: "diario", screen: "edit", id: null, seed: { ...seed, draftKey: Date.now() } },
    ]);
  }

  function journalMaterialized(id) {
    setRouteTrail((trail) => [
      ...trail.slice(0, -1),
      { ...trail[trail.length - 1], id },
    ]);
  }

  // A page can cross surfaces when its date or profile changes. Replace only the current route;
  // the origin trail stays intact, so moving a journal back to Pages never loses Back.
  useEffect(() => {
    if (notebook.loading || !route.id || isDictKey(route.id)) return;
    const item = notebook.items.find((candidate) => candidate.id === route.id);
    if (!item) return;
    const canonicalTab = isJournalEntry(item) ? "diario" : "cuaderno";
    if (canonicalTab === route.tab) return;
    setRouteTrail((trail) => [
      ...trail.slice(0, -1),
      { ...trail[trail.length - 1], tab: canonicalTab, screen: canonicalTab === "diario" ? "read" : "detail" },
    ]);
  }, [notebook.items, notebook.loading, route.id, route.tab]);

  const previousRoute = routeTrail[routeTrail.length - 2] || null;
  const backLabel = previousRoute?.id
    ? "Atrás"
    : previousRoute?.screen === "pages"
      ? "Pages"
    : previousRoute?.screen === "lexical"
      ? "Words & phrases"
    : previousRoute?.tab && previousRoute.tab !== route.tab
      ? TABS.find((candidate) => candidate.id === previousRoute.tab)?.label
      : route.tab === "diario"
        ? "Diario"
        : "Todo el cuaderno";

  // Keep the two notebook surfaces mounted while the session trail crosses between them.
  // Their local search/filter state then survives Journal → Back without becoming stored data.
  const cuadernoRoute = [...routeTrail].reverse().find((candidate) => candidate.tab === "cuaderno") || baseRoute("cuaderno");
  const diarioRoute = [...routeTrail].reverse().find((candidate) => candidate.tab === "diario") || baseRoute("diario");
  // Each hub brings its own focused header, so the app header steps aside for both of them.
  const hubOpen = tab === "cuaderno"
    && (cuadernoRoute.screen === "pages" || cuadernoRoute.screen === "lexical");

  // The document is the scroll container. A newly selected tab or detail must never inherit
  // a long source page's scroll offset and appear to open halfway down the destination. The two
  // dedicated hubs are the narrow exception: Back restores the offset captured when their entry
  // was opened, while that entry still arrives at the top.
  useLayoutEffect(() => {
    const destinationY = isHubRoute(route) && Number.isFinite(route.returnScrollY)
      ? route.returnScrollY
      : 0;
    window.scrollTo(0, destinationY);
  }, [route.screen, tab, selectedId]);

  return (
    <TagColorProvider colors={tagColors}>
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: C.paper }}>
        {!hubOpen && (
          <header
            className="sticky top-0 z-20 px-4 pt-4 pb-3"
            style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
                  Mi <Hi>cuaderno</Hi>
                </div>
                <div className="text-xs mt-1" style={{ color: C.mut }}>
                  Spanish notebook
                </div>
              </div>
              {tab !== "diario" && (
                <div
                  aria-label="Notebook totals"
                  className="text-right text-xs leading-relaxed"
                  style={{ fontFamily: MONO, color: C.mut }}
                >
                  {count(wordCount, "palabra")}
                  <br />
                  {count(phraseCount, "frase")}
                  <br />
                  {count(pageCount, "página")}
                </div>
              )}
            </div>
          </header>
        )}

        {notebook.loading ? (
          <div className="flex items-center justify-center gap-2 text-sm py-24" style={{ color: C.mut }}>
            <Loader2 size={16} className="animate-spin" /> Opening your cuaderno…
          </div>
        ) : (
          <>
            <section hidden={tab !== "cuaderno"} aria-label="Cuaderno surface">
              <div hidden={cuadernoRoute.screen === "pages" || cuadernoRoute.screen === "lexical"}>
                <Cuaderno
                  notebook={notebook}
                  selectedId={cuadernoRoute.screen === "detail" ? cuadernoRoute.id : null}
                  onSelect={openItem}
                  onBack={backFromDetail}
                  backLabel={backLabel}
                  onOpenSettings={() => switchTab("ajustes")}
                  onOpenPages={openPages}
                  onOpenLexical={openLexical}
                  seedQuery={cuadernoRoute.seedQuery || null}
                  pinnedPageIds={pinnedPageIds}
                  onPagePinnedChange={changePagePinned}
                />
              </div>
              <div hidden={cuadernoRoute.screen !== "pages"}>
                <PageHub
                  notebook={notebook}
                  pinnedPageIds={pinnedPageIds}
                  onPagePinnedChange={changePagePinned}
                  onSelect={openItem}
                  onBack={backFromDetail}
                />
              </div>
              <div hidden={cuadernoRoute.screen !== "lexical"}>
                <LexicalHub
                  notebook={notebook}
                  active={cuadernoRoute.screen === "lexical"}
                  formRequest={cuadernoRoute.formRequest || null}
                  pinnedLexicalIds={pinnedLexicalIds}
                  onLexicalPinnedChange={changeLexicalPinned}
                  onSelect={openItem}
                  onBack={backFromDetail}
                  onSearchDictionary={searchEverything}
                />
              </div>
            </section>
            <section hidden={tab !== "diario"} aria-label="Diario surface">
              <Diario
                notebook={notebook}
                route={diarioRoute}
                onSelect={openItem}
                onBack={backFromDetail}
                backLabel={backLabel}
                onEdit={editJournal}
                onStart={startJournal}
                onMaterialized={journalMaterialized}
              />
            </section>
            {tab === "repaso" && (
              <Repaso
                notebook={notebook}
                onSelect={openItem}
              />
            )}
            {tab === "ajustes" && (
              <Ajustes
                notebook={notebook}
                tagColors={tagColors}
                onTagColorChange={changeTagColor}
                onDataReplaced={notebook.reload}
              />
            )}
          </>
        )}

        <nav aria-label="Primary" className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto flex border-t" style={{ background: C.card, borderColor: C.line }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className="flex-1 py-2.5 flex flex-col items-center gap-0.5"
                >
                  <Icon size={19} style={{ color: active ? C.pen : C.mut }} />
                  <span
                    className="text-[11px]"
                    style={{ color: active ? C.pen : C.mut, fontWeight: active ? 600 : 400 }}
                  >
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
    </TagColorProvider>
  );
}
