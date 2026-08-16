import { ChevronDown, ChevronUp, ExternalLink, Eye } from "lucide-react";
import { C, SERIF, MONO, Card, Button } from "../theme.jsx";
import { personalHeadingSuffix } from "./ItemCard.jsx";
import { markdownPreviewText } from "../lib/noteMarkdown.js";

const firstNonblank = (...values) => values.find((value) => String(value || "").trim()) || "";

function meaningLabels(meaning) {
  return [
    ...(meaning.regions || []),
    ...(meaning.usageLabels || []),
    ...(meaning.posOverride ? [meaning.posOverride] : []),
    ...(meaning.verbBehavior || []),
  ];
}

function firstExample(item) {
  for (const meaning of item.meanings || []) {
    if (meaning.examples?.length) return meaning.examples[0];
  }
  return item.myExamples?.[0] || null;
}

function MeaningAnswer({ meaning }) {
  const labels = meaningLabels(meaning);
  return (
    <div className="pt-2 first:pt-0">
      <div className="text-sm whitespace-pre-wrap break-words" style={{ color: C.ink }}>
        {meaning.gloss}
      </div>
      {meaning.usageCue && (
        <div className="mt-0.5 text-xs italic whitespace-pre-wrap break-words" style={{ color: C.mut }}>
          {meaning.usageCue}
        </div>
      )}
      {labels.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {labels.map((label) => (
            <span
              key={label}
              className="rounded-full border px-1.5 py-0.5 text-[10px]"
              style={{ borderColor: C.line, color: C.mut, fontFamily: MONO }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A compact, independently expandable personal-vocabulary card for Collection pages.
 * It deliberately renders copied personal data only; dictionary senses remain on the
 * dictionary detail screen and can disappear without making this card meaningless.
 */
export default function CollectionVocabularyCard({
  item,
  expanded = false,
  onToggle,
  onOpen,
  practice = false,
  revealed = false,
  onReveal,
}) {
  const meanings = item.meanings || [];
  const first = meanings[0] || null;
  const suffix = personalHeadingSuffix(item);
  const previewLabels = first ? meaningLabels(first) : [];

  if (practice) {
    return (
      <Card className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg break-words" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
              {item.term}
            </div>
            {suffix && <div className="text-xs italic" style={{ color: C.mut }}>{suffix}</div>}
          </div>
          {meanings.length > 0 && !revealed && (
            <Button tone="quiet" className="shrink-0" onClick={onReveal}>
              <Eye size={14} /> Reveal
            </Button>
          )}
        </div>

        {meanings.length === 0 ? (
          <div aria-disabled="true" className="mt-3 text-xs italic" style={{ color: C.mut }}>
            Add a meaning before practicing this entry.
          </div>
        ) : revealed ? (
          <div className="mt-3 border-t pt-3" style={{ borderColor: C.line }}>
            {meanings.map((meaning) => <MeaningAnswer key={meaning.id} meaning={meaning} />)}
          </div>
        ) : null}
      </Card>
    );
  }

  const example = firstExample(item);
  const meaningNote = firstNonblank(...meanings.map((meaning) => meaning.note));
  const note = meaningNote || firstNonblank(item.notes);

  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full p-3 text-left flex items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="break-words" style={{ fontFamily: SERIF, color: C.ink, fontWeight: 700 }}>
            {item.term}
            {suffix && <span className="ml-2 text-xs italic font-normal" style={{ color: C.mut }}>{suffix}</span>}
          </div>
          {first ? (
            <>
              <div className="mt-1 text-sm whitespace-pre-wrap break-words" style={{ color: C.ink }}>
                {first.gloss}
                {meanings.length > 1 && (
                  <span className="ml-1 text-xs" style={{ color: C.mut }}>+{meanings.length - 1} meanings</span>
                )}
              </div>
              {first.usageCue && <div className="text-xs italic truncate" style={{ color: C.mut }}>{first.usageCue}</div>}
              {previewLabels.length > 0 && (
                <div className="mt-1 text-[10px] truncate" style={{ color: C.mut, fontFamily: MONO }}>
                  {previewLabels.join(" · ")}
                </div>
              )}
            </>
          ) : (
            <div className="mt-1 text-xs italic" style={{ color: C.mut }}>No meanings yet</div>
          )}
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: C.mut }} /> : <ChevronDown size={16} style={{ color: C.mut }} />}
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-3" style={{ borderColor: C.line }}>
          {meanings.length > 0 ? (
            <div className="divide-y" style={{ borderColor: C.line }}>
              {meanings.map((meaning) => <MeaningAnswer key={meaning.id} meaning={meaning} />)}
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: C.mut }}>This entry does not have a personal meaning yet.</div>
          )}

          {example && (
            <div className="mt-3 rounded-lg p-2 text-sm" style={{ background: C.paper }}>
              <div style={{ fontFamily: SERIF, color: C.ink }}>{example.es}</div>
              {example.en && <div className="mt-0.5 text-xs" style={{ color: C.mut }}>{example.en}</div>}
            </div>
          )}

          {note && (
            <div className="mt-3 text-xs whitespace-pre-wrap break-words line-clamp-2" style={{ color: C.mut }}>
              {markdownPreviewText(note, { noteCallouts: !meaningNote })}
            </div>
          )}

          <Button tone="quiet" className="mt-3" onClick={() => onOpen(item.id)}>
            <ExternalLink size={14} /> Open full entry
          </Button>
        </div>
      )}
    </Card>
  );
}
