/**
 * routes/notification.routes.js
 */

const router = require("express").Router();
const {
  getNotifications,
  readNotification,
  readAllNotifications,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notification.controller");
const { protect } = require("../middlewares/auth");

// Get all notifications
router.get("/", protect, getNotifications);

// Get unread count
router.get("/unread/count", protect, getUnreadCount);

// Mark all as read
router.patch("/read-all", protect, readAllNotifications);

// Mark single as read
router.patch("/:notificationId/read", protect, readNotification);

// Delete notification
router.delete("/:notificationId", protect, deleteNotification);

module.exports = router;
