const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// utils & models
const extractAudio = require("../utils/ffmpeg");
const transcribeAudio = require("../utils/transcribe");
const { parseTranscription, searchWords, detectSensitiveMatches } = require("../utils/processor");
const summarizeText = require("../utils/summarize");
const downloadYouTubeAudio = require("../utils/download");
const Media = require("../models/Media");
const SENSITIVE_WORDS = require("../config/sensitiveWords");
const { verifyToken, getBearerToken } = require("../utils/authToken");

const SUPPORTED_LANGUAGES = new Set(["auto", "en", "hi"]);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

// =======================
// Multer configuration
// =======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 300 * 1024 * 1024, // 300MB
  },
});

function shouldConvertToWav(media = {}) {
  const mime = String(media.mimeType || "").toLowerCase();
  const ext = path.extname(String(media.path || "")).toLowerCase();

  if (mime.startsWith("video")) return true;

  const wavLike = new Set([".wav", ".wave"]);
  if (wavLike.has(ext)) return false;
  if (mime.includes("wav") || mime.includes("x-wav") || mime.includes("wave")) return false;

  return true;
}


function getAuthenticatedUser(req) {
  try {
    const token = getBearerToken(req);
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

function normalizeLanguage(language) {
  const normalized = String(language || "auto").toLowerCase().trim();
  const alias = {
    hindi: "hi",
    "hi-in": "hi",
    english: "en",
    "en-us": "en",
    "en-gb": "en",
  };
  const mapped = alias[normalized] || normalized;
  return SUPPORTED_LANGUAGES.has(mapped) ? mapped : "auto";
}

async function processMedia(mediaId) {
  try {
    const media = await Media.findById(mediaId);
    if (!media) return;

    await Media.findByIdAndUpdate(mediaId, { status: "processing" });

    let audioPath = media.path;

    // normalize input for whisper.cpp: convert non-wav media to mono 16k WAV first
    if (shouldConvertToWav(media)) {
      audioPath = await extractAudio(media.path);
    }

    // transcribe via local whisper.cpp CLI
    const transcription = await transcribeAudio(audioPath, media.transcriptionLanguage || "auto");

    // parse segments + word-level index (fallback to proportional timestamps if needed)
    const parsed = parseTranscription(transcription);

    // detect sensitive words/phrases (credentials + harmful content)
    const sensitiveMatches = detectSensitiveMatches(parsed.words || [], SENSITIVE_WORDS);

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

    const transcriptionLanguage = normalizeLanguage(req.body?.language);

    const authUser = getAuthenticatedUser(req);

    const mediaDoc = new Media({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      source: "upload",
      transcriptionLanguage,
      ownerId: authUser?.sub,
      ownerEmail: authUser?.email,
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
    const { url, language } = req.body || {};
    if (!url) return res.status(400).json({ message: "Missing url" });

    // support YouTube (ytdl-core); extendable to other platforms
    if (!/youtube\.com|youtu\.be/.test(url)) {
      return res.status(400).json({ message: "Only YouTube links are supported for now" });
    }

    const filename = `${Date.now()}-youtube-audio.mp4`;
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const destPath = path.join(UPLOADS_DIR, filename);

    await downloadYouTubeAudio(url, destPath);

    const stats = fs.statSync(destPath);

    const authUser = getAuthenticatedUser(req);

    const mediaDoc = new Media({
      filename,
      originalName: url,
      mimeType: "audio/mp4",
      size: stats.size,
      path: path.relative(path.join(__dirname, ".."), destPath),
      source: "link",
      transcriptionLanguage: normalizeLanguage(language),
      originalUrl: url,
      ownerId: authUser?.sub,
      ownerEmail: authUser?.email,
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
// Previous activity for logged-in user
// =======================
router.get("/history", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const authUser = verifyToken(token);
    const items = await Media.find({ ownerId: authUser.sub })
      .sort({ uploadedAt: -1 })
      .limit(50)
      .select("_id originalName filename source status uploadedAt processedAt error summary transcript.fullText")
      .lean();

    return res.json({ items });
  } catch (error) {
    return res.status(401).json({ message: "Failed to fetch activity", error: error.message });
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
