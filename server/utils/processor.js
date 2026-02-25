// Parse OpenAI Whisper verbose_json transcription into structured transcript + word index
// Also provide a search helper that returns exact timestamps for phrase matches

const normalize = (s = '') => String(s).replace(/\s+/g, ' ').trim();

function parseOpenAITranscription(transcription) {
  // transcription may contain `segments` directly or nested - be defensive
  const segments = transcription?.segments || transcription?.data?.segments || [];
  let fullText = '';
  const parsedSegments = [];
  const words = [];

  segments.forEach((seg, sIdx) => {
    const segText = normalize(seg.text ?? seg.segment ?? '');
    const segStart = Number(seg.start ?? seg.start_time ?? 0);
    const segEnd = Number(seg.end ?? seg.end_time ?? (segStart + (seg.duration || 0)));

    parsedSegments.push({ start: segStart, end: segEnd, text: segText });

    if (fullText.length) fullText += ' ';
    fullText += segText;

    // If word-level timestamps are available, use them; otherwise distribute across tokens
    if (Array.isArray(seg.words) && seg.words.length) {
      seg.words.forEach((w) => {
        words.push({ word: w.text, start: Number(w.start ?? w.start_time ?? segStart), end: Number(w.end ?? w.end_time ?? segEnd), segmentIndex: sIdx });
      });
    } else {
      const tokens = segText.split(/\s+/).filter(Boolean);
      const segDuration = Math.max(0.001, segEnd - segStart);
      tokens.forEach((token, i) => {
        const tStart = segStart + (i / tokens.length) * segDuration;
        const tEnd = segStart + ((i + 1) / tokens.length) * segDuration;
        words.push({ word: token.replace(/[^\w'\-]/g, ''), start: Number(tStart.toFixed(3)), end: Number(tEnd.toFixed(3)), segmentIndex: sIdx });
      });
    }
  });

  return { fullText: normalize(fullText), segments: parsedSegments, words };
}

// Search for a phrase (single or multi-word) inside an array of word objects
function searchWords(words = [], phrase = '') {
  const q = String(phrase || '').trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const results = [];

  const lowerWords = words.map((w) => ({ ...w, _lc: String(w.word || '').toLowerCase() }));

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
      const text = words.slice(i, i + tokens.length).map((w) => w.word).join(' ');
      const contextLeft = Math.max(0, i - 6);
      const contextRight = Math.min(words.length, i + tokens.length + 6);
      const context = words.slice(contextLeft, contextRight).map((w) => w.word).join(' ');
      results.push({ text, start, end, index: i, context });
    }
  }

  return results;
}

module.exports = { parseOpenAITranscription, searchWords };
