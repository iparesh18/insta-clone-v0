/**
 * routes/user.routes.js
 */

const router = require("express").Router();
const {
  getProfile,
  updateProfile,
  searchUsers,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  deleteAccount,
} = require("../controllers/user.controller");
const { protect } = require("../middlewares/auth");
const { avatarUpload } = require("../middlewares/upload");

router.get("/search", protect, searchUsers);
router.get("/follow-requests", protect, getFollowRequests);
router.post("/follow-requests/:id/accept", protect, acceptFollowRequest);
router.post("/follow-requests/:id/reject", protect, rejectFollowRequest);

router.get("/:username", protect, getProfile);
router.put("/me", protect, avatarUpload.single("avatar"), updateProfile);
router.delete("/me", protect, deleteAccount);

router.post("/:id/follow", protect, followUser);
router.delete("/:id/follow", protect, unfollowUser);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);

module.exports = router;
