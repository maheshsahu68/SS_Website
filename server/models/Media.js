const mongoose = require('mongoose');

const WordSchema = new mongoose.Schema({
  word: String,
  start: Number,
  end: Number,
  segmentIndex: Number,
});

const SegmentSchema = new mongoose.Schema({
  start: Number,
  end: Number,
  text: String,
});

const TranscriptSchema = new mongoose.Schema({
  fullText: String,
  segments: [SegmentSchema],
  words: [WordSchema],
});

const MediaSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  path: String,
  source: { type: String, enum: ['upload', 'link'], default: 'upload' },
  originalUrl: String,
  status: { type: String, enum: ['uploaded', 'processing', 'ready', 'failed'], default: 'uploaded' },
  uploadedAt: Date,
  processedAt: Date,
  transcript: TranscriptSchema,
  summary: String,
  sensitive: [
    {
      word: String,
      start: Number,
      end: Number,
      idx: Number,
    },
  ],
  error: String,
});

module.exports = mongoose.model('Media', MediaSchema);