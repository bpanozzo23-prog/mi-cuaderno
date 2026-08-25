/**
 * Curated reference content for the Gym's Contrasts lane (docs/CONTRAST-LANE-DIRECTION.md).
 *
 * Four-choice cloze over short, original, everyday sentences: one blank, exactly one correct
 * option. Like the Usage and Endings content these constants know nothing about React,
 * IndexedDB or an installed dictionary, and their ids are stable so they can safely be
 * written to the event log.
 *
 * Curation rules (the direction's, restated where they bite):
 * - A sentence with two defensible answers is cut, not shipped fuzzy. Where an alternative
 *   is legitimately acceptable it sits in `alsoAcceptable`, which the deck builder forbids
 *   as a distractor, so the offered set still holds exactly one right answer.
 * - Ser/estar options are conjugated forms. Distractor order: the same-person form of the
 *   other verb, then another form of the answer verb, then a past form.
 * - Por/para distractors: the other member first, then two prepositions that fit the syntax
 *   but change the meaning.
 * - `gloss` is shown only after answering, so the question never leaks the rule.
 * - One canonical rule per card; the list must resist growing into an enumeration of sub-uses.
 */

export const CONTRAST_PAIRS = {
  "ser-estar": {
    id: "ser-estar",
    label: "Ser / estar",
    eyebrow: "Which verb?",
    // Present forms of both verbs plus the third-person past forms used by the past cards.
    vocabulary: [
      "soy", "eres", "es", "somos", "son",
      "estoy", "estás", "está", "estamos", "están",
      "era", "estaba", "fue", "estuvo",
    ],
  },
  "por-para": {
    id: "por-para",
    label: "Por / para",
    eyebrow: "Which preposition?",
    vocabulary: ["por", "para", "a", "de", "en", "con"],
  },
  connectors: {
    id: "connectors",
    label: "Connectors",
    eyebrow: "Which connector?",
    // Not a pair: one set spanning cause, consequence, contrast, concession, addition and time.
    vocabulary: ["pero", "aunque", "sin embargo", "porque", "por eso", "así que", "además", "en cambio", "mientras", "entonces"],
  },
};

export const CONTRAST_PAIR_IDS = Object.keys(CONTRAST_PAIRS);

/**
 * Multi-word or long terms only: the shared guide matcher is a substring test, and `para` alone
 * would match *Comparativos*. A single word qualifies only when it is long and distinctive
 * (`conectores`), never a function word.
 */
export const CONTRAST_GUIDE_TERMS = {
  "ser-estar": ["ser y estar", "ser vs estar", "ser vs. estar", "ser/estar", "ser o estar", "ser and estar"],
  "por-para": ["por y para", "por vs para", "por vs. para", "por/para", "por o para", "por and para"],
  connectors: ["conectores", "connectors", "palabras de enlace", "marcadores del discurso", "pero y aunque", "porque y por eso"],
};

const contrast = (pair, slug, answer, prompt, gloss, rule, confusables, options = {}) => ({
  id: `contrast:${pair}:${slug}`,
  skill: "contrast",
  pair,
  answer,
  prompt,
  gloss,
  contrast: rule,
  alsoAcceptable: options.alsoAcceptable || [],
  confusables,
  vocabulary: CONTRAST_PAIRS[pair].vocabulary,
});

const SER_ESTAR = "ser-estar";
const POR_PARA = "por-para";
const CONNECTORS = "connectors";

