import { useState } from "react";
import { Shuffle, X } from "lucide-react";
import { Button, C, MONO, SERIF } from "../theme.jsx";
import { DEFAULT_PRACTICE_LIMIT, PRACTICE_LIMITS, PRACTICE_ORDERS } from "../lib/practice.js";

const choiceStyle = (active) => ({
  background: active ? C.pen : C.card,
  borderColor: active ? C.pen : C.line,
  color: active ? C.card : C.ink,
});

export default function PracticeSetupSheet({
  eligibleCount,
  omittedCount,
  onClose,
  onStart,
  sourceLabel = "Current hub view",
  orderLabel = "Hub order",
  scopeOptions = null,
  starting = false,
}) {
  const [limit, setLimit] = useState(String(DEFAULT_PRACTICE_LIMIT));
  const [order, setOrder] = useState(PRACTICE_ORDERS.shuffled);
  const [direction, setDirection] = useState("forward");
  const [mode, setMode] = useState("reveal");
  const [scope, setScope] = useState(scopeOptions?.[0]?.value || null);
  const selectedScope = scopeOptions?.find((option) => option.value === scope) || null;
  const availableCount = selectedScope?.eligibleCount ?? eligibleCount;
  const unavailableCount = selectedScope?.omittedCount ?? omittedCount;
  const selectedCount = limit === "all" ? availableCount : Math.min(availableCount, Number(limit));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(33,42,61,0.35)" }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-setup-title"
        className="max-h-[calc(100vh-1rem)] w-full max-w-md overflow-y-auto rounded-t-2xl p-4 pb-6"
        style={{ background: C.paper }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.1em" }}>{sourceLabel}</div>
            <h2 id="practice-setup-title" className="mt-1 text-xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>Set up practice</h2>
            <p className="mt-1 text-sm" style={{ color: C.mut }}>
              Practice {selectedCount} of {availableCount} eligible {availableCount === 1 ? "card" : "cards"}.
              {unavailableCount > 0 && ` ${unavailableCount} ${unavailableCount === 1 ? "entry needs" : "entries need"} a meaning.`}
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
              Free practice stays in this session and does not change your Repaso schedule.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close practice setup" className="inline-flex min-h-11 min-w-11 items-center justify-center">
            <X size={17} style={{ color: C.mut }} />
          </button>
        </div>

        {scopeOptions?.length > 0 && (
          <fieldset className="mt-4">
            <legend className="text-xs font-semibold" style={{ color: C.mut }}>Practice from</legend>
            <div className="mt-2 grid gap-2">
              {scopeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg border px-3 text-sm font-medium"
                  style={choiceStyle(scope === option.value)}
                >
                  <input
                    type="radio"
                    name="practice-scope"
                    value={option.value}
                    checked={scope === option.value}
                    onChange={() => setScope(option.value)}
                    aria-label={option.label}
                    className="sr-only"
                  />
                  <span>{option.label}</span>
                  <span aria-hidden="true" style={{ fontFamily: MONO, opacity: 0.75 }}>{option.eligibleCount}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold" style={{ color: C.mut }}>Cards this session</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PRACTICE_LIMITS.map((value) => {
              const key = String(value);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={limit === key}
                  onClick={() => setLimit(key)}
                  className="min-h-11 rounded-lg border px-3 text-sm font-medium"
                  style={choiceStyle(limit === key)}
                >
                  {value === "all" ? `All ${availableCount}` : value}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold" style={{ color: C.mut }}>Card order</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={order === PRACTICE_ORDERS.shuffled}
              onClick={() => setOrder(PRACTICE_ORDERS.shuffled)}
              className="min-h-11 rounded-lg border px-3 text-sm font-medium"
              style={choiceStyle(order === PRACTICE_ORDERS.shuffled)}
            >
              <Shuffle size={14} className="mr-1.5 inline" /> Shuffled
            </button>
            <button
              type="button"
              aria-pressed={order === PRACTICE_ORDERS.current}
              onClick={() => setOrder(PRACTICE_ORDERS.current)}
              className="min-h-11 rounded-lg border px-3 text-sm font-medium"
              style={choiceStyle(order === PRACTICE_ORDERS.current)}
            >
              {orderLabel}
            </button>
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold" style={{ color: C.mut }}>Which way</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              ["forward", "es→en"],
              ["reverse", "en→es"],
              ["mixed", "Mixed"],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-medium"
                style={choiceStyle(direction === value)}
              >
                <input
                  type="radio"
                  name="practice-direction"
                  value={value}
                  checked={direction === value}
                  onChange={() => setDirection(value)}
                  aria-label={label}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold" style={{ color: C.mut }}>How to answer</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["reveal", "Reveal"],
              ["typed", "Type"],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium"
                style={choiceStyle(mode === value)}
              >
                <input
                  type="radio"
                  name="practice-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  aria-label={label}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Button
          className="mt-5 min-h-12 w-full"
          disabled={starting || selectedCount === 0}
          onClick={() => onStart({
            limit: limit === "all" ? "all" : Number(limit),
            order,
            direction,
            mode,
            ...(scopeOptions ? { scope } : {}),
          })}
        >
          {starting ? "Preparing practice…" : `Start ${selectedCount}-card practice`}
        </Button>
      </div>
    </div>
  );
}
