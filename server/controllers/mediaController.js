const { verifyToken, getBearerToken } = require("../utils/authToken");
const { deleteMediaWithArtifacts } = require("../services/mediaDeletionService");

async function deleteMediaController(req, res) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const authUser = verifyToken(token);

    const result = await deleteMediaWithArtifacts({
      mediaId: req.params.id,
      ownerId: authUser.sub,
    });

    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.status(200).json({ message: result.message, details: result.details });
  } catch (err) {
    console.error("[MediaDelete] Request failed:", err);
    return res.status(500).json({ message: "Delete failed", error: err.message });
  }
}

module.exports = {
  deleteMediaController,
};
