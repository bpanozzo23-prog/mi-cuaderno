import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { C } from "../theme.jsx";
import { suggestTags } from "../lib/tags.js";
import { tagChipStyle } from "../lib/tagColors.js";
import { useTagColors } from "./TagChip.jsx";

/**
 * Tagging, with the vocabulary already in use visible while you type.
 *
 * One control used everywhere tags are entered — the detail screen and the add sheet — because
 * the friction it fixes (duplicate near-identical tags) is not fixed by solving it in only one
 * of them. It also retires the add sheet's comma-separated text field, which was a second,
 * unforgiving way to do the same job.
 *
 * Suggestions are derived at render from the notebook already in memory (§7): nothing is
 * stored, and a tag becomes suggestible the moment it is used anywhere.
 */

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

export default function TagInput({ tags = [], allTags = [], onChange, placeholder = "new tag" }) {
  const [draft, setDraft] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  // The editor wears the same colours as every other surface, so a tag never looks like two
  // different things depending on where you meet it.
  const tagColors = useTagColors();

  const suggestions = useMemo(
    () => suggestTags(allTags, draft, { exclude: tags }),
    [allTags, draft, tags]
  );
  const isTyping = Boolean(draft.trim());
  const showSuggestions = isTyping || suggestionsOpen;

  function add(tag) {
    const clean = String(tag).trim();
    // Case and accents are compared loosely when SUGGESTING, but what gets stored is exactly
    // what the owner typed or tapped. Rewriting their spelling is not this control's job.
    if (!clean || tags.includes(clean)) {
      setDraft("");
      setSuggestionsOpen(false);
      return;
    }
    onChange([...tags, clean]);
    setDraft("");
    setSuggestionsOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs"
            style={tagChipStyle(tag, tagColors)}
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="opacity-70"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder={placeholder}
            className="text-xs px-2 py-1 rounded-full border outline-none w-24"
            style={inputStyle}
          />
          <button
            onClick={() => add(draft)}
            className="text-xs px-2 py-1 rounded-full text-white"
            style={{ background: C.pen }}
          >
            Add
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          {isTyping ? (
            <span className="flex-none text-[11px]" style={{ color: C.mut }}>
              already used:
            </span>
          ) : (
            <button
              type="button"
              aria-expanded={suggestionsOpen}
              onClick={() => setSuggestionsOpen((open) => !open)}
              className="flex flex-none items-center gap-0.5 text-[11px]"
              style={{ color: C.mut }}
            >
              used before ({suggestions.length})
              <ChevronDown
                aria-hidden="true"
                size={13}
                className={`transition-transform ${suggestionsOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}

          {showSuggestions && (
            <div
              role="group"
              aria-label="Previously used tag suggestions"
              className="flex min-w-0 flex-1 flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => add(tag)}
                  className="flex-none whitespace-nowrap rounded-full border px-2 py-0.5 text-xs"
                  style={{ background: C.paper, color: C.mut, borderColor: C.line }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
