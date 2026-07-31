import { useState } from "react";
import { BookOpen, BarChart3, Settings, Loader2 } from "lucide-react";
import { C, SERIF, MONO, Hi } from "./theme.jsx";
import Cuaderno from "./components/Cuaderno.jsx";
import Repaso from "./components/Repaso.jsx";
import Ajustes from "./components/Ajustes.jsx";
import { useNotebook } from "./useNotebook.js";

const TABS = [
  { id: "cuaderno", label: "Cuaderno", icon: BookOpen },
  { id: "repaso", label: "Repaso", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

export default function App() {
  const [tab, setTab] = useState("cuaderno");
  const [selectedId, setSelectedId] = useState(null);
  const notebook = useNotebook();

  const lexicalCount = notebook.items.filter((i) => i.type === "lexical").length;
  const pageCount = notebook.items.length - lexicalCount;

  function switchTab(next) {
    setTab(next);
    if (next !== "cuaderno") setSelectedId(null);
  }

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
            <div className="text-right text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              {lexicalCount} palabras
              <br />
              {pageCount} páginas
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
              <Cuaderno notebook={notebook} selectedId={selectedId} onSelect={setSelectedId} />
            )}
            {tab === "repaso" && (
              <Repaso
                notebook={notebook}
                onSelect={(id) => {
                  setSelectedId(id);
                  setTab("cuaderno");
                }}
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
