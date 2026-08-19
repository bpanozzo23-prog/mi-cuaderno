import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, HEAT, SERIF, MONO, dotGrid, SectionTitle, Card, Segmented } from "../theme.jsx";
import {
  activityByDay,
  streakFrom,
  heatmapWeeks,
  monthGrid,
  earliestActivityMonth,
  cumulativeWordsByWeek,
  HEATMAP_WEEKS,
} from "../lib/stats.js";
import { localDate, monthOfDate, addMonths } from "../lib/dates.js";
import { conjugationPerformance } from "../lib/conjugationStats.js";

/**
 * The Phase 11 sub-view: a calendar of what the owner has actually done, and a line of how
 * the vocabulary has grown. Both are replays of the event log and the items table — nothing
 * here is stored, and deleting this screen would lose no data (brief section 7).
 *
 * It lives behind Repaso rather than beside it because these are the numbers worth looking at
 * occasionally, where the streak and the review ladder are worth seeing daily.
 */

/** Monday-first, the Spanish convention. */
const WEEKDAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];

const MONTHS_ES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const MONTHS_ES_FULL = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const monthOf = (localDateStr) => Number(localDateStr.slice(5, 7)) - 1;

/** "2026-07-27" → "27 jul". A full ISO date is too wide to read at 9px on a phone. */
const shortDate = (localDateStr) =>
  `${Number(localDateStr.slice(8, 10))} ${MONTHS_ES[monthOf(localDateStr)]}`;

/** "2026-08" → "agosto 2026", the calendar's own heading. */
const monthTitle = (yearMonth) =>
  `${MONTHS_ES_FULL[Number(yearMonth.slice(5, 7)) - 1]} ${yearMonth.slice(0, 4)}`;

/**
 * How hard the day was circled. The five intensity levels the trend view uses collapse to
 * three weights here on purpose: the month page answers "did I show up", and a hand holding
 * one pen can only press so many distinguishable ways. Volume stays with the trend view.
 */
const INK = {
  1: { color: HEAT[2], width: 1.5 },
  2: { color: HEAT[2], width: 1.5 },
  3: { color: C.pen, width: 2 },
  4: { color: C.penDark, width: 2.5 },
};

/**
 * Three slightly-off ellipses, picked by day number so the same date always looks the same.
 * A circle drawn by hand is never the circle next to it, and repeating one shape 31 times is
 * what would make these read as a UI control rather than as ink.
 */
const WOBBLES = [
  { borderRadius: "50% 46% 54% 48% / 54% 48% 52% 46%", rotate: -5 },
  { borderRadius: "47% 53% 45% 55% / 50% 52% 48% 50%", rotate: 3 },
  { borderRadius: "53% 47% 52% 48% / 46% 54% 46% 54%", rotate: -2 },
];

const ROW_HEIGHT = 34;

/**
 * One month as a planner page: printed rules and typeset numbers, with the owner's own marks
 * on top. The contrast is the point — the page looks printed so the ink looks handwritten.
 *
 * Divs rather than SVG, as the strip before it was: each day needs its own `title` and
 * `aria-label`, which a grid of elements gives for free and a single drawing would not.
 */
