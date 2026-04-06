/**
 * controllers/post.controller.js
 *
 * POST   /posts              — Create post (multi-image upload)
 * GET    /posts/feed         — Paginated home feed from followed users
 * GET    /posts/:id          — Single post
 * DELETE /posts/:id          — Delete own post
 * POST   /posts/:id/like     — Toggle like
 * GET    /posts/:id/likes    — Who liked
 * GET    /posts/user/:userId — User's posts
 */

const Post = require("../models/Post");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const User = require("../models/User");
const fs = require("fs");
const { uploadToImageKit, deleteFromImageKit } = require("../utils/uploadToImageKit");
const { getCachedFeed, cacheFeed } = require("../redis/redisHelpers");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// Extract hashtags from caption
const extractTags = (caption = "") =>
  (caption.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase());

// ─── Create Post ─────────────────────────────────────────────────────────────
/**
 * Uploads 1-10 media files to ImageKit, stores metadata in MongoDB,
 * and increments the user's post count.
 */
const createPost = async (req, res, next) => {
  const cleanupTempFiles = () => {
    if (!req.files?.length) return;
    req.files.forEach((file) => {
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
    });
  };

  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, "At least one media file is required", 400);
    }
    if (req.files.length > 10) {
      return sendError(res, "Maximum 10 media files per post", 400);
    }

    const { caption, location } = req.body;

    // Upload files sequentially to avoid memory spikes on large videos.
    const uploadResults = [];
    try {
      for (const file of req.files) {
        const uploaded = await uploadToImageKit(
          file.path || file.buffer,
          "posts",
          file.mimetype
        );
        uploadResults.push({
          ...uploaded,
          type: file.mimetype.startsWith("video") ? "video" : "image",
        });
      }
    } catch (uploadErr) {
      cleanupTempFiles();
      return sendError(res, `Media upload failed: ${uploadErr.message}`, 400);
    }

    const post = await Post.create({
      author: req.user._id,
      caption,
      location,
      tags: extractTags(caption),
      media: uploadResults,
    });

    await User.findByIdAndUpdate(req.user._id, { $inc: { postCount: 1 } });

    const populated = await post.populate("author", "username profilePicture isVerified");
    cleanupTempFiles();

    return sendSuccess(res, { post: populated }, "Post created", 201);
  } catch (err) {
    cleanupTempFiles();
    next(err);
  }
};

// ─── Home Feed ────────────────────────────────────────────────────────────────
/**
 * Returns posts from accounts the current user follows.
 * Uses cursor-based pagination for stable infinite scroll.
 * Results are cached in Redis for 2 minutes.
 */
