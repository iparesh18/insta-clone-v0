/**
 * models/Message.js
 * One-to-one chat messages.
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
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
messageSchema.index({ roomId: 1, createdAt: -1 }); // chat history pagination
messageSchema.index({ receiver: 1, isRead: 1 });   // unread count

module.exports = mongoose.model("Message", messageSchema);
