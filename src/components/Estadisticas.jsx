import { useLayoutEffect, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { C, HEAT, SERIF, MONO, dotGrid, SectionTitle, Card } from "../theme.jsx";
import {
  activityByDay,
  streakFrom,
  heatmapWeeks,
  cumulativeWordsByWeek,
  HEATMAP_WEEKS,
} from "../lib/stats.js";

/**
 * The Phase 11 sub-view: a calendar of what the owner has actually done, and a line of how
 * the vocabulary has grown. Both are replays of the event log and the items table — nothing
 * here is stored, and deleting this screen would lose no data (brief section 7).
 *
 * It lives behind Repaso rather than beside it because these are the numbers worth looking at
 * occasionally, where the streak and the review ladder are worth seeing daily.
 */

/** Monday-first, the Spanish convention. Only alternate rows are labelled; seven would crowd. */
const WEEKDAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];
const LABELLED_ROWS = new Set([0, 2, 4]);

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const CELL = 14;
const GAP = 2;

const monthOf = (localDateStr) => Number(localDateStr.slice(5, 7)) - 1;

/** "2026-07-27" → "27 jul". A full ISO date is too wide to read at 9px on a phone. */
const shortDate = (localDateStr) =>
  `${Number(localDateStr.slice(8, 10))} ${MONTHS_ES[monthOf(localDateStr)]}`;

/**
 * The growth chart's drawing area inside its 320×140 viewBox. The left gutter holds the
 * vertical scale, and the top inset is headroom: a cumulative total never falls, so the last
 * point is always the highest one, and a label drawn above it needs somewhere to go.
 */
const PLOT = { left: 34, right: 310, top: 24, bottom: 112 };

/**
 * The growth line. Hand-authored SVG rather than a charting library: it is one path, and a
 * dependency would be larger than the chart.
 *
 * The default preserveAspectRatio is deliberate — `none` would stretch the label text along
 * with the geometry. At 375px the rendered width is close enough to the viewBox that the
 * scaling is invisible anyway.
 */
