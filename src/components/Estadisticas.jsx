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
  const max = Math.max(1, total);
  const points = series.map((point, i) => {
    // One point cannot span a width; park it at the left edge rather than dividing by zero.
    const x = series.length === 1 ? 10 : 10 + (i / (series.length - 1)) * 300;
    const y = 120 - (point.total / max) * 110;
    return { ...point, x, y };
  });
  const last = points[points.length - 1];
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${last.x.toFixed(1)} 120 L${points[0].x.toFixed(1)} 120 Z`;

  return (
    <svg
      viewBox="0 0 320 140"
      className="w-full h-auto"
      role="img"
      aria-label={`Words in the cuaderno over time, now ${total}`}
    >
      <path d={area} fill={C.penPale} />
      <path d={line} fill="none" stroke={C.pen} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="3" fill={C.pen} />
      <text
        x={last.x - 6}
        y={last.y - 8}
        textAnchor="end"
        fontFamily={MONO}
        fontSize="11"
        fill={C.ink}
      >
        {total}
      </text>
      <text x="10" y="136" fontFamily={MONO} fontSize="9" fill={C.mut}>
        {points[0].weekStart}
      </text>
      <text x="310" y="136" textAnchor="end" fontFamily={MONO} fontSize="9" fill={C.mut}>
        {last.weekStart}
      </text>
    </svg>
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
