/**
 * models/Message.js
 * One-to-one chat messages with support for shared posts/reels.
 */

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Conversation room id = sorted([senderId, receiverId]).join("_")
    roomId: { type: String, required: true },
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },
    
    // Shared content (post or reel)
    sharedContent: {
      type: {
        type: String,
        enum: ["post", "reel"],
        default: null,
      },
      contentId: mongoose.Schema.Types.ObjectId,
      message: { type: String, default: "" }, // optional share message
    },
    
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
messageSchema.index({ roomId: 1, createdAt: -1 }); // chat history pagination
messageSchema.index({ receiver: 1, isRead: 1 });   // unread count
messageSchema.index({ sender: 1 }); // delete messages by sender

module.exports = mongoose.model("Message", messageSchema);
