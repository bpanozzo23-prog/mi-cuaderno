import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { C, SERIF, Card, Button } from "../theme.jsx";
import {
  COMMON_REGIONS,
  MEANING_POS_OPTIONS,
  USAGE_LABELS,
  VERB_BEHAVIORS,
} from "../lib/meanings.js";

const inputStyle = { background: C.card, borderColor: C.line, color: C.ink };

function toggle(values, value) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

function ChoiceChips({ values, options, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = values.includes(option);
        return (
          <button
            type="button"
            key={option}
            onClick={() => onChange(toggle(values, option))}
            className="text-xs px-2 py-1 rounded-full border"
            style={active
              ? { background: C.pen, borderColor: C.pen, color: "#fff" }
              : { background: C.card, borderColor: C.line, color: C.mut }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function MeaningEditor({ meaning, onChange, initialDetails = false }) {
  const [details, setDetails] = useState(initialDetails);
  const [region, setRegion] = useState("");
  const [exampleEs, setExampleEs] = useState("");
  const [exampleEn, setExampleEn] = useState("");

  const change = (patch) => onChange({ ...meaning, ...patch });

  function addRegion() {
    const value = region.trim();
    if (!value) return;
    const duplicate = meaning.regions.some((entry) => entry.toLocaleLowerCase("en") === value.toLocaleLowerCase("en"));
    if (!duplicate) change({ regions: [...meaning.regions, value] });
    setRegion("");
  }

  function addExample() {
    if (!exampleEs.trim()) return;
    change({ examples: [...meaning.examples, { es: exampleEs.trim(), en: exampleEn.trim() }] });
    setExampleEs("");
    setExampleEn("");
  }

  return (
    <div className="space-y-2">
      <input
        aria-label="English gloss"
        value={meaning.gloss}
        onChange={(event) => change({ gloss: event.target.value })}
        placeholder="English meaning"
        className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
        style={{ ...inputStyle, fontFamily: SERIF }}
      />
      <input
        aria-label="Spanish usage cue"
        value={meaning.usageCue}
        onChange={(event) => change({ usageCue: event.target.value })}
        placeholder="Spanish usage cue (optional), e.g. sacar dinero"
        className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none"
        style={inputStyle}
      />

      <button
        type="button"
        onClick={() => setDetails((open) => !open)}
        aria-expanded={details}
        className="inline-flex items-center gap-1 text-xs"
        style={{ color: C.pen }}
      >
        {details ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {details ? "Hide optional details" : "Region, usage, grammar, note and examples"}
      </button>

      {details && (
        <Card className="space-y-3" style={{ background: C.paper }}>
          <div>
            <div className="text-xs mb-1" style={{ color: C.mut }}>Regions</div>
            <ChoiceChips
              values={meaning.regions}
              options={COMMON_REGIONS}
              onChange={(regions) => change({ regions })}
            />
            {meaning.regions.filter((value) => !COMMON_REGIONS.includes(value)).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {meaning.regions.filter((value) => !COMMON_REGIONS.includes(value)).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => change({ regions: meaning.regions.filter((entry) => entry !== value) })}
                    className="text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1"
                    style={{ borderColor: C.line, color: C.mut }}
                  >
                    {value} <X size={10} />
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <input
                aria-label="Custom region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addRegion();
                  }
                }}
                placeholder="Other country or region"
                className="min-w-0 flex-1 text-sm rounded-lg border px-2 py-1.5 outline-none"
                style={inputStyle}
              />
              <Button type="button" tone="quiet" onClick={addRegion}>Add</Button>
            </div>
          </div>

          <div>
            <div className="text-xs mb-1" style={{ color: C.mut }}>Usage</div>
            <ChoiceChips
              values={meaning.usageLabels}
              options={USAGE_LABELS}
              onChange={(usageLabels) => change({ usageLabels })}
            />
          </div>

          <label className="block text-xs" style={{ color: C.mut }}>
            Part of speech override
            <select
              aria-label="Meaning part of speech override"
              value={meaning.posOverride}
              onChange={(event) => change({ posOverride: event.target.value })}
              className="mt-1 w-full text-sm rounded-lg border px-2 py-2 outline-none"
              style={inputStyle}
            >
              {MEANING_POS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option || "inherit from entry"}</option>
              ))}
            </select>
          </label>

          <div>
            <div className="text-xs mb-1" style={{ color: C.mut }}>Verb behavior</div>
            <ChoiceChips
              values={meaning.verbBehavior}
              options={VERB_BEHAVIORS}
              onChange={(verbBehavior) => change({ verbBehavior })}
            />
          </div>

          <textarea
            aria-label="Meaning note"
            value={meaning.note}
            onChange={(event) => change({ note: event.target.value })}
            placeholder="Note for this meaning"
            className="w-full text-sm rounded-xl border px-3 py-2.5 outline-none min-h-20 resize-y"
            style={inputStyle}
          />

          <div>
            <div className="text-xs mb-1" style={{ color: C.mut }}>Examples for this meaning</div>
            <div className="space-y-1.5">
              {meaning.examples.map((example, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div style={{ fontFamily: SERIF }}>{example.es}</div>
                    {example.en && <div className="text-xs" style={{ color: C.mut }}>{example.en}</div>}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove meaning example"
                    onClick={() => change({ examples: meaning.examples.filter((_, itemIndex) => itemIndex !== index) })}
                  >
                    <X size={13} style={{ color: C.mut }} />
                  </button>
                </div>
              ))}
            </div>
            <input
              aria-label="Meaning example in Spanish"
              value={exampleEs}
              onChange={(event) => setExampleEs(event.target.value)}
              placeholder="Sentence in Spanish"
              className="mt-2 w-full text-sm rounded-lg border px-2 py-1.5 outline-none"
              style={inputStyle}
            />
            <input
              aria-label="Meaning example in English"
              value={exampleEn}
              onChange={(event) => setExampleEn(event.target.value)}
              placeholder="English (optional)"
              className="mt-1.5 w-full text-sm rounded-lg border px-2 py-1.5 outline-none"
              style={inputStyle}
            />
            <Button type="button" tone="quiet" className="mt-2" onClick={addExample}>
              <Plus size={13} /> Add example
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
