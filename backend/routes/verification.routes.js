/**
 * routes/verification.routes.js
 *
 * Email verification endpoints
 * POST   /verify-email/:token      — Verify email with token
 * POST   /resend-verification      — Resend verification email
 */

const express = require("express");
const { verifyEmail, resendVerificationEmail } = require("../controllers/verification.controller");
const { validate } = require("../middlewares/validate");
const { verificationValidators } = require("../validations/routeValidators");

const router = express.Router();

// Verify email with token
router.post("/verify-email/:token", verificationValidators.verifyEmail, validate, verifyEmail);

// Resend verification email
router.post("/resend-verification", verificationValidators.resendVerification, validate, resendVerificationEmail);

module.exports = router;
