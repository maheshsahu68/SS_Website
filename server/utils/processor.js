// Parse whisper transcription JSON into structured transcript + word index
// Also provide helpers for transcript search and sensitive-term detection

const normalize = (s = "") => String(s).replace(/\s+/g, " ").trim();
const sanitizeWord = (s = "") =>
  String(s)
    .normalize("NFKC")
    .replace(/(^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$)/gu, "")
    .trim();

function parseTranscription(transcription) {
  const segments = transcription?.segments || transcription?.data?.segments || [];
  let fullText = "";
  const parsedSegments = [];
  const words = [];

  segments.forEach((seg, sIdx) => {
    const segText = normalize(seg.text ?? seg.segment ?? "");
    const segStart = Number(seg.start ?? seg.start_time ?? 0);
    const segEnd = Number(seg.end ?? seg.end_time ?? segStart + (seg.duration || 0));

    parsedSegments.push({ start: segStart, end: segEnd, text: segText });

    if (fullText.length) fullText += " ";
    fullText += segText;

    if (Array.isArray(seg.words) && seg.words.length) {
      seg.words.forEach((w) => {
        const cleanedWord = sanitizeWord(w.text ?? w.word ?? "");
        if (!cleanedWord) return;

        words.push({
          word: cleanedWord,
          start: Number(w.start ?? w.start_time ?? segStart),
          end: Number(w.end ?? w.end_time ?? segEnd),
          segmentIndex: sIdx,
        });
      });
    } else {
      const tokens = segText.split(/\s+/u).map(sanitizeWord).filter(Boolean);
      const segDuration = Math.max(0.001, segEnd - segStart);
      tokens.forEach((token, i) => {
        const tStart = segStart + (i / tokens.length) * segDuration;
        const tEnd = segStart + ((i + 1) / tokens.length) * segDuration;
        words.push({
          word: token,
          start: Number(tStart.toFixed(3)),
          end: Number(tEnd.toFixed(3)),
          segmentIndex: sIdx,
        });
      });
    }
  });

  return { fullText: normalize(fullText), segments: parsedSegments, words };
}

function searchWords(words = [], phrase = "") {
  const q = normalize(phrase).toLocaleLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/u).map(sanitizeWord).filter(Boolean);
  if (!tokens.length) return [];

  const lowerWords = words.map((w) => ({
    ...w,
    _lc: sanitizeWord(w.word || "").toLocaleLowerCase(),
  }));

  const results = [];

  for (let i = 0; i < lowerWords.length; i++) {
    let matched = true;
    for (let j = 0; j < tokens.length; j++) {
      if (!lowerWords[i + j] || lowerWords[i + j]._lc !== tokens[j]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      const start = lowerWords[i].start;
      const end = lowerWords[i + tokens.length - 1].end;
      const text = words.slice(i, i + tokens.length).map((w) => w.word).join(" ");
      const contextLeft = Math.max(0, i - 6);
      const contextRight = Math.min(words.length, i + tokens.length + 6);
      const context = words
        .slice(contextLeft, contextRight)
        .map((w) => w.word)
        .join(" ");
      results.push({ text, start, end, index: i, context });
    }
  }

  return results;
}

function detectSensitiveMatches(words = [], sensitiveTerms = []) {
  const normalizedTerms = sensitiveTerms
    .map((term) => normalize(term).toLocaleLowerCase())
    .map((term) => term.split(/\s+/u).map(sanitizeWord).filter(Boolean))
    .filter((tokens) => tokens.length > 0);

  const normalizedWords = words.map((w) => sanitizeWord(w.word || "").toLocaleLowerCase());
  const matches = [];

  normalizedTerms.forEach((termTokens) => {
    for (let i = 0; i <= normalizedWords.length - termTokens.length; i++) {
      let matched = true;
      for (let j = 0; j < termTokens.length; j++) {
        if (normalizedWords[i + j] !== termTokens[j]) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;

      const startWord = words[i];
      const endWord = words[i + termTokens.length - 1];
      matches.push({
        word: words.slice(i, i + termTokens.length).map((w) => w.word).join(" "),
        start: startWord?.start ?? 0,
        end: endWord?.end ?? startWord?.end ?? 0,
        idx: i,
      });
    }
  });

  return matches.sort((a, b) => a.start - b.start || a.idx - b.idx);
}

module.exports = { parseTranscription, searchWords, detectSensitiveMatches };
