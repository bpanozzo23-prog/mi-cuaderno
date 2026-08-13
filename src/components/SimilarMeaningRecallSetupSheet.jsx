import { useState } from "react";
import { Link2, X } from "lucide-react";
import { Button, C, MONO, SERIF } from "../theme.jsx";
import { similarMeaningRecallLimits } from "../lib/similarMeaningRecall.js";

const choiceStyle = (active) => ({
  background: active ? C.pen : C.card,
  borderColor: active ? C.pen : C.line,
  color: active ? C.onAccent : C.ink,
});

const preferredLimit = (options) => options.includes(20) ? 20 : options[0];

export default function SimilarMeaningRecallSetupSheet({
  eligibleCount,
  onClose,
  onStart,
  starting = false,
}) {
  const options = similarMeaningRecallLimits(eligibleCount);
  const fallback = preferredLimit(options);
  const [chosenLimit, setChosenLimit] = useState(fallback);
  const limit = options.includes(chosenLimit) ? chosenLimit : fallback;
  const selectedCount = limit === "all" ? eligibleCount : Math.min(eligibleCount, limit || 0);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: C.scrim }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="similar-recall-setup-title"
        className="max-h-[calc(100vh-1rem)] w-full max-w-md overflow-y-auto rounded-t-2xl p-4 pb-6"
        style={{ background: C.paper }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase" style={{ color: C.mut, fontFamily: MONO, letterSpacing: "0.1em" }}>
              <Link2 size={13} /> Confirmed connections
            </div>
            <h2 id="similar-recall-setup-title" className="mt-1 text-xl font-bold" style={{ fontFamily: SERIF, color: C.ink }}>
              Set up similar-meaning recall
            </h2>
            <p className="mt-1 text-sm" style={{ color: C.mut }}>
              Recall {selectedCount} of {eligibleCount} eligible {eligibleCount === 1 ? "prompt" : "prompts"}.
            </p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: C.mut }}>
              Reveal uses only your confirmed Similar meaning connections. You self-grade because another answer may also be valid. This stays in this visit and changes no Repaso history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close similar-meaning recall setup"
            className="inline-flex min-h-11 min-w-11 items-center justify-center"
          >
            <X size={17} style={{ color: C.mut }} />
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-semibold" style={{ color: C.mut }}>Prompts this session</legend>
          <div
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, options.length)}, minmax(0, 1fr))` }}
          >
            {options.map((option) => (
              <button
                key={String(option)}
                type="button"
                aria-pressed={limit === option}
                onClick={() => setChosenLimit(option)}
                className="min-h-11 rounded-lg border px-3 text-sm font-medium"
                style={choiceStyle(limit === option)}
              >
                {option === "all" ? `All ${eligibleCount}` : option}
              </button>
            ))}
          </div>
        </fieldset>

        <Button
          className="mt-5 min-h-12 w-full"
          disabled={starting || selectedCount === 0}
          onClick={() => onStart({ limit })}
        >
          {starting ? "Preparing recall…" : `Start ${selectedCount}-prompt recall`}
        </Button>
      </div>
    </div>
  );
}
