/** Design tokens and small shared pieces, lifted from the prototype (docs/mi-cuaderno.jsx). */

import { useCallback, useLayoutEffect, useRef, useState } from "react";

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
  hiBorder: "var(--color-hi-border)",
  hiInk: "var(--color-hi-ink)",
  hiPale: "var(--color-hi-pale)",
  onAccent: "var(--color-on-accent)",
  scrim: "var(--color-scrim)",
  line: "var(--color-line)",
  mut: "var(--color-mut)",
  entryMeaning: "var(--color-entry-meaning)",
  entryMeaningDash: "var(--color-entry-meaning-dash)",
  red: "var(--color-red)",
  redPale: "var(--color-red-pale)",
  green: "var(--color-green)",
  greenPale: "var(--color-green-pale)",
  amber: "var(--color-amber)",
  amberPale: "var(--color-amber-pale)",
  chipBorder: "var(--color-chip-border)",
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
  roleSourcePale: "var(--color-role-source-pale)",
  roleSourceInk: "var(--color-role-source-ink)",
  roleGrammarPale: "var(--color-role-grammar-pale)",
  roleGrammarInk: "var(--color-role-grammar-ink)",
  sectionNeutralBand: "var(--color-section-neutral-band)",
  sectionNeutralSpine: "var(--color-section-neutral-spine)",
  diario: "var(--color-diario)",
  diarioPale: "var(--color-diario-pale)",
  diarioBorder: "var(--color-diario-border)",
  diarioInk: "var(--color-diario-ink)",
  chalkBoard: "var(--color-chalk-board)",
  chalkFrame: "var(--color-chalk-frame)",
  chalkFrameDark: "var(--color-chalk-frame-dark)",
  chalkTray: "var(--color-chalk-tray)",
  chalkTrayShadow: "var(--color-chalk-tray-shadow)",
  chalk: "var(--color-chalk)",
  chalkDim: "var(--color-chalk-dim)",
  chalkRule: "var(--color-chalk-rule)",
  chalkStick: "var(--color-chalk-stick)",
  chalkStickPink: "var(--color-chalk-stick-pink)",
  chalkEraserBack: "var(--color-chalk-eraser-back)",
  chalkEraserFelt: "var(--color-chalk-eraser-felt)",
  chalkEraserDust: "var(--color-chalk-eraser-dust)",
  chalkTrack: "var(--color-chalk-track)",
  chalkMint: "var(--color-chalk-mint)",
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
/* The chalkboard's two hands (self-hosted via @fontsource, imported in main.jsx): a rough
   print for the numbers, a quicker script for labels and the heading. */
export const CHALK_PRINT = '"Gloria Hallelujah", cursive';
export const CHALK_SCRIPT = '"Caveat", cursive';

export const HUB_TITLE_FULL = 18;
export const HUB_TITLE_TIGHT = 17;

/**
 * Measures a title's natural single-line width, in the face it actually renders in.
 *
 * A shared canvas rather than a probe element: this answers "how wide would this text be" without
 * touching layout, so asking cannot itself trigger the reflow it is trying to decide about. The
 * measurement is independent of whatever size the element is currently wearing, which is what
 * keeps the fit check below from oscillating between its two sizes.
 *
 * Returns 0 where there is no 2D context — jsdom without the canvas package, notably — so a test
 * environment that cannot measure text reads as "it fits" and gets the full size.
 */
let measureContext;
function naturalTitleWidth(text, px, weight, letterSpacing) {
  if (typeof document === "undefined") return 0;
  if (measureContext === undefined) {
    measureContext = document.createElement("canvas").getContext("2d") || null;
  }
  if (!measureContext) return 0;
  measureContext.font = `${weight} ${px}px ${SERIF}`;
  /* Supported since Chrome 99 and the only browser this PWA runs in; older engines simply measure
     without it, which errs toward the full size rather than a spurious step-down. */
  if ("letterSpacing" in measureContext) measureContext.letterSpacing = letterSpacing;
  return measureContext.measureText(text || "").width;
}

