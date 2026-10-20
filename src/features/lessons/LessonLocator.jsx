import { useId } from "react";
import outline from "./assets/mexico-outline.json";
import { locatorPlaces } from "./locatorMexico1917.js";

// Natural Earth v5.1.1, 1:110m. See the chapter SOURCES.md for the exact geometry,
// landmark coordinates and derivation. This is cartography, not the generated mockup.
const PARALLEL = Math.cos(19 * Math.PI / 180);
const REGION = { west: -105, north: 21.7, scale: 500 / (9.5 * PARALLEL) };
const COUNTRY = { west: -118.5, north: 33.5, scale: 114 / (32.5 * PARALLEL) };
const LABELS = {
  "queretaro": { x: 224, y: 58, anchor: "end" },
  "mexico-city": { x: 295, y: 134, anchor: "end" },
  "anenecuilco": { x: 336, y: 184 },
};

// Equidistant cylindrical projection, standard parallel 19° N, shared by outline
// and markers. The regional viewport clips the same outline used in the inset.
function project(lon, lat, frame) {
  return [(lon - frame.west) * PARALLEL * frame.scale, (frame.north - lat) * frame.scale];
}
function path(frame) {
  return outline.coordinates.map((ring) => ring.map(([lon, lat], index) => {
    const [x, y] = project(lon, lat, frame);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + "Z").join(" ");
}
const REGION_PATH = path(REGION);
const COUNTRY_PATH = path(COUNTRY);
const [areaX, areaY] = project(REGION.west, REGION.north, COUNTRY);
const areaWidth = 500 * COUNTRY.scale / REGION.scale;
const areaHeight = 310 * COUNTRY.scale / REGION.scale;

export default function LessonLocator({ card }) {
  const id = useId();
  return (
    <figure className="lesson-locator" aria-labelledby={`${id}-title`}>
      <p id={`${id}-title`} className="lesson-label">{card.title}</p>
      <svg viewBox="0 0 500 310" width="500" height="310" role="img"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
        <defs>
          <clipPath id={`${id}-clip`}><rect width="500" height="310" rx="12" /></clipPath>
          <linearGradient id={`${id}-land`} x1="0" y1="0" x2="0" y2="1">
            <stop className="lesson-map-land-light" offset="0" />
            <stop className="lesson-map-land-warm" offset="1" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-clip)`}>
          <rect className="lesson-map-water" width="500" height="310" />
          <path className="lesson-map-land" fill={`url(#${id}-land)`} d={REGION_PATH} />
          <text className="lesson-map-sea" x="48" y="280">Océano Pacífico</text>
          {locatorPlaces.map((place) => {
            const [x, y] = project(place.lon, place.lat, REGION);
            const label = LABELS[place.id];
            return <g key={place.id} className={`lesson-map-place${place.id === "queretaro" ? " lesson-map-place--opening" : ""}`} data-place={place.id}>
              <line className="lesson-map-leader" x1={x} y1={y} x2={label.x + (label.anchor === "end" ? 6 : -6)} y2={label.y - 6} />
              <circle cx={x} cy={y} r={place.id === "queretaro" ? 8 : 6} />
              <text x={label.x} y={label.y} textAnchor={label.anchor || "start"}>
                {place.name.split(/\s(?=\()/).map((part, line) => <tspan key={part} x={label.x} dy={line ? 21 : 0}>{part}</tspan>)}
              </text>
            </g>;
          })}
          <g className="lesson-map-inset" transform="translate(344 12)">
            <rect width="144" height="112" rx="8" />
            <g transform="translate(10 7) scale(1.08)">
              <path d={COUNTRY_PATH} />
              <rect className="lesson-map-extent" x={areaX} y={areaY} width={areaWidth} height={areaHeight} />
            </g>
            <text x="72" y="102" textAnchor="middle">México</text>
          </g>
          <text className="lesson-map-north" x="24" y="32">N</text>
          <line className="lesson-map-north-line" x1="31" y1="65" x2="31" y2="40" />
          <path className="lesson-map-north-line" d="M26 47 L31 40 L36 47" fill="none" />
        </g>
      </svg>
      <p id={`${id}-description`} className="lesson-map-description">
        {card.lines.join(" · ")}. {card.description}
      </p>
      <figcaption>{card.note}<span className="lesson-map-credit">Natural Earth · INEGI · SIC</span></figcaption>
    </figure>
  );
}
