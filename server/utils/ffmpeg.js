const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

const extractAudio = (videoPath) => {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(path.extname(videoPath), ".wav");

    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
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
