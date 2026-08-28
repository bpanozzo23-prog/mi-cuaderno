import { useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Hammer,
  PenLine,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button, C, Card, IconButton, MONO, SERIF, dotGrid } from "../theme.jsx";
import { localDate } from "../lib/dates.js";
import {
  archivedJournalYears,
  currentJournalDays,
  priorYearMemory,
  sameDayJournalContinuations,
  searchJournalEntries,
  todayJournalEntry,
} from "../lib/journal.js";
import { practiceDetailsByPage } from "../lib/taller.js";
import { markdownPreviewText, plainTextFromMarkdown } from "../lib/noteMarkdown.js";
import TallerPanel from "./TallerPanel.jsx";

function localDateObject(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function journalDateLabel(dateString, options = {}) {
  const date = localDateObject(dateString);
  if (!Number.isFinite(date.getTime())) return dateString;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

function entryHeading(entry) {
  if (entry.title?.trim()) return entry.title.trim();
  const firstLine = plainTextFromMarkdown(entry.body).split(/\r?\n/).find((line) => line.trim())?.trim();
  return firstLine ? firstLine.slice(0, 64) : "Untitled moment";
}

function EntryCard({ entry, onOpen, eyebrow = null, practice = null, showDate = true }) {
  const titled = Boolean(entry.title?.trim());
  const bodyPreview = markdownPreviewText(entry.body);
  const lead = eyebrow || (showDate ? journalDateLabel(entry.pageDate) : "");
  const hasMeta = Boolean(lead || practice || entry.tags?.length > 0);
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      aria-label={`Open ${entryHeading(entry)}`}
      className="w-full text-left"
    >
      <Card className="active:opacity-80">
        <div className={practice ? "flex items-start gap-3" : ""}>
          {practice && (
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
              style={{ background: C.diarioPale, borderColor: C.diarioBorder, color: C.diarioInk }}
              aria-hidden="true"
            >
              <Hammer size={18} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            {hasMeta && (
              <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
                <span className="min-w-0 truncate">
                  {lead && <span>{lead}</span>}
                  {lead && practice && <span aria-hidden="true"> · </span>}
                  {practice && (
                    <>
                      <span
                        className="font-semibold uppercase"
                        style={{ color: C.diarioInk, letterSpacing: "0.06em" }}
                      >
                        {practice.categoryLabel}
                      </span>
                      {practice.targetLabel && <span> · {practice.targetLabel}</span>}
                    </>
                  )}
                </span>
                {entry.tags?.length > 0 && <span className="max-w-[35%] shrink-0 truncate">#{entry.tags[0]}</span>}
              </div>
            )}
            <div className={`${titled ? "font-semibold" : "text-sm line-clamp-2"} ${hasMeta ? "mt-1" : ""}`} style={{ color: C.ink, fontFamily: SERIF }}>
              {entryHeading(entry)}
            </div>
            {titled && bodyPreview && (
              <div className="mt-1 text-sm line-clamp-2" style={{ color: C.mut }}>
                {bodyPreview}
              </div>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}

export default function JournalHome({
  entries,
  items = [],
  events = [],
  onOpen,
  onEdit,
  onStart,
  now = new Date(),
  random = Math.random,
}) {
  const today = localDate(now);
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [tallerOpen, setTallerOpen] = useState(false);
  const practiceByPage = useMemo(() => practiceDetailsByPage(events), [events]);
  const todayEntry = useMemo(() => todayJournalEntry(entries, today), [entries, today]);
  const continuations = useMemo(
    () => sameDayJournalContinuations(entries, todayEntry),
    [entries, todayEntry]
  );
  const memory = useMemo(() => priorYearMemory(entries, today), [entries, today]);
  const currentDays = useMemo(() => currentJournalDays(entries, today), [entries, today]);
  const archive = useMemo(() => archivedJournalYears(entries, today), [entries, today]);
  const results = useMemo(() => searchJournalEntries(entries, query), [entries, query]);
  const searching = query.trim() !== "";
  const todayPreview = markdownPreviewText(todayEntry?.body);

  return (
    <div className="px-4 py-5 pb-28" style={dotGrid}>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <PenLine size={20} style={{ color: C.diario }} />
          <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Diario</h1>
        </div>
      </div>

      <Card className="p-4" style={{ background: C.diarioPale, borderColor: C.diarioBorder }}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase" style={{ color: C.diarioInk, letterSpacing: "0.08em" }}>
          <CalendarDays size={14} /> Today
        </div>
        {todayEntry ? (
          <button
            type="button"
            onClick={() => onOpen(todayEntry.id)}
            aria-label={`Open ${entryHeading(todayEntry)}`}
            className="mt-2 w-full text-left active:opacity-80"
          >
            <div className="flex items-center justify-between gap-2 text-xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
              <span>{journalDateLabel(today, { weekday: "long", month: "long", year: undefined })}</span>
              <ChevronRight size={18} className="shrink-0" aria-hidden="true" style={{ color: C.diario }} />
            </div>
            {todayPreview && (
              <div className="mt-2 text-sm line-clamp-2" style={{ color: C.mut }}>
                {todayPreview}
              </div>
            )}
          </button>
        ) : (
          <div className="mt-2 text-xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
            {journalDateLabel(today, { weekday: "long", month: "long", year: undefined })}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => todayEntry ? onEdit(todayEntry.id) : onStart({ date: today })}>
            <PenLine size={15} /> {todayEntry ? "Continue" : "Write today"}
          </Button>
          {todayEntry && (
            <Button tone="quiet" onClick={() => onStart({ date: today })}>
              <Plus size={15} /> New
            </Button>
          )}
          <Button tone="quiet" onClick={() => setTallerOpen((open) => !open)} aria-expanded={tallerOpen}>
            <Hammer size={15} /> Taller
          </Button>
        </div>
      </Card>

      {tallerOpen && (
        <TallerPanel
          items={items}
          events={events}
          today={today}
          random={random}
          onStart={(seed) => {
            setTallerOpen(false);
            onStart(seed);
          }}
          onClose={() => setTallerOpen(false)}
        />
      )}

      {continuations.length > 0 && (
        <div className="mt-3 space-y-2">
          {continuations.map((continuation) => (
            <div
              key={continuation.id}
              className="w-full rounded-xl border p-2 pl-3 flex items-center gap-2"
              style={{ background: C.card, borderColor: C.line }}
            >
              <button
                type="button"
                onClick={() => onOpen(continuation.id)}
                aria-label={`Open ${entryHeading(continuation)}`}
                className="min-w-0 flex flex-1 items-center gap-3 text-left active:opacity-80"
              >
                <Clock3 size={17} className="shrink-0" style={{ color: C.diario }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Moment</div>
                  <div className="truncate text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                    {entryHeading(continuation)}
                  </div>
                </div>
              </button>
              <IconButton
                tone="quiet"
                aria-label={`Continue ${entryHeading(continuation)}`}
                onClick={() => onEdit(continuation.id)}
              >
                <PenLine size={16} />
              </IconButton>
            </div>
          ))}
        </div>
      )}

      {memory && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
            <Sparkles size={14} style={{ color: C.diario }} /> Around this time
          </div>
          <EntryCard entry={memory} onOpen={onOpen} eyebrow={`${journalDateLabel(memory.pageDate)} · memory`} />
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-xl border px-3 py-2" style={{ background: C.card, borderColor: C.line }}>
        <Search size={16} style={{ color: C.mut }} />
        <input
          aria-label="Search journal"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, writing, and tags…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: C.ink }}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear journal search">
            <X size={14} style={{ color: C.mut }} />
          </button>
        )}
      </div>

      {searching ? (
        <section aria-label="Journal search results" className="mt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Search</h2>
          {results.length > 0 ? (
            <div className="space-y-2.5">{results.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} practice={practiceByPage.get(entry.id)} />)}</div>
          ) : (
            <div className="py-7 text-center text-sm italic" style={{ color: C.mut }}>No moments match that.</div>
          )}
        </section>
      ) : (
        <>
          <section aria-label="Journal timeline" className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Timeline</h2>
            {currentDays.length > 0 ? (
              <div className="space-y-5">
                {currentDays.map((day) => (
                  <div key={day.date}>
                    <h3 className="mb-2 text-xs font-semibold" style={{ color: C.mut, fontFamily: MONO }}>
                      {journalDateLabel(day.date)}
                    </h3>
                    <div className="space-y-2.5">
                      {day.entries.map((entry) => (
                        <EntryCard
                          key={entry.id}
                          entry={entry}
                          onOpen={onOpen}
                          practice={practiceByPage.get(entry.id)}
                          showDate={false}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-7 text-center text-sm italic" style={{ color: C.mut }}>Your first moment can begin with today.</div>
            )}
          </section>

          {archive.length > 0 && (
            <section aria-label="Journal archive" className="mt-5">
              <button
                type="button"
                onClick={() => setArchiveOpen((open) => !open)}
                aria-expanded={archiveOpen}
                className="w-full rounded-xl border px-3 py-3 flex items-center gap-2 text-sm font-medium"
                style={{ background: C.card, borderColor: C.line, color: C.ink }}
              >
                <Archive size={16} style={{ color: C.diario }} /> Archive
                <span className="ml-auto">{archiveOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
              </button>
              {archiveOpen && (
                <div className="mt-4 space-y-5">
                  {archive.map((group) => (
                    <div key={group.year}>
                      <h3 className="mb-2 text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>{group.year}</h3>
                      <div className="space-y-2.5">{group.entries.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} practice={practiceByPage.get(entry.id)} />)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
