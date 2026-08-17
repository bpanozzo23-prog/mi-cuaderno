import { C, SERIF, Button } from "../theme.jsx";

/** Shared inline editor for saved personal examples, whether General or meaning-assigned. */
export default function ExampleEditForm({ originalExample, draft, onChange, onSubmit, onCancel, error = "" }) {
  return (
    <form
      aria-label={`Edit example “${originalExample.es}”`}
      onSubmit={onSubmit}
      className="space-y-2 rounded-lg border p-2"
      style={{ borderColor: C.line, background: C.paper }}
    >
      <input
        autoFocus
        aria-label="Example in Spanish"
        value={draft.es}
        onChange={(event) => onChange({ ...draft, es: event.target.value })}
        className="min-h-11 w-full rounded-lg border px-2 text-sm outline-none"
        style={{ background: C.card, borderColor: C.line, color: C.ink, fontFamily: SERIF }}
      />
      <input
        aria-label="Example in English"
        value={draft.en}
        onChange={(event) => onChange({ ...draft, en: event.target.value })}
        className="min-h-11 w-full rounded-lg border px-2 text-sm outline-none"
        style={{ background: C.card, borderColor: C.line, color: C.ink }}
      />
      {error && <div role="alert" className="text-xs" style={{ color: C.red }}>{error}</div>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-h-11" disabled={!draft.es.trim()}>
          Save example
        </Button>
        <Button
          type="button"
          tone="quiet"
          className="min-h-11"
          aria-label="Cancel example edit"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
