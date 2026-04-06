/**
 * controllers/user.controller.js
 *
 * GET  /users/:username         — Public profile
 * GET  /users/search?q=         — Search users
 * PUT  /users/me                — Update profile
 * POST /users/:id/follow        — Follow / send follow request
 * DELETE /users/:id/follow      — Unfollow
 * GET  /users/:id/followers     — Followers list
 * GET  /users/:id/following     — Following list
 * POST /users/follow-requests/:id/accept  — Accept follow request
 * POST /users/follow-requests/:id/reject  — Reject follow request
 * GET  /users/follow-requests   — Pending follow requests (private account)
 * DELETE /users/me              — Delete account (all data + ImageKit files)
 */

const User = require("../models/User");
const Follow = require("../models/Follow");
const Post = require("../models/Post");
const Reel = require("../models/Reel");
const Story = require("../models/Story");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Message = require("../models/Message");
const { avatarUpload } = require("../middlewares/upload");
const { uploadToImageKit, deleteFromImageKit } = require("../utils/uploadToImageKit");
const { invalidateFeedCache } = require("../redis/redisHelpers");
const { sendSuccess, sendError } = require("../utils/apiResponse");

const canViewPrivateAccount = async (viewerId, targetId) => {
  if (String(viewerId) === String(targetId)) return true;
  const edge = await Follow.findOne({
    follower: viewerId,
    following: targetId,
    status: "accepted",
  }).select("_id");
  return !!edge;
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return sendError(res, "User not found", 404);

    const edge = await Follow.findOne({
      follower: req.user._id,
      following: user._id,
    }).select("status");
    const followStatus = edge ? edge.status : null;

    const canViewContent = user.isPrivate
      ? await canViewPrivateAccount(req.user._id, user._id)
      : true;

    return sendSuccess(res, {
      user: user.toPublicJSON(),
      followStatus,
      canViewContent,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, bio, website, isPrivate } = req.body;
    const updates = {};

    if (fullName !== undefined) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (website !== undefined) updates.website = website;
    if (isPrivate !== undefined) {
      updates.isPrivate = isPrivate === true || isPrivate === "true";
    }

    // Handle avatar upload
    if (req.file) {
      const { url, fileId } = await uploadToImageKit(
        req.file.buffer,
        "avatars",
        req.file.mimetype
      );
      // Delete old avatar from ImageKit
      if (req.user.profilePicture?.fileId) {
        await deleteFromImageKit(req.user.profilePicture.fileId);
      }
      updates.profilePicture = { url, fileId };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return sendSuccess(res, { user: user.toPublicJSON() }, "Profile updated");
  } catch (err) {
    next(err);
  }
};

// ─── Search Users ─────────────────────────────────────────────────────────────
const searchUsers = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return sendError(res, "Query is required", 400);

    const users = await User.find(
      { $text: { $search: q }, _id: { $ne: req.user._id } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(parseInt(limit))
      .select("username fullName profilePicture isVerified followerCount");

    return sendSuccess(res, { users });
  } catch (err) {
    next(err);
  }
};

// ─── Follow ───────────────────────────────────────────────────────────────────
/**
 * For public accounts: creates an accepted follow edge immediately.
 * For private accounts: creates a pending follow request edge.
 * Increments denormalised counters on both user documents.
 */
const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;

    if (String(targetId) === String(req.user._id)) {
      return sendError(res, "You cannot follow yourself", 400);
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return sendError(res, "User not found", 404);

    const existing = await Follow.findOne({
      follower: req.user._id,
      following: targetId,
    });
    if (existing) {
      return sendError(
        res,
        existing.status === "pending" ? "Follow request already sent" : "Already following",
        409
      );
    }

    const status = targetUser.isPrivate ? "pending" : "accepted";
    await Follow.create({ follower: req.user._id, following: targetId, status });

    if (status === "accepted") {
      // Update counters
      await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: 1 } });
      await User.findByIdAndUpdate(targetId, { $inc: { followerCount: 1 } });
      // Invalidate requester's feed cache
      await invalidateFeedCache(String(req.user._id));
    }

    const message = status === "pending" ? "Follow request sent" : "Followed successfully";
    return sendSuccess(res, { status }, message);
  } catch (err) {
    next(err);
  }
};

// ─── Unfollow ─────────────────────────────────────────────────────────────────
const unfollowUser = async (req, res, next) => {
  try {
    const targetId = req.params.id;

    const edge = await Follow.findOneAndDelete({
      follower: req.user._id,
      following: targetId,
    });

    if (!edge) return sendError(res, "Not following this user", 400);

    if (edge.status === "accepted") {
      await User.findByIdAndUpdate(req.user._id, { $inc: { followingCount: -1 } });
      await User.findByIdAndUpdate(targetId, { $inc: { followerCount: -1 } });
      await invalidateFeedCache(String(req.user._id));
    }

    return sendSuccess(res, {}, "Unfollowed successfully");
  } catch (err) {
    next(err);
  }
};

// ─── Followers / Following Lists ─────────────────────────────────────────────
const getFollowers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20 } = req.query;

    const targetUser = await User.findById(id).select("isPrivate");
    if (!targetUser) return sendError(res, "User not found", 404);

    if (
      targetUser.isPrivate &&
      !(await canViewPrivateAccount(req.user._id, id))
    ) {
      return sendError(res, "This account is private", 403);
    }

    const query = { following: id, status: "accepted" };
    if (cursor) query._id = { $lt: cursor };

    const edges = await Follow.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("follower", "username fullName profilePicture isVerified");

    const followers = edges.map((e) => e.follower);
    const hasMore = followers.length === parseInt(limit);
    const nextCursor = hasMore ? edges[edges.length - 1]._id : null;

    return sendSuccess(res, { followers, pagination: { hasMore, nextCursor } });
  } catch (err) {
    next(err);
  }
};

