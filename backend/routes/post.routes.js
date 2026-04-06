/**
 * routes/post.routes.js
 */

const router = require("express").Router();
const {
  createPost,
  getFeed,
  getSavedPosts,
  getPost,
  deletePost,
  toggleLike,
  toggleSavePost,
  getLikes,
  getComments,
  addComment,
  deleteComment,
  getUserPosts,
} = require("../controllers/post.controller");
const { protect } = require("../middlewares/auth");
const { videoUpload } = require("../middlewares/upload");
const { uploadLimiter } = require("../middlewares/rateLimiter");

router.get("/feed", protect, getFeed);
router.get("/user/:userId", protect, getUserPosts);
router.get("/saved", protect, getSavedPosts);

router.post(
  "/",
  protect,
  uploadLimiter,
  videoUpload.array("media", 10),
  createPost
);

router.get("/:id", getPost);
router.delete("/:id", protect, deletePost);
router.post("/:id/like", protect, toggleLike);
router.post("/:id/save", protect, toggleSavePost);
router.get("/:id/likes", protect, getLikes);
router.get("/:id/comments", protect, getComments);
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

module.exports = router;
