/**
 * controllers/story.controller.js
 *
 * POST  /stories           — Create story (image/video)
 * GET   /stories/feed      — Stories from followed accounts (grouped by user)
 * POST  /stories/:id/view  — Mark story as viewed
 * DELETE /stories/:id      — Delete own story
 */

const Story = require("../models/Story");
const Follow = require("../models/Follow");
const fs = require("fs");
const path = require("path");
const { uploadToImageKit, deleteFromImageKit } = require("../utils/uploadToImageKit");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// ─── Create Story ─────────────────────────────────────────────────────────────
const createStory = async (req, res, next) => {
  const resolveFilePath = (filePath) => {
    if (!filePath) return null;
    if (!path.isAbsolute(filePath)) {
      return path.resolve(process.cwd(), filePath);
    }
    return filePath;
  };

  const cleanupTempFile = () => {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  };

  try {
    if (!req.file) return sendError(res, "Media file is required", 400);

    const { caption } = req.body;

    // Use file path (disk storage) with fallback to buffer (memory storage)
    const filePath = resolveFilePath(req.file.path);
    const { url, fileId } = await uploadToImageKit(
      filePath || req.file.buffer,
      "stories",
      req.file.mimetype
    );

    const story = await Story.create({
      author: req.user._id,
      caption,
      media: {
        url,
        fileId,
        type: req.file.mimetype.startsWith("video") ? "video" : "image",
      },
    });

    const populated = await story.populate("author", "username profilePicture");
    cleanupTempFile();
    return sendSuccess(res, { story: populated }, "Story created", 201);
  } catch (err) {
    cleanupTempFile();
    next(err);
  }
};

// ─── Story Feed ───────────────────────────────────────────────────────────────
/**
 * Returns stories from accounts the user follows, grouped by author.
 * Sorted so users with unseen stories appear first.
 */
const getStoryFeed = async (req, res, next) => {
  try {
    const followEdges = await Follow.find({
      follower: req.user._id,
      status: "accepted",
    }).select("following");

    const followingIds = followEdges.map((e) => e.following);
    followingIds.push(req.user._id); // include own stories

    const stories = await Story.find({ author: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .populate("author", "username profilePicture");

    // Group stories by author
    const grouped = stories.reduce((acc, story) => {
      const authorId = String(story.author._id);
      if (!acc[authorId]) {
        acc[authorId] = {
          user: story.author,
          stories: [],
          hasUnseen: false,
        };
      }
      const isSeen = story.viewers.includes(req.user._id);
      if (!isSeen) acc[authorId].hasUnseen = true;
      acc[authorId].stories.push({ ...story.toObject(), isSeen });
      return acc;
    }, {});

    // Sort: unseen first, then seen
    const sorted = Object.values(grouped).sort((a, b) =>
      a.hasUnseen === b.hasUnseen ? 0 : a.hasUnseen ? -1 : 1
    );

    return sendSuccess(res, { storyGroups: sorted });
  } catch (err) {
    next(err);
  }
};

// ─── View Story ───────────────────────────────────────────────────────────────
const viewStory = async (req, res, next) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { viewers: req.user._id } },
      { new: true }
    );
    if (!story) return sendError(res, "Story not found", 404);
    return sendSuccess(res, {}, "Story viewed");
  } catch (err) {
    next(err);
  }
};

// ─── Delete Story ─────────────────────────────────────────────────────────────
const deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findOne({ _id: req.params.id, author: req.user._id });
    if (!story) return sendError(res, "Story not found", 404);

    await deleteFromImageKit(story.media.fileId);
    await Story.findByIdAndDelete(story._id);

    return sendSuccess(res, {}, "Story deleted");
  } catch (err) {
    next(err);
  }
};

module.exports = { createStory, getStoryFeed, viewStory, deleteStory };
