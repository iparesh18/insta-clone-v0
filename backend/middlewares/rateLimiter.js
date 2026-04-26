/**
 * middlewares/rateLimiter.js
 * Redis-backed rate limiting via express-rate-limit.
 * 
 * Strategy:
 * - Skip global limiter for auth endpoints (they have their own)
 * - Use higher limits in development
 * - Skip health checks
 */

const rateLimit = require("express-rate-limit");

const getClientIpKey = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";

  if (typeof rateLimit.ipKeyGenerator === "function") {
    return rateLimit.ipKeyGenerator(ip);
  }

  return ip;
};

// Global API limiter (for non-auth routes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 500, // 500 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
  skip: (req) => {
    // Skip auth routes (they have dedicated limiters)
    // Skip health checks
    return req.path.includes("/auth") || req.path === "/health";
  },
});

// Auth limiter for registration, login, password reset
// More lenient in development
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100, // 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts. Try again in 15 minutes." },
  keyGenerator: (req) => getClientIpKey(req),
  skip: (req) => false, // Don't skip anything for auth
});

// Protected endpoint limiter (getMe, logout)
// Very lenient because these are called frequently on app load
const protectedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 60 : 300, // 300 in dev (5/sec)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please wait a moment." },
  keyGenerator: (req) => getClientIpKey(req),
  skip: (req) => false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { success: false, message: "Upload limit reached. Try again in an hour." },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter, protectedLimiter };
