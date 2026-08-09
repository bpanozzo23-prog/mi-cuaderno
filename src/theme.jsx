/** Design tokens and small shared pieces, lifted from the prototype (docs/mi-cuaderno.jsx). */

/**
 * The palette, as CSS variable references.
 *
 * The values live in `src/index.css`; these keys are the JavaScript handle on them. Callers are
 * unaffected — `style={{ color: C.pen }}` works exactly as it did when this held hex strings — but
 * the colour is now resolved by the browser at paint time rather than baked into a React render,
 * so the whole palette is swappable from one file.
 *
 * The one thing that no longer works is string surgery on a value: `${C.hi}E6` used to append hex
 * alpha and now produces nonsense. Where a variant is needed it gets its own token, as `hiSoft`
 * does below.
 */
export const C = {
  paper: "var(--color-paper)",
  card: "var(--color-card)",
  ink: "var(--color-ink)",
  pen: "var(--color-pen)",
  penDark: "var(--color-pen-dark)",
  penPale: "var(--color-pen-pale)",
  floatingAdd: "var(--color-floating-add)",
  hi: "var(--color-hi)",
  hiSoft: "var(--color-hi-soft)",
  line: "var(--color-line)",
  mut: "var(--color-mut)",
  entryMeaning: "var(--color-entry-meaning)",
  entryMeaningDash: "var(--color-entry-meaning-dash)",
  red: "var(--color-red)",
  redPale: "var(--color-red-pale)",
  green: "var(--color-green)",
  greenPale: "var(--color-green-pale)",
  chipBorder: "var(--color-chip-border)",
  sectionSpine: "var(--color-section-spine)",
  dangerBorder: "var(--color-danger-border)",
  disabled: "var(--color-disabled)",
  pageFolder: "var(--color-page-folder)",
  pageFolderTab: "var(--color-page-folder-tab)",
  pageFolderLine: "var(--color-page-folder-line)",
  pageFolderNotes: "var(--color-page-folder-notes)",
  pageFolderNotesTab: "var(--color-page-folder-notes-tab)",
  pageFolderNotesLine: "var(--color-page-folder-notes-line)",
  pageFolderSource: "var(--color-page-folder-source)",
  pageFolderSourceTab: "var(--color-page-folder-source-tab)",
  pageFolderSourceLine: "var(--color-page-folder-source-line)",
  pageFolderGrammar: "var(--color-page-folder-grammar)",
  pageFolderGrammarTab: "var(--color-page-folder-grammar-tab)",
  pageFolderGrammarLine: "var(--color-page-folder-grammar-line)",
  roleVocabularyPale: "var(--color-role-vocabulary-pale)",
  roleVocabularyInk: "var(--color-role-vocabulary-ink)",
  roleGrammarPale: "var(--color-role-grammar-pale)",
  roleGrammarInk: "var(--color-role-grammar-ink)",
};

/** The activity calendar's ramp, indexed by intensity level 0–4 (Phase 11). */
export const HEAT = [
  "var(--color-heat-0)",
  "var(--color-heat-1)",
  "var(--color-heat-2)",
  "var(--color-heat-3)",
  "var(--color-heat-4)",
];

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
        backgroundImage: `linear-gradient(100deg, transparent 0.5%, ${C.hi} 3.5%, ${C.hiSoft} 96%, transparent 99.5%)`,
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
          : { background: C.penPale, color: C.penDark, borderColor: C.chipBorder }
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
    primary: { background: disabled ? C.disabled : C.pen, color: "#fff", borderColor: "transparent" },
    quiet: { background: C.card, color: C.ink, borderColor: C.line },
    danger: { background: C.card, color: C.red, borderColor: C.dangerBorder },
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

/** A square, touch-sized action whose visible content is an icon and whose name is aria-label. */
export function IconButton({ children, onClick, disabled, tone = "quiet", className = "", style = {}, ...rest }) {
  const tones = {
    primary: { background: disabled ? C.disabled : C.pen, color: "#fff", borderColor: "transparent" },
    quiet: { background: C.card, color: C.ink, borderColor: C.line },
    danger: { background: C.card, color: C.red, borderColor: C.dangerBorder },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${className}`}
      style={{ ...tones[tone], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