const SER_ESTAR_CARDS = [
  // ser — identity, profession, origin
  contrast(SER_ESTAR, "profession", "es",
    "Mi hermana ___ médica.", "My sister is a doctor.",
    "Professions and identity take ser.", ["está", "son", "era"]),
  contrast(SER_ESTAR, "profession-plural", "son",
    "Mis vecinos ___ maestros.", "My neighbours are teachers.",
    "Professions and identity take ser.", ["están", "es", "somos"]),
  contrast(SER_ESTAR, "student", "soy",
    "Yo ___ estudiante de español.", "I am a Spanish student.",
    "What someone is — occupation, identity — takes ser.", ["estoy", "es", "era"]),
  contrast(SER_ESTAR, "friends", "son",
    "Ustedes ___ mis mejores amigos.", "You are my best friends.",
    "Identity and relationships take ser.", ["están", "es", "somos"]),
  contrast(SER_ESTAR, "origin", "somos",
    "Nosotros ___ de Colombia.", "We are from Colombia.",
    "Origin (ser de) takes ser.", ["estamos", "son", "soy"]),
  contrast(SER_ESTAR, "origin-question", "eres",
    "¿De dónde ___ tú?", "Where are you from?",
    "Origin (ser de) takes ser.", ["estás", "es", "era"]),
  // ser — time, dates, events
  contrast(SER_ESTAR, "clock", "son",
    "Ya ___ las tres de la tarde.", "It is already three in the afternoon.",
    "Clock time takes ser.", ["están", "es", "era"]),
  contrast(SER_ESTAR, "weekday", "es",
    "Hoy ___ lunes.", "Today is Monday.",
    "Days and dates take ser.", ["está", "son", "fue"]),
  contrast(SER_ESTAR, "birthday", "es",
    "Mi cumpleaños ___ en octubre.", "My birthday is in October.",
    "Dates take ser, even with 'en'.", ["está", "son", "era"]),
  contrast(SER_ESTAR, "event-place", "es",
    "La fiesta de mañana ___ en casa de Ana.", "Tomorrow's party is at Ana's house.",
    "Where an event takes place uses ser, not estar.", ["está", "son", "estaba"]),
  contrast(SER_ESTAR, "event-past", "fue",
    "El concierto de anoche ___ en el parque.", "Last night's concert was in the park.",
    "Where an event took place uses ser: fue.", ["estuvo", "estaba", "es"],
    { alsoAcceptable: ["era"] }),
  contrast(SER_ESTAR, "meeting-past", "fue",
    "La reunión de ayer ___ muy larga.", "Yesterday's meeting was very long.",
    "How a finished event was uses ser: fue.", ["estuvo", "estaba", "es"],
    { alsoAcceptable: ["era"] }),
  // ser — possession, material, traits
  contrast(SER_ESTAR, "possession", "es",
    "Este libro ___ de mi abuelo.", "This book is my grandfather's.",
    "Possession (ser de) takes ser.", ["está", "son", "era"]),
  contrast(SER_ESTAR, "material", "es",
    "La mesa ___ de madera.", "The table is made of wood.",
    "Material (ser de) takes ser.", ["está", "son", "era"]),
  contrast(SER_ESTAR, "trait", "es",
    "Mi perro ___ muy grande y negro.", "My dog is very big and black.",
    "Inherent traits take ser.", ["está", "son", "era"]),
  contrast(SER_ESTAR, "personality", "son",
    "Mis amigos ___ muy simpáticos.", "My friends are very nice.",
    "Personality traits take ser.", ["están", "es", "somos"]),
  contrast(SER_ESTAR, "height", "eres",
    "Tú ___ muy alto para tu edad.", "You are very tall for your age.",
    "Physical traits take ser.", ["estás", "es", "era"]),
  contrast(SER_ESTAR, "room-past", "era",
    "De niño, mi cuarto ___ pequeño pero bonito.", "As a child, my room was small but nice.",
    "A trait described in the past takes ser: era.", ["estaba", "es", "fue"]),
  // estar — location
  contrast(SER_ESTAR, "keys", "están",
    "Las llaves ___ en la mesa.", "The keys are on the table.",
    "Where people and things are takes estar.", ["son", "está", "estamos"]),
  contrast(SER_ESTAR, "mother-work", "está",
    "Mi madre ___ en el trabajo ahora.", "My mother is at work now.",
    "Where people and things are takes estar.", ["es", "están", "estaba"]),
  contrast(SER_ESTAR, "kitchen", "estamos",
    "Nosotros ___ en la cocina.", "We are in the kitchen.",
    "Where people and things are takes estar.", ["somos", "están", "estoy"]),
  contrast(SER_ESTAR, "vacation", "están",
    "Mis padres ___ de vacaciones.", "My parents are on holiday.",
    "Estar de + situation: de vacaciones, de viaje.", ["son", "está", "estamos"]),
  // estar — condition, feelings, change
  contrast(SER_ESTAR, "soup", "está",
    "La sopa ___ fría; caliéntala.", "The soup is cold; heat it up.",
    "A current condition takes estar.", ["es", "están", "era"]),
  contrast(SER_ESTAR, "coffee", "está",
    "El café ___ demasiado caliente todavía.", "The coffee is still too hot.",
    "A current condition takes estar.", ["es", "están", "era"]),
  contrast(SER_ESTAR, "happy", "estoy",
    "Ahora mismo ___ muy contento.", "Right now I am very happy.",
    "Feelings and moods take estar.", ["soy", "está", "estás"]),
  contrast(SER_ESTAR, "sad", "estás",
    "¿Por qué ___ triste, María?", "Why are you sad, María?",
    "Feelings and moods take estar.", ["eres", "está", "estaba"]),
  contrast(SER_ESTAR, "quiet-today", "están",
    "Ustedes ___ muy callados hoy. ¿Pasa algo?", "You are very quiet today. Is something wrong?",
    "A change from the usual takes estar.", ["son", "está", "estamos"]),
  contrast(SER_ESTAR, "sick", "está",
    "Mi abuelo ___ enfermo esta semana.", "My grandfather is ill this week.",
    "Health takes estar.", ["es", "están", "era"]),
  // estar — progressive and resulting states
  contrast(SER_ESTAR, "playing", "están",
    "Los niños ___ jugando en el patio.", "The children are playing in the yard.",
    "Estar + -ando/-iendo forms the progressive.", ["son", "está", "estamos"]),
  contrast(SER_ESTAR, "studying", "estoy",
    "Ahora ___ estudiando para el examen.", "Right now I am studying for the exam.",
    "Estar + -ando/-iendo forms the progressive.", ["soy", "está", "estás"]),
  contrast(SER_ESTAR, "shop-closed", "está",
    "La tienda ___ cerrada los domingos.", "The shop is closed on Sundays.",
    "A resulting state (participle) takes estar.", ["es", "están", "era"]),
  contrast(SER_ESTAR, "door-past", "estaba",
    "Cuando llegué, la puerta ___ abierta.", "When I arrived, the door was open.",
    "A state in the past takes estar: estaba.", ["era", "está", "estuvo"]),
];

