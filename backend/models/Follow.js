/**
 * models/Follow.js — Edge Collection
 *
 * Each document represents a directed "A follows B" relationship.
 * Using a separate collection (instead of embedding in User) allows:
 *   • Efficient bi-directional queries (followers / following lists)
 *   • Rich edge metadata (status, timestamps)
 *   • Atomic relationship management without document locking
 *   • Easy pagination of social graph data
 */

const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "accepted",
      // "pending" = follow request sent to a private account
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique constraint prevents duplicate follow edges
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Fast "who follows user X?" query
followSchema.index({ following: 1, status: 1 });

// Fast "who does user X follow?" query
followSchema.index({ follower: 1, status: 1 });

module.exports = mongoose.model("Follow", followSchema);
