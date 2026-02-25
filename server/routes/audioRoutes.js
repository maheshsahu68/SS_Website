// const express = require("express");
// const multer = require("multer");
// const router = express.Router();
// const transcribeAudio = require("../utils/transcribe");

// // storage configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   }
// });

// const upload = multer({ storage });

// // POST: upload audio & video files
// // router.post("/upload", upload.single("audio"), (req, res) => {
// //   const isVideo = req.file.mimetype.startsWith("video");

// //   res.json({
// //     message: isVideo
// //       ? "Video uploaded successfully"
// //       : "Audio uploaded successfully",
// //     file: req.file
// //   });
// // });
// router.post("/upload", upload.single("audio"), async (req, res) => {
//   try {
//     let audioPath = req.file.path;

//     // 👇 if video, extract audio
//     if (req.file.mimetype.startsWith("video")) {
//       audioPath = await extractAudio(req.file.path);
//     }

//     res.json({
//       message: "Media uploaded & audio ready",
//       file: req.file,
//       audioPath
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Processing failed" });
//   }
// });

// // POST: upload video and extract audio
// const extractAudio = require("../utils/ffmpeg");

// module.exports = router;

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// utils & models
const extractAudio = require("../utils/ffmpeg");
const transcribeAudio = require("../utils/transcribe").default;
const { parseOpenAITranscription, searchWords } = require("../utils/processor");
const summarizeText = require("../utils/summarize");
const downloadYouTubeAudio = require("../utils/download");
const Media = require("../models/Media");
const SENSITIVE_WORDS = require("../config/sensitiveWords");

// =======================
// Multer configuration
// =======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// -----------------------
// Background processing
// -----------------------
async function processMedia(mediaId) {
  try {
    const media = await Media.findById(mediaId);
    if (!media) throw new Error("Media not found");

    await Media.findByIdAndUpdate(mediaId, { status: "processing" });

    let audioPath = media.path;

    // if original was video, extract audio first
    if (media.mimeType && media.mimeType.startsWith("video")) {
      audioPath = await extractAudio(media.path);
    }

    // transcribe via configured STT (OpenAI Whisper)
    const transcription = await transcribeAudio(audioPath);

    // parse segments + word-level index (fallback to proportional timestamps if needed)
    const parsed = parseOpenAITranscription(transcription);

    // detect sensitive words from parsed.words
    const sensitiveMatches = [];
    const lowerSensitive = SENSITIVE_WORDS.map((w) => w.toLowerCase());
    parsed.words.forEach((w, idx) => {
      if (lowerSensitive.includes(String(w.word).toLowerCase())) {
        sensitiveMatches.push({ word: w.word, start: w.start, end: w.end, idx });
      }
    });

    // update DB
    await Media.findByIdAndUpdate(mediaId, {
      status: "ready",
      processedAt: new Date(),
      transcript: parsed,
      sensitive: sensitiveMatches,
    });

    console.log(`Media ${mediaId} processed — segments: ${parsed.segments.length}, words: ${parsed.words.length}`);
  } catch (err) {
    console.error("processMedia error:", err);
    await Media.findByIdAndUpdate(mediaId, { status: "failed", error: err.message });
  }
}

// =======================
// Upload route (saves record, processes in background)
// =======================
router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const mediaDoc = new Media({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      source: "upload",
      status: "uploaded",
      uploadedAt: new Date(),
    });

    await mediaDoc.save();

    // start processing in background (non-blocking)
    setImmediate(() => processMedia(mediaDoc._id));

    res.json({ message: "File received, processing started", mediaId: mediaDoc._id, file: req.file });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// =======================
// Accept external media link (YouTube first)
// =======================
router.post("/process-link", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ message: "Missing url" });

    // support YouTube (ytdl-core); extendable to other platforms
    if (!/youtube.com|youtu.be/.test(url)) {
      return res.status(400).json({ message: "Only YouTube links are supported for now" });
    }

    const filename = `${Date.now()}-youtube-audio.mp4`;
    const destPath = path.join("uploads", filename);

    await downloadYouTubeAudio(url, destPath);

    const stats = fs.statSync(destPath);

    const mediaDoc = new Media({
      filename,
      originalName: url,
      mimeType: "audio/mp4",
      size: stats.size,
      path: destPath,
      source: "link",
      originalUrl: url,
      status: "uploaded",
      uploadedAt: new Date(),
    });

    await mediaDoc.save();

    setImmediate(() => processMedia(mediaDoc._id));

    res.json({ message: "Link received, processing started", mediaId: mediaDoc._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Link processing failed", error: err.message });
  }
});

// =======================
// Get media status / transcript / metadata
// =======================
router.get("/:id", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).lean();
    if (!media) return res.status(404).json({ message: "Not found" });
    res.json(media);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch media", error: err.message });
  }
});

// =======================
// Search inside transcript (word/phrase) → return exact timestamps
// =======================
router.post("/:id/search", async (req, res) => {
  try {
    const { query } = req.body || {};
    if (!query) return res.status(400).json({ message: "Missing search query" });

    const media = await Media.findById(req.params.id).lean();
    if (!media || !media.transcript) return res.status(404).json({ message: "Transcript not ready" });

    const matches = searchWords(media.transcript.words || [], query);
    res.json({ matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

// =======================
// Generate / retrieve AI summary
// =======================
router.post("/:id/summary", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media || !media.transcript) return res.status(404).json({ message: "Transcript not ready" });

    if (media.summary) return res.json({ summary: media.summary });

    const summary = await summarizeText(media.transcript.fullText || media.transcript.text || "");
    media.summary = summary;
    await media.save();

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate summary", error: err.message });
  }
});

// =======================
// Sensitive matches
// =======================
router.get("/:id/sensitive", async (req, res) => {
  try {
    const media = await Media.findById(req.params.id).lean();
    if (!media) return res.status(404).json({ message: "Not found" });
    res.json({ sensitive: media.sensitive || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch sensitive info", error: err.message });
  }
});

module.exports = router;
