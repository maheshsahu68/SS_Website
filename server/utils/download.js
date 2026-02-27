const { spawn, spawnSync } = require("child_process");
const ytdl = require("ytdl-core");
const fs = require("fs");

function hasYtDlp() {
  const check = spawnSync("yt-dlp", ["--version"], { stdio: "ignore" });
  return check.status === 0;
}

function downloadViaYtDlp(url, destPath) {
  return new Promise((resolve, reject) => {
    const args = ["-f", "bestaudio", "--no-playlist", "-o", destPath, url];
    const child = spawn("yt-dlp", args, { stdio: ["ignore", "pipe", "pipe"] });
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

async function downloadYouTubeAudio(url, destPath) {
  if (hasYtDlp()) {
    try {
      return await downloadViaYtDlp(url, destPath);
    } catch (err) {
      console.warn("yt-dlp download failed, falling back to ytdl-core:", err.message);
    }
  }

  return downloadViaYtdlCore(url, destPath);
}

module.exports = downloadYouTubeAudio;
