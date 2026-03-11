const mongoose = require("mongoose");

const logsUri = process.env.LOGS_MONGODB_URI || "mongodb://127.0.0.1:27017/sonicsearch_logs";

const logsConnection = mongoose.createConnection();

logsConnection.on("connected", () => {
  console.log("✅ Connected to logs MongoDB");
});

logsConnection.on("error", (err) => {
  console.error("❌ Logs MongoDB connection error:", err.message);
});

logsConnection
  .openUri(logsUri, { serverSelectionTimeoutMS: 5000 })
  .catch((err) => console.error("❌ Logs MongoDB initial connect failed:", err.message));

module.exports = logsConnection;
