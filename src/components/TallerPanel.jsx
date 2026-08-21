import { useMemo, useState } from "react";
import { Hammer, X } from "lucide-react";
import { Button, C, Card, SERIF } from "../theme.jsx";
import { JOURNAL_PROMPT_CATEGORIES } from "../lib/journalPrompts.js";
import { drawDrillPrompt, proposeTallerSkill, sampleOfferedWords } from "../lib/taller.js";

/**
 * The Taller door's proposal panel (docs/DIARIO-TALLER-DIRECTION.md): one proposed skill with
 * the full category list one tap away. Everything here is visit-local; the drill itself starts
 * through `onStart({ drill })` and the door never shows counts, suggestions or pressure.
 */
export default function TallerPanel({ items = [], events = [], onStart, onClose, random = Math.random }) {
  const proposed = useMemo(() => proposeTallerSkill(events), [events]);
  const [skill, setSkill] = useState(proposed);
  const [choosing, setChoosing] = useState(false);
  const skillLabel = JOURNAL_PROMPT_CATEGORIES.find((category) => category.id === skill)?.label || skill;

  function startDrill() {
    const prompt = drawDrillPrompt(skill, { events, items, random });
    if (!prompt) return;
    const offeredWords = prompt.offersWords
      ? sampleOfferedWords(items, events, { random }).map((item) => ({ id: item.id, term: item.term }))
      : [];
    onStart({ drill: { skill, prompt, offeredWords } });
  }

  return (
    <Card className="mt-3 p-3" style={{ borderColor: C.chipBorder }}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            <Hammer size={15} style={{ color: C.diario }} /> Taller
          </div>
          <div className="text-xs" style={{ color: C.mut }}>
            Una práctica corta. Tú decides si se guarda.
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Taller" className="p-2">
          <X size={16} style={{ color: C.mut }} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border p-3" style={{ background: C.paper, borderColor: C.line }}>
        <div>
          <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Hoy</div>
          <div className="text-base font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>{skillLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setChoosing((open) => !open)}
          aria-expanded={choosing}
          className="min-h-11 px-2 text-sm"
          style={{ color: C.pen }}
        >
          Cambiar
        </button>
      </div>

      {choosing && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" aria-label="All skill categories">
          {JOURNAL_PROMPT_CATEGORIES.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => {
                setSkill(option.id);
                setChoosing(false);
              }}
              aria-pressed={skill === option.id}
              className="shrink-0 rounded-full border px-2.5 py-1 text-xs"
              style={skill === option.id
                ? { background: C.pen, borderColor: C.pen, color: C.onAccent }
                : { background: C.penPale, borderColor: C.chipBorder, color: C.penDark }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <Button className="mt-3 w-full" onClick={startDrill}>
        <Hammer size={14} /> Empezar
      </Button>
    </Card>
  );
}
