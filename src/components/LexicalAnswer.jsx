import { BookOpen } from "lucide-react";
import { C, SERIF, MONO } from "../theme.jsx";
import { meaningLabels } from "../lib/meanings.js";

/**
 * One personal meaning row. Exported for the reverse card face (Phase 10a), which shows
 * the same rows as its question side but with the Spanish usage cue withheld — the cue
 * routinely contains the very term being asked for.
 */
export function MeaningRow({ meaning, index, showCue = true }) {
  return (
    <div className="text-left rounded-lg px-2 py-1.5" style={{ background: C.paper }}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>{index + 1}</span>
        <span className="text-lg" style={{ fontFamily: SERIF, color: C.ink }}>{meaning.gloss}</span>
      </div>
      {showCue && meaning.usageCue && <div className="text-sm ml-5" style={{ color: C.mut }}>{meaning.usageCue}</div>}
      {meaningLabels(meaning).length > 0 && (
        <div className="flex flex-wrap gap-1 ml-5 mt-1">
          {meaningLabels(meaning).map((label) => (
            <span key={label} className="text-[11px] rounded-full px-1.5 py-0.5" style={{ background: C.penPale, color: C.penDark }}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The shared answer side for scheduled Repaso and session-only free practice. */
export default function LexicalAnswer({ item, showContext, onToggleContext, onOpen }) {
  const hasMeaningContext = item.meanings?.some(
    (meaning) => meaning.note || meaning.examples?.length
  );

  return (
    <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: C.line }}>
      {/* One lexical entry is one card, so every personal meaning is revealed together. */}
      <div className="space-y-2">
        {item.meanings?.length ? item.meanings.map((meaning, meaningIndex) => (
          <MeaningRow key={meaning.id} meaning={meaning} index={meaningIndex} />
        )) : (
          <span className="text-sm italic" style={{ color: C.mut }}>
            No meaning written down for this one yet.
          </span>
        )}
      </div>

      {hasMeaningContext && (
        <button
          type="button"
          onClick={onToggleContext}
          className="text-xs underline underline-offset-2"
          style={{ color: C.pen }}
        >
          {showContext ? "Hide meaning context" : "Show meaning notes and examples"}
        </button>
      )}

      {showContext && item.meanings?.map((meaning) =>
        meaning.note || meaning.examples?.length ? (
          <div key={meaning.id} className="text-sm rounded-lg p-2" style={{ background: C.paper }}>
            <div className="text-xs font-semibold" style={{ color: C.mut }}>{meaning.gloss}</div>
            {meaning.note && <div className="whitespace-pre-wrap mt-1">{meaning.note}</div>}
            {meaning.examples?.map((example, exampleIndex) => (
              <div key={exampleIndex} className="mt-1.5">
                <div style={{ fontFamily: SERIF }}>{example.es}</div>
                {example.en && <div className="text-xs" style={{ color: C.mut }}>{example.en}</div>}
              </div>
            ))}
          </div>
        ) : null
      )}

      {item.notes && (
        <div className="text-sm whitespace-pre-wrap" style={{ color: C.mut }}>
          {item.notes}
        </div>
      )}

      {item.myExamples?.slice(0, 2).map((example, index) => (
        <div key={index} className="text-sm">
          <div style={{ fontFamily: SERIF, color: C.ink }}>{example.es}</div>
          {example.en && <div className="text-xs mt-0.5" style={{ color: C.mut }}>{example.en}</div>}
        </div>
      ))}

      {onOpen && (
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="text-xs inline-flex items-center gap-1 underline underline-offset-2"
          style={{ color: C.pen }}
        >
          <BookOpen size={12} /> Open the full entry
        </button>
      )}
    </div>
  );
}
