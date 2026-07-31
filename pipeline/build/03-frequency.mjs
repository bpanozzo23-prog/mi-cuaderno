/**
 * Step 3 — turn token frequencies into lemma ranks (brief §12).
 *
 * FrequencyWords counts surface tokens ("casas", "fui"), not lemmas. Running those
 * through the form → lemma index gives lemma frequency, which is what "top ~10,000
 * lemmas" means. Two rules, both learned the hard way in the spike:
 *
 *  - aggregate on the ACCENT-SENSITIVE index, because "así" (very frequent adverb) and
 *    "así" (a form of asir) normalize alike, which handed a rare verb the adverb's count;
 *  - resolve ambiguity CITATION-FORM-FIRST: if a token is some lemma's own dictionary
 *    form, only those lemmas score it. Splitting evenly gave the conjunction "pero"'s
 *    790k occurrences to the non-existent-to-a-learner verb "perar", ranking it 82nd.
 *
 * Full scale exposed a third problem the spike's 186-record sample could not: when an
 * INFLECTED token is ambiguous, splitting it evenly lets a rare word ride a common one's
 * coat-tails. "podamos" is shared by poder and podar (to prune), so podar ranked 321st;
 * "sea" is shared by ser and the archaic seer, which ranked 241st; the inclusive-language
 * forms amigx/chicx/niñe inherited amigo/chico/niño's counts and ranked in the top 700.
 *
 * The fix is PROPORTIONAL-TO-EVIDENCE allocation, applied to inflected ambiguity only.
 * A first pass scores only UNAMBIGUOUS tokens — forms belonging to exactly one lemma —
 * giving each lemma a "core" score it cannot fake. A second pass then splits each
 * ambiguous INFLECTED token in proportion to those core scores, so poder (huge core from
 * puedo/puede/podría) takes nearly all of "podamos" and podar (core ≈ 0) takes nearly
 * none. This does NOT punish real verbs whose infinitive is rare — deber, gustar and
 * preocupar keep their rank, because their core score comes from debe/gusta/preocupa.
 *
 * Citation-form ambiguity is deliberately left splitting EVENLY. Weighting it by core
 * score is actively wrong: invariable words have no inflections, so a conjunction's core
 * score is structurally zero and it loses to any homograph that happens to inflect. Try
 * it and "pero" the conjunction — one of the commonest words in Spanish — hands its 790k
 * occurrences to "pero" the noun (which earns a core score from its plural "peros") and
 * falls to rank 5484. Same for adiós. Evidence-weighting answers "which lemma does this
 * inflected form belong to"; it cannot answer "which part of speech did the speaker mean".
 *
 * Every policy is still computed side by side, so the report shows the decisions holding
 * at full scale rather than only on the spike's sample.
 *
 * Run: node --max-old-space-size=6144 pipeline/build/03-frequency.mjs
 * Writes: raw/_lemma-ranks.json, out/03-frequency-report.json
 */
import { eachLine, eachJsonl, raw, out, writeJson, readJson, step, done } from "../lib/io.mjs";
import { normalize, splitLemmaKey } from "../lib/ids.mjs";

const started = step("03 · frequency → lemma ranks");

const REQUIRED = ["fui", "tuvimos", "casas", "rápidas"];
const COVERAGE_BUCKETS = [1000, 5000, 10000, 50000, 100000];
/**
 * Watched lemmas, in two groups that any policy change must be judged against together:
 * words that MUST fall (they ride a common word's inflections) and words that MUST NOT
 * (real, common verbs whose infinitive happens to be rarer than their conjugated forms).
 */
const WATCH_SHOULD_FALL = [
  "perar|verb", "asir|verb", "seer|verb", "podar|verb", "hacendar|verb", "pudir|verb",
  "piensar|verb", "amigx|noun", "chicx|noun", "niñe|noun", "segurar|verb", "your|det",
];
const WATCH_SHOULD_HOLD = [
  "pero|conj", "así|adv", "ir|verb", "ser|verb", "poder|verb", "querer|verb", "deber|verb",
  "gustar|verb", "preocupar|verb", "soler|verb", "adiós|intj", "amigo|noun", "casa|noun",
];
const WATCH = [...WATCH_SHOULD_FALL, ...WATCH_SHOULD_HOLD];
const TOP_N = 10000;

/**
 * Only lemmas that actually have a record can be ranked. Inflection stubs occasionally
 * point at a target with no lemma record of its own — the English "your" arrives that way
 * and reached rank 74 — and such a key can never become an entry, so ranking it would
 * silently spend one of the top 10,000 slots on nothing.
 */
const realLemmas = new Set(readJson(raw("_lemma-keys.json")));

// ---- the token list -------------------------------------------------------
const tokens = [];                 // rank order, as published
const countByToken = new Map();    // exact token -> count
const indicesByNorm = new Map();   // normalized token -> [index into tokens]

