/**
 * controllers/notification.controller.js
 * Real-time notification management
 */

const Notification = require("../models/Notification");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const { getIO } = require("../socket/socketManager");

// ─── Get Notifications ────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 50);
    const parsedSkip = parseInt(skip);

    console.log(`📬 [NOTIFICATIONS] Fetching for user: ${userId}`);

    // Fetch notifications with actor details
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip(parsedSkip)
      .populate("actor", "username profilePicture isVerified")
      .lean();

    // Get total count
    const total = await Notification.countDocuments({ userId });
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    console.log(`✅ [NOTIFICATIONS] Found ${notifications.length} of ${total} total`);

    return sendSuccess(res, {
      notifications,
      pagination: {
        total,
        unreadCount,
        limit: parsedLimit,
        skip: parsedSkip,
        hasMore: parsedSkip + parsedLimit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Mark Single Notification as Read ──────────────────────────────────────
const readNotification = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    ).populate("actor", "username profilePicture isVerified");

    if (!notification) {
      return sendError(res, "Notification not found", 404);
    }

    return sendSuccess(res, { notification });
  } catch (err) {
    next(err);
  }
};

// ─── Mark All Notifications as Read ───────────────────────────────────────
const readAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    console.log(`✅ [NOTIFICATIONS] Marked ${result.modifiedCount} as read`);

    return sendSuccess(res, {
      modifiedCount: result.modifiedCount,
      message: "All notifications marked as read",
    });
  } catch (err) {
    next(err);
  }
};

// ─── Create Notification (Internal Helper) ─────────────────────────────────
const createNotification = async (
  userId,
  actor,
  type,
  referenceId,
  referenceType,
  message
) => {
  try {
    // Never notify user of their own actions
    if (String(userId) === String(actor)) {
      console.log(`⏭️  [NOTIFICATIONS] Skipping self-notification`);
      return null;
    }

    const notification = await Notification.create({
      userId,
      actor,
      type,
      referenceId,
      referenceType,
      message: message || `${type}d your ${referenceType.toLowerCase()}`,
      isRead: false,
    });

    // Populate actor details
    const populated = await notification.populate(
      "actor",
      "username profilePicture isVerified"
    );

    console.log(
      `🔔 [NOTIFICATION] Created: ${type} for user ${userId} by ${actor}`
    );

    // Emit real-time notification via Socket.io
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit("new_notification", {
          _id: populated._id,
          actor: populated.actor,
          type: populated.type,
          referenceId: populated.referenceId,
          referenceType: populated.referenceType,
          message: populated.message,
          isRead: populated.isRead,
          createdAt: populated.createdAt,
        });
        console.log(`📤 [SOCKET] Emitted new_notification to user:${userId}`);
      }
    } catch (socketErr) {
      console.warn(`⚠️  [SOCKET] Failed to emit notification:`, socketErr.message);
    }

    return populated;
  } catch (err) {
    console.error("❌ Failed to create notification:", err);
    return null;
  }
};

// ─── Delete Notification ──────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.params;

    const deleted = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!deleted) {
      return sendError(res, "Notification not found", 404);
    }

    return sendSuccess(res, { message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── Get Unread Count ─────────────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return sendSuccess(res, { unreadCount });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  readNotification,
  readAllNotifications,
  deleteNotification,
  getUnreadCount,
  createNotification, // Export for use in other controllers
};
