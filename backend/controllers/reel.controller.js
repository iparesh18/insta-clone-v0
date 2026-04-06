/**
 * controllers/reel.controller.js
 *
 * POST   /reels            — Upload reel (video)
 * GET    /reels/feed       — Ranked infinite-scroll feed (cursor pagination)
 * GET    /reels/:id        — Single reel
 * POST   /reels/:id/view   — Register view (async via BullMQ)
 * POST   /reels/:id/like   — Toggle like
 * DELETE /reels/:id        — Delete own reel
 */

const Reel = require("../models/Reel");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const fs = require("fs");
const path = require("path");
const { uploadToImageKit, deleteFromImageKit } = require("../utils/uploadToImageKit");
const { reelViewQueue } = require("../queues");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// ─── Create Reel ─────────────────────────────────────────────────────────────
/**
 * Uploads the video and optional thumbnail to ImageKit.
 * The initial ranking score is computed from freshness only (0 likes/views yet).
 */
const createReel = async (req, res, next) => {
  // Resolve absolute path for multer disk storage - handle Windows paths
  const resolveFilePath = (filePath) => {
    if (!filePath) return null;
    // Always convert to absolute path for consistency
    if (!path.isAbsolute(filePath)) {
      return path.resolve(process.cwd(), filePath);
    }
    return filePath;
  };

  const cleanupTempFiles = () => {
    const files = Object.values(req.files || {}).flat();
    files.forEach((file) => {
      if (file.path) {
        fs.unlink(file.path, () => {});
      }
    });
  };

  try {
    console.log("[REEL] Starting reel creation...");
    if (!req.files?.video?.[0]) {
      console.log("[REEL] No video file found");
      return sendError(res, "Video file is required", 400);
    }

    const { caption } = req.body;
    const videoFile = req.files.video[0];
    console.log("[REEL] Video file received:", videoFile.originalname, "Size:", videoFile.size);

    // Upload video with absolute path resolution
    let videoResult;
    try {
      const videoPath = resolveFilePath(videoFile.path);
      console.log("[REEL] Resolved video path:", videoPath);
      videoResult = await uploadToImageKit(
        videoPath || videoFile.buffer,
        "reels",
        videoFile.mimetype
      );
      console.log("[REEL] Video uploaded to ImageKit:", videoResult.url);
    } catch (uploadErr) {
      cleanupTempFiles();
      console.error("[REEL] Video upload error:", uploadErr);
      return sendError(res, `Reel upload failed: ${uploadErr.message}`, 400);
    }

    // Optional thumbnail
    let thumbnailUrl = "";
    if (req.files?.thumbnail?.[0]) {
      const thumbFile = req.files.thumbnail[0];
      try {
        const thumbPath = resolveFilePath(thumbFile.path);
        const thumbResult = await uploadToImageKit(
          thumbPath || thumbFile.buffer,
          "reel-thumbnails",
          thumbFile.mimetype
        );
        thumbnailUrl = thumbResult.url;
        console.log("[REEL] Thumbnail uploaded:", thumbnailUrl);
      } catch (thumbErr) {
        console.error("[REEL] Thumbnail upload error:", thumbErr);
        // Continue without thumbnail
      }
    }

    console.log("[REEL] Creating reel in database...");
    const reel = await Reel.create({
      author: req.user._id,
      caption,
      tags: (caption?.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase()),
      video: {
        url: videoResult.url,
        fileId: videoResult.fileId,
        thumbnailUrl,
      },
      score: 100, // base score so new reels get some exposure
    });
    console.log("[REEL] Reel created in DB:", reel._id);

    console.log("[REEL] Populating author...");
    const populated = await reel.populate("author", "username profilePicture isVerified");
    console.log("[REEL] Author populated");
    
    cleanupTempFiles();
    console.log("[REEL] Temp files cleaned up");
    
    console.log("[REEL] Sending success response");
    return sendSuccess(res, { reel: populated }, "Reel uploaded", 201);
  } catch (err) {
    console.error("[REEL] Unexpected error in createReel:", err);
    cleanupTempFiles();
    next(err);
  }
};

