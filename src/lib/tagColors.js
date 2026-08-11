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

/*
 * The talavera set (owner-picked 2026-08-10): the desert-theme retune of the original eight ids —
 * denim blue, cactus green, chile red, cempasúchil amber, bougainvillea plum, talavera teal,
 * driftwood slate — plus three browns. Ids are the stored identity and never change; only the
 * values moved, so every previously picked tag colour follows automatically. The browns separate
 * by character, not hue alone: amber is yellow, clay saturated orange, leather a desaturated
 * saddle tan, and espresso a near-black coffee ink whose milky background carries the warmth.
 */
export const TAG_SWATCHES = [
  { id: "plain", label: "Plain", background: "transparent", color: "#8B8578", border: "#E3DFD2" },
  { id: "blue", label: "Blue", background: "#E3EBFA", color: "#2D4EA0", border: "#C7D5F0" },
  { id: "green", label: "Green", background: "#E4F0D9", color: "#44682C", border: "#CBDFB4" },
  { id: "red", label: "Red", background: "#F9E3DC", color: "#A2301F", border: "#F0C9BC" },
  { id: "amber", label: "Amber", background: "#FBEBC4", color: "#8A5E06", border: "#F1D98F" },
  { id: "plum", label: "Plum", background: "#F7E5EE", color: "#8A3D64", border: "#EDCBDC" },
  { id: "teal", label: "Teal", background: "#DCF0ED", color: "#1F6E68", border: "#B9E1DB" },
  { id: "slate", label: "Slate", background: "#EFEDE6", color: "#66625A", border: "#DBD6C7" },
  { id: "clay", label: "Clay", background: "#F6E3D3", color: "#94502A", border: "#EDD0B8" },
  { id: "leather", label: "Leather", background: "#F1E8D6", color: "#7A5A38", border: "#E2D2B6" },
  { id: "espresso", label: "Espresso", background: "#EFE5DE", color: "#2C1B15", border: "#DECDC2" },
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

/**
 * Applies Phase 20's colour ownership rules without assigning through arbitrary object keys.
 * Rebuilding from entries keeps legal tag strings such as `__proto__` as ordinary own data.
 */
export function tagColorsAfterChange(colors, { kind, source, destination = null } = {}) {
  const entries = Object.entries(colors || {});
  if (kind === "noop") return Object.fromEntries(entries);

  if (kind === "remove") {
    return Object.fromEntries(entries.filter(([tag]) => tag !== source));
  }

  if ((kind !== "rename" && kind !== "merge") || !destination) {
    return Object.fromEntries(entries);
  }

  const survivingSwatch = kind === "rename"
    ? tagSwatchId(source, colors)
    : tagSwatchId(destination, colors);
  const nextEntries = entries.filter(([tag]) => tag !== source && tag !== destination);
  if (survivingSwatch !== DEFAULT_SWATCH.id) nextEntries.push([destination, survivingSwatch]);
  return Object.fromEntries(nextEntries);
}
