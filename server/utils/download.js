const ytdl = require('ytdl-core');
const fs = require('fs');

async function downloadYouTubeAudio(url, destPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
    const fileStream = fs.createWriteStream(destPath);
    stream.pipe(fileStream);
    fileStream.on('finish', () => resolve(destPath));
    fileStream.on('error', (err) => reject(err));
    stream.on('error', (err) => reject(err));
  });
}

module.exports = downloadYouTubeAudio;