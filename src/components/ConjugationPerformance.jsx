import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Play, Target } from "lucide-react";
import { C, MONO, SERIF, Card, Button, SectionTitle, dotGrid } from "../theme.jsx";
import { conjugationPerformance } from "../lib/conjugationStats.js";
import { TENSE_PACKS } from "../lib/conjugationGym.js";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { recognitionPerformance } from "../lib/recognitionStats.js";
import { gymDepthPerformance } from "../lib/gymDepthStats.js";

const SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "saved", label: "Saved" },
  { value: "core", label: "Built-in" },
];

const PACK_OPTIONS = [
  { value: "all", label: "All tenses", tenses: null },
  { value: "everyday", label: "Everyday", tenses: TENSE_PACKS.everyday.tenses },
  { value: "commands", label: "Commands", tenses: TENSE_PACKS.commands.tenses },
  { value: "subjunctive", label: "Subjunctive", tenses: TENSE_PACKS.subjunctive.tenses },
  { value: "perfect", label: "Perfect tenses", tenses: TENSE_PACKS.perfect.tenses },
];

const DIAGNOSIS_LABEL = {
  accent_collision: "Accent changes the tense",
  missing_no: "Missing no",
  missing_reflexive: "Missing reflexive pronoun",
  wrong_person: "Wrong person",
  wrong_tense: "Wrong tense",
  other_form: "Another recognizable form",
  wrong: "Other answer",
};

const pct = (value) => value === null || value === undefined ? "—" : `${Math.round(value * 100)}%`;
const SKILL_LABEL = { usage: "Tense usage", endings: "Endings" };

function AccuracyRow({ label, row, weak = row.weak, onPractice = null }) {
  const percent = Math.round((row.accuracy || 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-xs" style={{ color: C.ink }}>{label}</span>
      {weak && <span className="text-[9px] uppercase" style={{ color: C.red }}>weak</span>}
      <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: C.paper }}>
        <span className="block h-full rounded-full" style={{ width: `${percent}%`, background: weak ? C.red : C.pen }} />
      </span>
      <span className="w-14 shrink-0 text-right text-[10px]" style={{ fontFamily: MONO, color: C.mut }}>
        {percent}% / {row.answered}
      </span>
      {onPractice && (
        <button type="button" aria-label={`Practise ${label}`} onClick={onPractice} style={{ color: C.pen }}>
          <Target size={15} />
        </button>
      )}
    </div>
  );
}

