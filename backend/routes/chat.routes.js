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

router.get("/conversations", protect, getConversations);
router.get("/:userId", protect, getMessages);
router.post("/:userId", protect, sendMessage);
router.patch("/:userId/read", protect, markAsRead);
router.delete("/message/:messageId", protect, deleteMessage);
router.delete("/:userId", protect, deleteConversation);

module.exports = router;
