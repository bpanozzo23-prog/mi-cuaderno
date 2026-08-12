/**
 * A tiny but structurally real dictionary: the same manifest, chunk and store shapes the
 * pipeline emits, small enough to assert against. Hashes are computed at build time so the
 * fixture cannot drift out of agreement with itself.
 */

const entry = (id, lemma, pos, glosses, extra = {}) => ({
  id: `dict:wiktionary-es:${id}`,
  lemma,
  pos,
  senses: glosses.map((g) => (typeof g === "string" ? { gloss: g } : g)),
  ...extra,
});

export const FIXTURE_ENTRIES = [
  entry("sacar:verb", "sacar", "verb", ["to take out (e.g. the trash)", "to remove"], {
    conjugationId: "conj:jehle:sacar",
    conjugationPatternIds: ["spelling:c-qu"],
    freqRank: 299,
  }),
  entry("año:noun", "año", "noun", ["year"], { gender: "m", freqRank: 100 }),
  entry("ano:noun", "ano", "noun", ["anus"], { gender: "m", freqRank: 9000 }),
  entry("ir:verb", "ir", "verb", ["to go"], { conjugationId: "conj:jehle:ir", freqRank: 27 }),
  entry("ser:verb", "ser", "verb", ["to be"], { conjugationId: "conj:jehle:ser", freqRank: 1 }),
  entry("quejarse:verb", "quejarse", "verb", ["to complain"], {
    conjugationId: "conj:fixture:quejarse",
    freqRank: 1200,
  }),
  entry("casa:noun", "casa", "noun", ["house", { gloss: "home", regionLabels: ["Mexico"] }], {
    gender: "f",
    freqRank: 90,
    examples: [["Mi casa es tu casa.", "My house is your house.", "tatoeba:1", "alice", "tatoeba:2", "bob"]],
  }),
];

export const FIXTURE_CONJUGATIONS = [
  {
    id: "conj:wikt:haber",
    source: "wiktionary",
    gerund: "habiendo",
    pastParticiple: "habido",
    tenses: {
      "Indicative/Present": {
        yo: "he", "tú": "has", "él/ella/usted": "ha",
        nosotros: "hemos", "ustedes/ellos": "han", vosotros: "habéis",
      },
    },
  },
  {
    id: "conj:jehle:sacar",
    source: "jehle",
    gerund: "sacando",
    pastParticiple: "sacado",
    tenses: {
      "Indicative/Present": {
        yo: "saco", "tú": "sacas", "él/ella/usted": "saca",
        nosotros: "sacamos", "ustedes/ellos": "sacan", vosotros: "sacáis",
      },
      "Indicative/Preterite": {
        yo: "saqué", "tú": "sacaste", "él/ella/usted": "sacó",
        nosotros: "sacamos", "ustedes/ellos": "sacaron", vosotros: "sacasteis",
      },
    },
  },
  { id: "conj:jehle:ir", source: "jehle", pastParticiple: "ido", tenses: {} },
  { id: "conj:jehle:ser", source: "jehle", pastParticiple: "sido", tenses: {} },
  {
    id: "conj:fixture:quejarse",
    source: "fixture",
    pastParticiple: "quejado",
    tenses: {
      "Indicative/Present": {
        yo: "me quejo", "tú": "te quejas", "él/ella/usted": "se queja",
        nosotros: "nos quejamos", "ustedes/ellos": "se quejan", vosotros: "os quejáis",
      },
      "Imperative Negative/Present": {
        "tú": "no te quejes", "él/ella/usted": "no se queje",
        nosotros: "no nos quejemos", "ustedes/ellos": "no se quejen", vosotros: "no os quejéis",
      },
    },
  },
];

/**
 * The shared Gym fixture intentionally has only two sacar tenses. Phase 21's spelling lesson
 * also requires the present subjunctive, so its focused UI tests opt into this richer variant
 * without silently changing older prompt pools.
 */
export const FIXTURE_PATTERN_CONJUGATIONS = FIXTURE_CONJUGATIONS.map((table) =>
  table.id !== "conj:jehle:sacar" ? table : {
    ...table,
    tenses: {
      ...table.tenses,
      "Subjunctive/Present": {
        yo: "saque", "tú": "saques", "él/ella/usted": "saque",
        nosotros: "saquemos", "ustedes/ellos": "saquen", vosotros: "saquéis",
      },
    },
  }
);

export const FIXTURE_FORM_SHARDS = [
  { id: "sa", terms: { sacar: ["dict:wiktionary-es:sacar:verb"], saco: ["dict:wiktionary-es:sacar:verb"], saque: ["dict:wiktionary-es:sacar:verb"] } },
  { id: "añ", terms: { "año": ["dict:wiktionary-es:año:noun"], "años": ["dict:wiktionary-es:año:noun"] } },
  { id: "an", terms: { ano: ["dict:wiktionary-es:ano:noun"] } },
  { id: "fu", terms: { fui: ["dict:wiktionary-es:ir:verb", "dict:wiktionary-es:ser:verb"] } },
  { id: "ir", terms: { ir: ["dict:wiktionary-es:ir:verb"] } },
  { id: "se", terms: { ser: ["dict:wiktionary-es:ser:verb"] } },
  { id: "qu", terms: { quejarse: ["dict:wiktionary-es:quejarse:verb"], "me quejo": ["dict:wiktionary-es:quejarse:verb"] } },
  { id: "ca", terms: { casa: ["dict:wiktionary-es:casa:noun"], casas: ["dict:wiktionary-es:casa:noun"] } },
];

