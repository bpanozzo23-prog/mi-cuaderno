/** Design tokens and small shared pieces, lifted from the prototype (docs/mi-cuaderno.jsx). */

export const C = {
  paper: "#FAF9F4",
  card: "#FFFFFF",
  ink: "#212A3D",
  pen: "#2D4EA0",
  penDark: "#243F85",
  penPale: "#EDF1FA",
  hi: "#F7DF4E",
  line: "#E6E3D7",
  mut: "#7A8199",
  red: "#B3402E",
  green: "#3E6B44",
  greenPale: "#EAF2EA",
};

export const SERIF = 'Georgia, "Iowan Old Style", "Times New Roman", serif';
export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * Hub card titles, sized by length. Single words stay the focal point; long phrases and page
 * titles step down instead of wrapping, which is what keeps a scrolling hub scannable on a phone.
 * Both class names are complete literals on purpose — Tailwind scans source text, so a class built
 * by concatenation would never be emitted.
 */
export const hubTitleSize = (text) => ((text || "").length > 18 ? "text-[17px]" : "text-[20px]");

export const dotGrid = {
  backgroundImage: "radial-gradient(rgba(45,78,160,0.06) 1px, transparent 1.2px)",
  backgroundSize: "18px 18px",
};

/** The highlighter swipe. `on` lets callers mark tricky words without branching. */
export function Hi({ children, on = true }) {
  if (!on) return <span>{children}</span>;
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

export function SectionTitle({ children }) {
  return (
    <div
      className="text-xs font-semibold uppercase mb-2 mt-6"
      style={{ color: C.mut, letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
}

/**
 * A filter control, and only that. It was doing double duty as a plain display chip for tags until
 * tags grew owner-chosen colours and moved to `TagChip`; what is left is one shape with one job,
 * so `active`/`aria-pressed` is always meaningful.
 */
export function Chip({ children, active, onClick, title, className = "" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={typeof active === "boolean" ? active : undefined}
      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${className}`}
      style={
        active
          ? { background: C.pen, color: "#fff", borderColor: C.pen }
          : { background: C.penPale, color: C.penDark, borderColor: "#D9E1F2" }
      }
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={`rounded-xl border p-3 ${className}`}
      style={{ background: C.card, borderColor: C.line, ...style }}
    >
      {children}
    </div>
  );
}

export function Button({ children, onClick, disabled, tone = "primary", className = "", ...rest }) {
  const tones = {
    primary: { background: disabled ? "#B9C2D8" : C.pen, color: "#fff", borderColor: "transparent" },
    quiet: { background: C.card, color: C.ink, borderColor: C.line },
    danger: { background: C.card, color: C.red, borderColor: "#E5C4BC" },
    dangerArmed: { background: C.red, color: "#fff", borderColor: C.red },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium ${className}`}
      style={tones[tone]}
      {...rest}
    >
      {children}
    </button>
  );
}