// ─── Ranked Feed with Cursor Pagination ──────────────────────────────────────
/**
 * CURSOR PAGINATION STRATEGY FOR RANKED FEED
 * ────────────────────────────────────────────
 * Standard offset pagination (skip/limit) breaks on a ranked feed
 * because scores change while the user scrolls. Cursor-based pagination
 * pins the position using (score, _id) as a composite cursor:
 *
 *   First page:  sort by { score: -1, _id: -1 }, take N
 *   Next page:   { $or: [
 *                  { score: { $lt: lastScore } },
 *                  { score: lastScore, _id: { $lt: lastId } }
 *                ]}
 *
 * This gives stable, duplicate-free pagination even as scores change.
 */
const getReelFeed = async (req, res, next) => {
  try {
    const { cursor, limit = 10 } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 20);

    let query = { isArchived: false };

    if (cursor) {
      // cursor format: "score_id"
      const [scoreStr, idStr] = cursor.split("_");
      const lastScore = parseInt(scoreStr);
      query.$or = [
        { score: { $lt: lastScore } },
        { score: lastScore, _id: { $lt: idStr } },
      ];
    }

    const reels = await Reel.find(query)
      .sort({ score: -1, _id: -1 })
      .limit(parsedLimit)
      .populate("author", "username profilePicture isVerified");

    const hasMore = reels.length === parsedLimit;
    let nextCursor = null;
    if (hasMore) {
      const last = reels[reels.length - 1];
      nextCursor = `${last.score}_${last._id}`;
    }

    // Attach isLiked for current user
    let likedSet = new Set();
    if (req.user) {
      const reelIds = reels.map((r) => r._id);
      const likes = await Like.find({
        user: req.user._id,
        targetId: { $in: reelIds },
        targetType: "Reel",
      }).select("targetId");
      likedSet = new Set(likes.map((l) => String(l.targetId)));
    }

    const enrichedReels = reels.map((r) => ({
      ...r.toObject(),
      isLiked: likedSet.has(String(r._id)),
    }));

    return res.status(200).json({
      success: true,
      data: { reels: enrichedReels },
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Reel ──────────────────────────────────────────────────────────
const getReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id).populate(
      "author",
      "username profilePicture isVerified"
    );
    if (!reel || reel.isArchived) return sendError(res, "Reel not found", 404);

    let isLiked = false;
    if (req.user) {
      const like = await Like.findOne({
        user: req.user._id,
        targetId: reel._id,
        targetType: "Reel",
      });
      isLiked = !!like;
    }

    return sendSuccess(res, { reel, isLiked });
  } catch (err) {
    next(err);
  }
};

// ─── Register View (async) ───────────────────────────────────────────────────
/**
 * Records a view asynchronously via BullMQ.
 * The HTTP response returns immediately; the view count increment
 * and score recalculation happen in the background worker.
 * This prevents view spikes from blocking the API.
 */
