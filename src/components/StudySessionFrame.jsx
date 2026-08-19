import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { C, MONO, SERIF, dotGrid } from "../theme.jsx";

const StudySessionRegistrationContext = createContext({
  register: () => () => {},
  requestFinish: null,
});

/**
 * Lets the app shell step aside while a nested study session is mounted.
 *
 * Registration is token-based rather than a single boolean so StrictMode's development
 * mount/unmount probe, or a future hand-off between two session components, cannot restore the
 * global chrome while another frame still owns focus mode.
 */
export function StudySessionProvider({
  onActiveChange,
  onSessionStart = null,
  onSessionEnd = null,
  requestFinish = null,
  children,
}) {
  const registrations = useRef(new Map());

  const register = useCallback((token, finish) => {
    registrations.current.set(token, finish);
    if (registrations.current.size === 1) {
      onActiveChange(true);
      onSessionStart?.(finish);
    }

    return () => {
      registrations.current.delete(token);
      if (registrations.current.size === 0) {
        onActiveChange(false);
        onSessionEnd?.();
      }
    };
  }, [onActiveChange, onSessionEnd, onSessionStart]);

  return (
    <StudySessionRegistrationContext.Provider value={{ register, requestFinish }}>
      {children}
    </StudySessionRegistrationContext.Provider>
  );
}

function useStudySessionRegistration(onFinish) {
  const { register, requestFinish } = useContext(StudySessionRegistrationContext);
  const token = useRef(null);
  const finishRef = useRef(onFinish);
  if (!token.current) token.current = Symbol("study-session");
  finishRef.current = onFinish;
  const finish = useCallback(() => finishRef.current?.(), []);

  useLayoutEffect(() => register(token.current, finish), [finish, register]);
  return requestFinish ? () => requestFinish(finish) : finish;
}

/** One quiet line above a card's actual question content. */
export function StudyCardEyebrow({ children, className = "" }) {
  if (!children) return null;
  return (
    <div
      className={`text-center text-xs ${className}`}
      style={{ fontFamily: MONO, color: C.mut }}
    >
      {children}
    </div>
  );
}

/**
 * The common outer anatomy for every active study flow. The content owns the teaching mechanic;
 * this frame owns focus mode, progress, scrolling, and the thumb-zone action dock.
 */
export default function StudySessionFrame({
  title,
  stageLabel = "",
  current = 0,
  total = 0,
  onFinish = null,
  actions = null,
  summary = false,
  children,
}) {
  const finish = useStudySessionRegistration(onFinish);

  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCurrent = safeTotal > 0
    ? Math.min(safeTotal, Math.max(1, Number(current) || 1))
    : 0;
  const progress = safeTotal > 0 ? (safeCurrent / safeTotal) * 100 : 0;

  return (
    <section
      data-study-session
      aria-label={`${title || "Study"} session`}
      className="fixed inset-0 z-40"
      style={{ background: C.paper, color: C.ink }}
    >
      <div
        className="mx-auto grid h-[100dvh] max-w-md grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
        style={{ background: C.paper }}
      >
        <header className="border-b" style={{ background: C.paper, borderColor: C.line }}>
          <div className="grid min-h-13 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
            {onFinish ? (
              <button
                type="button"
                onClick={finish}
                className="inline-flex min-h-11 items-center justify-self-start text-sm"
                style={{ color: C.pen }}
              >
                <ChevronLeft size={18} /> Finish
              </button>
            ) : <span aria-hidden="true" />}
            <div className="text-base font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>
              {title}
            </div>
            <span className="justify-self-end text-xs" style={{ fontFamily: MONO, color: C.mut }}>
              {safeTotal > 0 ? `${safeCurrent} of ${safeTotal}` : ""}
            </span>
          </div>
          {stageLabel && (
            <div
              className="-mt-1 pb-2 text-center text-[11px] font-semibold uppercase"
              style={{ fontFamily: MONO, color: C.mut, letterSpacing: "0.1em" }}
            >
              {stageLabel}
            </div>
          )}
          {safeTotal > 0 && (
            <div
              role="progressbar"
              aria-label="Session progress"
              aria-valuemin={0}
              aria-valuemax={safeTotal}
              aria-valuenow={safeCurrent}
              className="h-1"
              style={{ background: C.line }}
            >
              <div
                className="study-session-progress-fill h-full"
                style={{ background: C.pen, width: `${progress}%` }}
              />
            </div>
          )}
        </header>

        <main className="min-h-0 overflow-y-auto px-4 py-4" style={dotGrid}>
          <div className="flex min-h-full flex-col">
            <div className="my-auto" aria-live={summary ? "polite" : undefined}>{children}</div>
          </div>
        </main>

        {actions && (
          <footer
            data-study-actions
            className="border-t px-4 pt-3"
            style={{
              background: C.card,
              borderColor: C.line,
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            {actions}
          </footer>
        )}
      </div>
    </section>
  );
}
