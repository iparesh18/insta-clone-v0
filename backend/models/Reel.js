/**
 * models/Reel.js
 *
 * Reels are short-form videos. The feed is ranked by a score
 * computed from engagement signals (likes, views, recency).
 */

const mongoose = require("mongoose");

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caption: { type: String, maxlength: 2200, default: "" },
    tags: [{ type: String, lowercase: true }],

    // Video media
    video: {
      url: { type: String, required: true },
      fileId: { type: String, required: true },
      thumbnailUrl: { type: String, default: "" },
      duration: { type: Number, default: 0 }, // seconds
    },

    // Engagement signals
    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    /**
     * Ranking score — recomputed by BullMQ job after each view/like.
     * Formula: score = (likes * 3) + (views * 1) - decay(hoursOld)
     * Higher score = appears earlier in feed.
     */
    score: { type: Number, default: 0 },

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
reelSchema.index({ score: -1, createdAt: -1 }); // ranked feed (cursor pagination uses _id)
reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ tags: 1 });

module.exports = mongoose.model("Reel", reelSchema);
