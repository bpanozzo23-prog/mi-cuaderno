import { useEffect, useState } from "react";

/**
 * An https-only inline image that degrades to `fallback` instead of a broken glyph.
 * `no-referrer` keeps the page we came from private and dodges most hotlink checks.
 * With `link` (the default), tapping the image opens the source in a new tab; card fronts
 * pass `link={false}` so a mid-session tap cannot leave the study flow.
 */
export default function MediaImage({ src, alt = "", caption = true, link = true, fallback = null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const httpsSrc = typeof src === "string" && /^https:\/\//i.test(src) ? src : null;
  if (!httpsSrc || failed) return fallback;

  const figure = (
    <>
      <img
        src={httpsSrc}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {caption && alt && <span className="media-image__caption">{alt}</span>}
    </>
  );

  if (!link) return <span className="media-image">{figure}</span>;
  return (
    <a href={httpsSrc} target="_blank" rel="noreferrer" className="media-image">
      {figure}
    </a>
  );
}
