import { C, MONO, SERIF } from "../theme.jsx";
import { GYM_SLOTS } from "../lib/conjugationGym.js";

export function endingsRevealData(card, library) {
  const lemma = card.exampleLemma || "hablar";
  const verb = [...(library?.saved || []), ...(library?.core || [])]
    .find((candidate) => candidate.lemma === lemma);
  const row = verb?.conjugation?.tenses?.[card.answer];
  const forms = row ? GYM_SLOTS.map((slot) => ({ slot, form: row[slot] })).filter((cell) => cell.form) : [];
  if (forms.length === GYM_SLOTS.length) return { kind: "dictionary", lemma, forms };
  return { kind: "pattern", lemma, forms: [] };
}

export default function EndingsReveal({ card, library }) {
  const reveal = endingsRevealData(card, library);
  return (
    <div className="mt-4 rounded-xl border px-3 py-3" style={{ borderColor: C.line, background: C.paper }}>
      {reveal.kind === "dictionary" ? (
        <>
          <div className="text-center text-sm" style={{ color: C.mut }}>
            A real verb wearing the pattern
          </div>
          <div className="mt-1 text-center text-xl" lang="es" style={{ fontFamily: SERIF, fontWeight: 700, color: C.penDark }}>
            {reveal.lemma}
          </div>
          <div className="mt-3 grid gap-1.5">
            {reveal.forms.map(({ slot, form }) => (
              <div key={slot} className="flex items-baseline justify-between gap-3 text-sm">
                <span style={{ fontFamily: MONO, color: C.mut }}>{slot}</span>
                <span lang="es" className="text-right font-semibold" style={{ fontFamily: SERIF, color: C.ink }}>{form}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
            Pattern
          </div>
          <div className="mt-1 text-sm" style={{ color: C.ink }}>{card.prompt}</div>
          <div className="mt-1 text-xs" style={{ color: C.mut }}>
            Install the offline dictionary to see this on a real verb.
          </div>
        </>
      )}
    </div>
  );
}
