import { createContext, useContext } from "react";
import { tagChipStyle } from "../lib/tagColors.js";

/**
 * One tag, wherever it appears.
 *
 * The colour map arrives through context rather than props because tags are rendered five levels
 * down in five unrelated places; threading a preference through every card and sheet in between
 * would be noise. A component rendered without the provider — every test that does not care about
 * colour — gets the Plain swatch, which is exactly how tags looked before this existed.
 */
const TagColorContext = createContext(null);

export function TagColorProvider({ colors, children }) {
  return <TagColorContext.Provider value={colors || null}>{children}</TagColorContext.Provider>;
}

export function useTagColors() {
  return useContext(TagColorContext) || {};
}

export default function TagChip({ tag, className = "" }) {
  const colors = useTagColors();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${className}`}
      style={tagChipStyle(tag, colors)}
    >
      {tag}
    </span>
  );
}
