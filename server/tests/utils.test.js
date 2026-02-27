const test = require('node:test');
const assert = require('node:assert/strict');

const summarizeText = require('../utils/summarize');
const { parseTranscription, searchWords, detectSensitiveMatches } = require('../utils/processor');

test('parseTranscription creates words from segments', () => {
  const parsed = parseTranscription({
    segments: [
      { start: 0, end: 2, text: 'hello world' },
      { start: 2, end: 5, text: 'this is a test' },
    ],
  });

  assert.equal(parsed.segments.length, 2);
  assert.equal(parsed.words.length, 6);
  assert.equal(parsed.fullText, 'hello world this is a test');
});

test('parseTranscription keeps hindi words while sanitizing punctuation', () => {
  const parsed = parseTranscription({
    segments: [{ start: 0, end: 2, text: 'नमस्ते, दुनिया! hello...' }],
  });

  assert.deepEqual(
    parsed.words.map((w) => w.word),
    ['नमस्ते', 'दुनिया', 'hello']
  );
});

test('searchWords finds phrase boundaries', () => {
  const words = [
    { word: 'hello', start: 0, end: 0.5 },
    { word: 'world', start: 0.5, end: 1.0 },
    { word: 'again', start: 1.0, end: 1.5 },
  ];

  const matches = searchWords(words, 'hello world');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].start, 0);
  assert.equal(matches[0].end, 1.0);
});

test('searchWords matches hindi phrase', () => {
  const words = [
    { word: 'नमस्ते', start: 0, end: 0.5 },
    { word: 'दुनिया', start: 0.5, end: 1.0 },
  ];

  const matches = searchWords(words, 'नमस्ते दुनिया');
  assert.equal(matches.length, 1);
});



test('detectSensitiveMatches finds credential phrases and single words', () => {
  const words = [
    { word: 'share', start: 0, end: 0.3 },
    { word: 'your', start: 0.3, end: 0.6 },
    { word: 'bank', start: 0.6, end: 0.9 },
    { word: 'details', start: 0.9, end: 1.2 },
    { word: 'and', start: 1.2, end: 1.4 },
    { word: 'otp', start: 1.4, end: 1.7 },
  ];

  const matches = detectSensitiveMatches(words, ['bank details', 'otp']);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].word, 'bank details');
  assert.equal(matches[1].word, 'otp');
});

test('summarizeText returns compact local summary', () => {
  const input = 'Node.js helps build APIs. Node.js runs JavaScript on the server. APIs can process audio and video. Searchable transcripts improve content review.';
  const output = summarizeText(input);

  assert.match(output, /Key topic:/);
  assert.ok(output.length > 20);
});
