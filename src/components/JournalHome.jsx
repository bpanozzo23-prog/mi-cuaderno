import { useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  PenLine,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button, C, Card, MONO, SERIF, dotGrid } from "../theme.jsx";
import { localDate } from "../lib/dates.js";
import {
  archivedJournalYears,
  continueJournalEntry,
  currentJournalEntries,
  priorYearMemory,
  searchJournalEntries,
  todayJournalEntry,
} from "../lib/journal.js";

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
  const firstLine = entry.body?.split(/\r?\n/).find((line) => line.trim())?.trim();
  return firstLine ? firstLine.slice(0, 64) : "Untitled moment";
}

function EntryCard({ entry, onOpen, eyebrow = null }) {
  const titled = Boolean(entry.title?.trim());
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      aria-label={`Open ${entryHeading(entry)}`}
      className="w-full text-left"
    >
      <Card className="active:opacity-80">
        <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: C.mut, fontFamily: MONO }}>
          <span>{eyebrow || journalDateLabel(entry.pageDate)}</span>
          {entry.tags?.length > 0 && <span className="truncate">#{entry.tags[0]}</span>}
        </div>
        <div className={`${titled ? "mt-1 font-semibold" : "mt-1 text-sm line-clamp-2"}`} style={{ color: C.ink, fontFamily: SERIF }}>
          {entryHeading(entry)}
        </div>
        {titled && entry.body?.trim() && (
          <div className="mt-1 text-sm line-clamp-2 whitespace-pre-wrap" style={{ color: C.mut }}>
            {entry.body.trim()}
          </div>
        )}
      </Card>
    </button>
  );
}

export default function JournalHome({ entries, onOpen, onEdit, onStart, now = new Date() }) {
  const today = localDate(now);
  const [query, setQuery] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const todayEntry = useMemo(() => todayJournalEntry(entries, today), [entries, today]);
  const continuation = useMemo(() => continueJournalEntry(entries, todayEntry), [entries, todayEntry]);
  const memory = useMemo(() => priorYearMemory(entries, today), [entries, today]);
  const current = useMemo(() => currentJournalEntries(entries, today), [entries, today]);
  const archive = useMemo(() => archivedJournalYears(entries, today), [entries, today]);
  const results = useMemo(() => searchJournalEntries(entries, query), [entries, query]);
  const searching = query.trim() !== "";

  return (
    <div className="px-4 py-5 pb-28" style={dotGrid}>
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <PenLine size={20} style={{ color: C.pen }} />
          <h1 className="text-2xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>Diario</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: C.mut }}>
          Notice the day, practice your Spanish, remember what mattered.
        </p>
      </div>

      <Card className="p-4" style={{ background: C.penPale, borderColor: "#D9E1F2" }}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase" style={{ color: C.penDark, letterSpacing: "0.08em" }}>
          <CalendarDays size={14} /> Today
        </div>
        <div className="mt-2 text-xl font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
          {journalDateLabel(today, { weekday: "long", month: "long", year: undefined })}
        </div>
        {todayEntry?.body?.trim() && (
          <div className="mt-2 text-sm line-clamp-2 whitespace-pre-wrap" style={{ color: C.mut }}>
            {todayEntry.body.trim()}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => todayEntry ? onEdit(todayEntry.id) : onStart({ date: today })}>
            <PenLine size={15} /> {todayEntry ? "Continue today" : "Write today"}
          </Button>
          <Button tone="quiet" onClick={() => onStart({ date: today })}>
            <Plus size={15} /> New moment
          </Button>
        </div>
      </Card>

      {continuation && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onEdit(continuation.id)}
            className="w-full rounded-xl border p-3 text-left flex items-center gap-3"
            style={{ background: C.card, borderColor: C.line }}
          >
            <Clock3 size={17} className="shrink-0" style={{ color: C.pen }} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Continue</div>
              <div className="truncate text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>
                {entryHeading(continuation)}
              </div>
            </div>
            <span className="text-xs shrink-0" style={{ color: C.mut }}>{journalDateLabel(continuation.pageDate, { year: undefined })}</span>
          </button>
        </div>
      )}

      {memory && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
            <Sparkles size={14} style={{ color: C.pen }} /> Around this time
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
            <div className="space-y-2.5">{results.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} />)}</div>
          ) : (
            <div className="py-7 text-center text-sm italic" style={{ color: C.mut }}>No moments match that.</div>
          )}
        </section>
      ) : (
        <>
          <section aria-label="Journal timeline" className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>Timeline</h2>
            {current.length > 0 ? (
              <div className="space-y-2.5">{current.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} />)}</div>
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
                <Archive size={16} style={{ color: C.pen }} /> Archive
                <span className="ml-auto">{archiveOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
              </button>
              {archiveOpen && (
                <div className="mt-4 space-y-5">
                  {archive.map((group) => (
                    <div key={group.year}>
                      <h3 className="mb-2 text-sm font-semibold" style={{ color: C.ink, fontFamily: SERIF }}>{group.year}</h3>
                      <div className="space-y-2.5">{group.entries.map((entry) => <EntryCard key={entry.id} entry={entry} onOpen={onOpen} />)}</div>
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