export default function ConjugationPerformance({
  items,
  events,
  library,
  onBack,
  onPractice,
  onOpen,
}) {
  const [source, setSource] = useState("all");
  const [pack, setPack] = useState("everyday");
  const [expandedTense, setExpandedTense] = useState(null);
  const selectedPack = PACK_OPTIONS.find((option) => option.value === pack) || PACK_OPTIONS[0];
  const activeVerbs = useMemo(() => [...(library.saved || []), ...(library.core || [])], [library]);
  const itemLemmas = useMemo(
    () => new Map((library.saved || []).filter((verb) => verb.itemKey).map((verb) => [verb.itemKey, verb.lemma])),
    [library]
  );
  const stats = useMemo(
    () => conjugationPerformance(events, {
      items,
      itemLemmas,
      activeVerbs,
      dictionaryAvailable: Boolean(library.installed),
      source,
      tenses: selectedPack.tenses,
    }),
    [events, items, itemLemmas, activeVerbs, library.installed, source, selectedPack]
  );
  const recognition = useMemo(
    () => recognitionPerformance(events, { tenses: selectedPack.tenses }),
    [events, selectedPack]
  );
  const depth = useMemo(
    () => gymDepthPerformance(events, { tenses: selectedPack.tenses }),
    [events, selectedPack]
  );
  const weakVerbs = stats.verbs.filter((row) => row.weak);
  const productionByTense = new Map(stats.tenses.map((row) => [row.tense, row]));

  const startFocus = (focus = stats.practiceNext || { kind: "balanced" }) =>
    onPractice?.({ ...focus, source });

  return (
    <div className="px-4 py-4 pb-28" style={dotGrid}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm" style={{ color: C.pen }}>
          <ChevronLeft size={16} /> Gym
        </button>
        <div className="text-sm font-semibold" style={{ color: C.ink }}>Conjugation performance</div>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-lg border p-0.5" style={{ borderColor: C.line, background: C.paper }} role="radiogroup" aria-label="Performance source">
        {SOURCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={source === option.value}
            onClick={() => setSource(option.value)}
            className="rounded-md px-2 py-2 text-xs"
            style={{ fontFamily: MONO, background: source === option.value ? C.pen : "transparent", color: source === option.value ? C.card : C.mut }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <select
        aria-label="Performance tense pack"
        value={pack}
        onChange={(event) => {
          setPack(event.target.value);
          setExpandedTense(null);
        }}
        className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
        style={{ background: C.card, borderColor: C.line, color: C.ink }}
      >
        {PACK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      <SectionTitle>Last 50 typed first attempts</SectionTitle>
      <Card className="p-5 text-center">
        <div className="text-4xl" style={{ fontFamily: MONO, color: C.ink }}>{pct(stats.recent.accuracy)}</div>
        <div className="mt-1 text-sm" style={{ color: C.mut }}>
          {stats.recent.answered
            ? `${stats.recent.passed} correct of ${stats.recent.answered}`
            : "No typed first attempts in this view yet."}
        </div>
        {stats.recent.answered > 0 && (
          <div className="mt-2 text-xs" style={{ color: C.mut }}>
            {stats.recent.exact} exact · {stats.recent.accents} accent {stats.recent.accents === 1 ? "slip" : "slips"}
          </div>
        )}
        {stats.recent.comparison && (
          <div className="mt-2 text-xs" style={{ color: stats.recent.comparison.points >= 0 ? C.green : C.red }}>
            {stats.recent.comparison.points >= 0 ? "+" : ""}{stats.recent.comparison.points} points vs previous {stats.recent.comparison.answered}
          </div>
        )}
        <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: C.line, color: C.mut }}>
          Lifetime: {stats.lifetime.answered ? `${pct(stats.lifetime.accuracy)} · ${stats.lifetime.passed}/${stats.lifetime.answered}` : "—"}
        </div>
        {stats.activeTargets.length > 0 && (
          <Button className="mt-4 w-full" onClick={() => startFocus()}>
            <Play size={15} /> Practice next
          </Button>
        )}
      </Card>

      <SectionTitle>Choice recognition</SectionTitle>
      <Card className="p-4">
        {recognition.lifetime.answered === 0 ? (
          <div className="text-sm" style={{ color: C.mut }}>No recognition answers in this tense pack yet.</div>
        ) : (
          <>
            <div className="space-y-2.5">
              {recognition.lanes.map((lane) => (
                <AccuracyRow key={lane.skill} label={SKILL_LABEL[lane.skill] || lane.skill} row={lane} weak={false} />
              ))}
            </div>
            <div className="mt-4 border-t pt-3" style={{ borderColor: C.line }}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ fontFamily: MONO, color: C.mut }}>By tense</div>
              <div className="space-y-2.5">
                {recognition.tenses.map((row) => {
                  const production = productionByTense.get(row.tense);
                  return (
                    <div key={row.tense}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0" style={{ color: C.ink }}>{qualifiedTenseLabel(row.tense)}</span>
                        <span className="shrink-0 text-[10px]" style={{ fontFamily: MONO, color: C.mut }}>
                          recognition {pct(row.accuracy)} / {row.answered}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[10px]" style={{ fontFamily: MONO, color: C.mut }}>
                        {row.lanes.map((lane) => `${SKILL_LABEL[lane.skill]} ${lane.passed}/${lane.answered}`).join(" · ")}
                        {production && ` · Forms ${production.passed}/${production.answered}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 text-[10px]" style={{ color: C.mut }}>
              Choice recognition is global; the tense-pack filter applies, while Saved/Built-in filters only Forms.
            </div>
          </>
        )}
      </Card>

      {recognition.confusions.length > 0 && (
        <>
          <SectionTitle>Choice confusions</SectionTitle>
          <Card className="space-y-2 p-4">
            {recognition.confusions.map((row) => (
              <div key={`${row.tense}|${row.chosen}`} className="flex items-start justify-between gap-3 text-sm">
                <span style={{ color: C.ink }}>
                  {qualifiedTenseLabel(row.tense)} answered as {qualifiedTenseLabel(row.chosen)}
                </span>
                <span className="shrink-0" style={{ fontFamily: MONO, color: C.red }}>×{row.count}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {recognition.missed.answered > 0 && (
        <div className="mt-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.line, color: C.mut, background: C.paper }}>
          Choice missed round: {recognition.missed.passed}/{recognition.missed.answered} correct — separate from first attempts above.
        </div>
      )}

      <SectionTitle>Usage recall</SectionTitle>
      <Card className="p-4">
        {depth.usageRecall.firstAttempts.answered === 0 ? (
          <div className="text-sm" style={{ color: C.mut }}>No self-graded Usage recall in this tense pack yet.</div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-2xl" style={{ fontFamily: MONO, color: C.ink }}>{pct(depth.usageRecall.firstAttempts.accuracy)}</span>
              <span className="text-xs text-right" style={{ color: C.mut }}>
                {depth.usageRecall.firstAttempts.passed}/{depth.usageRecall.firstAttempts.answered} first-attempt self-grades
              </span>
            </div>
            {depth.usageRecall.missed.answered > 0 && (
              <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: C.line, color: C.mut }}>
                Missed round: {depth.usageRecall.missed.passed}/{depth.usageRecall.missed.answered} recalled
              </div>
            )}
          </>
        )}
      </Card>

      <SectionTitle>Typed Endings</SectionTitle>
      <Card className="p-4">
        {depth.typedEndings.firstAttempts.answered === 0 ? (
          <div className="text-sm" style={{ color: C.mut }}>No typed Endings rows in this tense pack yet.</div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-2xl" style={{ fontFamily: MONO, color: C.ink }}>{pct(depth.typedEndings.firstAttempts.accuracy)}</span>
              <span className="text-xs text-right" style={{ color: C.mut }}>
                {depth.typedEndings.firstAttempts.passed}/{depth.typedEndings.firstAttempts.answered} first-attempt rows
              </span>
            </div>
            <div className="mt-2 text-xs" style={{ color: C.mut }}>
              {depth.typedEndings.firstAttempts.exact} exact · {depth.typedEndings.firstAttempts.accents} accent-assisted
            </div>
            {depth.typedEndings.immediate.attempted > 0 && (
              <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: C.line, color: C.mut }}>
                Immediate recovery: {depth.typedEndings.immediate.recovered}/{depth.typedEndings.immediate.attempted}
              </div>
            )}
            {depth.typedEndings.missed.attempted > 0 && (
              <div className="mt-1 text-xs" style={{ color: C.mut }}>
                Missed round: {depth.typedEndings.missed.recovered}/{depth.typedEndings.missed.attempted} recovered
              </div>
            )}
          </>
        )}
      </Card>

      <SectionTitle>Coverage</SectionTitle>
      <Card className="p-4">
        {library.loading ? (
          <div className="text-sm" style={{ color: C.mut }}>Loading available forms…</div>
        ) : !stats.coverage.available ? (
          <div className="text-sm" style={{ color: C.mut }}>
            Dictionary not installed. Coverage and practice actions are unavailable; history above is unchanged.
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-2xl" style={{ fontFamily: MONO, color: C.ink }}>{pct(stats.coverage.rate)}</span>
              <span className="text-xs text-right" style={{ color: C.mut }}>
                {stats.coverage.practised}/{stats.coverage.total} forms · {stats.coverage.verbs} {stats.coverage.verbs === 1 ? "verb" : "verbs"}
              </span>
            </div>
            <div className="mt-2 text-xs" style={{ color: C.mut }}>A form counts once after a typed first attempt.</div>
          </>
        )}
      </Card>

      {stats.reveal.answered > 0 && (
        <>
          <SectionTitle>Reveal practice</SectionTitle>
          <Card className="p-4">
            <div className="text-sm" style={{ color: C.ink }}>
              {stats.reveal.passed} marked “Got it” of {stats.reveal.answered} reveals
            </div>
            <div className="mt-1 text-xs" style={{ color: C.mut }}>Shown separately from typed recall.</div>
          </Card>
        </>
      )}

      {stats.tenses.length > 0 && (
        <>
          <SectionTitle>By tense</SectionTitle>
          <Card className="divide-y p-0">
            {stats.tenses.map((row) => {
              const expanded = expandedTense === row.tense;
              return (
                <div key={row.tense} className="px-3 py-2.5" style={{ borderColor: C.line }}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedTense(expanded ? null : row.tense)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="min-w-0 flex-1 text-sm" style={{ color: C.ink }}>{qualifiedTenseLabel(row.tense)}</span>
                      {row.weak && <span className="text-[9px] uppercase" style={{ color: C.red }}>weak</span>}
                      <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>{pct(row.accuracy)} / {row.answered}</span>
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Practise ${qualifiedTenseLabel(row.tense)}`}
                      onClick={() => startFocus({ tense: row.tense })}
                      style={{ color: C.pen }}
                    >
                      <Target size={15} />
                    </button>
                  </div>
                  {expanded && (
                    <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: C.line }}>
                      {row.slots.map((slot) => <AccuracyRow key={slot.slot} label={slot.slot} row={slot} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </>
      )}

      {stats.slots.length > 0 && (
        <>
          <SectionTitle>By person</SectionTitle>
          <Card className="space-y-2.5 p-4">
            {stats.slots.map((row) => (
              <AccuracyRow
                key={row.slot}
                label={row.slot}
                row={row}
                onPractice={() => startFocus({ slot: row.slot })}
              />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Verbs to work on</SectionTitle>
      <Card className="p-3">
        {weakVerbs.length === 0 ? (
          <div className="text-sm" style={{ color: C.mut }}>A verb appears here below 80% after at least 3 first attempts.</div>
        ) : (
          <div className="divide-y">
            {weakVerbs.map((row) => (
              <div key={row.verbKey} className="flex items-center gap-2 py-2" style={{ borderColor: C.line }}>
                <button onClick={() => onOpen?.(row.target.openKey)} className="min-w-0 flex-1 truncate text-left" style={{ fontFamily: SERIF, color: C.pen, fontWeight: 700 }}>
                  {row.lemma}
                </button>
                <span className="text-xs" style={{ fontFamily: MONO, color: C.mut }}>{pct(row.accuracy)} / {row.answered}</span>
                <button aria-label={`Practise ${row.lemma}`} onClick={() => startFocus({ kind: "verb", target: row.target })} style={{ color: C.pen }}><Target size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {stats.problemForms.length > 0 && (
        <>
          <SectionTitle>Problem forms</SectionTitle>
          <Card className="space-y-2.5 p-4">
            {stats.problemForms.slice(0, 8).map((row) => (
              <button key={row.key} onClick={() => startFocus({ kind: "cell", target: row.target, tense: row.tense, slot: row.slot })} className="flex w-full items-center gap-2 text-left">
                <span className="min-w-0 flex-1 text-xs" style={{ color: C.ink }}>{row.lemma} · {qualifiedTenseLabel(row.tense)} · {row.slot}</span>
                <span className="text-[10px]" style={{ fontFamily: MONO, color: C.red }}>{pct(row.accuracy)} / {row.answered}</span>
                <ChevronRight size={13} style={{ color: C.mut }} />
              </button>
            ))}
          </Card>
        </>
      )}

      {stats.diagnoses.length > 0 && (
        <>
          <SectionTitle>Error patterns</SectionTitle>
          <Card className="space-y-2 p-4">
            {stats.diagnoses.map((row) => (
              <div key={row.diagnosis} className="flex justify-between gap-3 text-sm">
                <span style={{ color: C.ink }}>{DIAGNOSIS_LABEL[row.diagnosis] || row.diagnosis}</span>
                <span style={{ fontFamily: MONO, color: C.mut }}>{row.answered}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {stats.recovery.initialMisses > 0 && (
        <>
          <SectionTitle>Recovery</SectionTitle>
          <Card className="p-4 text-sm" style={{ color: C.ink }}>
            <div>{stats.recovery.immediateRecovered} of {stats.recovery.initialMisses} initial misses recovered on the immediate retry.</div>
            <div className="mt-1 text-xs" style={{ color: C.mut }}>
              Missed round: {stats.recovery.missedRecovered} recovered of {stats.recovery.missedAttempted} attempted.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
