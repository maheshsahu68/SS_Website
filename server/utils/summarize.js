function splitSentences(text = "") {
  return (
    String(text)
      .replace(/\s+/g, " ")
      .trim()
      .match(/[^.!?।]+[.!?।]+|[^.!?।]+$/gu) || []
  );
}

function tokenize(sentence = "") {
  return sentence
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s']/gu, " ")
    .split(/\s+/u)
    .filter((w) => w.length > 1);
}

function summarizeText(text) {
  if (!text || !text.trim()) return "";

  const sentences = splitSentences(text);
  if (sentences.length <= 3) return sentences.join(" ").trim();

  const stop = new Set([
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "from",
    "have",
    "your",
    "about",
    "are",
    "was",
    "were",
    "they",
    "them",
    "their",
    "into",
    "there",
    "what",
    "when",
    "which",
    "hai",
    "hain",
    "aur",
    "ka",
    "ke",
    "ki",
  ]);

  const freq = new Map();
  const sentenceTokens = sentences.map((s) => tokenize(s).filter((w) => !stop.has(w)));

  sentenceTokens.flat().forEach((token) => {
    freq.set(token, (freq.get(token) || 0) + 1);
  });

  const scored = sentenceTokens.map((tokens, idx) => {
    const score = tokens.reduce((sum, t) => sum + (freq.get(t) || 0), 0) / Math.max(1, tokens.length);
    return { idx, score, sentence: sentences[idx].trim() };
  });

  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.sentence);

  const topTerms = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([term]) => term);

  const bullets = topTerms.map((t) => `- Key topic: ${t}`);
  return `${topSentences.join(" ")}\n\n${bullets.join("\n")}`.trim();
}

module.exports = summarizeText;
