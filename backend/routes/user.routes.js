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
const { avatarUpload } = require("../middlewares/upload");
const { validate } = require("../middlewares/validate");
const { userValidators } = require("../validations/routeValidators");

router.get("/search", protect, userValidators.searchUsers, validate, searchUsers);
router.get("/suggestions", protect, userValidators.getSuggestions, validate, getSuggestions);
router.get("/follow-requests", protect, getFollowRequests);
router.post("/follow-requests/:id/accept", protect, userValidators.followRequestIdParam, validate, acceptFollowRequest);
router.post("/follow-requests/:id/reject", protect, userValidators.followRequestIdParam, validate, rejectFollowRequest);

router.get("/:username", protect, userValidators.getProfile, validate, getProfile);
router.put(
  "/me",
  protect,
  userValidators.updateProfile,
  validate,
  avatarUpload.single("avatar"),
  updateProfile
);
router.delete("/me", protect, deleteAccount);

router.post("/:id/follow", protect, userValidators.idParam, validate, followUser);
router.delete("/:id/follow", protect, userValidators.idParam, validate, unfollowUser);
router.get("/:id/followers", protect, userValidators.followersFollowing, validate, getFollowers);
router.get("/:id/following", protect, userValidators.followersFollowing, validate, getFollowing);

// Push notification endpoints
router.post("/push-subscription", protect, userValidators.pushSubscription, validate, registerPushSubscription);
router.delete("/push-subscription", protect, userValidators.pushSubscription, validate, unregisterPushSubscription);

module.exports = router;