export const FIXTURE_ENGLISH_SHARDS = [
  { id: "ta", terms: { take: ["dict:wiktionary-es:sacar:verb"] } },
  { id: "ou", terms: { out: ["dict:wiktionary-es:sacar:verb"] } },
  { id: "ye", terms: { year: ["dict:wiktionary-es:año:noun"] } },
  { id: "ho", terms: { house: ["dict:wiktionary-es:casa:noun"], home: ["dict:wiktionary-es:casa:noun"] } },
  { id: "go", terms: { go: ["dict:wiktionary-es:ir:verb"] } },
];

export const FIXTURE_PATTERN_FAMILIES = [
  { id: "spelling:c-qu", memberIds: ["dict:wiktionary-es:sacar:verb"] },
];

/** Splits the stores across chunks the way 07-package.mjs does. */
export function buildFixtureChunks(entries = FIXTURE_ENTRIES, {
  includePatternFamilies = true,
  patternFamilies = FIXTURE_PATTERN_FAMILIES,
} = {}) {
  const half = Math.ceil(entries.length / 2);
  return [
    { stores: { entries: entries.slice(0, half) } },
    { stores: { entries: entries.slice(half), conjugations: FIXTURE_CONJUGATIONS } },
    { stores: {
      formShards: FIXTURE_FORM_SHARDS,
      englishShards: FIXTURE_ENGLISH_SHARDS,
      ...(includePatternFamilies ? { patternFamilies } : {}),
    } },
  ];
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Builds a manifest and its chunk bodies, with real hashes.
 *
 * Takes either a version string or options:
 *   datasetVersion  a second, different version, to exercise the atomic swap
 *   dropEntries     ids to leave out, standing in for a rebuild that removed a word (§5)
 *   previousIds     the alias map, for testing that a moved id still resolves (§6)
 */
export async function buildFixtureDictionary(options = {}) {
  const {
    datasetVersion = "fixture-v1",
    dropEntries = [],
    previousIds = {},
    includePatternFamilies = true,
    patternFamilies = FIXTURE_PATTERN_FAMILIES,
    omitPatternFamilyRows = false,
  } = typeof options === "string" ? { datasetVersion: options } : options;

  const dropped = new Set(dropEntries);
  const entries = FIXTURE_ENTRIES.filter((e) => !dropped.has(e.id));
  const bodies = new Map();
  const chunks = [];

  const packagedFamilies = omitPatternFamilyRows ? [] : patternFamilies;
  for (const [index, chunk] of buildFixtureChunks(entries, { includePatternFamilies, patternFamilies: packagedFamilies }).entries()) {
    const file = `chunk-${String(index).padStart(3, "0")}.json`;
    const buffer = new TextEncoder().encode(JSON.stringify({ datasetVersion, chunk: index, ...chunk }));
    bodies.set(file, buffer);
    chunks.push({
      file,
      bytes: buffer.byteLength,
      sha256: await sha256Hex(buffer),
      rows: Object.fromEntries(Object.entries(chunk.stores).map(([k, v]) => [k, v.length])),
    });
  }

  const manifest = {
    format: "mi-cuaderno-dictionary",
    formatVersion: 1,
    datasetVersion,
    path: datasetVersion,
    counts: {
      entries: entries.length,
      conjugations: FIXTURE_CONJUGATIONS.length,
      formShards: FIXTURE_FORM_SHARDS.length,
      englishShards: FIXTURE_ENGLISH_SHARDS.length,
      ...(includePatternFamilies ? { patternFamilies: patternFamilies.length } : {}),
      examples: 1,
    },
    bytes: { total: chunks.reduce((n, c) => n + c.bytes, 0), gzipped: 0 },
    chunks,
    previousIds,
    attribution: {
      note: "Fixture data. The Jehle conjugation database is NONCOMMERCIAL (CC BY-NC-SA 3.0).",
      sources: [{ name: "Fixture", license: "CC BY-SA 4.0", attribution: "nobody", url: "https://example.invalid" }],
      examples: {
        license: "CC BY 2.0 FR",
        urlTemplate: "https://tatoeba.org/en/sentences/show/{id}",
        idPrefix: "tatoeba:",
      },
    },
  };

  return { manifest, bodies };
}

/**
 * Installs a fake `fetch` that serves the fixture. `corrupt` names a chunk file whose body
 * is returned with a byte flipped, so integrity handling can be tested; `failAfter` makes
 * the Nth chunk request fail outright, standing in for a dropped connection.
 */
export function installFetchStub({ manifest, bodies }, { corrupt = null, failAfter = null } = {}) {
  const requests = [];
  let served = 0;

  globalThis.fetch = async (url) => {
    const name = String(url).split("/").pop();
    requests.push(name);

    if (name === "manifest.json") {
      return new Response(JSON.stringify(manifest), { status: 200 });
    }
    if (!bodies.has(name)) return new Response("not found", { status: 404 });
    if (failAfter !== null && served >= failAfter) throw new TypeError("Failed to fetch");
    served++;

    const body = bodies.get(name);
    if (corrupt === name) {
      const damaged = body.slice();
      damaged[damaged.length - 2] ^= 0xff;
      return new Response(damaged, { status: 200 });
    }
    return new Response(body, { status: 200 });
  };

  return { requests };
}
