// The dictionary index and its queries must omit exactly the same words. Changing
// this list or tokenizer requires checking whether the shipped index needs rebuilding.
const STOPWORDS = new Set([
  "a", "an", "the", "of", "or", "and", "is", "are", "be", "was", "were", "as", "at",
  "by", "for", "from", "in", "into", "on", "onto", "that", "this", "these", "those",
  "with", "which", "who", "whom", "whose", "it", "its", "his", "her", "their", "one",
  "esp", "especially", "used", "usually", "something", "someone", "etc",
]);

export function englishSearchWords(text) {
  return text.toLowerCase().split(/[^a-z0-9']+/i)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word));
}
