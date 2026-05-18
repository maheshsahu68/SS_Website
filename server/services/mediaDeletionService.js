const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Media = require("../models/Media");
const Transcription = require("../models/Transcription");

function toAbsoluteFilePath(storedPath) {
  if (!storedPath) return null;
  if (path.isAbsolute(storedPath)) return storedPath;
  return path.join(__dirname, "..", storedPath);
}

async function safeDeleteFile(filePath) {
  if (!filePath) return { deleted: false, skipped: true, reason: "missing-path" };

  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (_) {
    return { deleted: false, skipped: true, reason: "file-not-found" };
  }

  try {
    await fs.promises.unlink(filePath);
    return { deleted: true, skipped: false };
  } catch (error) {
    return { deleted: false, skipped: false, reason: error.message };
  }
}

function buildTranscriptionDeleteQuery(media) {
  const mediaId = media?._id?.toString();
  const filename = media?.filename;
  const filePath = media?.path;

  const orConditions = [];
  if (mediaId) {
    orConditions.push({ mediaId });
    orConditions.push({ mediaId: media._id });
    orConditions.push({ media: mediaId });
    orConditions.push({ media: media._id });
  }
  if (filename) orConditions.push({ filename });
  if (filePath) orConditions.push({ path: filePath });

  return orConditions.length ? { $or: orConditions } : null;
}

async function deleteRelatedTranscriptions(media) {
  const query = buildTranscriptionDeleteQuery(media);
  if (!query) return { deletedCount: 0 };
  return Transcription.deleteMany(query);
}

async function deleteMediaAndArtifacts(media) {
  const results = { mediaDeleted: false, file: null, transcriptionsDeleted: 0 };

  try {
    await Media.findByIdAndDelete(media._id);
    results.mediaDeleted = true;
  } catch (error) {
    console.error("[MediaDelete] Media document deletion failed:", error.message);
  }

  try {
    results.file = await safeDeleteFile(toAbsoluteFilePath(media.path));
  } catch (error) {
    console.error("[MediaDelete] File deletion failed:", error.message);
  }

  try {
    const transcriptionResult = await deleteRelatedTranscriptions(media);
    results.transcriptionsDeleted = transcriptionResult?.deletedCount || 0;
  } catch (error) {
    console.error("[MediaDelete] Transcription cleanup failed:", error.message);
  }

  return results;
}

async function deleteMediaWithArtifacts({ mediaId, ownerId }) {
  if (!mongoose.Types.ObjectId.isValid(mediaId)) {
    return { ok: false, status: 400, message: "Invalid media id" };
  }

  const media = await Media.findOne({ _id: mediaId, ownerId });
  if (!media) {
    return { ok: false, status: 404, message: "Not found or not authorised" };
  }

  const details = await deleteMediaAndArtifacts(media);

  console.log(
    `[MediaDelete] mediaId=${media._id} mediaDeleted=${details.mediaDeleted} transcriptionsDeleted=${details.transcriptionsDeleted} fileStatus=${JSON.stringify(details.file)}`
  );

  return { ok: true, status: 200, message: "Deleted", details };
}

module.exports = {
  deleteMediaWithArtifacts,
  deleteMediaAndArtifacts,
};