function MonthCalendar({ cells, today }) {
  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }} aria-hidden="true">
        {WEEKDAY_INITIALS.map((initial) => (
          <div
            key={initial}
            className="text-center text-[9px] leading-none pb-1"
            style={{ fontFamily: MONO, color: C.mut }}
          >
            {initial}
          </div>
        ))}
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          borderTop: `1px solid ${C.line}`,
          borderLeft: `1px solid ${C.line}`,
        }}
      >
        {cells.map((cell) => {
          const ink = cell.inMonth && !cell.future ? INK[cell.level] : null;
          const wobble = WOBBLES[cell.dayOfMonth % WOBBLES.length];
          const isToday = cell.date === today;
          return (
            <div
              key={cell.date}
              className="relative flex items-center justify-center"
              style={{
                height: ROW_HEIGHT,
                borderRight: `1px solid ${C.line}`,
                borderBottom: `1px solid ${C.line}`,
              }}
              title={cell.inMonth && !cell.future ? `${cell.date}: ${cell.count}` : undefined}
              aria-label={
                cell.inMonth && !cell.future ? `${cell.date}: ${cell.count} events` : undefined
              }
            >
              {ink && (
                <span
                  className="activity-mark pointer-events-none absolute"
                  aria-hidden="true"
                  style={{
                    inset: "4px 6px",
                    border: `${ink.width}px solid ${ink.color}`,
                    borderRadius: wobble.borderRadius,
                    transform: `rotate(${wobble.rotate}deg)`,
                  }}
                />
              )}
              {isToday && (
                <span
                  className="today-rule pointer-events-none absolute"
                  aria-hidden="true"
                  style={{ left: "32%", right: "32%", bottom: 1, height: 2, background: C.red, zIndex: 1 }}
                />
              )}
              {cell.inMonth && (
                <span
                  className="relative text-[11px] leading-none"
                  style={{ fontFamily: MONO, color: cell.future ? C.mut : C.ink }}
                >
                  {cell.dayOfMonth}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A trend dot is one day shown up, tinted by how busy it was. */
const DOT = 8;

/**
 * The trailing sixteen weeks as one column per week, one dot per day the owner showed up.
 *
 * Deliberately not a calendar: at this zoom which weekday a day was carries nothing, while
 * how full each column is carries the whole story. A column of seven is a perfect week, and
 * a run of tall columns is the habit holding.
 */
function TrendWeeks({ weeks }) {
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 7 * DOT + 6 * 2 }}>
        {weeks.map((week) => {
          const active = week.days.filter((day) => !day.future && day.count > 0);
          return (
            <div
              key={week.weekStart}
              className="flex min-w-0 flex-1 flex-col-reverse items-center gap-[2px]"
              aria-label={`Week of ${week.weekStart}: ${active.length} active days`}
            >
              {active.map((day) => (
                <span
                  key={day.date}
                  className="trend-dot rounded-full"
                  style={{ width: DOT, height: DOT, background: HEAT[day.level] }}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex gap-1" aria-hidden="true">
        {weeks.map((week, i) => {
          const opensMonth = i === 0 || monthOf(week.weekStart) !== monthOf(weeks[i - 1].weekStart);
          return (
            <div
              key={week.weekStart}
              className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-[9px] leading-none"
              style={{ fontFamily: MONO, color: C.mut }}
            >
              {opensMonth ? MONTHS_ES[monthOf(week.weekStart)] : ""}
            </div>
          );
        })}
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
    </div>
  );
}

/**
 * The growth chart's drawing area inside its 320×140 viewBox. The left gutter holds the
 * vertical scale, and the top inset is headroom: a cumulative total never falls, so the last
 * point is always the highest one, and a label drawn above it needs somewhere to go.
 */
const PLOT = { left: 34, right: 310, top: 24, bottom: 112 };

/** Weekly points stop being tellable apart past this many, and the marks come off. */
const PLOT_MARK_LIMIT = 26;

/**
 * How far a point may sit off its true height, in viewBox units.
 *
 * A line drawn by hand does not pass exactly through its points, and this is what keeps the
 * chart in the same voice as the calendar's circles. The amplitude falls as the weeks crowd:
 * at two years the same wobble would read as fur rather than as a hand. It is derived from
 * the index rather than random so a re-render never redraws the line differently, and the
 * first and last points are left exact — those two carry the numbers the caption states.
 */
function wobbleFor(index, count) {
  if (index === 0 || index === count - 1) return 0;
  const amplitude = count > 40 ? 0.5 : count > 12 ? 1 : 1.6;
  return (((index * 7919) % 13) / 13 - 0.5) * 2 * amplitude;
}

/**
 * The growth line. Hand-authored SVG rather than a charting library: it is one path, and a
 * dependency would be larger than the chart.
 *
 * Drawn as a graph plotted by hand on the notebook's own paper: a faint dashed grid, a
 * slightly unsteady ink line, a mark on every week while the marks can still be told apart,
 * and the running total riding above the last point rather than sitting on an axis. The total
 * is the one number worth reading, and at the end of the line it needs no gutter to hold it.
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
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${(p.y + wobbleFor(i, points.length)).toFixed(1)}`)
    .join(" ");

  // The total sits just past the last point, flipping to the inside once the point is close
  // enough to the right edge that a label hung outside it would leave the viewBox.
  const totalX = Math.min(last.x + 6, PLOT.right - 2);
  const totalAnchor = last.x > PLOT.right - 40 ? "end" : "start";

  return (
    <>
      <svg
        viewBox="0 0 320 140"
        className="w-full h-auto"
        role="img"
        aria-label={`Words in the cuaderno over time, now ${total}`}
      >
        {/* Graph paper: four dashed rules and six dashed columns, faint enough to read as the
            page rather than as data. The baseline alone is solid, because it is the zero the
            heights are measured from and not just a guide. */}
        {[0, 1, 2, 3, 4].map((step) => {
          const y = PLOT.bottom - (step / 4) * span;
          return (
            <line
              key={`rule-${step}`}
              x1={PLOT.left}
              y1={y}
              x2={PLOT.right}
              y2={y}
              stroke={C.line}
              strokeWidth={step === 0 ? 1 : 0.5}
              strokeDasharray={step === 0 ? undefined : "2 4"}
            />
          );
        })}
        {[0, 1, 2, 3, 4, 5, 6].map((step) => {
          const x = PLOT.left + (step / 6) * (PLOT.right - PLOT.left);
          return (
            <line
              key={`column-${step}`}
              x1={x}
              y1={PLOT.top}
              x2={x}
              y2={PLOT.bottom}
              stroke={C.line}
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
          );
        })}

        <text x={PLOT.left - 6} y={PLOT.bottom + 3} textAnchor="end" fontFamily={MONO} fontSize="10" fill={C.mut}>
          0
        </text>

        <path
          d={line}
          fill="none"
          stroke={C.pen}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Every week gets its mark while the marks can still be told apart. Past that the
            line carries the shape on its own, rather than thickening into a smudge. */}
        {points.length <= PLOT_MARK_LIMIT &&
          points.map((p, i) => (
            <circle
              key={p.weekStart}
              cx={p.x.toFixed(1)}
              cy={(p.y + wobbleFor(i, points.length)).toFixed(1)}
              r="1.7"
              fill={C.penDark}
            />
          ))}

        {/* The last point is the one the caption talks about, so it is drawn heavier and
            knocked out of the line with a ring of card so the ink does not swallow it. */}
        <circle cx={last.x} cy={last.y} r="3" fill={C.pen} stroke={C.card} strokeWidth="1" />
        <text
          x={totalX}
          y={last.y - 8}
          textAnchor={totalAnchor}
          fontFamily={MONO}
          fontSize="11"
          fill={C.ink}
        >
          {total}
        </text>

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

export default function Estadisticas({
  items,
  events,
  onBack,
  backLabel = "Repaso",
  onOpenConjugationPerformance,
}) {
  // Two views of the same activity: the month page for "did I show up", the trend for how
  // that has held over time. The month is the default because it is the one the owner is
  // standing in.
  const [activityView, setActivityView] = useState("mes");
  const today = localDate();
  const thisMonth = monthOfDate(today);
  const [month, setMonth] = useState(thisMonth);

  const activity = useMemo(() => activityByDay(events), [events]);
  const streak = useMemo(() => streakFrom(activity), [activity]);
  const weeks = useMemo(() => heatmapWeeks(activity), [activity]);
  const cells = useMemo(() => monthGrid(activity, month, today), [activity, month, today]);
  const earliest = useMemo(() => earliestActivityMonth(activity), [activity]);
  const growth = useMemo(() => cumulativeWordsByWeek(items), [items]);
  const conjugations = useMemo(() => conjugationPerformance(events, { items }), [events, items]);

  // Paging stops at the first month with anything in it and at the month the owner is in:
  // there is nothing to see on either side, and an arrow that always works invites the hunt.
  const canGoBack = Boolean(earliest) && month > earliest;
  const canGoForward = month < thisMonth;

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-3" style={{ color: C.pen }}>
        <ChevronLeft size={16} /> {backLabel}
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
        {activityView === "mes" && (
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              disabled={!canGoBack}
              onClick={() => setMonth(addMonths(month, -1))}
              className="p-1"
              style={{ color: canGoBack ? C.pen : C.disabled }}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm" style={{ fontFamily: SERIF, color: C.ink }}>
              {monthTitle(month)}
            </div>
            <button
              type="button"
              aria-label="Mes siguiente"
              disabled={!canGoForward}
              onClick={() => setMonth(addMonths(month, 1))}
              className="p-1"
              style={{ color: canGoForward ? C.pen : C.disabled }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {activityView === "mes" ? (
          <MonthCalendar cells={cells} today={today} />
        ) : (
          <TrendWeeks weeks={weeks} />
        )}

        <div className="mt-2 text-xs" style={{ color: C.mut }}>
          {activityView === "mes"
            ? "A circled day is a day you studied; heavier ink, busier day."
            : `The last ${HEATMAP_WEEKS} weeks, one dot per day you showed up.`}{" "}
          Every kind of activity counts, including words since deleted.
        </div>

        <div className="mt-3">
          <Segmented
            label="Vista de actividad"
            value={activityView}
            options={[
              { value: "mes", label: "mes" },
              { value: "tendencia", label: "tendencia" },
            ]}
            onChange={setActivityView}
          />
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

      {/* The detailed skill model lives in the Gym; general Estadísticas keeps one compact
          doorway so activity/growth remains the point of this screen. */}
      {(conjugations.lifetime.answered > 0 || conjugations.reveal.answered > 0) && (
        <>
          <SectionTitle>Conjugaciones</SectionTitle>
          <button
            type="button"
            onClick={onOpenConjugationPerformance}
            className="w-full rounded-xl border p-3 text-left"
            style={{ background: C.card, borderColor: C.line }}
          >
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ color: C.ink }}>Conjugation Gym</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl" style={{ fontFamily: MONO, color: C.ink }}>
                    {conjugations.recent.answered
                      ? `${Math.round(conjugations.recent.accuracy * 100)}%`
                      : "—"}
                  </span>
                  <span className="text-xs" style={{ color: C.mut }}>
                    {conjugations.recent.answered
                      ? `${conjugations.recent.passed}/${conjugations.recent.answered} typed first attempts`
                      : `${conjugations.reveal.answered} reveal ${conjugations.reveal.answered === 1 ? "answer" : "answers"}`}
                  </span>
                </div>
                {conjugations.recent.accents > 0 && (
                  <div className="mt-1 text-xs" style={{ color: C.mut }}>
                    {conjugations.recent.accents} {conjugations.recent.accents === 1 ? "accent slip" : "accent slips"}
                  </div>
                )}
              </div>
              <ChevronRight size={16} style={{ color: C.mut }} />
            </div>
          </button>
        </>
      )}
    </div>
  );
}
