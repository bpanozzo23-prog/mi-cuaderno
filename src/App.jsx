import { useState } from "react";
import { BookOpen, BarChart3, Settings } from "lucide-react";
import { C, SERIF, MONO, dotGrid, Hi, Card } from "./theme.jsx";
import Ajustes from "./components/Ajustes.jsx";

const TABS = [
  { id: "cuaderno", label: "Cuaderno", icon: BookOpen },
  { id: "repaso", label: "Repaso", icon: BarChart3 },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

function Placeholder({ text }) {
  return (
    <div className="px-4 py-16" style={dotGrid}>
      <Card className="mx-auto max-w-xs text-center p-6">
        <div className="text-base" style={{ fontFamily: SERIF, color: C.ink }}>
          Aquí empieza el cuaderno.
        </div>
        <div className="mt-2 text-sm" style={{ color: C.mut }}>
          {text}
        </div>
      </Card>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("cuaderno");
  const [dataEpoch, setDataEpoch] = useState(0); // bumped when an import replaces everything

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto min-h-screen relative" style={{ background: C.paper }}>
        <header
          className="sticky top-0 z-20 px-4 pt-4 pb-3"
          style={{ background: C.paper, borderBottom: `1px solid ${C.line}` }}
        >
          <div className="text-2xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
            Mi <Hi>cuaderno</Hi>
          </div>
          <div className="text-xs mt-1" style={{ color: C.mut }}>
            Spanish notebook
          </div>
        </header>

        {tab === "cuaderno" && <Placeholder text="Words, phrases and pages arrive in the next step (Phase 1b)." />}
        {tab === "repaso" && <Placeholder text="Lookup history and tricky words arrive in Phase 1d." />}
        {tab === "ajustes" && <Ajustes key={dataEpoch} onDataReplaced={() => setDataEpoch((n) => n + 1)} />}

        <nav className="fixed bottom-0 inset-x-0 z-30">
          <div className="max-w-md mx-auto flex border-t" style={{ background: C.card, borderColor: C.line }}>
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
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
