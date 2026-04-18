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
  getSuggestions,
  registerPushSubscription,
  unregisterPushSubscription,
} = require("../controllers/user.controller");
const { protect } = require("../middlewares/auth");
const { uploadSingleWithCompression } = require("../middlewares/upload");

router.get("/search", protect, searchUsers);
router.get("/suggestions", protect, getSuggestions);
router.get("/follow-requests", protect, getFollowRequests);
router.post("/follow-requests/:id/accept", protect, acceptFollowRequest);
router.post("/follow-requests/:id/reject", protect, rejectFollowRequest);

router.get("/:username", protect, getProfile);
router.put("/me", protect, ...uploadSingleWithCompression(["image/jpeg", "image/png", "image/webp"], 5, "avatar"), updateProfile);
router.delete("/me", protect, deleteAccount);

router.post("/:id/follow", protect, followUser);
router.delete("/:id/follow", protect, unfollowUser);
router.get("/:id/followers", protect, getFollowers);
router.get("/:id/following", protect, getFollowing);

// Push notification endpoints
router.post("/push-subscription", protect, registerPushSubscription);
router.delete("/push-subscription", protect, unregisterPushSubscription);

module.exports = router;
