const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "sonicsearchsupersecure2026";

function createToken(user) {
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
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new Error("Invalid token format");
  }

  const [payload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  if (expected !== signature) throw new Error("Invalid token signature");

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (!parsed?.sub || !parsed?.exp) throw new Error("Invalid token payload");
  if (Date.now() > Number(parsed.exp)) throw new Error("Token expired");
  return parsed;
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}

module.exports = { createToken, verifyToken, getBearerToken };
