const express = require("express");
const crypto = require("crypto");

const User = require("../models/User");
const SessionLog = require("../models/SessionLog");
const { createToken, verifyToken, getBearerToken } = require("../utils/authToken");

const router = express.Router();

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "309276754683-5oaskor4cp6hs8i0o2so994a7al78vc3.apps.googleusercontent.com";

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(hash, "hex"));
};

async function writeSessionLog(req, user, event, meta = {}) {
  try {
    const xForwardedFor = req.headers["x-forwarded-for"];
    const ip = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : String(xForwardedFor || "").split(",")[0].trim() || req.ip || "unknown";

    await SessionLog.create({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      provider: user.provider,
      event,
      ip,
      userAgent: req.headers["user-agent"] || "unknown",
      meta,
    });
  } catch (error) {
    console.error("session log write failed:", error.message);
  }
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      provider: "local",
      providerId: normalizedEmail,
      lastLoginAt: new Date(),
    });

    await writeSessionLog(req, user, "register");

    return res.status(201).json({
      message: "Registered successfully",
      token: createToken(user),
      user: { id: user._id, name: user.name, email: user.email, provider: user.provider, avatar: user.avatar || "" },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    if (!user.providerId) {
      user.providerId = user.provider === "google" ? user.googleId || normalizedEmail : normalizedEmail;
    }
    await user.save();
    await writeSessionLog(req, user, "login");

    return res.json({
      message: "Login successful",
      token: createToken(user),
      user: { id: user._id, name: user.name, email: user.email, provider: user.provider, avatar: user.avatar || "" },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

router.post("/google", async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google sign-in is not configured on server" });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ message: "Google token verification failed" });
    }

    const payload = await verifyRes.json();
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: "Google token audience mismatch" });
    }

    const email = payload.email?.toLowerCase();
    const googleId = payload.sub;
    const name = payload.name || "Google User";
    const avatar = payload.picture || "";

    if (!email || !googleId) {
      return res.status(400).json({ message: "Invalid Google token payload" });
    }

    let user = await User.findOne({ $or: [{ email }, { provider: "google", providerId: googleId }, { googleId }] });
    if (!user) {
      try {
        user = await User.create({
          name,
          email,
          googleId,
          provider: "google",
          providerId: googleId,
          avatar,
          lastLoginAt: new Date(),
        });
      } catch (error) {
        if (error?.code === 11000) {
          user = await User.findOne({ $or: [{ email }, { provider: "google", providerId: googleId }, { googleId }] });
        } else {
          throw error;
        }
      }
    }

    if (!user) {
      return res.status(409).json({ message: "Could not resolve Google user record" });
    }

    user.googleId = googleId;
    user.provider = "google";
    user.providerId = googleId;
    user.name = name;
    user.avatar = avatar || user.avatar;
    user.lastLoginAt = new Date();
    await user.save();

    await writeSessionLog(req, user, "google_login");

    return res.json({
      message: "Google sign-in successful",
      token: createToken(user),
      user: { id: user._id, name: user.name, email: user.email, provider: user.provider, avatar: user.avatar || "" },
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Google sign-in failed", error: error.message });
  }
});

router.get("/sessions", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ message: "Missing auth token" });

    const payload = verifyToken(token);
    const logs = await SessionLog.find({ userId: payload.sub }).sort({ createdAt: -1 }).limit(30).lean();
    return res.json({ logs });
  } catch (error) {
    return res.status(401).json({ message: "Failed to fetch sessions", error: error.message });
  }
});

module.exports = router;
