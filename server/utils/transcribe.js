const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function resolveWhisperBinary() {
  if (process.env.WHISPER_CPP_BIN) return process.env.WHISPER_CPP_BIN;
  return "whisper-cli";
}

function runWhisper(audioPath, outDir, outBase) {
  const whisperBinary = resolveWhisperBinary();
  const modelPath = process.env.WHISPER_CPP_MODEL;

  if (!modelPath) {
    throw new Error("WHISPER_CPP_MODEL is not set. Point it to a local GGML/GGUF Whisper model file.");
  }

  const args = [
    "-m",
    modelPath,
    "-f",
    audioPath,
    "-oj",
    "-of",
    path.join(outDir, outBase),
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(whisperBinary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`whisper.cpp failed with code ${code}: ${stderr.trim()}`));
      }
      resolve();
    });
  });
}

function parseWhisperCppJson(raw) {
  const transcription = { text: raw?.transcription?.map((s) => s.text).join(" ") || "", segments: [] };

  if (!Array.isArray(raw?.transcription)) return transcription;

  transcription.segments = raw.transcription.map((segment) => {
    const start = Number(segment.offsets?.from ?? 0) / 1000;
    const end = Number(segment.offsets?.to ?? 0) / 1000;
    return {
      start,
      end,
      text: String(segment.text || "").trim(),
    };
  });

  return transcription;
}

async function transcribeAudio(audioPath) {
  const absAudioPath = path.resolve(audioPath);
  if (!fs.existsSync(absAudioPath)) {
    throw new Error(`Audio file does not exist: ${absAudioPath}`);
  }

  const outDir = path.resolve("uploads");
  const outBase = `${path.parse(absAudioPath).name}-transcript`;
  const outJson = path.join(outDir, `${outBase}.json`);

  await runWhisper(absAudioPath, outDir, outBase);

  if (!fs.existsSync(outJson)) {
    throw new Error(`whisper.cpp did not generate JSON output at ${outJson}`);
  }

  const raw = JSON.parse(fs.readFileSync(outJson, "utf8"));
  return parseWhisperCppJson(raw);
}

module.exports = transcribeAudio;
