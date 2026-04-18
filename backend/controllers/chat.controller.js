/**
 * controllers/chat.controller.js
 *
 * GET /chat/conversations   — List user's conversations
 * GET /chat/:userId         — Get message history with a user
 * POST /chat/:userId        — Send a message (REST fallback; primary is Socket.io)
 * PATCH /chat/:userId/read  — Mark messages as read
 */

const Message = require("../models/Message");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// Helper: deterministic room ID from two user IDs
const getRoomId = (a, b) => [String(a), String(b)].sort().join("_");

// ─── Get Conversations ────────────────────────────────────────────────────────
/**
 * Returns the most recent message per conversation,
 * along with the other participant's profile.
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$roomId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiver", userId] }, { $eq: ["$isRead", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    // Populate the other participant
    const populated = await Promise.all(
      conversations.map(async (conv) => {
        const msg = conv.lastMessage;
        const otherUserId =
          String(msg.sender) === String(userId) ? msg.receiver : msg.sender;
        const otherUser = await User.findById(otherUserId).select(
          "username profilePicture isVerified"
        );
        return { ...conv, otherUser };
      })
    );

    return sendSuccess(res, { conversations: populated });
  } catch (err) {
    next(err);
  }
};

// ─── Get Message History ──────────────────────────────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = 30 } = req.query;
    const roomId = getRoomId(req.user._id, userId);

    const otherUser = await User.findById(userId).select(
      "username fullName profilePicture isVerified"
    );
    if (!otherUser) return sendError(res, "User not found", 404);

    const query = { roomId };
    if (cursor) query._id = { $lt: cursor };

    let messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1)
      .populate("sender", "username profilePicture");

    const hasMore = messages.length > parseInt(limit);
    if (hasMore) messages.pop();

    const nextCursor = hasMore ? messages[messages.length - 1]?._id : null;

    // Populate shared content (posts or reels) based on type
    messages = await Promise.all(
      messages.map(async (msg) => {
        if (msg.sharedContent?.type && msg.sharedContent?.contentId) {
          const Model = msg.sharedContent.type === "post" ? require("../models/Post") : require("../models/Reel");
          const content = await Model.findById(msg.sharedContent.contentId)
            .populate("author", "username profilePicture isVerified");
          
          const msgObj = msg.toObject();
          msgObj.sharedContent = {
            ...msgObj.sharedContent,
            content: content.toObject ? content.toObject() : content,
          };
          return msgObj;
        }
        return msg.toObject();
      })
    );

    // Return in chronological order for display
    return sendSuccess(res, {
      messages: messages.reverse(),
      otherUser,
      pagination: { hasMore, nextCursor },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Send Message (REST) ──────────────────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { text, mediaUrl, sharedContent } = req.body;

    if (!text && !mediaUrl && !sharedContent) {
      return sendError(res, "Message cannot be empty", 400);
    }

    const receiver = await User.findById(userId);
    if (!receiver) return sendError(res, "User not found", 404);

    const messageData = {
      sender: req.user._id,
      receiver: userId,
      roomId: getRoomId(req.user._id, userId),
      text: text || "",
      mediaUrl: mediaUrl || "",
    };

    // Add sharedContent if provided
    if (sharedContent && sharedContent.type && sharedContent.contentId) {
      messageData.sharedContent = {
        type: sharedContent.type,
        contentId: sharedContent.contentId,
        message: sharedContent.message || "",
      };
    }

    const message = await Message.create(messageData);

    // Populate sender
    await message.populate("sender", "username profilePicture");

    // If sharing, populate the post/reel data
    if (message.sharedContent?.type && message.sharedContent?.contentId) {
      const Model = message.sharedContent.type === "post"
        ? require("../models/Post")
        : require("../models/Reel");
      const content = await Model.findById(message.sharedContent.contentId)
        .populate("author", "username profilePicture isVerified");
      
      const msgObj = message.toObject();
      msgObj.sharedContent = {
        ...msgObj.sharedContent,
        content: content.toObject ? content.toObject() : content,
      };
      return sendSuccess(res, { message: msgObj }, "Message sent", 201);
    }

    return sendSuccess(res, { message: message }, "Message sent", 201);
  } catch (err) {
    next(err);
  }
};

// ─── Mark Read ────────────────────────────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const roomId = getRoomId(req.user._id, req.params.userId);
    await Message.updateMany(
      { roomId, receiver: req.user._id, isRead: false },
      { isRead: true }
    );
    return sendSuccess(res, {}, "Messages marked as read");
  } catch (err) {
    next(err);
  }
};

// ─── Delete Message ───────────────────────────────────────────────────────────
/**
 * Delete a message (only sender can delete)
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return sendError(res, "Message not found", 404);

    // Only sender can delete
    if (String(message.sender) !== String(req.user._id)) {
      return sendError(res, "You can only delete your own messages", 403);
    }

    await Message.findByIdAndDelete(messageId);
    return sendSuccess(res, {}, "Message deleted");
  } catch (err) {
    next(err);
  }
};

// ─── Delete Conversation ──────────────────────────────────────────────────────
/**
 * Delete entire conversation with a user (deletes all messages both ways)
 */
const deleteConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Check if the user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) return sendError(res, "User not found", 404);

    // Delete all messages where current user is sender OR receiver
    const result = await Message.deleteMany({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    });

    return sendSuccess(
      res,
      { deletedCount: result.deletedCount },
      "Conversation deleted"
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, getMessages, sendMessage, markAsRead, deleteMessage, deleteConversation, getRoomId };
