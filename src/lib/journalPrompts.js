export const JOURNAL_PROMPT_CATEGORIES = Object.freeze([
  { id: "notice", label: "Notice" },
  { id: "reflect", label: "Reflect" },
  { id: "spanish", label: "Spanish" },
  { id: "grow", label: "Grow" },
  { id: "narrate", label: "Narrate" },
  { id: "imagine", label: "Imagine" },
  { id: "connect", label: "Connect" },
]);

/**
 * Optional writing nudges. IDs and selections are intentionally never stored on a page.
 *
 * Skill prompts may carry optional Taller drill data: `easier`/`harder` `{es, en}` tier
 * variants, a `tense` naming the targeted conjugation table key (exact `"Mood/Tense"` from
 * `conjugation.js`, so stats and endings scaffolds need no mapping), a human-readable `focus`
 * for non-tense grammar/vocabulary targets, and `offersWords` marking prompts where the drill
 * may show a few of the owner's own saved words.
 *
 * Skill prompts also carry an `example`: a short Spanish-only model answer to the base prompt
 * (deliberately no English — reading it is comprehension practice). It is transient display
 * furniture behind the editor's Ejemplo disclosure, never stored or inserted into an entry.
 */
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

  {
    id: "narrate-scene", category: "narrate", tense: "Indicative/Preterite", offersWords: true,
    es: "Cuenta algo que pasó hoy: usa el imperfecto para la escena y el pretérito para lo que ocurrió.",
    en: "Tell something that happened today: imperfect for the scene, preterite for what occurred.",
    easier: { es: "Cuenta algo que pasó hoy en dos frases: primero cómo era el momento, luego qué ocurrió.", en: "Tell something that happened today in two sentences: first what the moment was like, then what occurred." },
    harder: { es: "Cuenta algo que pasó hoy alternando escena y acción varias veces: qué pasaba alrededor mientras ocurría cada cosa.", en: "Tell something that happened today, alternating scene and action several times: what was going on around you as each thing occurred." },
    example: "Estaba en la cocina y la casa estaba tranquila. De repente sonó el teléfono: era mi hermana con una buena noticia. Colgué y me quedé sonriendo un rato.",
  },
  {
    id: "narrate-interrupted", category: "narrate", tense: "Indicative/Imperfect",
    es: "¿Qué estabas haciendo cuando algo te interrumpió hoy?",
    en: "What were you doing when something interrupted you today?",
    easier: { es: "Completa: «Yo estaba... cuando...».", en: "Complete: \"I was... when...\"" },
    harder: { es: "Cuenta una interrupción de hoy: qué hacías, qué pasó, y qué habías planeado hacer antes.", en: "Tell one interruption from today: what you were doing, what happened, and what you had planned to do before." },
    example: "Yo estaba leyendo en el sofá cuando alguien llamó a la puerta. Era un vecino que necesitaba ayuda con una caja pesada. Cuando volví, mi café ya estaba frío.",
  },
  {
    id: "narrate-before", category: "narrate", tense: "Indicative/Imperfect",
    es: "Compara cómo era tu mañana típica antes con lo que hiciste esta mañana.",
    en: "Compare what your typical morning used to be like with what you did this morning.",
    easier: { es: "Escribe dos frases: «Antes yo siempre...» y «Hoy yo...».", en: "Write two sentences: \"Before, I always...\" and \"Today I...\"" },
    harder: { es: "Compara tu vida de hace unos años con la de hoy: qué hacías entonces, qué hiciste hoy, y qué cambió.", en: "Compare your life a few years ago with today: what you used to do, what you did today, and what changed." },
    example: "Antes yo siempre desayunaba de prisa y salía corriendo. Esta mañana me levanté temprano, preparé el café con calma y hasta leí un poco antes de empezar.",
  },
  {
    id: "narrate-routine", category: "narrate", tense: "Indicative/Preterite", offersWords: true,
    es: "Cuenta tu mañana desde que te despertaste, paso a paso.",
    en: "Tell your morning from the moment you woke up, step by step.",
    easier: { es: "Escribe tres cosas que hiciste esta mañana, en orden.", en: "Write three things you did this morning, in order." },
    harder: { es: "Cuenta tu mañana paso a paso, incluyendo lo que hiciste por ti y lo que otros te hicieron o dijeron.", en: "Tell your morning step by step, including what you did for yourself and what others did or said to you." },
    example: "Me desperté a las siete, me duché y preparé el desayuno. Después revisé el correo y salí a caminar un rato. Volví a casa justo antes de la lluvia.",
  },
  {
    id: "narrate-order", category: "narrate", tense: "Indicative/Preterite", offersWords: true,
    es: "Cuenta un momento de hoy usando «primero», «luego», «mientras» y «al final».",
    en: "Tell one moment of today using \"first,\" \"then,\" \"while,\" and \"in the end.\"",
    easier: { es: "Cuenta un momento de hoy usando «primero» y «luego».", en: "Tell one moment of today using \"first\" and \"then.\"" },
    harder: { es: "Cuenta un momento de hoy usando «en cuanto», «mientras tanto», «justo cuando» y «al final».", en: "Tell one moment of today using \"as soon as,\" \"meanwhile,\" \"just when,\" and \"in the end.\"" },
    example: "Primero fui al mercado a comprar fruta. Luego pasé por la farmacia, y mientras esperaba mi turno, hablé con una señora muy amable. Al final volví a casa cansado pero contento.",
  },
  {
    id: "narrate-perfect", category: "narrate", tense: "Indicative/Present Perfect",
    es: "¿Qué has hecho hoy que nunca habías hecho antes?",
    en: "What have you done today that you had never done before?",
    easier: { es: "Escribe tres frases que empiecen con «Hoy he...».", en: "Write three sentences starting with \"Today I have...\"" },
    harder: { es: "¿Qué has hecho hoy que nunca habías hecho, y qué habías hecho ya muchas veces? Compara.", en: "What have you done today that you had never done, and what had you already done many times? Compare." },
    example: "Hoy he cocinado un plato que nunca había probado. He seguido la receta paso a paso y me ha salido bastante bien. También he aprendido que la paciencia importa más que la prisa.",
  },
  {
    id: "narrate-already", category: "narrate", tense: "Indicative/Past Perfect",
    es: "Elige un momento de hoy: ¿qué ya había pasado antes de ese momento?",
    en: "Pick one moment of today: what had already happened before that moment?",
    easier: { es: "Completa: «Cuando llegué, ya había...».", en: "Complete: \"When I arrived, ... had already...\"" },
    harder: { es: "Cuenta un momento de hoy y tres cosas que ya habían pasado antes de ese momento, en orden.", en: "Tell one moment of today and three things that had already happened before it, in order." },
    example: "Cuando llegué a la oficina, mi compañera ya había hecho café. La reunión ya había empezado, y alguien ya había abierto las ventanas porque hacía calor.",
  },

  {
    id: "imagine-emotions", category: "imagine", tense: "Subjunctive/Present",
    es: "Escribe tres frases que empiecen con «Me alegra que...», «Me molesta que...» o «Dudo que...».",
    en: "Write three sentences starting with \"I'm glad that...,\" \"It bothers me that...,\" or \"I doubt that...\"",
    easier: { es: "Completa una frase: «Me alegra que...».", en: "Complete one sentence: \"I'm glad that...\"" },
    harder: { es: "Escribe sobre tu día usando «me alegra que», «me molesta que», «dudo que» y «es posible que», todo en un párrafo.", en: "Write about your day using \"I'm glad that,\" \"it bothers me that,\" \"I doubt that,\" and \"it's possible that,\" all in one paragraph." },
    example: "Me alegra que mi amiga venga a visitarme este fin de semana. Me molesta que el autobús llegue tarde casi todos los días. Dudo que termine el libro esta semana.",
  },
  {
    id: "imagine-hope", category: "imagine", tense: "Subjunctive/Present",
    es: "¿Qué esperas que pase mañana? Empieza con «Espero que...».",
    en: "What do you hope happens tomorrow? Start with \"I hope that...\"",
    easier: { es: "Completa: «Espero que mañana...».", en: "Complete: \"I hope that tomorrow...\"" },
    harder: { es: "Escribe tres esperanzas para esta semana con «espero que», «ojalá» y «quiero que», y explica por qué.", en: "Write three hopes for this week with \"I hope that,\" \"hopefully,\" and \"I want that,\" and explain why." },
    example: "Espero que mañana haga buen tiempo para salir a caminar. También espero que la reunión sea corta y que me quede energía por la tarde.",
  },
  {
    id: "imagine-advice", category: "imagine", tense: "Indicative/Conditional",
    es: "¿Qué le recomendarías a alguien que viviera tu día de hoy?",
    en: "What would you recommend to someone living your day today?",
    easier: { es: "Completa: «Yo le recomendaría...».", en: "Complete: \"I would recommend...\"" },
    harder: { es: "Dale tres consejos a alguien que fuera a vivir tu día: qué haría bien, qué evitaría y qué cambiaría.", en: "Give three pieces of advice to someone about to live your day: what they would do well, what they would avoid, and what they would change." },
    example: "Yo le recomendaría desayunar con calma y salir a caminar temprano. Le diría que la tarde sería larga, así que guardaría algo de energía para el final.",
  },
  {
    id: "imagine-tomorrow", category: "imagine", tense: "Indicative/Future", offersWords: true,
    es: "Describe tu día de mañana como si ya lo supieras: ¿qué harás?",
    en: "Describe tomorrow as if you already knew it: what will you do?",
    easier: { es: "Escribe tres frases sobre mañana con «voy a...» o «haré...».", en: "Write three sentences about tomorrow with \"I'm going to...\" or \"I will...\"" },
    harder: { es: "Describe mañana hora por hora: qué harás, dónde estarás y cómo te sentirás al final.", en: "Describe tomorrow hour by hour: what you will do, where you will be, and how you will feel at the end." },
    example: "Mañana me levantaré temprano y trabajaré hasta el mediodía. Por la tarde iré al supermercado y prepararé algo rico. Estaré cansado, pero me sentiré tranquilo.",
  },
  {
    id: "imagine-redo", category: "imagine", tense: "Indicative/Conditional",
    es: "Si pudieras repetir un momento de hoy, ¿qué cambiarías?",
    en: "If you could repeat one moment of today, what would you change?",
    easier: { es: "Completa: «Si pudiera repetir hoy, yo...».", en: "Complete: \"If I could repeat today, I...\"" },
    harder: { es: "Si hubieras hecho una cosa de otra manera hoy, ¿qué habría pasado después? Sigue la cadena.", en: "If you had done one thing differently today, what would have happened next? Follow the chain." },
    example: "Si pudiera repetir hoy, cambiaría la tarde. No pasaría dos horas mirando el teléfono; llamaría a mi madre y saldría a caminar antes de que oscureciera.",
  },
  {
    id: "imagine-wish", category: "imagine", tense: "Subjunctive/Present",
    es: "¿Qué quieres que sea diferente esta semana?",
    en: "What do you want to be different this week?",
    easier: { es: "Completa: «Quiero que esta semana...».", en: "Complete: \"I want this week to...\"" },
    harder: { es: "Escribe tres deseos para esta semana con «quiero que», «necesito que» y «ojalá», y di qué harás tú para lograrlos.", en: "Write three wishes for this week with \"I want,\" \"I need,\" and \"hopefully,\" and say what you yourself will do to make them happen." },
    example: "Quiero que esta semana sea más tranquila que la pasada. Quiero que cenemos juntos al menos dos veces, y ojalá el trabajo me deje tiempo para leer.",
  },
  {
    id: "imagine-hypothetical", category: "imagine", tense: "Subjunctive/Imperfect",
    es: "Si tuvieras un día libre mañana, sin obligaciones, ¿qué harías?",
    en: "If you had a free day tomorrow, with no obligations, what would you do?",
    easier: { es: "Completa: «Si tuviera tiempo mañana, yo...».", en: "Complete: \"If I had time tomorrow, I...\"" },
    harder: { es: "Describe tu día ideal usando «si tuviera», «si pudiera» y «si estuviera», y explica por qué cada cosa.", en: "Describe your ideal day using \"if I had,\" \"if I could,\" and \"if I were,\" and explain why each one." },
    example: "Si tuviera un día libre mañana, dormiría hasta tarde y desayunaría sin prisa. Si pudiera, iría al mar, aunque fuera solo por una hora.",
  },
  {
    id: "imagine-regret", category: "imagine", tense: "Subjunctive/Past Perfect",
    es: "Si un momento de hoy hubiera sido diferente, ¿qué habría pasado después?",
    en: "If one moment of today had been different, what would have happened next?",
    easier: { es: "Completa: «Si hubiera salido más temprano, yo...».", en: "Complete: \"If I had left earlier, I...\"" },
    harder: { es: "Elige dos momentos de hoy y cuenta qué habría pasado si cada uno hubiera sido diferente.", en: "Pick two moments of today and tell what would have happened if each one had been different." },
    example: "Si hubiera salido cinco minutos antes, no habría perdido el autobús. Habría llegado con calma y habría tenido tiempo para un café.",
  },

  {
    id: "connect-person", category: "connect", focus: "Ser vs. estar", offersWords: true,
    es: "Describe a una persona que viste hoy: cómo es y cómo estaba.",
    en: "Describe a person you saw today: what they are like, and how they were.",
    easier: { es: "Describe a una persona de hoy con dos frases: una con «es» y otra con «estaba».", en: "Describe a person from today in two sentences: one with \"es\" and one with \"estaba.\"" },
    harder: { es: "Describe a dos personas de hoy: cómo son, cómo estaban, y en qué se parecen o se diferencian.", en: "Describe two people from today: what they are like, how they were, and how they are alike or different." },
    example: "Mi vecino es alto y un poco callado, pero es muy amable. Hoy estaba cansado porque había trabajado toda la noche, y aun así me saludó con una sonrisa.",
  },
  {
    id: "connect-mood", category: "connect", focus: "Descriptive vocabulary", offersWords: true,
    es: "Describe tu estado de ánimo ahora mismo sin usar «bien» ni «mal».",
    en: "Describe your mood right now without using \"bien\" or \"mal.\"",
    easier: { es: "Escribe una frase: «Ahora mismo estoy...» con una palabra nueva.", en: "Write one sentence: \"Right now I am...\" with a new word." },
    harder: { es: "Describe tu estado de ánimo con tres matices distintos y explica de dónde viene cada uno.", en: "Describe your mood in three distinct shades and explain where each one comes from." },
    example: "Ahora mismo estoy tranquilo y un poco soñoliento. El día fue largo, pero me siento satisfecho, como cuando terminas una lista de tareas.",
  },
  {
    id: "connect-opinion", category: "connect", focus: "Connectors",
    es: "Escribe una opinión sobre algo de hoy usando «aunque», «sin embargo» o «por eso».",
    en: "Write an opinion about something today using \"although,\" \"however,\" or \"that's why.\"",
    easier: { es: "Escribe una opinión sobre hoy usando «pero».", en: "Write an opinion about today using \"but.\"" },
    harder: { es: "Defiende una opinión sobre algo de hoy usando «aunque», «sin embargo», «por lo tanto» y «a pesar de».", en: "Defend an opinion about something today using \"although,\" \"however,\" \"therefore,\" and \"despite.\"" },
    example: "Aunque llovió toda la tarde, el día fue bueno. El tráfico estuvo terrible; sin embargo, llegué a tiempo, y por eso decidí no quejarme.",
  },
  {
    id: "connect-porpara", category: "connect", focus: "Por vs. para",
    es: "¿Qué hiciste hoy por alguien, o para qué hiciste lo que hiciste?",
    en: "What did you do today for someone, or what purpose drove what you did?",
    easier: { es: "Escribe dos frases sobre hoy: una con «por» y otra con «para».", en: "Write two sentences about today: one with \"por\" and one with \"para.\"" },
    harder: { es: "Cuenta un momento de hoy usando «por» y «para» al menos dos veces cada uno, con sentidos distintos.", en: "Tell one moment of today using \"por\" and \"para\" at least twice each, with different senses." },
    example: "Hoy compré pan para el desayuno de mañana. Después pasé por casa de mi abuela por su cumpleaños y le llevé flores para alegrarle el día.",
  },
  {
    id: "connect-pronouns", category: "connect", focus: "Object pronouns",
    es: "¿Quién te dijo, te dio o te pidió algo hoy? Cuéntalo.",
    en: "Who told you, gave you, or asked you for something today? Tell it.",
    easier: { es: "Completa: «Hoy alguien me dijo...».", en: "Complete: \"Today someone told me...\"" },
    harder: { es: "Cuenta un intercambio de hoy sin repetir los nombres: usa «se lo», «me la», «te los» donde puedas.", en: "Tell one exchange from today without repeating the names: use \"se lo,\" \"me la,\" \"te los\" where you can." },
    example: "Hoy mi jefa me pidió un favor y se lo hice sin problema. Después mi hermano me mandó una foto del perro y yo le contesté con otra.",
  },
  {
    id: "connect-compare", category: "connect", focus: "Comparisons", offersWords: true,
    es: "Compara dos momentos de hoy usando «más... que», «menos... que» o «tan... como».",
    en: "Compare two moments of today using \"more... than,\" \"less... than,\" or \"as... as.\"",
    easier: { es: "Compara hoy con ayer en una frase con «más... que».", en: "Compare today with yesterday in one sentence with \"more... than.\"" },
    harder: { es: "Compara tres momentos de hoy entre sí: cuál fue el mejor, el peor, y por qué, usando superlativos.", en: "Compare three moments of today with one another: which was the best, the worst, and why, using superlatives." },
    example: "La mañana fue más tranquila que la tarde. El almuerzo estuvo tan rico como el de ayer, y la reunión fue menos larga que la de la semana pasada.",
  },
  {
    id: "connect-gustar", category: "connect", focus: "Gustar patterns", offersWords: true,
    es: "Cuenta tu día con «me encanta», «me molesta», «me cuesta» o «me falta».",
    en: "Tell your day with \"I love,\" \"it bothers me,\" \"it's hard for me,\" or \"I'm missing.\"",
    easier: { es: "Escribe dos frases: una con «me gusta» y otra con «me molesta».", en: "Write two sentences: one with \"I like\" and one with \"it bothers me.\"" },
    harder: { es: "Escribe sobre hoy usando «me encanta», «me cuesta», «me hace falta» y «me duele», cada uno con su porqué.", en: "Write about today using \"I love,\" \"it's hard for me,\" \"I need,\" and \"it hurts,\" each with its reason." },
    example: "Me encanta el silencio de la casa por la mañana. Hoy me costó concentrarme después del almuerzo, y me faltó tiempo para todo lo que quería hacer.",
  },
  {
    id: "connect-duration", category: "connect", focus: "Duration expressions",
    es: "¿Desde cuándo haces algo que hiciste hoy? Usa «desde hace», «llevo» o «acabo de».",
    en: "How long have you been doing something you did today? Use \"desde hace,\" \"llevo,\" or \"acabo de.\"",
    easier: { es: "Completa: «Llevo mucho tiempo...» o «Acabo de...».", en: "Complete: \"Llevo mucho tiempo...\" or \"Acabo de...\"" },
    harder: { es: "Cuenta tres costumbres tuyas con «desde hace», «llevo + gerundio» y «acabar de», y di cómo empezó cada una.", en: "Tell three habits of yours with \"desde hace,\" \"llevo + gerundio,\" and \"acabar de,\" and say how each one began." },
    example: "Llevo dos años escribiendo un poco cada noche. Estudio español desde hace seis meses, y hoy acabo de aprender una palabra nueva que quiero usar mañana.",
  },
]);
