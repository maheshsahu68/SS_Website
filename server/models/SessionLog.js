const mongoose = require("mongoose");
const logsConnection = require("../db/logsConnection");

const sessionLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    provider: { type: String, enum: ["local", "google", "guest"], default: "local" },
    event: { type: String, enum: ["register", "login", "google_login", "logout"], required: true },
    ip: { type: String, default: "unknown" },
    userAgent: { type: String, default: "unknown" },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = logsConnection.models.SessionLog || logsConnection.model("SessionLog", sessionLogSchema);
