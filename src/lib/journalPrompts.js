export const JOURNAL_PROMPT_CATEGORIES = Object.freeze([
  { id: "notice", label: "Notice" },
  { id: "reflect", label: "Reflect" },
  { id: "spanish", label: "Spanish" },
  { id: "grow", label: "Grow" },
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
]);
