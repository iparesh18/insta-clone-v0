/**
 * controllers/search.controller.js
 * Global search across users, posts, reels, hashtags
 */

const User = require("../models/User");
const Post = require("../models/Post");
const Reel = require("../models/Reel");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// ─── Global Search ───────────────────────────────────────────────────────────
const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user._id;

    // Validate query
    if (!q || q.trim().length === 0) {
      return sendError(res, "Search query is required", 400);
    }

    const query = q.trim();
    const searchRegex = new RegExp(query, "i"); // Case-insensitive regex

    console.log(`🔍 [SEARCH] Query: "${query}"`);

    // Parallel queries for performance
    const [users, posts, reels, allHashtags] = await Promise.all([
      // 1️⃣ Search users by username or fullName
      User.find({
        $or: [
          { username: searchRegex },
          { fullName: searchRegex },
        ],
      })
        .select("_id username fullName profilePicture isVerified followers")
        .limit(5),

      // 2️⃣ Search posts by caption
      Post.find({
        caption: searchRegex,
        isArchived: false,
      })
        .select("_id caption media author likeCount createdAt")
        .populate("author", "username profilePicture")
        .limit(5),

      // 3️⃣ Search reels by caption or tags
      Reel.find({
        $or: [
          { caption: searchRegex },
          { tags: { $in: [searchRegex] } },
        ],
        isArchived: false,
      })
        .select("_id caption video tags author likeCount createdAt")
        .populate("author", "username profilePicture")
        .limit(5),

      // 4️⃣ Extract hashtags from all reels and posts
      Reel.find({ tags: { $exists: true, $ne: [] }, isArchived: false })
        .select("tags")
        .limit(100),
    ]);

    // Extract unique hashtags
    const hashtagSet = new Set();
    allHashtags.forEach((reel) => {
      (reel.tags || []).forEach((tag) => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          hashtagSet.add(tag);
        }
      });
    });
    const hashtags = Array.from(hashtagSet).slice(0, 5);

    console.log(
      `✅ [SEARCH] Found: ${users.length} users, ${posts.length} posts, ${reels.length} reels, ${hashtags.length} tags`
    );

    return sendSuccess(res, {
      users,
      posts,
      reels,
      hashtags,
    });
  } catch (err) {
    console.error("❌ Search error:", err);
    next(err);
  }
};

module.exports = { globalSearch };
