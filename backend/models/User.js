/**
 * models/User.js
 *
 * The central user document. Deliberately kept lean —
 * social graph data lives in edge collections (Follow model)
 * instead of embedding follower/following arrays here.
 *
 * WHY EDGE COLLECTIONS?
 * ─────────────────────
 * Embedding arrays (followers: [ObjectId]) inside the user document
 * causes:
 *   1. Document growth — MongoDB documents have a 16 MB cap.
 *   2. Hotspot writes — every follow locks the same document.
 *   3. Poor query performance — pagination / filtering on large
 *      embedded arrays requires $slice + in-memory scanning.
 *
 * Edge collections (Follow, Like) model each relationship as its
 * own document with compound indexes, enabling:
 *   • O(log n) lookups instead of full array scans
 *   • Atomic upsert / delete per relationship
 *   • Rich metadata (createdAt, status, etc.) on the edge itself
 *   • Horizontal scaling without document bloat
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscore and period"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never returned by default
    },
    fullName: { type: String, trim: true, maxlength: 60 },
    bio: { type: String, maxlength: 150, default: "" },
    website: { type: String, default: "" },
    profilePicture: {
      url: { type: String, default: "" },
      fileId: { type: String, default: "" }, // ImageKit fileId for deletion
    },
    isPrivate: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },   // email verified
    isBlueVerified: { type: Boolean, default: false }, // creator badge

    // Denormalised counters — updated by post/reel/follow events
    // These avoid expensive COUNT queries on every profile load.
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    // Saved posts collection for profile "Saved" tab
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Email verification
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    emailVerifiedAt: { type: Date, default: null },

    // Push notifications
    pushTokens: [{ type: String }], // array of device push tokens for web push
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Note: username and email indexes are defined in field schema with index: true
// to avoid duplicate index warnings. Full-text search index for users is defined below.
userSchema.index({ username: "text", fullName: "text" }); // search

// ─── Hooks ────────────────────────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
