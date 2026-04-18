/**
 * controllers/verification.controller.js
 *
 * Handles email verification and account activation
 * POST /verify-email/:token — Verify user email and activate account
 */

const crypto = require("crypto");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Verify email token and activate user account
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return sendError(res, "Verification token is required", 400);
    }

    // Hash the token to match what's stored in DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return sendError(res, "Invalid or expired verification link", 400);
    }

    // Mark email as verified
    user.emailVerifiedAt = new Date();
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    return sendSuccess(
      res,
      { username: user.username, email: user.email },
      "Email verified successfully! You can now log in.",
      200
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Resend verification email (for users who didn't receive the first one)
 */
const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, "Email is required", 400);
    }

    const user = await User.findOne({
      email,
      $or: [{ emailVerifiedAt: null }, { emailVerifiedAt: { $exists: false } }],
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return sendError(res, "User not found or already verified", 404);
    }

    // Check if user can request another verification email (rate limiting)
    if (user.emailVerificationExpires && user.emailVerificationExpires > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.emailVerificationExpires - new Date()) / 1000 / 60
      );
      return sendError(
        res,
        `Please wait ${remainingMinutes} minutes before requesting another verification email`,
        429
      );
    }

    // Generate new verification token
    const { sendVerificationEmail } = require("../services/emailService");
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(emailVerificationToken)
      .digest("hex");
    user.emailVerificationExpires = emailVerificationExpires;

    await user.save();

    // Send email
    try {
      await sendVerificationEmail(user.email, user.username, emailVerificationToken);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      return sendError(res, "Failed to send verification email", 500);
    }

    return sendSuccess(
      res,
      { email: user.email },
      "Verification email sent! Check your inbox.",
      200
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyEmail,
  resendVerificationEmail,
};
