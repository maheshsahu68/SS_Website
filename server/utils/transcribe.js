const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function resolveWhisperBinary() {
  if (process.env.WHISPER_CPP_BIN) return process.env.WHISPER_CPP_BIN;
  return "whisper-cli";
}

function resolveModelPath(language = "auto") {
  const defaultModel = process.env.WHISPER_CPP_MODEL;
  const hindiModel = process.env.WHISPER_CPP_MODEL_HI;
  const selectedModel = language === "hi" && hindiModel ? hindiModel : defaultModel;

  if (!selectedModel) {
    throw new Error("WHISPER_CPP_MODEL is not set. Point it to a local GGML/GGUF Whisper model file.");
  }

  if (language === "hi" && /\.en(\.|$)/i.test(selectedModel)) {
    throw new Error("Hindi transcription requires a multilingual Whisper model. Set WHISPER_CPP_MODEL_HI or use a non-.en model.");
  }

  return selectedModel;
}

function runWhisper(audioPath, outDir, outBase, language = "auto") {
  const whisperBinary = resolveWhisperBinary();
  const modelPath = resolveModelPath(language);

  const args = ["-m", modelPath, "-f", audioPath, "-oj", "-of", path.join(outDir, outBase)];

  if (language && language !== "auto") {
    args.push("-l", language);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(whisperBinary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`whisper.cpp failed with code ${code}: ${stderr.trim()}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

function findWhisperJsonOutput(outDir, outBase, absAudioPath) {
  const audioName = path.parse(absAudioPath).name;
  const candidates = [
    path.join(outDir, `${outBase}.json`),
    path.join(outDir, `${audioName}.json`),
    path.join(path.dirname(absAudioPath), `${outBase}.json`),
    path.join(path.dirname(absAudioPath), `${audioName}.json`),
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }

  return null;
}

function parseTimeValue(value, fallback, unit = "seconds") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (unit === "milliseconds") return parsed / 1000;
  return parsed;
}

function parseWhisperCppJson(raw) {
  const transcription = { text: raw?.transcription?.map((s) => s.text).join(" ") || "", segments: [] };

  if (!Array.isArray(raw?.transcription)) return transcription;

  transcription.segments = raw.transcription.map((segment) => {
    const start = parseTimeValue(segment.offsets?.from, 0, "milliseconds");
    const end = parseTimeValue(segment.offsets?.to, start, "milliseconds");

    return {
      start,
      end,
      text: String(segment.text || "").trim(),
      words: Array.isArray(segment.words)
        ? segment.words.map((w) => {
            const hasOffsets = w.offsets?.from != null || w.offsets?.to != null;
            return {
              text: w.word ?? w.text ?? "",
              start: hasOffsets
                ? parseTimeValue(w.offsets?.from, start, "milliseconds")
                : parseTimeValue(w.start, start, "seconds"),
              end: hasOffsets
                ? parseTimeValue(w.offsets?.to, end, "milliseconds")
                : parseTimeValue(w.end, end, "seconds"),
            };
          })
        : [],
    };
  });

  return transcription;
}

async function transcribeAudio(audioPath, language = "auto") {
  const absAudioPath = path.resolve(audioPath);
  if (!fs.existsSync(absAudioPath)) {
    throw new Error(`Audio file does not exist: ${absAudioPath}`);
  }

  const outDir = path.resolve("uploads");
  const outBase = `${path.parse(absAudioPath).name}-transcript`;
  const runResult = await runWhisper(absAudioPath, outDir, outBase, language);
  const outJson = findWhisperJsonOutput(outDir, outBase, absAudioPath);

  if (!outJson) {
    const details = [runResult.stderr, runResult.stdout].filter(Boolean).join("\n").trim();
    throw new Error(
      `whisper.cpp did not generate JSON output near ${outDir}. ${details ? `Command output: ${details}` : ""}`.trim()
    );
  }

  const raw = JSON.parse(fs.readFileSync(outJson, "utf8"));
  return parseWhisperCppJson(raw);
}

module.exports = transcribeAudio;
