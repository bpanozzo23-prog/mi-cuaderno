import { useMemo, useState } from "react";
import { Shuffle, X } from "lucide-react";
import { Button, C, Card, SERIF } from "../theme.jsx";
import { JOURNAL_PROMPT_CATEGORIES, JOURNAL_PROMPTS } from "../lib/journalPrompts.js";

export default function PromptLibrary({ onSelect, onClose, random = Math.random }) {
  const [category, setCategory] = useState(JOURNAL_PROMPT_CATEGORIES[0].id);
  const visible = useMemo(
    () => JOURNAL_PROMPTS.filter((prompt) => prompt.category === category),
    [category]
  );

  return (
    <Card className="mt-3 p-3" style={{ borderColor: C.chipBorder }}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>A gentle place to begin</div>
          <div className="text-xs" style={{ color: C.mut }}>A prompt guides this visit only.</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close prompt library" className="p-2">
          <X size={16} style={{ color: C.mut }} />
        </button>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {JOURNAL_PROMPT_CATEGORIES.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => setCategory(option.id)}
            aria-pressed={category === option.id}
            className="shrink-0 rounded-full border px-2.5 py-1 text-xs"
            style={category === option.id
              ? { background: C.pen, borderColor: C.pen, color: "#fff" }
              : { background: C.penPale, borderColor: C.chipBorder, color: C.penDark }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        {visible.map((prompt) => (
          <button
            type="button"
            key={prompt.id}
            onClick={() => onSelect(prompt)}
            aria-label={`Use prompt: ${prompt.es}`}
            className="w-full rounded-lg border p-2.5 text-left active:opacity-80"
            style={{ background: C.paper, borderColor: C.line }}
          >
            <div className="text-sm" style={{ color: C.ink, fontFamily: SERIF }}>{prompt.es}</div>
            <div className="mt-0.5 text-xs" style={{ color: C.mut }}>{prompt.en}</div>
          </button>
        ))}
      </div>

      <Button
        tone="quiet"
        className="mt-3 w-full"
        onClick={() => onSelect(JOURNAL_PROMPTS[Math.floor(random() * JOURNAL_PROMPTS.length)])}
      >
        <Shuffle size={14} /> Surprise me
      </Button>
    </Card>
  );
}
