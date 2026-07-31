/**
 * The make-or-break test (brief section 12, Phase 0.5 / Phase 2).
 *
 * FrequencyWords gives TOKEN counts ("casas", "fui"), not lemma ranks. This script runs
 * those tokens through the form -> lemma index from script 03 and aggregates them into
 * lemma frequencies, then reports:
 *   - the four required inflected lookups: fui, tuvimos, casas, rápidas
 *   - what share of the top tokens resolve to a lemma at all
 *   - three ambiguity policies side by side, so the owner can choose one for Phase 2
 *
 * Aggregation uses the ACCENT-SENSITIVE index; search uses the normalized one. Mixing them
 * credits rare verbs with common words' counts ("así" the adverb vs "así" the form of asir).
 *
 * Run: node pipeline/spike/04-form-lemma.mjs
 * Writes: out/04-form-lemma-report.json, raw/_lemma-ranks.json (large, gitignored)
 */
import { eachLine, raw, out, writeJson, readJson } from "./lib/io.mjs";
import { normalize } from "./lib/normalize.mjs";

const REQUIRED = ["fui", "tuvimos", "casas", "rápidas"];
const COVERAGE_BUCKETS = [1000, 5000, 10000, 50000, 100000];
const WATCH = ["perar|verb", "asir|verb", "parir|verb", "solar|verb", "pero|conj", "así|adv", "ir|verb", "ser|verb"];

console.log("Loading indexes …");
const searchIndex = readJson(raw("_form-index.json"));        // normalized — for search
const exactIndex = readJson(raw("_form-index-exact.json"));   // accent-sensitive — for frequency
const citation = readJson(raw("_citation-forms.json"));
console.log(`  ${Object.keys(searchIndex).length.toLocaleString()} normalized forms, ${Object.keys(exactIndex).length.toLocaleString()} exact forms`);

const searchLookup = (t) => searchIndex[normalize(t)] || [];

// ---- required cases (these use the SEARCH index — that is what the app will do) ----
const requiredResults = REQUIRED.map((form) => {
  const hits = searchLookup(form);
  return {
    form,
    resolves: hits.length > 0,
    lemmas: hits.map((h) => { const i = h.lastIndexOf("|"); return { lemma: h.slice(0, i), pos: h.slice(i + 1) }; }),
  };
});

// ---- frequency aggregation, three policies --------------------------------
const scores = { split: new Map(), full: new Map(), citationFirst: new Map() };
const bump = (m, k, v) => m.set(k, (m.get(k) || 0) + v);

let tokensRead = 0, tokensResolved = 0, totalCount = 0, resolvedCount = 0, citationShortcuts = 0;
const bucketStats = COVERAGE_BUCKETS.map((n) => ({ topN: n, resolved: 0 }));
const unresolvedTop = [];

console.log("Aggregating frequency tokens …");
await eachLine(raw("es_full.txt"), (line) => {
  const sp = line.lastIndexOf(" ");
  if (sp < 1) return;
  const token = line.slice(0, sp).normalize("NFC");
  const count = Number(line.slice(sp + 1));
  if (!Number.isFinite(count)) return;

  tokensRead++;
  totalCount += count;

  const hits = exactIndex[token] || [];
  const searchHits = searchLookup(token);
  if (searchHits.length) {
    tokensResolved++;
    resolvedCount += count;
  } else if (unresolvedTop.length < 40) {
    unresolvedTop.push({ token, count });
  }
  for (const b of bucketStats) if (tokensRead <= b.topN && searchHits.length) b.resolved++;

  if (!hits.length) return;

  // policy A: split evenly among candidates
  for (const h of hits) bump(scores.split, h, count / hits.length);
  // policy B: every candidate gets the full count
  for (const h of hits) bump(scores.full, h, count);
  // policy C: if the token IS some lemma's own citation form, only those lemmas score.
  // "pero" is the citation form of pero(conj)/pero(noun), so the rare verb perar — for
  // which "pero" is merely an inflected form — gets nothing.
  const cites = citation[token];
  if (cites && cites.length) {
    citationShortcuts++;
    for (const h of cites) bump(scores.citationFirst, h, count / cites.length);
  } else {
    for (const h of hits) bump(scores.citationFirst, h, count / hits.length);
  }
});

