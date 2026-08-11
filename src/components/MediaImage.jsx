import { useEffect, useState } from "react";

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|svg)$/i;

/** True when a media-link URL is worth attempting as an inline preview. */
export function isDirectImageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && IMAGE_EXTENSION.test(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * An https-only inline image that degrades to `fallback` instead of a broken glyph. Tapping the
 * image opens the source in a new tab; `no-referrer` keeps the page we came from private and
 * dodges most hotlink checks.
 */
export default function MediaImage({ src, alt = "", caption = true, fallback = null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const httpsSrc = typeof src === "string" && /^https:\/\//i.test(src) ? src : null;
  if (!httpsSrc || failed) return fallback;

  return (
    <a href={httpsSrc} target="_blank" rel="noreferrer" className="media-image">
      <img
        src={httpsSrc}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {caption && alt && <span className="media-image__caption">{alt}</span>}
    </a>
  );
}
