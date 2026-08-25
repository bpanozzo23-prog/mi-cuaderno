import { normalize } from "./normalize.js";
import { qualifiedTenseLabel, tenseHeading } from "./conjugation.js";

const SPANISH_TENSE_TERMS = {
  "Indicative/Present": ["presente", "presente indicativo"],
  "Indicative/Preterite": ["pretérito", "pretérito indefinido"],
  "Indicative/Imperfect": ["imperfecto", "pretérito imperfecto"],
  "Indicative/Future": ["futuro", "futuro simple"],
  "Indicative/Conditional": ["condicional", "condicional simple"],
  "Subjunctive/Present": ["presente subjuntivo", "presente de subjuntivo"],
  "Subjunctive/Imperfect": ["imperfecto subjuntivo", "imperfecto de subjuntivo"],
  "Indicative/Present Perfect": ["pretérito perfecto", "presente perfecto"],
  "Indicative/Past Perfect": ["pluscuamperfecto", "pasado perfecto"],
  "Indicative/Future Perfect": ["futuro perfecto"],
  "Indicative/Conditional Perfect": ["condicional perfecto"],
  "Subjunctive/Present Perfect": ["pretérito perfecto de subjuntivo", "presente perfecto de subjuntivo"],
  "Subjunctive/Past Perfect": ["pluscuamperfecto de subjuntivo", "pasado perfecto de subjuntivo"],
  "Imperative Affirmative/Present": ["imperativo afirmativo", "mandato afirmativo"],
  "Imperative Negative/Present": ["imperativo negativo", "mandato negativo"],
};

export function guideTermsForTense(tense) {
  return [...new Set([
    qualifiedTenseLabel(tense),
    tenseHeading(tense),
    ...(SPANISH_TENSE_TERMS[tense] || []),
  ].map(normalize).filter(Boolean))];
}

/**
 * At most two active Grammar-focused pages whose normalized title contains one of the terms.
 * The match is a substring test, so callers must supply terms long enough not to hide inside
 * unrelated titles (the Contrasts lane passes multi-word terms for exactly that reason).
 */
export function grammarGuidesForTerms(items, rawTerms) {
  const terms = [...new Set((rawTerms || []).map(normalize).filter(Boolean))];
  if (!terms.length) return [];
  return (items || [])
    .filter((item) =>
      item?.type === "page" && item.pageFocus === "grammar" && item.grammar?.enabled &&
      terms.some((term) => normalize(item.title).includes(term))
    )
    .slice(0, 2);
}

/** At most two active Grammar-focused pages whose title names this tense. */
export function grammarGuidesForTense(items, tense) {
  return grammarGuidesForTerms(items, guideTermsForTense(tense));
}