const POR_PARA_CARDS = [
  // por — thanks, cause, emotion cause
  contrast(POR_PARA, "thanks", "por",
    "Gracias ___ tu ayuda.", "Thanks for your help.",
    "Thanks and reasons take por.", ["para", "de", "a"]),
  contrast(POR_PARA, "rain", "por",
    "No salimos ___ la lluvia.", "We did not go out because of the rain.",
    "Cause or reason takes por.", ["para", "con", "de"]),
  contrast(POR_PARA, "fault", "por",
    "Lo siento, fue ___ mi culpa.", "I am sorry, it was my fault.",
    "Cause takes por: por mi culpa.", ["para", "de", "a"]),
  contrast(POR_PARA, "worried", "por",
    "Estoy muy preocupado ___ el examen.", "I am very worried about the exam.",
    "The cause of a feeling takes por: preocupado por.", ["para", "de", "con"]),
  // por — duration, exchange, price
  contrast(POR_PARA, "duration", "por",
    "Viví en México ___ dos años.", "I lived in Mexico for two years.",
    "Duration takes por.", ["para", "en", "de"]),
  contrast(POR_PARA, "swap", "por",
    "Te cambio mi sándwich ___ tu manzana.", "I will swap you my sandwich for your apple.",
    "Exchange takes por.", ["para", "con", "a"]),
  contrast(POR_PARA, "price", "por",
    "¿Cuánto pagaste ___ esa bicicleta?", "How much did you pay for that bicycle?",
    "The price paid takes por.", ["para", "a", "de"]),
  // por — through, means, agent, frequency
  contrast(POR_PARA, "park", "por",
    "Caminamos ___ el parque toda la tarde.", "We walked around the park all afternoon.",
    "Movement through or around a place takes por.", ["para", "a", "de"],
    { alsoAcceptable: ["en"] }),
  contrast(POR_PARA, "stop-by", "por",
    "Pasamos ___ tu casa a las ocho para recogerte.", "We will stop by your house at eight to pick you up.",
    "Pasar por = to stop by.", ["para", "a", "de"]),
  contrast(POR_PARA, "phone", "por",
    "Hablamos ___ teléfono cada domingo.", "We talk on the phone every Sunday.",
    "Means of communication takes por.", ["para", "en", "a"]),
  contrast(POR_PARA, "email", "por",
    "Mándame la foto ___ correo electrónico.", "Send me the photo by email.",
    "Means of communication takes por.", ["para", "en", "a"]),
  contrast(POR_PARA, "agent", "por",
    "El libro fue escrito ___ una autora chilena.", "The book was written by a Chilean author.",
    "The agent of a passive takes por.", ["para", "de", "a"]),
  contrast(POR_PARA, "per-week", "por",
    "Tomo el autobús dos veces ___ semana.", "I take the bus twice a week.",
    "Frequency ('per') takes por; 'a la semana' also works.", ["para", "en", "de"],
    { alsoAcceptable: ["a"] }),
  contrast(POR_PARA, "morning", "por",
    "Siempre tomo café ___ la mañana.", "I always drink coffee in the morning.",
    "Parts of the day take por (en in much of Latin America).", ["para", "a", "de"],
    { alsoAcceptable: ["en"] }),
  // por — on behalf of, vote for
  contrast(POR_PARA, "cover-shift", "por",
    "Hoy trabajo ___ mi compañero, que está enfermo.", "Today I am working in place of my colleague, who is ill.",
    "In place of / on behalf of takes por.", ["para", "con", "a"]),
  contrast(POR_PARA, "vote", "por",
    "Voy a votar ___ la candidata más joven.", "I am going to vote for the youngest candidate.",
    "Votar por = to vote for.", ["para", "a", "con"]),
  // para — purpose
  contrast(POR_PARA, "purpose-family", "para",
    "Estudio español ___ hablar con mi familia.", "I study Spanish in order to talk with my family.",
    "Purpose + infinitive takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "purpose-flowers", "para",
    "Compré flores ___ regalarle a mi madre.", "I bought flowers to give to my mother.",
    "Purpose + infinitive takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "purpose-practice", "para",
    "Este ejercicio es ___ practicar el subjuntivo.", "This exercise is for practising the subjunctive.",
    "Purpose + infinitive takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "purpose-project", "para",
    "Necesitamos más tiempo ___ terminar el proyecto.", "We need more time to finish the project.",
    "Purpose + infinitive takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "box", "para",
    "Esta caja es ___ guardar los juguetes.", "This box is for keeping the toys in.",
    "Intended use takes para.", ["por", "a", "de"]),
  // para — recipient, addressee
  contrast(POR_PARA, "gift", "para",
    "Este regalo es ___ ti.", "This present is for you.",
    "The recipient takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "cookies", "para",
    "Estas galletas son ___ la fiesta de mañana.", "These biscuits are for tomorrow's party.",
    "What something is intended for takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "question", "para",
    "Tengo una pregunta ___ el profesor.", "I have a question for the teacher.",
    "The person something is addressed to takes para.", ["por", "a", "de"]),
  // para — destination, deadline
  contrast(POR_PARA, "destination", "para",
    "Mañana salimos ___ Madrid.", "Tomorrow we leave for Madrid.",
    "Destination takes para (a also works).", ["por", "de", "en"],
    { alsoAcceptable: ["a"] }),
  contrast(POR_PARA, "train", "para",
    "El tren ___ Barcelona sale a las nueve.", "The train to Barcelona leaves at nine.",
    "Destination takes para (a also works).", ["por", "de", "en"],
    { alsoAcceptable: ["a"] }),
  contrast(POR_PARA, "deadline", "para",
    "La tarea es ___ el viernes.", "The homework is due on Friday.",
    "A deadline takes para.", ["por", "a", "en"]),
  contrast(POR_PARA, "countdown", "para",
    "Falta una semana ___ las vacaciones.", "There is one week left until the holidays.",
    "Time remaining until takes para.", ["por", "a", "de"]),
  // para — opinion, employer, comparison
  contrast(POR_PARA, "opinion", "para",
    "El español, ___ mí, es más fácil que el francés.", "For me, Spanish is easier than French.",
    "An opinion takes para: para mí.", ["por", "a", "de"]),
  contrast(POR_PARA, "employer", "para",
    "Mi prima trabaja ___ una empresa de software.", "My cousin works for a software company.",
    "The employer takes para: trabajar para.", ["por", "con", "de"],
    { alsoAcceptable: ["en"] }),
  contrast(POR_PARA, "compare-child", "para",
    "Lee muy bien ___ un niño de cinco años.", "He reads very well for a five-year-old.",
    "Comparison against what is expected takes para.", ["por", "a", "de"]),
  contrast(POR_PARA, "compare-young", "para",
    "Tiene mucha experiencia ___ ser tan joven.", "She has a lot of experience for someone so young.",
    "Comparison against what is expected takes para.", ["por", "a", "de"]),
];

