/**
 * models/Like.js — Edge Collection (polymorphic)
 *
 * A single Like model handles likes on Posts, Reels, and future
 * content types via the (targetId, targetType) polymorphic pattern.
 *
 * WHY NOT EMBED LIKES IN EACH CONTENT DOCUMENT?
 * ───────────────────────────────────────────────
 * A viral reel can receive millions of likes. Embedding them would
 * bloat the reel document past MongoDB's 16 MB limit and cause
 * write contention on a single hot document.
 *
 * Edge collection benefits:
 *   • Each like is an independent document — no document size limits
 *   • Compound index (user + target) enforces uniqueness & enables O(1) checks
 *   • COUNT aggregation uses index scan, not document read
 *   • Supports efficient "did this user like this?" queries for UI state
 */

const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // References Post, Reel, or Comment depending on targetType
    },
    targetType: {
      type: String,
      enum: ["Post", "Reel", "Comment"],
      required: true,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique constraint: one user can like a target only once
likeSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });

// Fast "how many likes does post X have?" + "who liked post X?"
likeSchema.index({ targetId: 1, targetType: 1 });

module.exports = mongoose.model("Like", likeSchema);
