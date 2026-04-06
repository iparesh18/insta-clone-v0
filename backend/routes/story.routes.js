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
const { videoUpload } = require("../middlewares/upload");
const { uploadLimiter } = require("../middlewares/rateLimiter");

router.get("/feed", protect, getStoryFeed);
router.post("/", protect, uploadLimiter, videoUpload.single("media"), createStory);
router.post("/:id/view", protect, viewStory);
router.delete("/:id", protect, deleteStory);

module.exports = router;
