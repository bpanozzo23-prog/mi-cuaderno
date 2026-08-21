import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { C, SERIF } from "../theme.jsx";
import { dictionaryInstalled, getVerbTablesByLemma } from "../db/ref/entries.js";
import { GYM_SLOTS } from "../lib/conjugationGym.js";
import { qualifiedTenseLabel } from "../lib/conjugation.js";
import { endingsForTense } from "../lib/taller.js";
import { scaffoldForCategory } from "../lib/tallerScaffolds.js";

const FALLBACK_TENSE = "Indicative/Present";

/**
 * Transient drill furniture (docs/DIARIO-TALLER-DIRECTION.md): a tense-targeted prompt keeps
 * its regular endings always visible, while the category word bank and the live dictionary
 * verb lookup sit behind one disclosure. Read-only throughout — the lookup resolves a typed
 * lemma at render through the reference layer and stores no `dict:` key anywhere, so the §5
 * orphan path can never be needed; with no dictionary installed the lookup simply is not
 * offered, because "not installed" is not "orphaned".
 */
export default function TallerScaffold({ prompt }) {
  const [open, setOpen] = useState(false);
  const [dictReady, setDictReady] = useState(false);
  const [lookupDraft, setLookupDraft] = useState("");
  const [lookup, setLookup] = useState(null);
  const [searching, setSearching] = useState(false);

  const endings = endingsForTense(prompt?.tense);
  const bank = scaffoldForCategory(prompt?.category);
  const targetTense = prompt?.tense || FALLBACK_TENSE;

  useEffect(() => {
    let live = true;
    dictionaryInstalled()
      .then((installed) => {
        if (live) setDictReady(Boolean(installed));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function searchVerb() {
    const lemma = lookupDraft.trim();
    if (!lemma || searching) return;
    setSearching(true);
    try {
      const [result] = await getVerbTablesByLemma([lemma]);
      if (!result?.available) {
        setLookup({ lemma, forms: null });
        return;
      }
      const tense = result.conjugation.tenses?.[targetTense] ? targetTense : FALLBACK_TENSE;
      const table = result.conjugation.tenses?.[tense] || {};
      setLookup({
        lemma: result.entry.lemma || lemma,
        tense,
        forms: GYM_SLOTS
          .map((slot) => ({ slot, form: table[slot] }))
          .filter((row) => row.form),
      });
    } catch {
      setLookup({ lemma, forms: null });
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mt-3">
      {endings.length > 0 && (
        <div aria-label="Regular endings" className="rounded-lg border p-2" style={{ background: C.paper, borderColor: C.line }}>
          <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
            {qualifiedTenseLabel(prompt.tense)}
          </div>
          {endings.map((row) => (
            <div key={row.id} className="mt-1 text-xs" style={{ color: C.ink }}>
              {row.prompt}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs"
        style={{ color: C.pen }}
      >
        <ChevronDown size={13} /> Apoyos
      </button>
      {open && (
        <div className="space-y-2">
          {bank.map((group) => (
            <div key={group.label}>
              <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
                {group.label}
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border px-2 py-0.5 text-xs"
                    style={{ background: C.paper, borderColor: C.chipBorder, color: C.ink, fontFamily: SERIF }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {dictReady && (
            <div aria-label="Verb lookup">
              <div className="flex gap-2">
                <input
                  aria-label="Look up a verb"
                  value={lookupDraft}
                  onChange={(event) => setLookupDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchVerb();
                    }
                  }}
                  placeholder="¿Cómo se conjuga…? (hablar)"
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ background: C.card, borderColor: C.line, color: C.ink }}
                />
                <button
                  type="button"
                  onClick={searchVerb}
                  aria-label="Search verb"
                  disabled={searching || !lookupDraft.trim()}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border"
                  style={{ background: C.card, borderColor: C.line, color: C.pen }}
                >
                  <Search size={15} />
                </button>
              </div>
              {lookup && (
                lookup.forms ? (
                  <div className="mt-2 rounded-lg border p-2" style={{ background: C.paper, borderColor: C.line }}>
                    <div className="text-[11px] uppercase" style={{ color: C.mut, letterSpacing: "0.08em" }}>
                      {lookup.lemma} · {qualifiedTenseLabel(lookup.tense)}
                    </div>
                    {lookup.forms.map((row) => (
                      <div key={row.slot} className="mt-1 flex justify-between gap-3 text-xs">
                        <span style={{ color: C.mut }}>{row.slot}</span>
                        <span style={{ color: C.ink, fontFamily: SERIF }}>{row.form}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs" style={{ color: C.mut }}>
                    No hay un verbo «{lookup.lemma}» en el diccionario instalado.
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
