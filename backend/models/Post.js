/**
 * models/Post.js
 */

const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    fileId: { type: String, required: true }, // ImageKit fileId
    type: { type: String, enum: ["image", "video"], default: "image" },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caption: { type: String, maxlength: 2200, default: "" },
    media: { type: [mediaSchema], required: true, validate: [(v) => v.length > 0, "At least one media item"] },
    tags: [{ type: String, lowercase: true }], // hashtags extracted from caption
    location: { type: String, maxlength: 100 },

    // Denormalised counters (updated by Like/Comment events)
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
postSchema.index({ author: 1, createdAt: -1 }); // profile feed
postSchema.index({ tags: 1 });                   // hashtag search
postSchema.index({ createdAt: -1 });             // global recency

module.exports = mongoose.model("Post", postSchema);
