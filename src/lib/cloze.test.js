import { describe, it, expect } from "vitest";
import { clozeFromExample, clozeCandidates, pickCloze, verbForms } from "./cloze.js";
import { makeLexical } from "../test/factories.js";
import { newMeaning } from "./meanings.js";

const ex = (es, en = "") => ({ es, en });

describe("blanking the term out of a sentence", () => {
  it("splits the sentence around the word, keeping the original spelling and punctuation", () => {
    const split = clozeFromExample(ex("Tengo que sacar la basura."), { term: "sacar" });

    expect(split).toEqual({ before: "Tengo que ", answer: "sacar", after: " la basura." });
  });

  it("keeps the sentence's own capitalisation in the answer", () => {
    const split = clozeFromExample(ex("Sacar la basura es mi tarea."), { term: "sacar" });

    expect(split.answer).toBe("Sacar");
    expect(split.before).toBe("");
  });

  it("matches a term written with accents against a sentence without them, and back", () => {
    expect(clozeFromExample(ex("Ayer saco la basura."), { term: "sacó" })?.answer).toBe("saco");
    expect(clozeFromExample(ex("Ayer sacó la basura."), { term: "saco" })?.answer).toBe("sacó");
  });

  it("never blanks ano when the word is año", () => {
    // The §8 tripwire, applied here: ñ is a distinct letter everywhere matching happens.
    expect(clozeFromExample(ex("El ano es una parte del cuerpo."), { term: "año" })).toBeNull();
    expect(clozeFromExample(ex("El año pasado fui a México."), { term: "ano" })).toBeNull();
    expect(clozeFromExample(ex("El año pasado fui a México."), { term: "año" })?.answer).toBe("año");
  });

  it("only matches whole words, so a short term cannot be cut out of a longer one", () => {
    expect(clozeFromExample(ex("Ella es una casada feliz."), { term: "casa" })).toBeNull();
  });

  it("blanks a phrase as one run, across its internal spacing", () => {
    const split = clozeFromExample(ex("Siempre llego tarde, por lo tanto me disculpo."), {
      term: "por lo tanto",
    });

    expect(split.answer).toBe("por lo tanto");
    expect(split.before).toBe("Siempre llego tarde, ");
  });

  it("returns null when the term simply is not there", () => {
    expect(clozeFromExample(ex("Mi casa es tu casa."), { term: "madrugar" })).toBeNull();
  });

  it("returns null for an example with no Spanish side", () => {
    expect(clozeFromExample(ex("", "My house is your house."), { term: "casa" })).toBeNull();
  });

  it("takes the first occurrence when the word appears twice", () => {
    const split = clozeFromExample(ex("Mi casa es tu casa."), { term: "casa" });

    expect(split.before).toBe("Mi ");
    expect(split.after).toBe(" es tu casa.");
  });
});

describe("matching a conjugated form back to its lemma", () => {
  const table = {
    tenses: {
      "Indicative/Preterite": { yo: "saqué", "tú": "sacaste", "ustedes/ellos": "sacaron" },
      "Indicative/Present": { yo: "saco", "él/ella/usted": "saca" },
    },
    gerund: "sacando",
    pastParticiple: "sacado",
  };

  it("collects the simple forms, the gerund and the participle", () => {
    const forms = verbForms(table);

    expect(forms.has("saque")).toBe(true); // normalized, so the accent does not matter
    expect(forms.has("sacaron")).toBe(true);
    expect(forms.has("sacando")).toBe(true);
    expect(forms.has("sacado")).toBe(true);
  });

  it("drops the clitic pronoun of a pronominal verb", () => {
    // "me" would otherwise match the pronoun in any sentence and blank the wrong word.
    const forms = verbForms({ tenses: { "Indicative/Present": { yo: "me arrepiento" } } });

    expect(forms.has("arrepiento")).toBe(true);
    expect(forms.has("me")).toBe(false);
  });

  it("blanks the conjugated form when the card is for the lemma", () => {
    const split = clozeFromExample(ex("Ayer saqué la basura."), {
      term: "sacar",
      forms: verbForms(table),
    });

    expect(split.answer).toBe("saqué");
  });

  it("does not treat an inflection as a match for a multi-word term", () => {
    const split = clozeFromExample(ex("Ayer saqué la basura."), {
      term: "sacar algo",
      forms: verbForms(table),
    });

    expect(split).toBeNull();
  });
});

describe("choosing which example to ask", () => {
  const entry = { examples: [["Mi casa es tu casa.", "My house is your house."]] };

  it("keeps the owner's sentences apart from the dictionary's, meanings first", () => {
    const item = makeLexical({
      term: "casa",
      meanings: [newMeaning({ gloss: "house", examples: [ex("Vivo en una casa azul.")] })],
      myExamples: [ex("La casa de mi abuela.")],
    });

    const { personal, stock } = clozeCandidates(item, entry);

    expect(personal.map((example) => example.es)).toEqual([
      "Vivo en una casa azul.",
      "La casa de mi abuela.",
    ]);
    expect(stock.map((example) => example.es)).toEqual(["Mi casa es tu casa."]);
  });

  it("never reaches for a stock example while one of the owner's works", () => {
    // The pools must not be pooled: choosing across both at once would demote the
    // owner's own writing whenever an entry happened to ship more examples than they
    // wrote. Every possible draw here has to land on the personal sentence.
    const item = makeLexical({
      term: "casa",
      meanings: [],
      myExamples: [ex("La casa de mi abuela.")],
    });
    const richEntry = {
      examples: [
        ["Mi casa es tu casa.", "My house is your house."],
        ["La casa es grande.", "The house is big."],
        ["Vendieron la casa.", "They sold the house."],
      ],
    };

    for (const draw of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(pickCloze(item, richEntry, { rng: () => draw }).es).toBe("La casa de mi abuela.");
    }
  });

  it("falls back to a stock example when the owner has written none", () => {
    const item = makeLexical({ term: "casa", meanings: [newMeaning({ gloss: "house" })], myExamples: [] });

    const picked = pickCloze(item, entry, { rng: () => 0 });

    expect(picked).toMatchObject({ answer: "casa", es: "Mi casa es tu casa." });
    expect(picked.en).toBe("My house is your house.");
  });

  it("skips examples the term is missing from rather than giving up", () => {
    const item = makeLexical({
      term: "casa",
      meanings: [newMeaning({ gloss: "house", examples: [ex("No aparece aquí.")] })],
      myExamples: [ex("La casa de mi abuela.")],
    });

    expect(pickCloze(item, entry, { rng: () => 0 }).es).toBe("La casa de mi abuela.");
  });

  it("returns null when no example contains the term at all", () => {
    const item = makeLexical({ term: "madrugar", meanings: [], myExamples: [ex("Nada que ver.")] });

    expect(pickCloze(item, null, { rng: () => 0 })).toBeNull();
  });

  it("stays inside the candidate list even when the coin lands on 1", () => {
    const item = makeLexical({ term: "casa", meanings: [], myExamples: [ex("Mi casa.")] });

    expect(pickCloze(item, null, { rng: () => 0.999999 })).not.toBeNull();
  });
});
