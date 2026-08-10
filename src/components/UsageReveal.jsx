import { C, MONO } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { grammarGuidesForTense } from "../lib/recognitionGuides.js";

export default function UsageReveal({ card, items = [], controls = null }) {
  const guides = grammarGuidesForTense(items, card.answer);
  if (!card.alsoAcceptable?.length && guides.length === 0) return null;
  return (
    <div className="mt-3 space-y-3">
      {card.alsoAcceptable?.length > 0 && (
        <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: C.chipBorder, background: C.penPale, color: C.penDark }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
            Mexican Spanish note
          </div>
          <div className="mt-0.5">
            {card.alsoAcceptable.map(qualifiedTenseLabel).join(" or ")} can also be natural here, so it was not offered as a distractor.
          </div>
        </div>
      )}
      {guides.length > 0 && controls && (
        <div className="space-y-1.5">
          {controls.openArmed && (
            <div role="alert" className="text-xs" style={{ color: C.red }}>
              Opening this guide ends the session. {controls.remaining} {controls.remaining === 1 ? "prompt remains" : "prompts remain"}.
            </div>
          )}
          {guides.map((guide) => {
            const armed = controls.openArmed === guide.id;
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => controls.requestOpen(guide.id)}
                className="block text-left text-xs underline underline-offset-2"
                style={{ color: armed ? C.red : C.pen }}
              >
                {armed ? `Open ${guide.title} and end session` : `Open your guide · ${guide.title}`}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
