import { useLayoutEffect, useState } from "react";
import { BookOpen, BarChart3, Settings, Loader2 } from "lucide-react";
import { C, SERIF, MONO, Hi } from "./theme.jsx";
import Cuaderno from "./components/Cuaderno.jsx";
import Repaso from "./components/Repaso.jsx";
import Ajustes from "./components/Ajustes.jsx";
import { useNotebook } from "./useNotebook.js";

/**
 * Spanish pluralization for the header counts: only 1 takes the singular, 0 takes the plural.
 * Worth the three lines in a notebook for learning Spanish — and splitting phrases out gave the
 * counts a line that will often read exactly 1, where the wrong plural is most visible.
 */
const count = (n, singular) => `${n} ${n === 1 ? singular : `${singular}s`}`;

const TABS = [
  { id: "cuaderno", label: "Cuaderno", icon: BookOpen },
  { id: "repaso", label: "Repaso", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

export default function App() {
  const [tab, setTab] = useState("cuaderno");
  // Detail navigation is a session-only trail. A related-item hop pushes a key; Back pops it.
  // Nothing is stored and the browser URL stays unchanged — this is the smallest fix for
  // source → word → back losing its origin without introducing a router.
  const [detailTrail, setDetailTrail] = useState([]);
  const notebook = useNotebook();
  const selectedId = detailTrail[detailTrail.length - 1] || null;

  // Counted the way the tabs divide things, since a single "palabras" total that quietly
  // included phrases stopped being true the moment they got their own tab.
  const lexical = notebook.items.filter((i) => i.type === "lexical");
  const phraseCount = lexical.filter((i) => i.form === "phrase").length;
  const wordCount = lexical.length - phraseCount;
  const pageCount = notebook.items.length - lexical.length;

  function switchTab(next) {
    setTab(next);
    if (next !== "cuaderno") setDetailTrail([]);
  }

  function openItem(id) {
    if (!id) return;
    setDetailTrail((trail) => (trail[trail.length - 1] === id ? trail : [...trail, id]));
    setTab("cuaderno");
  }

  function backFromDetail() {
    setDetailTrail((trail) => trail.slice(0, -1));
  }

  // The document is the scroll container. A newly selected tab or detail must never inherit
  // a long source page's scroll offset and appear to open halfway down the destination.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, selectedId]);

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: C.paper }}>
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
            <div className="text-right text-xs leading-relaxed" style={{ fontFamily: MONO, color: C.mut }}>
              {count(wordCount, "palabra")}
              <br />
              {count(phraseCount, "frase")}
              <br />
              {count(pageCount, "página")}
            </div>
          </div>
        </header>

        {notebook.loading ? (
          <div className="flex items-center justify-center gap-2 text-sm py-24" style={{ color: C.mut }}>
            <Loader2 size={16} className="animate-spin" /> Opening your cuaderno…
          </div>
        ) : (
          <>
            {tab === "cuaderno" && (
              <Cuaderno
                notebook={notebook}
                selectedId={selectedId}
                onSelect={openItem}
                onBack={backFromDetail}
                hasDetailOrigin={detailTrail.length > 1}
                onOpenSettings={() => switchTab("ajustes")}
              />
            )}
            {tab === "repaso" && (
              <Repaso
                notebook={notebook}
                onSelect={openItem}
              />
            )}
            {tab === "ajustes" && <Ajustes onDataReplaced={notebook.reload} />}
          </>
        )}

        <nav className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto flex border-t" style={{ background: C.card, borderColor: C.line }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
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
  );
}
