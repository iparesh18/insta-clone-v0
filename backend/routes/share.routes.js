/**
 * routes/share.routes.js
 * Routes for sharing posts and reels
 */

const express = require("express");
const {
  getShareableFollowers,
  sharePost,
  shareReel,
  getSharedPosts,
  getSharedReels,
  markShareAsRead,
} = require("../controllers/share.controller");
const { protect } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { shareValidators } = require("../validations/routeValidators");

const router = express.Router();

// ─── Get followers for share modal ────────────────────────────────────────────
router.get("/followers", protect, shareValidators.followers, validate, getShareableFollowers);

// ─── Share posts and reels ────────────────────────────────────────────────────
router.post("/posts/:postId", protect, shareValidators.sharePost, validate, sharePost);
router.post("/reels/:reelId", protect, shareValidators.shareReel, validate, shareReel);

// ─── Get shared content ───────────────────────────────────────────────────────
router.get("/posts", protect, shareValidators.sharedList, validate, getSharedPosts);
router.get("/reels", protect, shareValidators.sharedList, validate, getSharedReels);

// ─── Mark share as read ───────────────────────────────────────────────────────
router.patch("/:shareId/read", protect, shareValidators.shareId, validate, markShareAsRead);

module.exports = router;
