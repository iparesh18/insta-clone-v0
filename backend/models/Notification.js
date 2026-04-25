/**
 * models/Notification.js
 * Real-time notification system with auto-expiry
 */

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Fast fetch by userId
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["follow", "like", "comment", "post", "mention"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // postId, reelId, or commentId
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["Post", "Reel", "Comment"],
      required: true,
    },
    message: String, // e.g., "liked your post"
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1, // Descending index for latest-first queries
    },
  },
  { timestamps: false }
);

// TTL Index: MongoDB automatically deletes docs when expiresAt passes
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
