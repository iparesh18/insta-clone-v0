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
const { validate } = require("../middlewares/validate");
const { reelValidators } = require("../validations/routeValidators");

router.get("/feed", protect, reelValidators.feed, validate, getReelFeed);

router.get("/user/:userId", reelValidators.userReels, validate, getUserReels);

router.post(
  "/",
  protect,
  uploadLimiter,
  reelValidators.createReel,
  validate,
  ...reelUpload,
  createReel
);

router.get("/:id", reelValidators.reelId, validate, getReel);
router.post("/:id/view", reelValidators.reelId, validate, registerView);
router.post("/:id/like", protect, reelValidators.reelId, validate, toggleLike);
router.get("/:id/comments", reelValidators.comments, validate, getComments);
router.post("/:id/comments", protect, reelValidators.addComment, validate, addComment);
router.delete("/:id/comments/:commentId", protect, reelValidators.deleteComment, validate, deleteComment);
router.delete("/:id", protect, reelValidators.reelId, validate, deleteReel);

module.exports = router;
