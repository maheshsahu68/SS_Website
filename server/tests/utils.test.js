const test = require('node:test');
const assert = require('node:assert/strict');

const summarizeText = require('../utils/summarize');
const { parseTranscription, searchWords } = require('../utils/processor');

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

test('summarizeText returns compact local summary', () => {
  const input = 'Node.js helps build APIs. Node.js runs JavaScript on the server. APIs can process audio and video. Searchable transcripts improve content review.';
  const output = summarizeText(input);

  assert.match(output, /Key topic:/);
  assert.ok(output.length > 20);
});
