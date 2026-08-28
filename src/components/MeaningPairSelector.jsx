import { C, MONO } from "../theme.jsx";

function MeaningSelect({ label, item, value, onChange }) {
  return (
    <label className="block text-xs" style={{ color: C.mut }}>
      <span className="mb-1 block" style={{ fontFamily: MONO }}>{label}</span>
      <select
        aria-label={label}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border px-2 py-2 text-sm outline-none"
        style={{ background: C.card, borderColor: C.line, color: C.ink }}
      >
        <option value="">Choose a meaning…</option>
        {(item?.meanings || []).map((meaning, index) => (
          <option key={meaning.id} value={meaning.id}>{index + 1}. {meaning.gloss}</option>
        ))}
      </select>
    </label>
  );
}

/** Visit-local chooser; null means the explicit legacy-compatible Whole entry scope. */
export default function MeaningPairSelector({ focal, target, value, onChange }) {
  const available = focal?.type === "lexical" && target?.type === "lexical"
    && focal.meanings?.length > 0 && target.meanings?.length > 0;
  const specific = value !== null && available;

  return (
    <fieldset className="mt-3 rounded-lg border p-3" style={{ borderColor: C.line }}>
      <legend className="px-1 text-xs font-semibold" style={{ color: C.ink }}>Connection scope</legend>
      <label className="flex min-h-11 items-center gap-2 text-sm" style={{ color: C.ink }}>
        <input type="radio" checked={!specific} onChange={() => onChange(null)} /> Whole entry
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm" style={{ color: C.ink, opacity: available ? 1 : 0.55 }}>
        <input
          type="radio"
          checked={specific}
          disabled={!available}
          onChange={() => onChange({
            focalMeaningId: focal.meanings.length === 1 ? focal.meanings[0].id : "",
            targetMeaningId: target.meanings.length === 1 ? target.meanings[0].id : "",
          })}
        /> Individual meanings
      </label>
      {!available && (
        <div className="text-xs" style={{ color: C.mut }}>Both entries need a saved meaning first.</div>
      )}
      {specific && (
        <div className="mt-2 grid gap-3">
          <MeaningSelect
            label={`${focal.term}: meaning`}
            item={focal}
            value={value?.focalMeaningId}
            onChange={(focalMeaningId) => onChange({ ...value, focalMeaningId })}
          />
          <MeaningSelect
            label={`${target.term}: meaning`}
            item={target}
            value={value?.targetMeaningId}
            onChange={(targetMeaningId) => onChange({ ...value, targetMeaningId })}
          />
        </div>
      )}
    </fieldset>
  );
}

