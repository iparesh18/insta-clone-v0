/**
 * routes/story.routes.js
 */

const router = require("express").Router();
const {
  createStory,
  getStoryFeed,
  viewStory,
  deleteStory,
} = require("../controllers/story.controller");
const { protect } = require("../middlewares/auth");
const { uploadSingleWithCompression } = require("../middlewares/upload");
const { uploadLimiter } = require("../middlewares/rateLimiter");

router.get("/feed", protect, getStoryFeed);
router.post("/", protect, uploadLimiter, ...uploadSingleWithCompression(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"], 100, "media"), createStory);
router.post("/:id/view", protect, viewStory);
router.delete("/:id", protect, deleteStory);

module.exports = router;
