import { useState } from "react";
import { Shuffle, X } from "lucide-react";
import { Button, C, MONO, SERIF } from "../theme.jsx";
import { DEFAULT_PRACTICE_LIMIT, PRACTICE_LIMITS, PRACTICE_ORDERS } from "../lib/practice.js";

const choiceStyle = (active) => ({
  background: active ? C.pen : C.card,
  borderColor: active ? C.pen : C.line,
  color: active ? "#fff" : C.ink,
});

export default function PracticeSetupSheet({ eligibleCount, omittedCount, onClose, onStart }) {
  const [limit, setLimit] = useState(String(DEFAULT_PRACTICE_LIMIT));
  const [order, setOrder] = useState(PRACTICE_ORDERS.shuffled);
  const selectedCount = limit === "all" ? eligibleCount : Math.min(eligibleCount, Number(limit));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "rgba(33,42,61,0.35)" }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-setup-title"
        className="w-full max-w-md rounded-t-2xl p-4 pb-6"
        style={{ background: C.paper }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.1em" }}>Current hub view</div>
            <h2 id="practice-setup-title" className="mt-1 text-xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>Set up practice</h2>
            <p className="mt-1 text-sm" style={{ color: C.mut }}>
              Practice {selectedCount} of {eligibleCount} eligible {eligibleCount === 1 ? "card" : "cards"}.
              {omittedCount > 0 && ` ${omittedCount} ${omittedCount === 1 ? "entry needs" : "entries need"} a meaning.`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close practice setup" className="inline-flex min-h-11 min-w-11 items-center justify-center">
            <X size={17} style={{ color: C.mut }} />
          </button>
        </div>

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
                  {value === "all" ? `All ${eligibleCount}` : value}
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
              Hub order
            </button>
          </div>
        </fieldset>

        <Button
          className="mt-6 min-h-12 w-full"
          onClick={() => onStart({
            limit: limit === "all" ? "all" : Number(limit),
            order,
          })}
        >
          Start {selectedCount}-card practice
        </Button>
      </div>
    </div>
  );
}