const getFollowing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { cursor, limit = 20 } = req.query;

    const targetUser = await User.findById(id).select("isPrivate");
    if (!targetUser) return sendError(res, "User not found", 404);

    if (
      targetUser.isPrivate &&
      !(await canViewPrivateAccount(req.user._id, id))
    ) {
      return sendError(res, "This account is private", 403);
    }

    const query = { follower: id, status: "accepted" };
    if (cursor) query._id = { $lt: cursor };

    const edges = await Follow.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("following", "username fullName profilePicture isVerified");

    const following = edges.map((e) => e.following);
    const hasMore = following.length === parseInt(limit);
    const nextCursor = hasMore ? edges[edges.length - 1]._id : null;

    return sendSuccess(res, { following, pagination: { hasMore, nextCursor } });
  } catch (err) {
    next(err);
  }
};

// ─── Follow Requests ─────────────────────────────────────────────────────────
const getFollowRequests = async (req, res, next) => {
  try {
    const requests = await Follow.find({
      following: req.user._id,
      status: "pending",
    }).populate("follower", "username fullName profilePicture");

    return sendSuccess(res, { requests });
  } catch (err) {
    next(err);
  }
};

const acceptFollowRequest = async (req, res, next) => {
  try {
    const edge = await Follow.findOneAndUpdate(
      { follower: req.params.id, following: req.user._id, status: "pending" },
      { status: "accepted" },
      { new: true }
    );

    if (!edge) return sendError(res, "Follow request not found", 404);

    await User.findByIdAndUpdate(req.params.id, { $inc: { followingCount: 1 } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { followerCount: 1 } });
    await invalidateFeedCache(String(req.params.id));

    return sendSuccess(res, {}, "Follow request accepted");
  } catch (err) {
    next(err);
  }
};

const rejectFollowRequest = async (req, res, next) => {
  try {
    const deleted = await Follow.findOneAndDelete({
      follower: req.params.id,
      following: req.user._id,
      status: "pending",
    });

    if (!deleted) return sendError(res, "Follow request not found", 404);

    return sendSuccess(res, {}, "Follow request rejected");
  } catch (err) {
    next(err);
  }
};

// ─── Delete Account ───────────────────────────────────────────────────────────
/**
 * Permanently deletes user account and all associated data:
 * • User document
 * • All posts, reels, stories
 * • All uploaded files from ImageKit
 * • All relationships (follows, likes, comments)
 * • All messages
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // ─── Get all user's media to delete from ImageKit ──────────────────────
    const userPosts = await Post.find({ author: userId });
    const userReels = await Reel.find({ author: userId });
    const userStories = await Story.find({ author: userId });

    const filesToDelete = [];

    // Collect profile picture
    if (req.user.profilePicture?.fileId) {
      filesToDelete.push(req.user.profilePicture.fileId);
    }

    // Collect post images
    userPosts.forEach((post) => {
      if (post.image?.fileId) filesToDelete.push(post.image.fileId);
    });

    // Collect reel videos
    userReels.forEach((reel) => {
      if (reel.video?.fileId) filesToDelete.push(reel.video.fileId);
    });

    // Collect story files
    userStories.forEach((story) => {
      if (story.media?.fileId) filesToDelete.push(story.media.fileId);
    });

    // ─── Delete files from ImageKit ──────────────────────────────────────
    for (const fileId of filesToDelete) {
      try {
        await deleteFromImageKit(fileId);
      } catch (err) {
        console.warn(`Failed to delete file ${fileId}:`, err.message);
        // Continue with other files even if one fails
      }
    }

    // ─── Delete all user data from database ──────────────────────────────
    const userIdStr = String(userId);

    // Delete posts, reels, stories
    await Post.deleteMany({ author: userId });
    await Reel.deleteMany({ author: userId });
    await Story.deleteMany({ author: userId });

    // Delete likes and comments
    await Like.deleteMany({ author: userId });
    await Comment.deleteMany({ author: userId });

    // Delete follows (as follower and following)
    await Follow.deleteMany({
      $or: [{ follower: userId }, { following: userId }],
    });

    // Delete messages (as sender and receiver)
    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }],
    });

    // ─── Update counters on users who followed this user ──────────────────
    const followersToUpdate = await Follow.find({ following: userId });
    for (const edge of followersToUpdate) {
      await User.findByIdAndUpdate(edge.follower, {
        $inc: { followingCount: -1 },
      });
    }

    const followingToUpdate = await Follow.find({ follower: userId });
    for (const edge of followingToUpdate) {
      await User.findByIdAndUpdate(edge.following, {
        $inc: { followerCount: -1 },
      });
    }

    // ─── Delete user account ────────────────────────────────────────────
    await User.findByIdAndDelete(userId);

    // ─── Clear session ──────────────────────────────────────────────────
    res.clearCookie("accessToken");

    // ─── Invalidate caches ──────────────────────────────────────────────
    await invalidateFeedCache(userIdStr);

    return sendSuccess(
      res,
      {},
      "Account deleted successfully. All your data has been removed."
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
