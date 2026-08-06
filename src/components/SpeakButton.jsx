import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { C } from "../theme.jsx";
import { onSpanishVoice, speakSpanish } from "../lib/speech.js";

/**
 * Reads a piece of Spanish aloud (Phase 10d).
 *
 * Renders nothing at all when the device has no Spanish voice. A disabled control would
 * be a promise the browser cannot keep, and this is an enhancement — the notebook works
 * exactly as before without it.
 */
export default function SpeakButton({ text, label, className = "", size = 14 }) {
  const [voice, setVoice] = useState(undefined);

  useEffect(() => onSpanishVoice(setVoice), []);

  const said = String(text || "").trim();
  // undefined is "still looking"; null is "this device has none".
  if (!said || voice === undefined || voice === null) return null;

  return (
    <button
      type="button"
      aria-label={label || `Play ${said}`}
      onClick={(event) => {
        // Detail rows and cards are often clickable themselves; hearing a word should
        // never also navigate away from it.
        event.stopPropagation();
        speakSpanish(said, voice);
      }}
      className={`inline-flex items-center justify-center shrink-0 min-h-11 min-w-11 ${className}`}
      style={{ color: C.mut }}
    >
      <Volume2 size={size} />
    </button>
  );
}
