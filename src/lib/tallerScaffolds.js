/**
 * Static word banks for Taller drills — transient drill furniture shipped with the prompt
 * library (docs/DIARIO-TALLER-DIRECTION.md). Nothing here is ever stored on a page or an
 * event; the drill renders a bank for its prompt's category and forgets it.
 */
export const TALLER_SCAFFOLDS = Object.freeze({
  narrate: [
    {
      label: "Time markers",
      items: ["primero", "luego", "después", "mientras", "de repente", "en cuanto", "al final", "ya"],
    },
    {
      label: "Sentence starters",
      items: ["Esta mañana...", "Cuando...", "Estaba... cuando...", "Antes siempre...", "Hoy he..."],
    },
  ],
  imagine: [
    {
      label: "Subjunctive triggers",
      items: ["Espero que", "Ojalá", "Quiero que", "Dudo que", "Me alegra que", "Es posible que", "No creo que"],
    },
    {
      label: "Sentence starters",
      items: ["Mañana voy a...", "Si pudiera...", "Yo le recomendaría...", "Me gustaría que..."],
    },
  ],
  connect: [
    {
      label: "Connectors",
      items: ["aunque", "sin embargo", "por eso", "además", "en cambio", "a pesar de", "por lo tanto"],
    },
    {
      label: "Comparisons",
      items: ["más... que", "menos... que", "tan... como", "el mejor / el peor"],
    },
  ],
  /** Fallback for the reflective categories, so a reflective drill is not bare. */
  general: [
    {
      label: "Connectors",
      items: ["porque", "pero", "también", "entonces", "por ejemplo", "sobre todo"],
    },
    {
      label: "Sentence starters",
      items: ["Hoy...", "Me di cuenta de que...", "Lo que más me llamó la atención fue...", "Al final del día..."],
    },
  ],
});

export function scaffoldForCategory(categoryId) {
  return TALLER_SCAFFOLDS[categoryId] || TALLER_SCAFFOLDS.general;
}
