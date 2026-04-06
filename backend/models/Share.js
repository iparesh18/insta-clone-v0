/**
 * models/Share.js
 * Tracks when a user shares a post/reel with followers
 */

const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
  {
    // Who shared it
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Who received the share
    sharedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // What was shared
    contentType: {
      type: String,
      enum: ["post", "reel"],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Can reference either Post or Reel
    },

    // Optional personal message with the share
    message: { type: String, maxlength: 500, default: "" },

    // Track read status
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
shareSchema.index({ sharedWith: 1, createdAt: -1 }); // Get shares received
shareSchema.index({ sharedBy: 1, createdAt: -1 }); // Get shares sent
shareSchema.index({ contentType: 1, contentId: 1 }); // Find shares of specific content
shareSchema.index({ sharedWith: 1, isRead: 1 }); // Get unread shares

module.exports = mongoose.model("Share", shareSchema);
