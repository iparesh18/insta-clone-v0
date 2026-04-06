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

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate("sender", "username profilePicture");

    const hasMore = messages.length === parseInt(limit);
    const nextCursor = hasMore ? messages[messages.length - 1]._id : null;

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
    const { text, mediaUrl } = req.body;

    if (!text && !mediaUrl) return sendError(res, "Message cannot be empty", 400);

    const receiver = await User.findById(userId);
    if (!receiver) return sendError(res, "User not found", 404);

    const message = await Message.create({
      sender: req.user._id,
      receiver: userId,
      roomId: getRoomId(req.user._id, userId),
      text: text || "",
      mediaUrl: mediaUrl || "",
    });

    const populated = await message.populate("sender", "username profilePicture");
    return sendSuccess(res, { message: populated }, "Message sent", 201);
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

module.exports = { getConversations, getMessages, sendMessage, markAsRead, getRoomId };
