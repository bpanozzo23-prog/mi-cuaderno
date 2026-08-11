const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|svg)$/i;

/** True when a media-link URL is worth attempting as an inline image. */
export function isDirectImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && IMAGE_EXTENSION.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** The item's picture for card fronts: its first direct-image media link, or null. */
export function firstImageLink(item) {
  return (item?.mediaLinks || []).find((media) => isDirectImageUrl(media?.url)) || null;
}
