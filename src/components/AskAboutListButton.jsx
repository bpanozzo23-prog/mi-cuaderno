import { MessageCircleQuestion } from "lucide-react";
import { C, MONO } from "../theme.jsx";
import { MAX_GROUP_ENTRIES } from "../lib/askGroups.js";

/**
 * "Ask Claude about these N": attaches a narrowed list of words and phrases to the next Pregunta
 * question as one group. Shown by Words & phrases and Cuaderno only while a filter, tag, form or
 * search narrows the list; sort order alone does not.
 */
export default function AskAboutListButton({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium"
      style={{ background: C.card, borderColor: C.line, color: C.mut }}
    >
      <MessageCircleQuestion size={15} className="shrink-0" />
      <span>Ask Claude about these {count}</span>
      {count > MAX_GROUP_ENTRIES && (
        <span className="ml-auto shrink-0 text-xs" style={{ fontFamily: MONO }}>
          up to {MAX_GROUP_ENTRIES} sent
        </span>
      )}
    </button>
  );
}
