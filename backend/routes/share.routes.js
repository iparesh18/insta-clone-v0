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

const router = express.Router();

// ─── Get followers for share modal ────────────────────────────────────────────
router.get("/followers", protect, getShareableFollowers);

// ─── Share posts and reels ────────────────────────────────────────────────────
router.post("/posts/:postId", protect, sharePost);
router.post("/reels/:reelId", protect, shareReel);

// ─── Get shared content ───────────────────────────────────────────────────────
router.get("/posts", protect, getSharedPosts);
router.get("/reels", protect, getSharedReels);

// ─── Mark share as read ───────────────────────────────────────────────────────
router.patch("/:shareId/read", protect, markShareAsRead);

module.exports = router;
