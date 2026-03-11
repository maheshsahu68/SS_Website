const { spawn, spawnSync } = require("child_process");
const ytdl = require("ytdl-core");
const fs = require("fs");

function resolveYtDlpCommand() {
  const direct = spawnSync("yt-dlp", ["--version"], { stdio: "ignore" });
  if (direct.status === 0) {
    return { command: "yt-dlp", baseArgs: [] };
  }

  const pythonModule = spawnSync("python", ["-m", "yt_dlp", "--version"], { stdio: "ignore" });
  if (pythonModule.status === 0) {
    return { command: "python", baseArgs: ["-m", "yt_dlp"] };
  }

  return null;
}

function downloadViaYtDlp(url, destPath, runner) {
  return new Promise((resolve, reject) => {
    const args = [...runner.baseArgs, "-f", "bestaudio", "--no-playlist", "-o", destPath, url];
    const child = spawn(runner.command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(destPath);
      reject(new Error(`yt-dlp failed with code ${code}: ${stderr.trim()}`));
    });
  });
}

function downloadViaYtdlCore(url, destPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
    const fileStream = fs.createWriteStream(destPath);
    stream.pipe(fileStream);
    fileStream.on("finish", () => resolve(destPath));
    fileStream.on("error", (err) => reject(err));
    stream.on("error", (err) => reject(err));
  });
}

function isSignatureExtractionError(err) {
  const message = String(err?.message || "").toLowerCase();
  return message.includes("could not extract functions") || message.includes("signature") || message.includes("cipher");
}

async function downloadYouTubeAudio(url, destPath) {
  const ytDlpRunner = resolveYtDlpCommand();
  if (ytDlpRunner) {
    try {
      return await downloadViaYtDlp(url, destPath, ytDlpRunner);
    } catch (err) {
      console.warn("yt-dlp download failed, falling back to ytdl-core:", err.message);
    }
  }

  try {
    return await downloadViaYtdlCore(url, destPath);
  } catch (err) {
    if (isSignatureExtractionError(err)) {
      throw new Error(
        "YouTube changed its player signature and ytdl-core could not parse it. Install yt-dlp (or python yt_dlp) and retry."
      );
    }
    throw err;
  }
}

module.exports = downloadYouTubeAudio;
