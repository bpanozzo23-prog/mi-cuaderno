import { NotebookPen } from "lucide-react";

/* Design tokens from the prototype (docs/mi-cuaderno.jsx) */
const C = {
  paper: "#FAF9F4",
  card: "#FFFFFF",
  ink: "#212A3D",
  pen: "#2D4EA0",
  penPale: "#EDF1FA",
  hi: "#F7DF4E",
  line: "#E6E3D7",
  mut: "#7A8199",
};
const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

function Hi({ children }) {
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(100deg, transparent 0.5%, ${C.hi} 3.5%, ${C.hi}E6 96%, transparent 99.5%)`,
        borderRadius: 4,
        padding: "0 6px",
        margin: "0 -6px",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {children}
    </span>
  );
}

const dotGrid = {
  backgroundImage: "radial-gradient(rgba(45,78,160,0.06) 1px, transparent 1.2px)",
  backgroundSize: "18px 18px",
};

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <div className="max-w-md mx-auto min-h-screen" style={{ background: C.paper }}>
        <header className="px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="text-2xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
            Mi <Hi>cuaderno</Hi>
          </div>
          <div className="text-xs mt-1" style={{ color: C.mut }}>
            Spanish notebook · setup complete
          </div>
        </header>

        <main className="px-4 py-16 text-center" style={dotGrid}>
          <div
            className="mx-auto max-w-xs rounded-2xl border p-6"
            style={{ background: C.card, borderColor: C.line }}
          >
            <NotebookPen size={28} className="mx-auto" style={{ color: C.pen }} />
            <div className="mt-3 text-base" style={{ fontFamily: SERIF, color: C.ink }}>
              Aquí empieza el cuaderno.
            </div>
            <div className="mt-2 text-sm" style={{ color: C.mut }}>
              The notebook itself arrives in Phase 1. This shell exists to prove the app installs,
              opens full-screen, and redeploys on every push.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
