/**
 * routes/post.routes.js
 */

const router = require("express").Router();
const {
  generatePostCaption,
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
const { uploadWithCompression } = require("../middlewares/upload");
const { uploadLimiter } = require("../middlewares/rateLimiter");
const { validate } = require("../middlewares/validate");
const { postValidators } = require("../validations/routeValidators");

router.get("/feed", protect, postValidators.feed, validate, getFeed);
router.get("/user/:userId", protect, postValidators.userPosts, validate, getUserPosts);
router.get("/saved", protect, getSavedPosts);
router.post("/generate-caption", protect, postValidators.generateCaption, validate, generatePostCaption);

router.post(
  "/",
  protect,
  uploadLimiter,
  postValidators.createPost,
  validate,
  ...uploadWithCompression(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"], 100),
  createPost
);

router.get("/:id", postValidators.postId, validate, getPost);
router.delete("/:id", protect, postValidators.postId, validate, deletePost);
router.post("/:id/like", protect, postValidators.postId, validate, toggleLike);
router.post("/:id/save", protect, postValidators.postId, validate, toggleSavePost);
router.get("/:id/likes", protect, postValidators.likesComments, validate, getLikes);
router.get("/:id/comments", protect, postValidators.likesComments, validate, getComments);
router.post("/:id/comments", protect, postValidators.addComment, validate, addComment);
router.delete("/:id/comments/:commentId", protect, postValidators.deleteComment, validate, deleteComment);

module.exports = router;
