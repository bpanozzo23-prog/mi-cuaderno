import { BookMarked } from "lucide-react";
import { C, SERIF, MONO } from "../theme.jsx";
import { PART_OF_SPEECH_ABBR, grammarAbbreviations } from "../lib/partOfSpeech.js";

export const POS_LABEL = PART_OF_SPEECH_ABBR;

/**
 * A dictionary result. Deliberately quieter than ItemCard — a slightly greyer border and
 * a small book mark — so that at a glance the owner can tell their own words from the
 * dictionary's without reading a label.
 */
export default function DictCard({ entry, reason, onOpen }) {
  const first = entry.senses[0];
  const region = first?.regionLabels?.[0];

  return (
    <button
      onClick={() => onOpen(entry.id)}
      className="w-full text-left rounded-xl border px-4 py-3 active:opacity-80"
      style={{ background: C.paper, borderColor: C.line, borderStyle: "dashed" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-lg min-w-0" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
          {entry.lemma}
          <span className="italic font-normal text-sm ml-2" style={{ color: C.mut }}>
            {grammarAbbreviations(entry.pos, entry.gender)}
          </span>
        </div>
        <BookMarked size={13} className="shrink-0 mt-1" style={{ color: C.mut }} />
      </div>

      {first && (
        <div className="text-sm mt-0.5" style={{ color: C.ink }}>
          {region && (
            <span
              className="text-xs px-1.5 py-0.5 rounded mr-1.5 align-middle"
              style={{ background: C.penPale, color: C.penDark }}
            >
              {region}
            </span>
          )}
          {first.gloss}
        </div>
      )}
      {entry.senses.length > 1 && (
        <div className="text-xs mt-0.5" style={{ color: C.mut }}>
          +{entry.senses.length - 1} more {entry.senses.length === 2 ? "meaning" : "meanings"}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2 text-xs italic" style={{ color: C.mut }}>
        <span>{reason}</span>
        {entry.freqRank && (
          <span className="ml-auto not-italic" style={{ fontFamily: MONO }}>
            #{entry.freqRank}
          </span>
        )}
      </div>
    </button>
  );
}
