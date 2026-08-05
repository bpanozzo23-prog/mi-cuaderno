/**
 * Tag colours: a small fixed palette, chosen per tag by the owner and stored as one preference.
 *
 * Presets rather than a colour wheel. Every swatch pairs a pale background with a text tone dark
 * enough to read on the paper background, so no choice the owner can make produces an unreadable
 * chip or a card that stops looking like the rest of the notebook. The values live here rather than
 * in `theme.jsx` because they are content styling the owner controls, not app chrome.
 *
 * Stored in the existing `prefs` table, so the map rides along in backups and needs no schema
 * change (§5): `{ [tag]: swatchId }`. An unknown or missing id falls back to Plain, which is what
 * every tag looked like before this existed.
 */
export const TAG_COLORS_PREF = "tagColors";

export const TAG_SWATCHES = [
  { id: "plain", label: "Plain", background: "transparent", color: "#7A8199", border: "#E6E3D7" },
  { id: "blue", label: "Blue", background: "#EDF1FA", color: "#243F85", border: "#D9E1F2" },
  { id: "green", label: "Green", background: "#EAF2EA", color: "#3E6B44", border: "#D3E3D5" },
  { id: "red", label: "Red", background: "#F7E9E5", color: "#B3402E", border: "#EDD5CE" },
  { id: "amber", label: "Amber", background: "#FBF0DA", color: "#8A6516", border: "#EFDFBE" },
  { id: "plum", label: "Plum", background: "#F2EAF5", color: "#6B3F7A", border: "#E2D3E8" },
  { id: "teal", label: "Teal", background: "#E4F1F0", color: "#2F6360", border: "#CFE3E1" },
  { id: "slate", label: "Slate", background: "#ECEEF2", color: "#4A5468", border: "#DCE0E7" },
];

export const DEFAULT_SWATCH = TAG_SWATCHES[0];

export const swatchById = (id) => TAG_SWATCHES.find((swatch) => swatch.id === id) || DEFAULT_SWATCH;

/** The swatch id the owner picked for one tag, or Plain. */
export const tagSwatchId = (tag, colors = {}) => {
  const id = colors?.[tag];
  return TAG_SWATCHES.some((swatch) => swatch.id === id) ? id : DEFAULT_SWATCH.id;
};

/** Inline style for one tag chip. Every chip in the app goes through here. */
export const tagChipStyle = (tag, colors = {}) => {
  const swatch = swatchById(tagSwatchId(tag, colors));
  return { background: swatch.background, color: swatch.color, borderColor: swatch.border };
};

/**
 * Keeps the stored map honest: only known swatch ids survive, Plain is dropped because it is the
 * default, and tags the notebook no longer has stop taking up room in the preference.
 */
export function normalizeTagColors(colors, knownTags = null) {
  const known = knownTags ? new Set(knownTags) : null;
  const next = {};
  for (const [tag, id] of Object.entries(colors || {})) {
    if (known && !known.has(tag)) continue;
    if (!TAG_SWATCHES.some((swatch) => swatch.id === id)) continue;
    if (id === DEFAULT_SWATCH.id) continue;
    next[tag] = id;
  }
  return next;
}
