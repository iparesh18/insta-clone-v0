/**
 * routes/reel.routes.js
 */

const router = require("express").Router();
const {
  createReel,
  getReelFeed,
  getReel,
  getUserReels,
  registerView,
  toggleLike,
  deleteReel,
  getComments,
  addComment,
  deleteComment,
} = require("../controllers/reel.controller");
const { protect } = require("../middlewares/auth");
const { reelUpload } = require("../middlewares/upload");
const { uploadLimiter } = require("../middlewares/rateLimiter");

router.get("/feed", protect, getReelFeed);

router.get("/user/:userId", getUserReels);

router.post(
  "/",
  protect,
  uploadLimiter,
  ...reelUpload,
  createReel
);

router.get("/:id", getReel);
router.post("/:id/view", registerView);
router.post("/:id/like", protect, toggleLike);
router.get("/:id/comments", getComments);
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);
router.delete("/:id", protect, deleteReel);

module.exports = router;