function GrowthChart({ series }) {
  const total = series.length ? series[series.length - 1].total : 0;
  const first = series.length ? series[0].total : 0;
  const max = Math.max(1, total);
  const span = PLOT.bottom - PLOT.top;

  const yFor = (value) => PLOT.bottom - (value / max) * span;
  const points = series.map((point, i) => ({
    ...point,
    // One point cannot span a width; park it at the left edge rather than dividing by zero.
    x: series.length === 1
      ? PLOT.left
      : PLOT.left + (i / (series.length - 1)) * (PLOT.right - PLOT.left),
    y: yFor(point.total),
  }));

  const last = points[points.length - 1];
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${last.x.toFixed(1)} ${PLOT.bottom} L${points[0].x.toFixed(1)} ${PLOT.bottom} Z`;

  return (
    <>
      <svg
        viewBox="0 0 320 140"
        className="w-full h-auto"
        role="img"
        aria-label={`Words in the cuaderno over time, now ${total}`}
      >
        {/* The scale, so the slope means something. The top rule sits at the current total —
            on a cumulative line those are the same number, which is why it can be labelled
            once, at the left, where nothing can clip it. */}
        <line
          x1={PLOT.left}
          y1={PLOT.top}
          x2={PLOT.right}
          y2={PLOT.top}
          stroke={C.line}
          strokeDasharray="3 3"
        />
        <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke={C.line} />
        <text x={PLOT.left - 6} y={PLOT.top + 3} textAnchor="end" fontFamily={MONO} fontSize="10" fill={C.ink}>
          {total}
        </text>
        <text x={PLOT.left - 6} y={PLOT.bottom + 3} textAnchor="end" fontFamily={MONO} fontSize="10" fill={C.mut}>
          0
        </text>

        <path d={area} fill={C.penPale} />
        <path d={line} fill="none" stroke={C.pen} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={last.x} cy={last.y} r="3" fill={C.pen} />

        <text x={PLOT.left} y="132" fontFamily={MONO} fontSize="9" fill={C.mut}>
          {shortDate(points[0].weekStart)}
        </text>
        {series.length > 1 && (
          <text x={PLOT.right} y="132" textAnchor="end" fontFamily={MONO} fontSize="9" fill={C.mut}>
            {shortDate(last.weekStart)}
          </text>
        )}
      </svg>

      {/* The two numbers the axis cannot state outright: where the line started, and how much
          of the total arrived since. Plain text rather than more SVG labels, because it wraps
          and stays legible at a phone's text size. */}
      <div className="mt-1 text-xs" style={{ color: C.mut }}>
        {series.length === 1
          ? `${total} ${total === 1 ? "word" : "words"}, all added in ${shortDate(points[0].weekStart)}.`
          : `${total} ${total === 1 ? "word" : "words"} — ${first} by ${shortDate(points[0].weekStart)}, ${total - first} added since.`}
      </div>
    </>
  );
}

export default function Estadisticas({ items, events, onBack }) {
  // Repaso swaps this in locally, so App's route-keyed scroll reset never fires for it —
  // without this the screen opens wherever the Repaso list happened to be scrolled to.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activity = useMemo(() => activityByDay(events), [events]);
  const streak = useMemo(() => streakFrom(activity), [activity]);
  const weeks = useMemo(() => heatmapWeeks(activity), [activity]);
  const growth = useMemo(() => cumulativeWordsByWeek(items), [items]);

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> Repaso
      </button>

      <h1 className="text-xl mb-1" style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink }}>
        Estadísticas
      </h1>

      <Card className="p-4 text-center">
        <div className="text-3xl" style={{ fontFamily: MONO, color: C.ink }}>
          {streak}
        </div>
        <div className="text-xs" style={{ color: C.mut }}>
          {streak === 1 ? "day in a row" : "days in a row"}
        </div>
      </Card>

      <SectionTitle>Actividad</SectionTitle>
      <Card className="p-3">
        <div className="flex gap-1">
          <div
            className="grid shrink-0"
            style={{ gridTemplateRows: `repeat(7, ${CELL}px)`, gap: `${GAP}px` }}
            aria-hidden="true"
          >
            {WEEKDAY_INITIALS.map((initial, row) => (
              <div
                key={initial}
                className="flex items-center text-[9px] leading-none"
                style={{ fontFamily: MONO, color: C.mut, height: CELL }}
              >
                {LABELLED_ROWS.has(row) ? initial : ""}
              </div>
            ))}
          </div>

          <div className="min-w-0">
            {/* Month names sit above the column that opens each month, so a 16-week strip
                still says roughly when it is without a full axis. */}
            <div
              className="grid mb-1"
              style={{
                gridAutoFlow: "column",
                gridAutoColumns: `${CELL}px`,
                gap: `${GAP}px`,
              }}
              aria-hidden="true"
            >
              {weeks.map((week, i) => {
                const opensMonth = i === 0 || monthOf(week.weekStart) !== monthOf(weeks[i - 1].weekStart);
                return (
                  <div
                    key={week.weekStart}
                    className="text-[9px] leading-none overflow-visible whitespace-nowrap"
                    style={{ fontFamily: MONO, color: C.mut }}
                  >
                    {opensMonth ? MONTHS_ES[monthOf(week.weekStart)] : ""}
                  </div>
                );
              })}
            </div>

            <div
              className="grid"
              style={{
                gridAutoFlow: "column",
                gridTemplateRows: `repeat(7, ${CELL}px)`,
                gridAutoColumns: `${CELL}px`,
                gap: `${GAP}px`,
              }}
            >
              {weeks.flatMap((week) =>
                week.days.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-[3px]"
                    title={day.future ? undefined : `${day.date}: ${day.count}`}
                    aria-label={day.future ? undefined : `${day.date}: ${day.count} events`}
                    style={{ background: day.future ? "transparent" : HEAT[day.level] }}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-1">
          <span className="text-[9px]" style={{ fontFamily: MONO, color: C.mut }}>
            menos
          </span>
          {HEAT.map((tone, level) => (
            <div key={level} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: tone }} />
          ))}
          <span className="text-[9px]" style={{ fontFamily: MONO, color: C.mut }}>
            más
          </span>
        </div>

        <div className="mt-2 text-xs" style={{ color: C.mut }}>
          The last {HEATMAP_WEEKS} weeks. Every kind of activity counts, including words since
          deleted.
        </div>
      </Card>

      <SectionTitle>Crecimiento</SectionTitle>
      <Card className="p-3">
        {growth.length === 0 ? (
          <div className="text-sm" style={{ color: C.mut }}>
            The line starts with your first word.
          </div>
        ) : (
          <GrowthChart series={growth} />
        )}
      </Card>
    </div>
  );
}