console.log("  reading frequency list …");
await eachLine(raw("es_full.txt"), (line) => {
  const sp = line.lastIndexOf(" ");
  if (sp < 1) return;
  const token = line.slice(0, sp).normalize("NFC");
  const count = Number(line.slice(sp + 1));
  if (!Number.isFinite(count)) return;

  const i = tokens.length;
  tokens.push({ token, count });
  countByToken.set(token, (countByToken.get(token) || 0) + count);
  const n = normalize(token);
  const list = indicesByNorm.get(n);
  if (list) list.push(i);
  else indicesByNorm.set(n, [i]);
});
const totalOccurrences = tokens.reduce((n, t) => n + t.count, 0);
console.log(`    ${tokens.length.toLocaleString()} tokens, ${totalOccurrences.toLocaleString()} occurrences`);

// ---- coverage: which tokens resolve through the SEARCH index --------------
// This is the index the app uses, so this number answers "would the app find it?".
const resolved = new Uint8Array(tokens.length);
const requiredHits = new Map(REQUIRED.map((f) => [normalize(f), []]));

console.log("  streaming search index for coverage …");
await eachJsonl(raw("_forms-search.jsonl"), ([form, hits]) => {
  const idxs = indicesByNorm.get(form);
  if (idxs) for (const i of idxs) resolved[i] = 1;
  if (requiredHits.has(form)) requiredHits.get(form).push(...hits);
});

let resolvedTokens = 0, resolvedOccurrences = 0;
const buckets = COVERAGE_BUCKETS.map((topN) => ({ topN, resolved: 0 }));
for (let i = 0; i < tokens.length; i++) {
  if (!resolved[i]) continue;
  resolvedTokens++;
  resolvedOccurrences += tokens[i].count;
  for (const b of buckets) if (i < b.topN) b.resolved++;
}

const unresolvedTop = [];
for (let i = 0; i < tokens.length && unresolvedTop.length < 40; i++) {
  if (!resolved[i]) unresolvedTop.push(tokens[i]);
}

// ---- aggregate token counts into lemma scores -----------------------------
const scores = {
  split: new Map(),
  citationFirst: new Map(),          // spike policy: ambiguity split evenly
  citationProportional: new Map(),   // decided policy: ambiguity split by core evidence
};
const coreScore = new Map();         // score from unambiguous tokens only
const bump = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
let citationShortcuts = 0, ambiguousForms = 0, unambiguousForms = 0;

/** Citation-first narrowing: a token that is some lemma's own dictionary form scores only those. */
const real = (list) => list.filter((h) => realLemmas.has(h));
const candidatesFor = (hits, cites) => (cites.length ? cites : hits);

console.log("  pass 1 — scoring unambiguous tokens …");
await eachJsonl(raw("_forms-exact.jsonl"), ([form, allHits, allCites]) => {
  const count = countByToken.get(form);
  if (!count) return;
  const hits = real(allHits);
  const cites = real(allCites || []);
  if (!hits.length) return;
  const candidates = candidatesFor(hits, cites);
  if (candidates.length === 1) {
    unambiguousForms++;
    bump(coreScore, candidates[0], count);
  } else {
    ambiguousForms++;
  }
});

console.log("  pass 2 — allocating ambiguous tokens by evidence …");
// Smoothing keeps a lemma with no unambiguous evidence at all from taking a zero-division
// share; it still ends up with a negligible slice next to a competitor with real evidence.
const EPSILON = 1;
await eachJsonl(raw("_forms-exact.jsonl"), ([form, allHits, allCites]) => {
  const count = countByToken.get(form);
  if (!count) return;
  const hits = real(allHits);
  const cites = real(allCites || []);
  if (!hits.length) return;

  for (const h of hits) bump(scores.split, h, count / hits.length);

  const candidates = candidatesFor(hits, cites);
  if (cites.length) citationShortcuts++;

  for (const h of candidates) bump(scores.citationFirst, h, count / candidates.length);

  if (candidates.length === 1) {
    bump(scores.citationProportional, candidates[0], count);
  } else if (cites.length) {
    // Citation-form ambiguity: split evenly. See the header — weighting this by core
    // score robs invariable words (pero, adiós) of counts they genuinely own.
    for (const h of candidates) bump(scores.citationProportional, h, count / candidates.length);
  } else {
    const weights = candidates.map((h) => (coreScore.get(h) || 0) + EPSILON);
    const total = weights.reduce((a, b) => a + b, 0);
    candidates.forEach((h, i) => bump(scores.citationProportional, h, (count * weights[i]) / total));
  }
});

const rank = (m) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, score], i) => ({ rank: i + 1, ...splitLemmaKey(key), score: Math.round(score) }));

const ranked = {
  split: rank(scores.split),
  citationFirst: rank(scores.citationFirst),
  citationProportional: rank(scores.citationProportional),
};
const rankMap = (list) => new Map(list.map((r) => [`${r.lemma}|${r.pos}`, r.rank]));
const maps = {
  split: rankMap(ranked.split),
  citationFirst: rankMap(ranked.citationFirst),
  citationProportional: rankMap(ranked.citationProportional),
};

