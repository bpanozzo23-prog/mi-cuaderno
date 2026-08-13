import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { C, SERIF } from "../theme.jsx";

/** Shared Phase 21 family rows; callers provide only their surface-specific navigation. */
export default function ConjugationFamilyRows({
  family,
  onOpenSibling,
  onOpenDictionary,
}) {
  if (!family?.entry) return null;
  return (
    <div className="space-y-1.5">
      {(family.siblings || []).map((sibling) => (
        <button
          type="button"
          key={sibling.id}
          onClick={() => onOpenSibling(sibling.id)}
          className="min-h-11 w-full rounded-xl border px-3 py-2 text-left"
          style={{ background: C.card, borderColor: C.line }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="shrink-0" style={{ color: C.pen }} />
            <span
              className="min-w-0 flex-1 break-words text-sm font-semibold"
              style={{ color: C.ink, fontFamily: SERIF }}
            >
              {sibling.term}
            </span>
            <ArrowRight size={15} className="shrink-0" style={{ color: C.mut }} />
          </div>
          <div className="mt-0.5 pl-[23px] text-xs" style={{ color: C.mut }}>
            Saved in your cuaderno
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onOpenDictionary(family.entry.id)}
        className="min-h-11 w-full rounded-xl border px-3 py-2 text-left"
        style={{ background: C.penPale, borderColor: C.chipBorder }}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold" style={{ color: C.penDark }}>What to notice</div>
            <div className="mt-0.5 text-xs" style={{ color: C.mut }}>
              Open the dictionary teaching view
            </div>
          </div>
          <ExternalLink
            size={15}
            className="shrink-0"
            style={{ color: C.pen }}
            aria-label="Dictionary exit"
          />
        </div>
      </button>
    </div>
  );
}
