import { useEffect, useMemo, useState } from "react";
import { Hammer, Plus, X } from "lucide-react";
import { Button, C, Card, SERIF } from "../theme.jsx";
import { getPref, setPref } from "../db/db.js";
import { JOURNAL_PROMPT_CATEGORIES } from "../lib/journalPrompts.js";
import {
  TALLER_TEMAS_PREF,
  cleanTemas,
  drawDrillPrompt,
  drawTema,
  proposeTallerSkill,
  sampleOfferedWords,
} from "../lib/taller.js";

/**
 * The Taller door's proposal panel (docs/DIARIO-TALLER-DIRECTION.md): one proposed skill with
 * the full category list one tap away, plus the owner-edited tema list — kept inside Taller so
 * the feature stays self-contained. Everything but the tema preference is visit-local; the
 * drill itself starts through `onStart({ drill })` and the door never shows counts or pressure.
 */
export default function TallerPanel({ items = [], events = [], today, onStart, onClose, random = Math.random }) {
  const proposed = useMemo(() => proposeTallerSkill(events, today), [events, today]);
  const [skill, setSkill] = useState(proposed);
  const [choosing, setChoosing] = useState(false);
  const [temas, setTemas] = useState([]);
  const [managingTemas, setManagingTemas] = useState(false);
  const [temaDraft, setTemaDraft] = useState("");
  const skillLabel = JOURNAL_PROMPT_CATEGORIES.find((category) => category.id === skill)?.label || skill;

  useEffect(() => {
    let live = true;
    getPref(TALLER_TEMAS_PREF, []).then((stored) => {
      if (live) setTemas(cleanTemas(stored));
    });
    return () => {
      live = false;
    };
  }, []);

  async function saveTemas(next) {
    const cleaned = cleanTemas(next);
    setTemas(cleaned);
    await setPref(TALLER_TEMAS_PREF, cleaned);
  }

  function addTema() {
    const tema = temaDraft.trim();
    if (!tema) return;
    setTemaDraft("");
    saveTemas([...temas, tema]);
  }

  function startDrill() {
    const prompt = drawDrillPrompt(skill, { events, items, random });
    if (!prompt) return;
    const offeredWords = prompt.offersWords
      ? sampleOfferedWords(items, events, { random }).map((item) => ({ id: item.id, term: item.term }))
      : [];
    onStart({ drill: { skill, prompt, offeredWords, tema: drawTema(temas, { random }), temas } });
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Taller"
          className="inline-flex min-h-11 min-w-11 items-center justify-center"
        >
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

      <section aria-label="Mis temas" className="mt-3">
        <button
          type="button"
          onClick={() => setManagingTemas((open) => !open)}
          aria-expanded={managingTemas}
          className="inline-flex min-h-11 items-center gap-1 text-xs"
          style={{ color: C.pen }}
        >
          Mis temas{temas.length > 0 ? ` (${temas.length})` : ""}
        </button>
        {managingTemas && (
          <div className="mt-1">
            <div className="text-xs" style={{ color: C.mut }}>
              Intereses que un ejercicio puede proponer. Solo una sugerencia — nada los comprueba.
            </div>
            {temas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {temas.map((tema) => (
                  <span
                    key={tema}
                    className="inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-0.5 text-xs"
                    style={{ background: C.paper, borderColor: C.chipBorder, color: C.ink }}
                  >
                    {tema}
                    <button
                      type="button"
                      onClick={() => saveTemas(temas.filter((existing) => existing !== tema))}
                      aria-label={`Remove tema ${tema}`}
                      className="p-1.5"
                    >
                      <X size={12} style={{ color: C.mut }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                aria-label="New tema"
                value={temaDraft}
                onChange={(event) => setTemaDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTema();
                  }
                }}
                placeholder="escalada, cocina, mi perro…"
                className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              />
              <Button tone="quiet" onClick={addTema} aria-label="Add tema" disabled={!temaDraft.trim()}>
                <Plus size={15} />
              </Button>
            </div>
          </div>
        )}
      </section>

      <Button className="mt-3 w-full" onClick={startDrill}>
        <Hammer size={14} /> Empezar
      </Button>
    </Card>
  );
}
