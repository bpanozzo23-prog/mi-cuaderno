/**
 * Curated reference content for the Gym's Transform lane (docs/TRANSFORM-LANE-DIRECTION.md).
 *
 * Each card pairs an indicative sentence with a frame that puts the same verb, same person,
 * under a present-subjunctive trigger. The answer is the verb form alone; the frame carries
 * any tail. Every lemma is one of the curated Gym lemmas, so the installed dictionary's
 * table is already in the Gym library for diagnosis and the paradigm reveal, and a
 * shipped-data test reproduces every `answer` and every base form from the packaged tables.
 * Like the Usage, Endings and Contrasts content this module knows nothing about React,
 * IndexedDB or an installed dictionary, and its ids are stable enough for the event log.
 */

export const TRANSFORM_FAMILIES = {
  doubt: {
    id: "doubt",
    label: "Doubt & denial",
    triggers: ["Dudo que", "No creo que", "No es verdad que", "No pienso que"],
    rule: "Doubt and denial trigger the subjunctive.",
  },
  emotion: {
    id: "emotion",
    label: "Emotion",
    triggers: ["Me alegra que", "Me molesta que", "Siento que", "Me sorprende que", "Tengo miedo de que", "Me preocupa que"],
    rule: "A reaction or feeling about a fact triggers the subjunctive.",
  },
  wish: {
    id: "wish",
    label: "Wish & influence",
    triggers: ["Quiero que", "Espero que", "Prefiero que", "Te pido que", "Ojalá que", "Necesito que"],
    rule: "Wanting, hoping or asking someone else to do something triggers the subjunctive.",
  },
  impersonal: {
    id: "impersonal",
    label: "Impersonal",
    triggers: ["Es posible que", "Es importante que", "Es necesario que", "Es mejor que", "Es raro que", "Es normal que"],
    rule: "Impersonal judgements (es posible / importante / mejor que) trigger the subjunctive.",
  },
  purpose: {
    id: "purpose",
    label: "Purpose & time",
    triggers: ["para que", "antes de que", "hasta que", "cuando (future)", "en cuanto"],
    rule: "Purpose and not-yet-happened time clauses trigger the subjunctive.",
  },
};

export const TRANSFORM_FAMILY_IDS = Object.keys(TRANSFORM_FAMILIES);

/** Long or multi-word only — the shared guide matcher is a substring test. */
export const TRANSFORM_GUIDE_TERMS = ["subjuntivo", "subjunctive", "presente de subjuntivo", "modo subjuntivo"];

const transform = (family, slug, lemma, slot, answer, base, frame, gloss, rule = null) => ({
  id: `transform:${family}:${slug}`,
  skill: "transform",
  family,
  lemma,
  slot,
  tense: "Subjunctive/Present",
  answer,
  base,
  frame,
  gloss,
  rule: rule || TRANSFORM_FAMILIES[family].rule,
});

const EL = "él/ella/usted";
const ELLOS = "ustedes/ellos";

