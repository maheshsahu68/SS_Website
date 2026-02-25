require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const audioRoutes = require("./routes/audioRoutes");

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sonicsearch";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

app.use("/api/audio", audioRoutes);

app.get("/", (req, res) => {
  res.send("SonicSearch Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
