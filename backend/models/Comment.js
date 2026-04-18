/**
 * models/Comment.js
 */

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ["Post", "Reel"], required: true },
    text: { type: String, required: true, maxlength: 500 },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // array of mentioned users
    likeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

commentSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });
commentSchema.index({ author: 1 });

module.exports = mongoose.model("Comment", commentSchema);
