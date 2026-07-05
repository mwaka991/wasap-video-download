// downloader.js - Inaita yt-dlp (binary iliyosakinishwa kwenye mfumo) kudownload video
// na kurudisha njia ya faili + video_id.

const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const MAX_WHATSAPP_SIZE_BYTES = 64 * 1024 * 1024; // WhatsApp inazuia ~64-100MB (inatofautiana)

function generateVideoId() {
  return crypto.randomBytes(6).toString('hex'); // mfano: "a1b2c3d4e5f6"
}

/**
 * Download video kwa yt-dlp.
 * @param {string} url
 * @returns {Promise<{filePath: string, videoId: string, title: string, sizeBytes: number}>}
 */
function downloadVideo(url) {
  return new Promise((resolve, reject) => {
    const videoId = generateVideoId();
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-ytdlp-'));
    const outTemplate = path.join(outDir, '%(title).60s.%(ext)s');

    const args = [
      url,
      '-o', outTemplate,
      '-f', 'bv*[height<=720]+ba/b[height<=720]/b',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--quiet',
      '--no-warnings',
      '--print', 'after_move:filepath',
    ];

    execFile('yt-dlp', args, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        fs.rmSync(outDir, { recursive: true, force: true });
        return reject(new Error(stderr || error.message));
      }

      const filePath = stdout.trim().split('\n').pop();
      if (!filePath || !fs.existsSync(filePath)) {
        fs.rmSync(outDir, { recursive: true, force: true });
        return reject(new Error('Faili la video halikupatikana baada ya download.'));
      }

      const stats = fs.statSync(filePath);
      resolve({
        filePath,
        videoId,
        title: path.basename(filePath),
        sizeBytes: stats.size,
        outDir,
      });
    });
  });
}

function cleanup(outDir) {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch (e) {
    // sawa tu, si tatizo kubwa
  }
}

module.exports = { downloadVideo, cleanup, MAX_WHATSAPP_SIZE_BYTES };