const registerView = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fire-and-forget via BullMQ
    await reelViewQueue.add("reelView", {
      reelId: id,
      userId: req.user?._id || null,
      timestamp: Date.now(),
    });

    return sendSuccess(res, {}, "View registered");
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Like ─────────────────────────────────────────────────────────────
const toggleLike = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return sendError(res, "Reel not found", 404);

    const existing = await Like.findOneAndDelete({
      user: req.user._id,
      targetId: reel._id,
      targetType: "Reel",
    });

    if (existing) {
      const updated = await Reel.findByIdAndUpdate(
        reel._id,
        { $inc: { likeCount: -1 } },
        { new: true }
      ).select("likeCount");
      return sendSuccess(res, {
        liked: false,
        action: "unliked",
        likeCount: Math.max(0, updated?.likeCount || 0),
      });
    }

    await Like.create({ user: req.user._id, targetId: reel._id, targetType: "Reel" });
    const updated = await Reel.findByIdAndUpdate(
      reel._id,
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

// ─── Delete Reel ─────────────────────────────────────────────────────────────
const deleteReel = async (req, res, next) => {
  try {
    const reel = await Reel.findOne({ _id: req.params.id, author: req.user._id });
    if (!reel) return sendError(res, "Reel not found or not authorised", 404);

    await deleteFromImageKit(reel.video.fileId);
    await Reel.findByIdAndDelete(reel._id);
    await Like.deleteMany({ targetId: reel._id, targetType: "Reel" });
    await Comment.deleteMany({ targetId: reel._id, targetType: "Reel" });

    return sendSuccess(res, {}, "Reel deleted");
  } catch (err) {
    next(err);
  }
};

// ─── Get Reel Comments ────────────────────────────────────────────────────────
const getComments = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const query = {
      targetId: req.params.id,
      targetType: "Reel",
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

// ─── Add Comment to Reel ──────────────────────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return sendError(res, "Comment text is required", 400);

    const reel = await Reel.findById(req.params.id).select("_id");
    if (!reel) return sendError(res, "Reel not found", 404);

    const comment = await Comment.create({
      author: req.user._id,
      targetId: reel._id,
      targetType: "Reel",
      text: text.trim(),
    });

    await Reel.findByIdAndUpdate(reel._id, { $inc: { commentCount: 1 } });

    const populated = await comment.populate("author", "username profilePicture isVerified");
    return sendSuccess(res, { comment: populated }, "Comment added", 201);
  } catch (err) {
    next(err);
  }
};

// ─── Delete Comment ───────────────────────────────────────────────────────────
const deleteComment = async (req, res, next) => {
  try {
    const { id: reelId, commentId } = req.params;

    const reel = await Reel.findById(reelId).select("author");
    if (!reel) return sendError(res, "Reel not found", 404);

    const comment = await Comment.findOne({
      _id: commentId,
      targetId: reelId,
      targetType: "Reel",
    });

    if (!comment) return sendError(res, "Comment not found", 404);

    const isCommentOwner = String(comment.author) === String(req.user._id);
    const isReelOwner = String(reel.author) === String(req.user._id);

    if (!isCommentOwner && !isReelOwner) {
      return sendError(res, "Not authorised to delete this comment", 403);
    }

    await Comment.findByIdAndDelete(commentId);
    await Reel.findByIdAndUpdate(reelId, { $inc: { commentCount: -1 } });

    return sendSuccess(res, {}, "Comment deleted");
  } catch (err) {
    next(err);
  }
};


// ─── Get User Reels ──────────────────────────────────────────────────────────
const getUserReels = async (req, res, next) => {
  try {
    const { cursor, limit = 9 } = req.query;
    const userId = req.params.userId;
    const parsedLimit = Math.min(parseInt(limit), 20);

    let query = { author: userId, isArchived: false };

    if (cursor) {
      const [scoreStr, idStr] = cursor.split("_");
      const lastScore = parseInt(scoreStr);
      query.$or = [
        { score: { $lt: lastScore } },
        { score: lastScore, _id: { $lt: idStr } },
      ];
    }

    const reels = await Reel.find(query)
      .sort({ score: -1, createdAt: -1, _id: -1 })
      .limit(parsedLimit)
      .populate("author", "username profilePicture isVerified");

    const hasMore = reels.length === parsedLimit;
    let nextCursor = null;
    if (hasMore && reels.length > 0) {
      const last = reels[reels.length - 1];
      nextCursor = `${last.score}_${last._id}`;
    }

    // Attach isLiked for current user
    let likedSet = new Set();
    if (req.user) {
      const reelIds = reels.map((r) => r._id);
      const likes = await Like.find({
        user: req.user._id,
        targetId: { $in: reelIds },
        targetType: "Reel",
      }).select("targetId");
      likedSet = new Set(likes.map((l) => String(l.targetId)));
    }

    const enrichedReels = reels.map((r) => ({
      ...r.toObject(),
      isLiked: likedSet.has(String(r._id)),
    }));

    return res.status(200).json({
      success: true,
      data: { reels: enrichedReels },
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReel, getReelFeed, getReel, getUserReels, registerView, toggleLike, deleteReel, getComments, addComment, deleteComment };
