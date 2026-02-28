const express = require("express");
const crypto = require("crypto");

const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "sonicsearchsupersecure2026";
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

const createToken = (user) => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      provider: user.provider,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString("base64url");

  const signature = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

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
    });

    return res.status(201).json({
      message: "Registered successfully",
      token: createToken(user),
      user: { id: user._id, name: user.name, email: user.email, provider: user.provider },
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      message: "Login successful",
      token: createToken(user),
      user: { id: user._id, name: user.name, email: user.email, provider: user.provider },
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

    if (!email || !googleId) {
      return res.status(400).json({ message: "Invalid Google token payload" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, googleId, provider: "google" });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.provider = "google";
      await user.save();
    }

    return res.json({
      message: "Google sign-in successful",
      token: createToken(user),
      user: { id: user._id, name: user.name, email: user.email, provider: user.provider },
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Google sign-in failed", error: error.message });
  }
});

module.exports = router;
