/**
 * routes/chat.routes.js
 */

const router = require("express").Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  deleteConversation,
} = require("../controllers/chat.controller");
const { protect } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { chatValidators } = require("../validations/routeValidators");

router.get("/conversations", protect, getConversations);
router.get("/:userId", protect, chatValidators.getMessages, validate, getMessages);
router.post("/:userId", protect, chatValidators.sendMessage, validate, sendMessage);
router.patch("/:userId/read", protect, chatValidators.userIdParam, validate, markAsRead);
router.delete("/message/:messageId", protect, chatValidators.messageIdParam, validate, deleteMessage);
router.delete("/:userId", protect, chatValidators.userIdParam, validate, deleteConversation);

module.exports = router;