/**
 * A hub card title at full size, stepping down one point only when it genuinely does not fit.
 *
 * This replaced a character count (`length > 18`), which was a guess about width rather than a
 * measurement of it and shrank titles that had room to spare — a 22-character phrase needed 212px
 * and had 269px. Returns the ref to put on the title element (its own width is the space to fill)
 * and the font size in px to render at.
 */
export function useHubTitleSize(text, { weight = 700, letterSpacing = "0px" } = {}) {
  const ref = useRef(null);
  const [size, setSize] = useState(HUB_TITLE_FULL);

  const fit = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const available = element.clientWidth;
    /* Zero means the title has no box to fill yet — every hub mounts behind a `display: none`
       route, so this is the state a card is born in, not an edge case. Bail without deciding and
       let a later run answer, rather than committing to a size measured against nothing. */
    if (!available) return;
    const needed = naturalTitleWidth(text, HUB_TITLE_FULL, weight, letterSpacing);
    setSize(needed <= available ? HUB_TITLE_FULL : HUB_TITLE_TIGHT);
  }, [text, weight, letterSpacing]);

  /* Deliberately no dependency array: the fit must re-run on every render, because the render that
     matters is the one where the card's route stops being hidden and the title finally has a
     width. Keying this to [text] instead left a hub card measuring 0 at mount and never asking
     again, which is how a 30-character phrase sat at full size in 254px of space. The work is a
     canvas measure and one `clientWidth` read, and settling on the same size is a no-op because
     React bails out of an identical state update. */
  useLayoutEffect(fit);

  /* The viewport can change without React rendering anything — a rotation — which is the one case
     the every-render fit above cannot see. This was a ResizeObserver on the title, which looked
     more precise and did not work: every hub mounts hidden, so the observer was attached to an
     element with no box and never delivered once it had one. The window's own resize event has no
     such dependency, and the card's width here follows the viewport anyway. */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  return [ref, size];
}

export const dotGrid = {
  backgroundImage: "radial-gradient(var(--color-dot-grid) 1px, transparent 1.2px)",
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
          ? { background: C.pen, color: C.onAccent, borderColor: C.pen }
          : { background: C.penPale, color: C.penDark, borderColor: C.chipBorder }
      }
    >
      {children}
    </button>
  );
}

/**
 * One row of mutually exclusive choices — a radio group wearing a segmented control's clothes.
 * It began in the Conjugation Gym and moved here when the activity calendar needed the same
 * shape, so the two screens cannot drift into two different-looking toggles.
 */
export function Segmented({ label, value, options, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-lg border p-0.5"
      style={{ borderColor: C.line, background: C.paper }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className="min-w-0 flex-1 rounded-md px-1 py-2 text-xs break-words text-center"
            style={{
              fontFamily: MONO,
              background: active ? C.pen : "transparent",
              color: active ? C.card : C.mut,
              opacity: option.disabled ? 0.45 : 1,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
    primary: { background: disabled ? C.disabled : C.pen, color: C.onAccent, borderColor: "transparent" },
    success: { background: disabled ? C.disabled : C.green, color: C.onAccent, borderColor: "transparent" },
    quiet: { background: C.card, color: C.ink, borderColor: C.line },
    danger: { background: C.card, color: C.red, borderColor: C.dangerBorder },
    dangerArmed: { background: C.red, color: C.onAccent, borderColor: C.red },
    gradeAgain: { background: C.redPale, color: C.red, borderColor: C.red },
    gradeHard: { background: C.amberPale, color: C.amber, borderColor: C.amber },
    gradeGood: { background: C.penPale, color: C.penDark, borderColor: C.pen },
    gradeEasy: { background: C.greenPale, color: C.green, borderColor: C.green },
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
    primary: { background: disabled ? C.disabled : C.pen, color: C.onAccent, borderColor: "transparent" },
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