const getFeed = async (req, res, next) => {
  try {
    const { cursor, limit = 12 } = req.query;
    const pageKey = cursor || "first";

    // Cache hit
    const cached = await getCachedFeed(String(req.user._id), pageKey);
    if (cached) return res.status(200).json(cached);

    // Get IDs of accounts the user follows
    const followEdges = await Follow.find({
      follower: req.user._id,
      status: "accepted",
    }).select("following");
    const followingIds = followEdges.map((e) => e.following);
    followingIds.push(req.user._id); // include own posts

    const query = {
      author: { $in: followingIds },
      isArchived: false,
    };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("author", "username profilePicture isVerified");

    const hasMore = posts.length === parseInt(limit);
    const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

    const payload = {
      success: true,
      data: { posts },
      pagination: { hasMore, nextCursor },
    };

    await cacheFeed(String(req.user._id), pageKey, payload);

    return res.status(200).json(payload);
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Post ─────────────────────────────────────────────────────────
const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "author",
      "username profilePicture isVerified"
    );
    if (!post || post.isArchived) return sendError(res, "Post not found", 404);

    // Attach like status for current user
    let isLiked = false;
    if (req.user) {
      const like = await Like.findOne({
        user: req.user._id,
        targetId: post._id,
        targetType: "Post",
      });
      isLiked = !!like;
    }

    return sendSuccess(res, { post, isLiked });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Post ─────────────────────────────────────────────────────────────
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
    if (!post) return sendError(res, "Post not found or not authorised", 404);

    // Delete media from ImageKit
    await Promise.all(post.media.map((m) => deleteFromImageKit(m.fileId)));

    await Post.findByIdAndDelete(post._id);
    await Like.deleteMany({ targetId: post._id, targetType: "Post" });
    await Comment.deleteMany({ targetId: post._id, targetType: "Post" });
    await User.updateMany({}, { $pull: { savedPosts: post._id } });
    await User.findByIdAndUpdate(req.user._id, { $inc: { postCount: -1 } });

    return sendSuccess(res, {}, "Post deleted");
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Like ─────────────────────────────────────────────────────────────
/**
 * Uses findOneAndDelete / create pattern for atomic toggle.
 * Updates the denormalised likeCount on the post.
 */
const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select("_id");
    if (!post) return sendError(res, "Post not found", 404);

    const existing = await Like.findOneAndDelete({
      user: req.user._id,
      targetId: req.params.id,
      targetType: "Post",
    });

    if (existing) {
      // Was liked — now unliked
      const updated = await Post.findByIdAndUpdate(
        req.params.id,
        { $inc: { likeCount: -1 } },
        { new: true }
      ).select("likeCount");
      return sendSuccess(res, {
        liked: false,
        action: "unliked",
        likeCount: Math.max(0, updated?.likeCount || 0),
      });
    }

    // Not liked — now liked
    await Like.create({
      user: req.user._id,
      targetId: req.params.id,
      targetType: "Post",
    });
    const updated = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { likeCount: 1 } },
      { new: true }
    ).select("likeCount");

    return sendSuccess(res, {
      liked: true,
      action: "liked",
      likeCount: updated?.likeCount || 1,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Who Liked ───────────────────────────────────────────────────────────────
const getLikes = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const query = { targetId: req.params.id, targetType: "Post" };
    if (cursor) query._id = { $lt: cursor };

    const likes = await Like.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("user", "username profilePicture isVerified");

    const hasMore = likes.length === parseInt(limit);
    const nextCursor = hasMore ? likes[likes.length - 1]._id : null;

    return sendSuccess(res, {
      users: likes.map((l) => l.user),
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Comments ────────────────────────────────────────────────────────────────
const getComments = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const query = {
      targetId: req.params.id,
      targetType: "Post",
      parentComment: null,
    };

    if (cursor) query._id = { $lt: cursor };

    const comments = await Comment.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("author", "username profilePicture isVerified");

    const hasMore = comments.length === parseInt(limit);
    const nextCursor = hasMore ? comments[comments.length - 1]._id : null;

    return sendSuccess(res, { comments, pagination: { hasMore, nextCursor } });
  } catch (err) {
    next(err);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return sendError(res, "Comment text is required", 400);

    const post = await Post.findById(req.params.id).select("_id");
    if (!post) return sendError(res, "Post not found", 404);

    const comment = await Comment.create({
      author: req.user._id,
      targetId: post._id,
      targetType: "Post",
      text: text.trim(),
    });

    await Post.findByIdAndUpdate(post._id, { $inc: { commentCount: 1 } });

    const populated = await comment.populate("author", "username profilePicture isVerified");
    return sendSuccess(res, { comment: populated }, "Comment added", 201);
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { id: postId, commentId } = req.params;

    const post = await Post.findById(postId).select("author");
    if (!post) return sendError(res, "Post not found", 404);

    const comment = await Comment.findOne({
      _id: commentId,
      targetId: postId,
      targetType: "Post",
    });

    if (!comment) return sendError(res, "Comment not found", 404);

    const isCommentOwner = String(comment.author) === String(req.user._id);
    const isPostOwner = String(post.author) === String(req.user._id);
    if (!isCommentOwner && !isPostOwner) {
      return sendError(res, "Not authorised to delete this comment", 403);
    }

    await Comment.findByIdAndDelete(comment._id);
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });

    return sendSuccess(res, {}, "Comment deleted");
  } catch (err) {
    next(err);
  }
};

const toggleSavePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).select("_id");
    if (!post) return sendError(res, "Post not found", 404);

    const user = await User.findById(req.user._id).select("savedPosts");
    const alreadySaved = user.savedPosts.some(
      (savedId) => String(savedId) === String(post._id)
    );

    if (alreadySaved) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { savedPosts: post._id } });
      return sendSuccess(res, { saved: false }, "Post removed from saved");
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedPosts: post._id } });
    return sendSuccess(res, { saved: true }, "Post saved");
  } catch (err) {
    next(err);
  }
};

const getSavedPosts = async (req, res, next) => {
  try {
    const { cursor, limit = 12 } = req.query;

    const user = await User.findById(req.user._id).select("savedPosts");
    const query = {
      _id: { $in: user.savedPosts || [] },
      isArchived: false,
    };

    if (cursor) query._id.$lt = cursor;

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("author", "username profilePicture isVerified")
      .select("author media likeCount commentCount createdAt caption location");

    const hasMore = posts.length === parseInt(limit);
    const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

    return sendSuccess(res, { posts, pagination: { hasMore, nextCursor } });
  } catch (err) {
    next(err);
  }
};

// ─── User Posts ───────────────────────────────────────────────────────────────
const getUserPosts = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId).select("isPrivate");
    if (!targetUser) return sendError(res, "User not found", 404);

    if (targetUser.isPrivate && String(req.user._id) !== String(targetUser._id)) {
      const canView = await Follow.findOne({
        follower: req.user._id,
        following: targetUser._id,
        status: "accepted",
      }).select("_id");

      if (!canView) {
        return sendError(res, "This account is private", 403);
      }
    }

    const { cursor, limit = 12 } = req.query;
    const query = { author: req.params.userId, isArchived: false };
    if (cursor) query._id = { $lt: cursor };

    const posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .select("media likeCount commentCount createdAt");

    const hasMore = posts.length === parseInt(limit);
    const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

    return sendSuccess(res, { posts, pagination: { hasMore, nextCursor } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPost,
  getFeed,
  getPost,
  deletePost,
  toggleLike,
  getLikes,
  getComments,
  addComment,
  deleteComment,
  toggleSavePost,
  getSavedPosts,
  getUserPosts,
};
