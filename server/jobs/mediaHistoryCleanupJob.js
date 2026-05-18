const Media = require("../models/Media");
const { deleteMediaAndArtifacts } = require("../services/mediaDeletionService");

const SIXTY_DAYS_IN_MS = 60 * 24 * 60 * 60 * 1000;
const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const BATCH_SIZE = 100;

let isRunning = false;

function getCutoffDate() {
  return new Date(Date.now() - SIXTY_DAYS_IN_MS);
}

function buildRetentionQuery(cutoffDate) {
  // Retain compatibility with existing docs that may only have uploadedAt.
  return {
    $or: [
      { createdAt: { $lt: cutoffDate } },
      { createdAt: { $exists: false }, uploadedAt: { $lt: cutoffDate } },
    ],
  };
}

async function cleanupOldMediaHistory() {
  if (isRunning) return;
  isRunning = true;

  const cutoffDate = getCutoffDate();
  const retentionQuery = buildRetentionQuery(cutoffDate);

  try {
    let scanned = 0;
    let mediaDeleted = 0;
    let transcriptionDeleted = 0;
    let fileDeleted = 0;

    while (true) {
      const candidates = await Media.find(retentionQuery)
        .sort({ createdAt: 1, uploadedAt: 1 })
        .limit(BATCH_SIZE)
        .select("_id path filename uploadedAt createdAt")
        .lean();

      if (!candidates.length) break;

      scanned += candidates.length;

      for (const media of candidates) {
        const outcome = await deleteMediaAndArtifacts(media);
        if (outcome.mediaDeleted) mediaDeleted += 1;
        transcriptionDeleted += outcome.transcriptionsDeleted || 0;
        if (outcome.file?.deleted) fileDeleted += 1;
      }
    }

    console.log(
      `[MediaHistoryCleanup] cutoff=${cutoffDate.toISOString()} scanned=${scanned} mediaDeleted=${mediaDeleted} filesDeleted=${fileDeleted} transcriptionsDeleted=${transcriptionDeleted}`
    );
  } catch (error) {
    console.error("[MediaHistoryCleanup] Failed to cleanup old media history:", error.message);
  } finally {
    isRunning = false;
  }
}

function startMediaHistoryCleanupJob() {
  cleanupOldMediaHistory();

  const timer = setInterval(() => {
    cleanupOldMediaHistory();
  }, ONE_HOUR_IN_MS);

  timer.unref();

  return timer;
}

module.exports = {
  cleanupOldMediaHistory,
  startMediaHistoryCleanupJob,
};
