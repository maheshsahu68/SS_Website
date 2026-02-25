const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// 👇 explicitly set ffmpeg path (VERY IMPORTANT on Windows)
ffmpeg.setFfmpegPath("C:/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe");

const extractAudio = (videoPath) => {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(path.extname(videoPath), ".wav");

    ffmpeg(videoPath)
      .output(audioPath)
      .on("end", () => {
        console.log("Audio extracted:", audioPath);
        resolve(audioPath);
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err.message);
        reject(err);
      })
      .run();
  });
};

module.exports = extractAudio;