export const TRANSFORM_CARDS = [
  // doubt & denial
  transform("doubt", "venir-viene", "venir", EL, "venga",
    "Sé que viene mañana.", "Dudo que ___ mañana.", "I doubt he's coming tomorrow."),
  transform("doubt", "tener-tiene", "tener", EL, "tenga",
    "Creo que tiene razón.", "No creo que ___ razón.", "I don't think she's right."),
  transform("doubt", "poder-pueden", "poder", ELLOS, "puedan",
    "Dicen que pueden ayudar.", "Dudo que ___ ayudar.", "I doubt they can help."),
  transform("doubt", "ser-es", "ser", EL, "sea",
    "Es verdad que es caro.", "No es verdad que ___ caro.", "It's not true that it's expensive."),
  transform("doubt", "saber-sabe", "saber", EL, "sepa",
    "Pienso que sabe la respuesta.", "No pienso que ___ la respuesta.", "I don't think he knows the answer."),
  transform("doubt", "llegar-llegan", "llegar", ELLOS, "lleguen",
    "Creo que llegan a tiempo.", "No creo que ___ a tiempo.", "I don't think they'll arrive on time."),
  transform("doubt", "estar-esta", "estar", EL, "esté",
    "Dicen que está en casa.", "Dudo que ___ en casa.", "I doubt she's at home."),
  transform("doubt", "entender-entiendes", "entender", "tú", "entiendas",
    "Veo que entiendes el problema.", "No creo que ___ el problema.", "I don't think you understand the problem."),

  // emotion
  transform("emotion", "vivir-vives", "vivir", "tú", "vivas",
    "Vives cerca de aquí.", "Me alegra que ___ cerca de aquí.", "I'm glad you live near here."),
  transform("emotion", "trabajar-trabaja", "trabajar", EL, "trabaje",
    "Mi hermana trabaja los domingos.", "Me molesta que mi hermana ___ los domingos.", "It bothers me that my sister works on Sundays."),
  transform("emotion", "estar-estan", "estar", ELLOS, "estén",
    "Mis padres están enfermos.", "Siento que mis padres ___ enfermos.", "I'm sorry my parents are ill."),
  transform("emotion", "hablar-hablas", "hablar", "tú", "hables",
    "Hablas muy bien español.", "Me sorprende que ___ tan bien español.", "I'm surprised you speak Spanish so well."),
  transform("emotion", "perder-pierden", "perder", ELLOS, "pierdan",
    "Siempre pierden las llaves.", "Me molesta que siempre ___ las llaves.", "It bothers me that they always lose the keys."),
  transform("emotion", "salir-sales", "salir", "tú", "salgas",
    "Sales solo de noche.", "Tengo miedo de que ___ solo de noche.", "I'm afraid of you going out alone at night."),
  transform("emotion", "aprender-aprende", "aprender", EL, "aprenda",
    "Mi hijo aprende rápido.", "Me alegra que mi hijo ___ rápido.", "I'm glad my son learns fast."),
  transform("emotion", "dormir-duermes", "dormir", "tú", "duermas",
    "Duermes muy poco.", "Me preocupa que ___ tan poco.", "It worries me that you sleep so little."),

  // wish & influence
  transform("wish", "hacer-haces", "hacer", "tú", "hagas",
    "Haces la tarea hoy.", "Quiero que ___ la tarea hoy.", "I want you to do the homework today."),
  transform("wish", "volver-vuelve", "volver", EL, "vuelva",
    "Vuelve pronto.", "Espero que ___ pronto.", "I hope she comes back soon."),
  transform("wish", "comer-comemos", "comer", "nosotros", "comamos",
    "Comemos en casa.", "Prefiero que ___ en casa.", "I'd rather we eat at home."),
  transform("wish", "decir-dices", "decir", "tú", "digas",
    "Dices la verdad.", "Te pido que ___ la verdad.", "I'm asking you to tell the truth."),
  transform("wish", "ir-va", "ir", EL, "vaya",
    "Va al médico.", "Ojalá que ___ al médico.", "I hope he goes to the doctor."),
  transform("wish", "traer-traen", "traer", ELLOS, "traigan",
    "Traen los documentos.", "Necesito que ___ los documentos.", "I need them to bring the documents."),
  transform("wish", "empezar-empieza", "empezar", EL, "empiece",
    "La clase empieza a las ocho.", "Quiero que la clase ___ a las ocho.", "I want the class to start at eight."),
  transform("wish", "dar-da", "dar", EL, "dé",
    "Me da su número.", "Espero que me ___ su número.", "I hope she gives me her number."),

  // impersonal
  transform("impersonal", "buscar-busca", "buscar", EL, "busque",
    "Busca otro trabajo.", "Es posible que ___ otro trabajo.", "It's possible he's looking for another job."),
  transform("impersonal", "conocer-conoces", "conocer", "tú", "conozcas",
    "Conoces a mi primo.", "Es posible que ___ a mi primo.", "It's possible you know my cousin."),
  transform("impersonal", "pedir-pedimos", "pedir", "nosotros", "pidamos",
    "Pedimos ayuda.", "Es importante que ___ ayuda.", "It's important that we ask for help."),
  transform("impersonal", "seguir-sigues", "seguir", "tú", "sigas",
    "Sigues las instrucciones.", "Es necesario que ___ las instrucciones.", "It's necessary that you follow the instructions."),
  transform("impersonal", "pagar-pagan", "pagar", ELLOS, "paguen",
    "Pagan con tarjeta.", "Es mejor que ___ con tarjeta.", "It's better that they pay by card."),
  transform("impersonal", "querer-quiere", "querer", EL, "quiera",
    "No quiere venir.", "Es raro que no ___ venir.", "It's odd that he doesn't want to come."),
  transform("impersonal", "sentir-sientes", "sentir", "tú", "sientas",
    "Te sientes cansado.", "Es normal que te ___ cansado.", "It's normal that you feel tired."),
  transform("impersonal", "jugar-juegan", "jugar", ELLOS, "jueguen",
    "Los niños juegan afuera.", "Es mejor que los niños ___ afuera.", "It's better that the children play outside."),

  // purpose & time
  transform("purpose", "entender-entienden", "entender", ELLOS, "entiendan",
    "Lo explico y todos entienden.", "Lo explico para que todos ___.", "I explain it so that everyone understands."),
  transform("purpose", "llegar-llega", "llegar", EL, "llegue",
    "El tren llega a las nueve.", "Esperamos aquí hasta que ___ el tren.", "We'll wait here until the train arrives."),
  transform("purpose", "salir-salimos", "salir", "nosotros", "salgamos",
    "Salimos a las seis.", "Llámame antes de que ___ a las seis.", "Call me before we leave at six."),
  transform("purpose", "tener-tengo", "tener", "yo", "tenga",
    "Tengo tiempo los sábados.", "Te ayudaré cuando ___ tiempo.", "I'll help you when I have time."),
  transform("purpose", "ver-ves", "ver", "tú", "veas",
    "Ves a Ana en la oficina.", "Dile hola cuando ___ a Ana.", "Say hi when you see Ana."),
  transform("purpose", "saber-sabemos", "saber", "nosotros", "sepamos",
    "Sabemos la fecha.", "Te avisamos en cuanto ___ la fecha.", "We'll let you know as soon as we know the date."),
  transform("purpose", "poner-pones", "poner", "tú", "pongas",
    "Pones la mesa.", "No comemos hasta que ___ la mesa.", "We're not eating until you set the table."),
  transform("purpose", "practicar-practicas", "practicar", "tú", "practiques",
    "Practicas cada día.", "Te lo presto para que ___ cada día.", "I'll lend it to you so that you practise every day."),
];

const ALL = new Set(["all", undefined, null, ""]);
const familyIds = (ids) => (ALL.has(ids) ? TRANSFORM_FAMILY_IDS : [].concat(ids));

/** The cards for one family id, `"all"`, or a list of family ids. */
export function transformCards(ids) {
  const allowed = new Set(familyIds(ids));
  return TRANSFORM_CARDS.filter((card) => allowed.has(card.family));
}
