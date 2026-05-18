const mongoose = require("mongoose");

// Flexible schema to support pre-existing transcription documents/fields.
const TranscriptionSchema = new mongoose.Schema({}, { strict: false, timestamps: true, collection: "transcriptions" });

module.exports = mongoose.models.Transcription || mongoose.model("Transcription", TranscriptionSchema);
