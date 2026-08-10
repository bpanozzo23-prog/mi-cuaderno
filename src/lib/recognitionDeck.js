/** Pure, injectable-rng deck rules shared by both recognition lanes. */

const shuffle = (values, rng) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const optionSetKey = (options) => [...options].sort().join("|");

export function recognitionOptions(
  card,
  { tenseScope, allTenses = tenseScope, rng = Math.random, previousOptions = null } = {}
) {
  const forbidden = new Set([card.answer, ...(card.alsoAcceptable || [])]);
  const scoped = [...new Set(tenseScope || [])].filter((tense) => !forbidden.has(tense));
  const fallback = [...new Set(allTenses || [])].filter((tense) => !forbidden.has(tense));
  const preferred = [
    ...(card.confusables || []).filter((tense) => scoped.includes(tense)),
    ...shuffle(scoped, rng),
    ...(card.confusables || []).filter((tense) => fallback.includes(tense)),
    ...shuffle(fallback, rng),
  ];
  const distractors = [...new Set(preferred)].slice(0, 3);
  if (distractors.length < 3) return [];

  let options = shuffle([card.answer, ...distractors], rng);
  if (previousOptions && optionSetKey(options) === optionSetKey(previousOptions)) {
    const replacement = fallback.find((tense) => !options.includes(tense));
    if (replacement) {
      const replaceAt = options.findIndex((tense) => tense !== card.answer);
      options = shuffle(options.map((tense, index) => index === replaceAt ? replacement : tense), rng);
    }
  }
  return options;
}

function balancedCards(cards, size, rng) {
  const pool = shuffle(cards, rng);
  const deck = [];
  const answerCounts = new Map();
  while (deck.length < size && pool.length) {
    const previous = deck.at(-1);
    const canSwitch = previous && pool.some((card) => card.answer !== previous.answer);
    let bestIndex = 0;
    let bestScore = null;
    for (let index = 0; index < pool.length; index += 1) {
      const card = pool[index];
      const score = [
        canSwitch && card.answer === previous.answer ? 1 : 0,
        answerCounts.get(card.answer) || 0,
      ];
      if (!bestScore || score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
        bestIndex = index;
        bestScore = score;
      }
    }
    const [next] = pool.splice(bestIndex, 1);
    deck.push(next);
    answerCounts.set(next.answer, (answerCounts.get(next.answer) || 0) + 1);
  }
  return deck;
}

/**
 * Builds one finite recognition pass. Card ids never repeat, answers are spread across
 * tenses, consecutive equal answers are avoided whenever possible, and every ask owns
 * a freshly shuffled four-option set.
 */
export function buildRecognitionDeck(
  cards,
  { size = 10, tenseScope = [], allTenses = tenseScope, rng = Math.random } = {}
) {
  const allowed = new Set(tenseScope);
  const candidates = (cards || []).filter((card) => allowed.has(card.answer));
  const selected = balancedCards(candidates, Math.min(size, candidates.length), rng);
  const deck = [];
  let previousOptions = null;
  for (const card of selected) {
    const options = recognitionOptions(card, { tenseScope, allTenses, rng, previousOptions });
    if (options.length !== 4) continue;
    deck.push({ ...card, options });
    previousOptions = options;
  }
  return deck;
}

/** Re-asks missed cards without changing identity and guarantees a fresh option order. */
export function rebuildMissedRecognitionDeck(cards, options = {}) {
  return (cards || []).map((card) => {
    let rebuilt = card.options?.length === 4
      ? shuffle(card.options, options.rng || Math.random)
      : recognitionOptions(card, { ...options, previousOptions: null });
    if (rebuilt.length === 4 && rebuilt.every((value, index) => value === card.options?.[index])) {
      rebuilt = [...rebuilt.slice(1), rebuilt[0]];
    }
    return { ...card, options: rebuilt };
  }).filter((card) => card.options.length === 4);
}

/** Aggregates the authored usage prompts into one stable recall card per canonical tense. */
export function usageRecallCards(cards) {
  const byTense = new Map();
  for (const card of cards || []) {
    const tense = card.answer;
    if (!tense) continue;
    const current = byTense.get(tense) || {
      id: `usage:recall:${tense}`,
      skill: "usage",
      answer: tense,
      uses: [],
      contrasts: [],
    };
    const uses = card.uses?.length ? card.uses : [{
      id: card.id,
      prompt: card.prompt,
      alsoAcceptable: card.alsoAcceptable || [],
    }];
    for (const use of uses) {
      if (use?.id && !current.uses.some((row) => row.id === use.id)) current.uses.push(use);
    }
    for (const contrast of card.contrasts || (card.contrast ? [card.contrast] : [])) {
      if (contrast && !current.contrasts.includes(contrast)) current.contrasts.push(contrast);
    }
    byTense.set(tense, current);
  }
  return [...byTense.values()];
}

function recallCycle(cards, rng, previousTense = null) {
  const cycle = shuffle(cards, rng);
  if (cycle.length > 1 && cycle[0].answer === previousTense) {
    const replacement = cycle.findIndex((card) => card.answer !== previousTense);
    [cycle[0], cycle[replacement]] = [cycle[replacement], cycle[0]];
  }
  return cycle;
}

/**
 * Builds Usage recall in complete balanced cycles. `all` presents every selected tense once;
 * numeric lengths repeat only after a cycle has exhausted every selected tense.
 */
export function buildUsageRecallDeck(
  cards,
  { size = "all", tenseScope = [], rng = Math.random } = {}
) {
  const allowed = tenseScope?.length ? new Set(tenseScope) : null;
  const candidates = usageRecallCards(cards).filter((card) => !allowed || allowed.has(card.answer));
  if (!candidates.length) return [];
  const requested = size === "all" ? candidates.length : Math.max(0, Number(size) || 0);
  const deck = [];
  while (deck.length < requested) {
    const cycle = recallCycle(candidates, rng, deck.at(-1)?.answer || null);
    deck.push(...cycle.slice(0, requested - deck.length));
  }
  return deck;
}

/** Repeats each missed tense once, even when it appeared or was missed more than once. */
export function rebuildMissedUsageRecallDeck(cards, { rng = Math.random } = {}) {
  return buildUsageRecallDeck(usageRecallCards(cards), { size: "all", rng });
}
