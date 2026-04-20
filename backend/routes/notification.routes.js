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
const { validate } = require("../middlewares/validate");
const { notificationValidators } = require("../validations/routeValidators");

// Get all notifications
router.get("/", protect, notificationValidators.list, validate, getNotifications);

// Get unread count
router.get("/unread/count", protect, getUnreadCount);

// Mark all as read
router.patch("/read-all", protect, readAllNotifications);

// Mark single as read
router.patch("/:notificationId/read", protect, notificationValidators.notificationId, validate, readNotification);

// Delete notification
router.delete("/:notificationId", protect, notificationValidators.notificationId, validate, deleteNotification);

module.exports = router;
