/**
 * controllers/auth.controller.js
 *
 * Handles direct auth only:
 *  POST /register — Creates user + issues auth cookie
 *  POST /login    — Issues auth cookie
 *  POST /logout   — Clears auth cookie
 *  GET  /me       — Returns authenticated user
 */

const User = require("../models/User");
const { signAccessToken } = require("../utils/jwt");
const { sendSuccess, sendError } = require("../utils/apiResponse");

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

    const user = await User.create({
      username,
      email,
      password,
      fullName,
      isVerified: true,
    });

    const accessToken = issueToken(user);
    res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);

    return sendSuccess(res, { user: user.toPublicJSON() }, "Account created", 201);
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
/**
 * Authenticates the user with email + password. Returns auth cookie.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return sendError(res, "Invalid credentials", 401);

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
