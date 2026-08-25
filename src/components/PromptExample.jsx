import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { C, SERIF } from "../theme.jsx";

/**
 * Hidden-by-default peek at a skill prompt's Spanish-only model answer.
 * Renders nothing for prompts without an `example`; the example is transient
 * drill furniture — display only, never stored on the page or inserted into it.
 */
export default function PromptExample({ prompt }) {
  const [open, setOpen] = useState(false);
  if (!prompt?.example) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs"
        style={{ color: C.pen }}
      >
        <ChevronDown size={13} /> Ejemplo
      </button>
      {open && (
        <div className="text-sm" style={{ color: C.ink, fontFamily: SERIF }}>{prompt.example}</div>
      )}
    </div>
  );
}
