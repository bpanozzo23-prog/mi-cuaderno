import { NotebookPen } from "lucide-react";
import { C } from "../theme.jsx";

/**
 * A saved personal example can seed an ordinary phrase draft. The action stays separate from
 * example editing: it never moves or rewrites the example, and the AddSheet remains the explicit
 * creation boundary.
 */
export default function ExamplePhraseAction({ example, onAddPhraseFromExample, menu = false }) {
  const spanish = String(example?.es || "");
  if (!spanish.trim() || !onAddPhraseFromExample) return null;

  return (
    <button
      type="button"
      aria-label={`Add “${spanish.trim()}” as a phrase`}
      onClick={() => onAddPhraseFromExample(example)}
      className={`inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium ${menu ? "w-full justify-start gap-2" : ""}`}
      style={{ color: C.pen }}
    >
      {menu && <NotebookPen size={14} />}
      Add as phrase…
    </button>
  );
}
