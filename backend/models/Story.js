/**
 * models/Story.js
 *
 * Stories auto-expire after 24 hours using MongoDB's native TTL index.
 * The `expiresAt` field drives a background thread in mongod that
 * deletes expired documents automatically — no cron job required.
 */

const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    media: {
      url: { type: String, required: true },
      fileId: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], default: "image" },
    },
    caption: { type: String, maxlength: 300, default: "" },

    // Viewers list — kept small (stories expire in 24h anyway)
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // TTL field: MongoDB deletes the document when current time > expiresAt
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    },
  },
  { timestamps: true }
);

// ─── TTL Index ────────────────────────────────────────────────────────────────
// expireAfterSeconds: 0 means "delete at the time specified in expiresAt"
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("Story", storySchema);
