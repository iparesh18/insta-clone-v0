/**
 * controllers/share.controller.js
 * Handles sharing posts and reels with followers
 */

const Share = require("../models/Share");
const Post = require("../models/Post");
const Reel = require("../models/Reel");
const Follow = require("../models/Follow");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// ─── Get Followers for Share Modal ────────────────────────────────────────────
/**
 * Returns paginated list of user's followers for share selection
 */
const getShareableFollowers = async (req, res, next) => {
  try {
    const { limit = 50, cursor } = req.query;
    const userId = req.user._id;

    const query = {
      following: userId,
      status: "accepted",
    };
    if (cursor) query._id = { $lt: cursor };

    const follows = await Follow.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1) // Fetch one extra to determine hasMore
      .populate("follower", "username fullName profilePicture");

    const hasMore = follows.length > parseInt(limit);
    if (hasMore) follows.pop(); // Remove extra item

    const nextCursor = hasMore ? follows[follows.length - 1]?._id : null;
    const followers = follows.map((f) => ({
      _id: f.follower._id,
      username: f.follower.username,
      fullName: f.follower.fullName,
      profilePicture: f.follower.profilePicture,
    }));

    return sendSuccess(res, {
      followers,
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Share Post ───────────────────────────────────────────────────────────────
/**
 * Share a post with one or more followers
 */
const sharePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { recipientIds, message } = req.body;

    if (!postId) return sendError(res, "Post ID required", 400);
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return sendError(res, "At least one recipient required", 400);
    }
    if (recipientIds.length > 100) {
      return sendError(res, "Maximum 100 recipients per share", 400);
    }

    const post = await Post.findById(postId);
    if (!post) return sendError(res, "Post not found", 404);

    // Check if requester is post author or follower (can share any post)
    // For now, allow any authenticated user to share (like Instagram)

    // Create share records (bulk insert)
    const shareRecords = recipientIds.map((recipientId) => ({
      sharedBy: req.user._id,
      sharedWith: recipientId,
      contentType: "post",
      contentId: postId,
      message: message?.trim() || "",
    }));

    // Remove duplicate shares to same person
    const uniqueShares = [];
    const seen = new Set();
    for (const share of shareRecords) {
      const key = `${share.sharedWith}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueShares.push(share);
      }
    }

    const created = await Share.insertMany(uniqueShares);

    return sendSuccess(
      res,
      { sharesCreated: created.length },
      `Post shared with ${created.length} follower(s)`,
      201
    );
  } catch (err) {
    next(err);
  }
};

// ─── Share Reel ───────────────────────────────────────────────────────────────
/**
 * Share a reel with one or more followers
 */
const shareReel = async (req, res, next) => {
  try {
    const { reelId } = req.params;
    const { recipientIds, message } = req.body;

    if (!reelId) return sendError(res, "Reel ID required", 400);
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return sendError(res, "At least one recipient required", 400);
    }
    if (recipientIds.length > 100) {
      return sendError(res, "Maximum 100 recipients per share", 400);
    }

    const reel = await Reel.findById(reelId);
    if (!reel) return sendError(res, "Reel not found", 404);

    const shareRecords = recipientIds.map((recipientId) => ({
      sharedBy: req.user._id,
      sharedWith: recipientId,
      contentType: "reel",
      contentId: reelId,
      message: message?.trim() || "",
    }));

    // Remove duplicates
    const uniqueShares = [];
    const seen = new Set();
    for (const share of shareRecords) {
      const key = `${share.sharedWith}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueShares.push(share);
      }
    }

    const created = await Share.insertMany(uniqueShares);

    return sendSuccess(
      res,
      { sharesCreated: created.length },
      `Reel shared with ${created.length} follower(s)`,
      201
    );
  } catch (err) {
    next(err);
  }
};

// ─── Get Shared Posts ─────────────────────────────────────────────────────────
/**
 * Get posts that were shared with the current user
 */
const getSharedPosts = async (req, res, next) => {
  try {
    const { cursor, limit = 12 } = req.query;
    const userId = req.user._id;

    const query = {
      sharedWith: userId,
      contentType: "post",
    };
    if (cursor) query._id = { $lt: cursor };

    const shares = await Share.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate({
        path: "contentId",
        model: "Post",
        populate: {
          path: "author",
          select: "username profilePicture isVerified",
        },
      })
      .populate("sharedBy", "username profilePicture");

    const hasMore = shares.length > parseInt(limit);
    if (hasMore) shares.pop();

    const nextCursor = hasMore ? shares[shares.length - 1]?._id : null;

    // Transform to include share metadata with post data
    const postsWithShareInfo = shares.map((share) => ({
      ...share.contentId.toObject(),
      sharedBy: share.sharedBy,
      sharedAt: share.createdAt,
      shareMessage: share.message,
      _shareId: share._id,
    }));

    return sendSuccess(res, {
      posts: postsWithShareInfo,
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Shared Reels ─────────────────────────────────────────────────────────
/**
 * Get reels that were shared with the current user
 */
const getSharedReels = async (req, res, next) => {
  try {
    const { cursor, limit = 12 } = req.query;
    const userId = req.user._id;

    const query = {
      sharedWith: userId,
      contentType: "reel",
    };
    if (cursor) query._id = { $lt: cursor };

    const shares = await Share.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate({
        path: "contentId",
        model: "Reel",
        populate: {
          path: "author",
          select: "username profilePicture isVerified",
        },
      })
      .populate("sharedBy", "username profilePicture");

    const hasMore = shares.length > parseInt(limit);
    if (hasMore) shares.pop();

    const nextCursor = hasMore ? shares[shares.length - 1]?._id : null;

    const reelsWithShareInfo = shares.map((share) => ({
      ...share.contentId.toObject(),
      sharedBy: share.sharedBy,
      sharedAt: share.createdAt,
      shareMessage: share.message,
      _shareId: share._id,
    }));

    return sendSuccess(res, {
      reels: reelsWithShareInfo,
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Mark Share as Read ────────────────────────────────────────────────────────
/**
 * Mark a share as read when user views it
 */
const markShareAsRead = async (req, res, next) => {
  try {
    const { shareId } = req.params;

    const share = await Share.findByIdAndUpdate(
      shareId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!share) return sendError(res, "Share not found", 404);

    return sendSuccess(res, {}, "Share marked as read");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getShareableFollowers,
  sharePost,
  shareReel,
  getSharedPosts,
  getSharedReels,
  markShareAsRead,
};
