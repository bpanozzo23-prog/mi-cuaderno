import { C, MONO } from "../theme.jsx";
import { qualifiedTenseLabel } from "../lib/conjugation.js";

export default function UsageReveal({ card }) {
  if (!card.alsoAcceptable?.length) return null;
  return (
    <div className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: C.chipBorder, background: C.penPale, color: C.penDark }}>
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>
        Mexican Spanish note
      </div>
      <div className="mt-0.5">
        {card.alsoAcceptable.map(qualifiedTenseLabel).join(" or ")} can also be natural here, so it was not offered as a distractor.
      </div>
    </div>
  );
}