const rank = (m) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, score], i) => {
    const j = key.lastIndexOf("|");
    return { rank: i + 1, lemma: key.slice(0, j), pos: key.slice(j + 1), score: Math.round(score) };
  });

const ranked = { split: rank(scores.split), full: rank(scores.full), citationFirst: rank(scores.citationFirst) };
const rankMap = (list) => new Map(list.map((r) => [`${r.lemma}|${r.pos}`, r.rank]));
const maps = { split: rankMap(ranked.split), full: rankMap(ranked.full), citationFirst: rankMap(ranked.citationFirst) };

// the recommended policy feeds the rest of the pipeline
writeJson(raw("_lemma-ranks.json"), { policy: "citationFirst", ranked: ranked.citationFirst });

const report = {
  generatedAt: new Date().toISOString(),
  requiredCases: requiredResults,
  tokens: {
    read: tokensRead,
    resolved: tokensResolved,
    resolvedPct: +((tokensResolved / tokensRead) * 100).toFixed(1),
    corpusOccurrencesCoveredPct: +((resolvedCount / totalCount) * 100).toFixed(1),
    tokensThatAreACitationForm: citationShortcuts,
  },
  coverageByTopN: bucketStats.map((b) => ({ topN: b.topN, resolved: b.resolved, pct: +((b.resolved / Math.min(b.topN, tokensRead)) * 100).toFixed(1) })),
  policyComparison: WATCH.map((k) => ({
    lemma: k,
    rankSplit: maps.split.get(k) ?? null,
    rankFullCredit: maps.full.get(k) ?? null,
    rankCitationFirst: maps.citationFirst.get(k) ?? null,
  })),
  top40_citationFirst: ranked.citationFirst.slice(0, 40),
  top40_split: ranked.split.slice(0, 40),
  unresolvedHighFrequencyTokens: unresolvedTop,
};
writeJson(out("04-form-lemma-report.json"), report);

console.log(`\nREQUIRED INFLECTED LOOKUPS (brief section 12)`);
for (const r of requiredResults) {
  console.log(`  ${r.resolves ? "PASS" : "FAIL"}  ${r.form.padEnd(9)} -> ${r.lemmas.map((l) => `${l.lemma} (${l.pos})`).join(", ") || "NOTHING"}`);
}

console.log(`\nTOKEN RESOLUTION`);
console.log(`  tokens in list             ${tokensRead.toLocaleString()}`);
console.log(`  resolved to a lemma        ${tokensResolved.toLocaleString()} (${report.tokens.resolvedPct}%)`);
console.log(`  corpus occurrences covered ${report.tokens.corpusOccurrencesCoveredPct}%`);
for (const b of report.coverageByTopN) console.log(`    top ${String(b.topN).padStart(6)}  ${b.pct}% resolved`);

console.log(`\nAMBIGUITY POLICY COMPARISON (rank under each policy; lower = more frequent)`);
console.log(`  ${"lemma".padEnd(14)} ${"split".padStart(8)} ${"full".padStart(8)} ${"citation".padStart(9)}`);
for (const p of report.policyComparison) {
  console.log(`  ${p.lemma.padEnd(14)} ${String(p.rankSplit ?? "—").padStart(8)} ${String(p.rankFullCredit ?? "—").padStart(8)} ${String(p.rankCitationFirst ?? "—").padStart(9)}`);
}

console.log(`\nTop 25 lemmas — citation-first policy (recommended):`);
for (const r of ranked.citationFirst.slice(0, 25)) console.log(`  ${String(r.rank).padStart(3)}. ${r.lemma.padEnd(16)} ${r.pos}`);