// the decided policy is what the rest of the pipeline consumes
writeJson(raw("_lemma-ranks.json"), {
  policy: "citationProportional",
  generatedAt: new Date().toISOString(),
  ranked: ranked.citationProportional,
});

const top = ranked.citationProportional.slice(0, TOP_N);
const posInTop = {};
for (const r of top) posInTop[r.pos] = (posInTop[r.pos] || 0) + 1;

const watchRow = (k) => ({
  lemma: k,
  rankSplit: maps.split.get(k) ?? null,
  rankCitationEven: maps.citationFirst.get(k) ?? null,
  rankCitationProportional: maps.citationProportional.get(k) ?? null,
  coreScore: Math.round(coreScore.get(k) || 0),
});

const report = {
  generatedAt: new Date().toISOString(),
  policy: "citationProportional",
  policyNote:
    "Citation-form-first narrowing, then ambiguous tokens allocated in proportion to each " +
    "candidate's score from unambiguous tokens. See the header of this script for why.",
  requiredCases: REQUIRED.map((form) => {
    const hits = requiredHits.get(normalize(form)) || [];
    return { form, resolves: hits.length > 0, lemmas: hits.map(splitLemmaKey) };
  }),
  tokens: {
    read: tokens.length,
    resolved: resolvedTokens,
    resolvedPct: +((resolvedTokens / tokens.length) * 100).toFixed(1),
    corpusOccurrencesCoveredPct: +((resolvedOccurrences / totalOccurrences) * 100).toFixed(1),
    tokensThatAreACitationForm: citationShortcuts,
    unambiguousForms,
    ambiguousForms,
  },
  coverageByTopN: buckets.map((b) => ({
    topN: b.topN,
    resolved: b.resolved,
    pct: +((b.resolved / Math.min(b.topN, tokens.length)) * 100).toFixed(1),
  })),
  lemmasRanked: ranked.citationProportional.length,
  posDistributionInTop: { topN: TOP_N, counts: Object.fromEntries(Object.entries(posInTop).sort((a, b) => b[1] - a[1])) },
  policyComparison: {
    shouldFall: WATCH_SHOULD_FALL.map(watchRow),
    shouldHold: WATCH_SHOULD_HOLD.map(watchRow),
  },
  top50: top.slice(0, 50),
  rank9950to10050: ranked.citationProportional.slice(9949, 10050),
  unresolvedHighFrequencyTokens: unresolvedTop,
};
writeJson(out("03-frequency-report.json"), report);

console.log(`\n  REQUIRED INFLECTED LOOKUPS (brief §12)`);
for (const r of report.requiredCases) {
  console.log(`    ${r.resolves ? "PASS" : "FAIL"}  ${r.form.padEnd(9)} → ${r.lemmas.map((l) => `${l.lemma} (${l.pos})`).join(", ") || "NOTHING"}`);
}
console.log(`\n  token resolution       ${resolvedTokens.toLocaleString()}/${tokens.length.toLocaleString()} (${report.tokens.resolvedPct}%)`);
console.log(`  corpus occurrences     ${report.tokens.corpusOccurrencesCoveredPct}% covered`);
for (const b of report.coverageByTopN) console.log(`    top ${String(b.topN).padStart(6)}        ${b.pct}%`);
console.log(`  ambiguous forms        ${ambiguousForms.toLocaleString()} of ${(ambiguousForms + unambiguousForms).toLocaleString()} that carry a corpus count`);

const printWatch = (title, rows) => {
  console.log(`\n  ${title}`);
  console.log(`    ${"lemma".padEnd(16)} ${"split".padStart(8)} ${"cit-even".padStart(9)} ${"cit-prop".padStart(9)}`);
  for (const p of rows) {
    console.log(
      `    ${p.lemma.padEnd(16)} ${String(p.rankSplit ?? "—").padStart(8)} ` +
        `${String(p.rankCitationEven ?? "—").padStart(9)} ${String(p.rankCitationProportional ?? "—").padStart(9)}`
    );
  }
};
printWatch("MUST FALL out of the top 10k (junk riding common words)", report.policyComparison.shouldFall);
printWatch("MUST HOLD their place (real words, rare infinitive)", report.policyComparison.shouldHold);

console.log(`\n  lemmas ranked          ${ranked.citationProportional.length.toLocaleString()}`);
console.log(`  parts of speech in top ${TOP_N.toLocaleString()}:`);
for (const [pos, n] of Object.entries(report.posDistributionInTop.counts)) {
  console.log(`    ${pos.padEnd(14)} ${String(n).padStart(6)}`);
}
console.log(`\n  top 20: ${top.slice(0, 20).map((r) => r.lemma).join(", ")}`);
done(started);
