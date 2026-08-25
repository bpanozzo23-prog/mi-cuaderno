import { C, MONO } from "../theme.jsx";
import { CONTRAST_GUIDE_TERMS } from "../lib/contrastContent.js";
import { grammarGuidesForTerms } from "../lib/recognitionGuides.js";

/**
 * What a Contrasts card shows after it is answered: the English gloss (never before, so the
 * question cannot leak the rule), any legitimately acceptable alternative, and up to two of
 * the owner's own Grammar guides matched on multi-word terms only.
 */
export default function ContrastReveal({ card, items = [], controls = null }) {
  const guides = grammarGuidesForTerms(items, CONTRAST_GUIDE_TERMS[card.pair]);
  return (
    <div className="mt-3 space-y-3">
      <div className="text-sm" style={{ color: C.mut }}>
        {card.prompt.replace("___", card.answer)}
        <span className="mx-1.5" aria-hidden="true">·</span>
        <span style={{ fontStyle: "italic" }}>{card.gloss}</span>
      </div>
      {card.alsoAcceptable?.length > 0 && (
        <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: C.chipBorder, background: C.penPale, color: C.penDark }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
            Also natural
          </div>
          <div className="mt-0.5">
            «{card.alsoAcceptable.join("» or «")}» can also be natural here, so it was not offered as a distractor.
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