/**
 * Connectors are far more interchangeable than por/para, so each sentence is framed to admit
 * one connector in its slot: clause order, punctuation (a full stop before `sin embargo`, a
 * question before `porque`) and sentence position do the forcing, and every second defensible
 * connector sits in `alsoAcceptable`. Distractor #1 is the opposite direction of the same
 * relation (cause ↔ consequence, concession ↔ contrast) unless that one is itself acceptable.
 */
const CONNECTOR_CARDS = [
  // cause — porque, forced by a question-and-answer frame
  contrast(CONNECTORS, "cause-party", "porque",
    "¿Por qué no viniste a la fiesta? — ___ estaba enfermo.", "Why didn't you come to the party? — Because I was ill.",
    "Porque introduces the cause; por eso introduces the consequence.", ["por eso", "aunque", "mientras"]),
  contrast(CONNECTORS, "cause-late", "porque",
    "¿Por qué llegaste tarde? — ___ el autobús no pasó.", "Why were you late? — Because the bus didn't come.",
    "Porque introduces the cause; por eso introduces the consequence.", ["por eso", "así que", "mientras"]),
  contrast(CONNECTORS, "cause-study", "porque",
    "¿Por qué estudias español? — ___ mi familia vive en México.", "Why do you study Spanish? — Because my family lives in Mexico.",
    "Porque introduces the cause; por eso introduces the consequence.", ["por eso", "aunque", "entonces"]),
  // consequence — por eso / así que, each acceptable where the other is the answer
  contrast(CONNECTORS, "result-party", "por eso",
    "Estaba enfermo; ___ no fui a la fiesta.", "I was ill; that's why I didn't go to the party.",
    "Por eso introduces the consequence; porque would introduce the cause.", ["porque", "pero", "además"],
    { alsoAcceptable: ["así que", "entonces"] }),
  contrast(CONNECTORS, "result-money", "por eso",
    "No tengo dinero; ___ no puedo viajar este verano.", "I have no money; that's why I can't travel this summer.",
    "Por eso introduces the consequence; porque would introduce the cause.", ["porque", "aunque", "mientras"],
    { alsoAcceptable: ["así que", "entonces"] }),
  contrast(CONNECTORS, "result-rain", "por eso",
    "Llovía muchísimo; ___ cancelaron el partido.", "It was pouring; that's why they cancelled the match.",
    "Por eso introduces the consequence; porque would introduce the cause.", ["porque", "sin embargo", "mientras"],
    { alsoAcceptable: ["así que", "entonces"] }),
  contrast(CONNECTORS, "so-sleep", "así que",
    "Ya es tarde, ___ me voy a dormir.", "It's late, so I'm going to bed.",
    "Así que draws the consequence; porque would give the reason.", ["porque", "pero", "aunque"],
    { alsoAcceptable: ["por eso", "entonces"] }),
  contrast(CONNECTORS, "so-bread", "así que",
    "No había pan, ___ fui a la panadería.", "There was no bread, so I went to the bakery.",
    "Así que draws the consequence; porque would give the reason.", ["porque", "mientras", "en cambio"],
    { alsoAcceptable: ["por eso", "entonces"] }),
  // contrast — pero
  contrast(CONNECTORS, "but-come", "pero",
    "Ven, ___ no llegues tarde.", "Come, but don't be late.",
    "Pero contrasts two clauses; aunque would concede one.", ["aunque", "porque", "así que"]),
  contrast(CONNECTORS, "but-time", "pero",
    "Quiero ir, ___ no tengo tiempo.", "I want to go, but I have no time.",
    "Pero contrasts two clauses; aunque would concede one.", ["porque", "por eso", "mientras"],
    { alsoAcceptable: ["aunque", "sin embargo"] }),
  contrast(CONNECTORS, "but-small", "pero",
    "Es pequeño ___ muy cómodo.", "It is small but very comfortable.",
    "Pero contrasts two qualities; aunque would concede one.", ["además", "en cambio", "porque"],
    { alsoAcceptable: ["aunque"] }),
  // concession — aunque, forced by sentence-initial position
  contrast(CONNECTORS, "although-rain", "aunque",
    "___ llovía mucho, salimos a caminar.", "Although it was raining hard, we went out for a walk.",
    "Aunque opens a concession; pero cannot open the sentence this way.", ["pero", "porque", "por eso"]),
  contrast(CONNECTORS, "although-tired", "aunque",
    "___ estoy cansado, voy a terminar el trabajo hoy.", "Although I'm tired, I'm going to finish the work today.",
    "Aunque opens a concession; pero cannot open the sentence this way.", ["pero", "porque", "así que"]),
  contrast(CONNECTORS, "although-money", "aunque",
    "___ no tengo mucho dinero, soy feliz.", "Although I don't have much money, I am happy.",
    "Aunque opens a concession; pero cannot open the sentence this way.", ["pero", "además", "por eso"]),
  // adversative after a full stop — sin embargo
  contrast(CONNECTORS, "however-exam", "sin embargo",
    "Estudió mucho. ___, no aprobó el examen.", "He studied a lot. However, he didn't pass the exam.",
    "Sin embargo opens a new sentence; pero joins two clauses.", ["pero", "además", "por eso"]),
  contrast(CONNECTORS, "however-hotel", "sin embargo",
    "El hotel era caro. ___, la comida era excelente.", "The hotel was expensive. However, the food was excellent.",
    "Sin embargo opens a new sentence; pero joins two clauses.", ["pero", "además", "porque"],
    { alsoAcceptable: ["en cambio"] }),
  contrast(CONNECTORS, "however-beach", "sin embargo",
    "Hace frío. ___, los niños quieren ir a la playa.", "It's cold. However, the children want to go to the beach.",
    "Sin embargo opens a new sentence; pero joins two clauses.", ["pero", "así que", "además"]),
  // comparison of two subjects — en cambio
  contrast(CONNECTORS, "whereas-tea", "en cambio",
    "A mí me gusta el café; a mi hermana, ___, le gusta el té.", "I like coffee; my sister, on the other hand, likes tea.",
    "En cambio sets two subjects against each other.", ["además", "por eso", "porque"],
    { alsoAcceptable: ["sin embargo"] }),
  contrast(CONNECTORS, "whereas-parents", "en cambio",
    "Mi padre es muy tranquilo; mi madre, ___, es muy nerviosa.", "My father is very calm; my mother, on the other hand, is very anxious.",
    "En cambio sets two subjects against each other.", ["además", "así que", "mientras"],
    { alsoAcceptable: ["sin embargo"] }),
  // addition — además
  contrast(CONNECTORS, "besides-cheap", "además",
    "Es barato y, ___, está cerca de casa.", "It's cheap and, besides, it's close to home.",
    "Además adds a point; pero would contrast one.", ["pero", "en cambio", "por eso"]),
  contrast(CONNECTORS, "besides-rain", "además",
    "No quiero salir: estoy cansado y, ___, llueve.", "I don't want to go out: I'm tired and, besides, it's raining.",
    "Además adds a point; pero would contrast one.", ["pero", "sin embargo", "mientras"]),
  contrast(CONNECTORS, "besides-city", "además",
    "Es una ciudad bonita. ___, tiene un clima perfecto.", "It's a pretty city. Besides, it has perfect weather.",
    "Además adds a point; sin embargo would contrast one.", ["pero", "sin embargo", "por eso"]),
  // simultaneity — mientras
  contrast(CONNECTORS, "while-cook", "mientras",
    "Cocino ___ escucho música.", "I cook while I listen to music.",
    "Mientras joins two things happening at once.", ["entonces", "porque", "pero"]),
  contrast(CONNECTORS, "while-study", "mientras",
    "Mi hermano estudia ___ yo trabajo.", "My brother studies while I work.",
    "Mientras joins two things happening at once.", ["entonces", "aunque", "por eso"]),
  // sequence — entonces
  contrast(CONNECTORS, "then-run", "entonces",
    "Terminé el trabajo y ___ salí a correr.", "I finished work and then went out for a run.",
    "Entonces marks what came next.", ["mientras", "porque", "aunque"],
    { alsoAcceptable: ["por eso"] }),
  contrast(CONNECTORS, "then-beach", "entonces",
    "Si no llueve mañana, ___ vamos a la playa.", "If it doesn't rain tomorrow, then we'll go to the beach.",
    "Entonces marks what follows.", ["mientras", "porque", "aunque"]),
];

export const CONTRAST_CARDS = [...SER_ESTAR_CARDS, ...POR_PARA_CARDS, ...CONNECTOR_CARDS];

const ALL_SETS = new Set(["all", "both", undefined, null, ""]);
const setIds = (pairIds) => (ALL_SETS.has(pairIds) ? CONTRAST_PAIR_IDS : [].concat(pairIds));

/** The union option vocabulary of the chosen sets — the Contrasts analogue of `recognitionTenses`. */
export function contrastOptions(pairIds) {
  return [...new Set(setIds(pairIds).flatMap((id) => CONTRAST_PAIRS[id]?.vocabulary || []))];
}

/** The cards for one set id, `"all"` (or the older `"both"`), or a list of set ids. */
export function contrastCards(pairIds) {
  const ids = new Set(setIds(pairIds));
  return CONTRAST_CARDS.filter((card) => ids.has(card.pair));
}
