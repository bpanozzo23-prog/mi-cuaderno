export const JOURNAL_PROMPT_CATEGORIES = Object.freeze([
  { id: "notice", label: "Notice" },
  { id: "reflect", label: "Reflect" },
  { id: "spanish", label: "Spanish" },
  { id: "grow", label: "Grow" },
  { id: "narrate", label: "Narrate" },
  { id: "imagine", label: "Imagine" },
  { id: "connect", label: "Connect" },
]);

/** Optional writing nudges. IDs and selections are intentionally never stored on a page. */
export const JOURNAL_PROMPTS = Object.freeze([
  { id: "notice-remember", category: "notice", es: "¿Qué pasó hoy que no quiero olvidar?", en: "What happened today that I do not want to forget?" },
  { id: "notice-small", category: "notice", es: "Describe un momento pequeño que llamó tu atención.", en: "Describe a small moment that caught your attention." },
  { id: "notice-senses", category: "notice", es: "¿Qué viste, oíste, oliste o saboreaste hoy?", en: "What did you see, hear, smell, or taste today?" },
  { id: "notice-place", category: "notice", es: "Describe un lugar donde estuviste hoy.", en: "Describe a place where you spent time today." },
  { id: "notice-conversation", category: "notice", es: "¿Qué conversación se te quedó grabada?", en: "Which conversation stayed with you?" },
  { id: "notice-surprise", category: "notice", es: "¿Qué te sorprendió hoy?", en: "What surprised you today?" },

  { id: "reflect-feeling", category: "reflect", es: "¿Qué emoción fue más fuerte hoy y por qué?", en: "Which feeling was strongest today, and why?" },
  { id: "reflect-energy", category: "reflect", es: "¿Qué te dio energía y qué te la quitó?", en: "What gave you energy, and what took it away?" },
  { id: "reflect-choice", category: "reflect", es: "¿Qué decisión tomaste hoy?", en: "What decision did you make today?" },
  { id: "reflect-different", category: "reflect", es: "¿Qué harías de otra manera si repitieras el día?", en: "What would you do differently if you repeated the day?" },
  { id: "reflect-question", category: "reflect", es: "¿Qué pregunta sigue contigo al terminar el día?", en: "What question is still with you at the end of the day?" },
  { id: "reflect-meaning", category: "reflect", es: "¿Qué pareció importante hoy?", en: "What felt important today?" },

  { id: "spanish-word", category: "spanish", es: "¿Qué palabra o frase en español apareció hoy?", en: "Which Spanish word or phrase appeared today?" },
  { id: "spanish-three", category: "spanish", es: "Cuenta un momento de hoy en tres frases en español.", en: "Tell one moment from today in three Spanish sentences." },
  { id: "spanish-heard", category: "spanish", es: "¿Qué entendiste en español que antes habría sido difícil?", en: "What did you understand in Spanish that used to be difficult?" },
  { id: "spanish-stuck", category: "spanish", es: "¿Qué quisiste decir en español pero no pudiste?", en: "What did you want to say in Spanish but could not?" },
  { id: "spanish-rewrite", category: "spanish", es: "Escribe una idea primero libremente y luego otra vez en español.", en: "Write one thought freely, then write it again in Spanish." },
  { id: "spanish-voice", category: "spanish", es: "¿Cómo sonaría este día contado con tu propia voz en español?", en: "How would this day sound in your own Spanish voice?" },

  { id: "grow-grateful", category: "grow", es: "¿Por qué sientes gratitud hoy?", en: "What are you grateful for today?" },
  { id: "grow-learned", category: "grow", es: "¿Qué aprendiste sobre ti hoy?", en: "What did you learn about yourself today?" },
  { id: "grow-courage", category: "grow", es: "¿Cuándo mostraste valentía, aunque fuera pequeña?", en: "When did you show courage, even a little?" },
  { id: "grow-kindness", category: "grow", es: "¿Qué acto de bondad diste o recibiste?", en: "What kindness did you give or receive?" },
  { id: "grow-release", category: "grow", es: "¿Qué puedes dejar ir antes de mañana?", en: "What can you let go of before tomorrow?" },
  { id: "grow-tomorrow", category: "grow", es: "¿Qué intención pequeña quieres llevar a mañana?", en: "What small intention do you want to carry into tomorrow?" },

  { id: "narrate-scene", category: "narrate", es: "Cuenta algo que pasó hoy: usa el imperfecto para la escena y el pretérito para lo que ocurrió.", en: "Tell something that happened today: imperfect for the scene, preterite for what occurred." },
  { id: "narrate-interrupted", category: "narrate", es: "¿Qué estabas haciendo cuando algo te interrumpió hoy?", en: "What were you doing when something interrupted you today?" },
  { id: "narrate-before", category: "narrate", es: "Compara cómo era tu mañana típica antes con lo que hiciste esta mañana.", en: "Compare what your typical morning used to be like with what you did this morning." },
  { id: "narrate-routine", category: "narrate", es: "Cuenta tu mañana desde que te despertaste, paso a paso.", en: "Tell your morning from the moment you woke up, step by step." },
  { id: "narrate-order", category: "narrate", es: "Cuenta un momento de hoy usando «primero», «luego», «mientras» y «al final».", en: "Tell one moment of today using \"first,\" \"then,\" \"while,\" and \"in the end.\"" },
  { id: "narrate-perfect", category: "narrate", es: "¿Qué has hecho hoy que nunca habías hecho antes?", en: "What have you done today that you had never done before?" },

  { id: "imagine-emotions", category: "imagine", es: "Escribe tres frases que empiecen con «Me alegra que...», «Me molesta que...» o «Dudo que...».", en: "Write three sentences starting with \"I'm glad that...,\" \"It bothers me that...,\" or \"I doubt that...\"" },
  { id: "imagine-hope", category: "imagine", es: "¿Qué esperas que pase mañana? Empieza con «Espero que...».", en: "What do you hope happens tomorrow? Start with \"I hope that...\"" },
  { id: "imagine-advice", category: "imagine", es: "¿Qué le recomendarías a alguien que viviera tu día de hoy?", en: "What would you recommend to someone living your day today?" },
  { id: "imagine-tomorrow", category: "imagine", es: "Describe tu día de mañana como si ya lo supieras: ¿qué harás?", en: "Describe tomorrow as if you already knew it: what will you do?" },
  { id: "imagine-redo", category: "imagine", es: "Si pudieras repetir un momento de hoy, ¿qué cambiarías?", en: "If you could repeat one moment of today, what would you change?" },
  { id: "imagine-wish", category: "imagine", es: "¿Qué quieres que sea diferente esta semana?", en: "What do you want to be different this week?" },

  { id: "connect-person", category: "connect", es: "Describe a una persona que viste hoy: cómo es y cómo estaba.", en: "Describe a person you saw today: what they are like, and how they were." },
  { id: "connect-mood", category: "connect", es: "Describe tu estado de ánimo ahora mismo sin usar «bien» ni «mal».", en: "Describe your mood right now without using \"bien\" or \"mal.\"" },
  { id: "connect-opinion", category: "connect", es: "Escribe una opinión sobre algo de hoy usando «aunque», «sin embargo» o «por eso».", en: "Write an opinion about something today using \"although,\" \"however,\" or \"that's why.\"" },
  { id: "connect-porpara", category: "connect", es: "¿Qué hiciste hoy por alguien, o para qué hiciste lo que hiciste?", en: "What did you do today for someone, or what purpose drove what you did?" },
  { id: "connect-pronouns", category: "connect", es: "¿Quién te dijo, te dio o te pidió algo hoy? Cuéntalo.", en: "Who told you, gave you, or asked you for something today? Tell it." },
  { id: "connect-compare", category: "connect", es: "Compara dos momentos de hoy usando «más... que», «menos... que» o «tan... como».", en: "Compare two moments of today using \"more... than,\" \"less... than,\" or \"as... as.\"" },
]);
