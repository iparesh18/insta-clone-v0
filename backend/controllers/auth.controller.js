/**
 * controllers/auth.controller.js
 *
 * Handles direct auth only:
 *  POST /register — Creates user + sends email verification
 *  POST /login    — Issues auth cookie
 *  POST /logout   — Clears auth cookie
 *  GET  /me       — Returns authenticated user
 */

const crypto = require("crypto");
const User = require("../models/User");
const { signAccessToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { sendVerificationEmail } = require("../services/emailService");

// ─── Cookie Options ──────────────────────────────────────────────────────────
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { username, email, password, fullName } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? "Email" : "Username";
      return sendError(res, `${field} is already taken`, 409);
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      username,
      email,
      password,
      fullName,
      isVerified: false, // User not verified until email is confirmed
      emailVerificationToken: crypto
        .createHash("sha256")
        .update(emailVerificationToken)
        .digest("hex"),
      emailVerificationExpires,
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.username, emailVerificationToken);
    } catch (emailErr) {
      // If email fails, still inform user but they may not receive email
      console.error("Email send failed:", emailErr);
    }

    return sendSuccess(
      res,
      { email: user.email, username: user.username },
      "Account created! Please check your email to verify your account.",
      201
    );
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
/**
 * Authenticates the user with email + password. Returns auth cookie.
 * User must have verified their email first.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return sendError(res, "Invalid credentials", 401);

    // Check if email is verified
    if (!user.emailVerifiedAt) {
      return sendError(res, "Please verify your email before logging in", 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return sendError(res, "Invalid credentials", 401);

    const accessToken = issueToken(user);
    res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);

    return sendSuccess(res, { user: user.toPublicJSON(), accessToken }, "Logged in");
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken");

    return sendSuccess(res, {}, "Logged out");
  } catch (err) {
    next(err);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  return sendSuccess(res, { user: req.user.toPublicJSON() });
};

// ─── Internal: Issue JWT ─────────────────────────────────────────────────────
const issueToken = (user) => {
  return signAccessToken({ id: user._id });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
