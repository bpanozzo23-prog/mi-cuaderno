import { C } from "../theme.jsx";

/**
 * A saved personal example can seed an ordinary phrase draft. The action stays separate from
 * example editing: it never moves or rewrites the example, and the AddSheet remains the explicit
 * creation boundary.
 */
export default function ExamplePhraseAction({ example, onAddPhraseFromExample }) {
  const spanish = String(example?.es || "");
  if (!spanish.trim() || !onAddPhraseFromExample) return null;

  return (
    <button
      type="button"
      aria-label={`Add “${spanish.trim()}” as a phrase`}
      onClick={() => onAddPhraseFromExample(example)}
      className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-medium"
      style={{ color: C.pen }}
    >
      Add as phrase…
    </button>
  );
}
