import { describe, expect, it, vi } from "vitest";
import { preparePracticeCards } from "./practiceCards.js";

const word = (over = {}) => ({
  id: "user:sacar",
  type: "lexical",
  form: "word",
  term: "sacar",
  meanings: [{
    id: "meaning:sacar",
    gloss: "take out",
    examples: [{ es: "Tengo que sacar la basura.", en: "I have to take out the trash." }],
  }],
  myExamples: [],
  ...over,
});

describe("shared vocabulary-card preparation", () => {
  it("makes a forward cloze from a personal example without consulting the dictionary", async () => {
    const resolve = vi.fn();
    const [card] = await preparePracticeCards([word()], { random: () => 0, resolve });

    expect(card.direction).toBe("forward");
    expect(card.face).toBe("cloze");
    expect(card.cloze).toMatchObject({ before: "Tengo que ", answer: "sacar", after: " la basura." });
    expect(resolve).not.toHaveBeenCalled();
  });

  it("never combines a reverse prompt with cloze", async () => {
    const [card] = await preparePracticeCards([word()], { direction: "reverse", random: () => 0 });

    expect(card.direction).toBe("reverse");
    expect(card.cloze).toBeUndefined();
  });

  it("gives a forward card with an image link the picture face, outranking cloze", async () => {
    const resolve = vi.fn();
    const pictured = word({
      mediaLinks: [
        { url: "https://example.com/article", label: "Not an image" },
        { url: "https://upload.wikimedia.org/sacar.jpg", label: "sacar" },
      ],
      dictKey: "dict:es-base:sacar",
    });
    const [card] = await preparePracticeCards([pictured], { random: () => 0, resolve });

    expect(card.face).toBe("image");
    expect(card.image).toEqual({ url: "https://upload.wikimedia.org/sacar.jpg" });
    expect(card.image.label).toBeUndefined();
    expect(card.cloze).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });

  it("never puts a picture on a reverse card and ignores non-image links", async () => {
    const pictured = word({ mediaLinks: [{ url: "https://upload.wikimedia.org/sacar.jpg", label: "sacar" }] });
    const [reverseCard] = await preparePracticeCards([pictured], { direction: "reverse", random: () => 0 });
    expect(reverseCard.face).toBeUndefined();
    expect(reverseCard.image).toBeUndefined();

    const linkOnly = word({ mediaLinks: [{ url: "http://example.com/sacar.jpg", label: "insecure" }] });
    const [plainCard] = await preparePracticeCards([linkOnly], { random: () => 0 });
    expect(plainCard.face).toBe("cloze");
    expect(plainCard.image).toBeUndefined();
  });

  it("keeps a plain card usable when an optional dictionary read fails", async () => {
    const attached = word({
      dictKey: "dict:missing:sacar",
      meanings: [{ id: "meaning:sacar", gloss: "take out", examples: [] }],
    });
    const [card] = await preparePracticeCards([attached], {
      resolve: vi.fn().mockRejectedValue(new Error("dictionary unavailable")),
    });

    expect(card).toMatchObject({ id: attached.id, direction: "forward", term: "sacar" });
    expect(card.cloze).toBeUndefined();
  });
});
