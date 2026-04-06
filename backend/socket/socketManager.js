/**
 * socket/socketManager.js - FIXED v2
 *
 * Auth supports BOTH:
 *  1. httpOnly cookie (sent automatically by browser with withCredentials)
 *  2. Bearer token in handshake.auth.token (for mobile/Postman clients)
 *
 * Cookie parsing uses the cookie npm package for lightweight extraction.
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const {
  setUserOnline,
  refreshUserActivity,
  setUserOffline,
  getUserOnlineStatus,
} = require("../redis/redisHelpers");
const logger = require("../utils/logger");

const onlineUsers = new Map(); // userId → socketId

const getRoomId = (a, b) => [String(a), String(b)].sort().join("_");

/**
 * Extracts token from either:
 *  - socket.handshake.auth.token  (Bearer pattern)
 *  - socket.handshake.headers.cookie  (httpOnly cookie)
 */
const extractToken = (socket) => {
  // 1. Explicit auth token
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }

  // 2. Parse from cookie header
  const rawCookie = socket.handshake.headers?.cookie || "";
  const match = rawCookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── Auth middleware ──────────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = String(decoded.id);
      next();
    } catch (err) {
      logger.warn("Socket auth failed:", err.message);
      next(new Error("Invalid or expired token"));
    }
  });

  // ── Connection ────────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    try {
      // Set user online in Redis with longer expiration
      await setUserOnline(userId);
      logger.info(`✓ Online: ${userId}`);
    } catch (err) {
      logger.error("Failed to set user online:", err.message);
    }

    // Join personal room for direct message routing
    socket.join(`user:${userId}`);

    // Broadcast presence to all connected clients
    socket.broadcast.emit("user:online", { userId, timestamp: Date.now() });

    // ── Socket Heartbeat (Refresh Activity) ────────────────────────────────
    socket.on("ping", async () => {
      try {
        await refreshUserActivity(userId);
      } catch (err) {
        logger.warn("Failed to refresh activity:", err.message);
      }
    });

    // ── Join Chat Room ────────────────────────────────────────────────────
    // Called when user enters a specific chat
    socket.on("chat:join", async ({ otherUserId }) => {
      try {
        if (!otherUserId) return;
        
        const roomId = getRoomId(userId, otherUserId);
        socket.join(`chat:${roomId}`);

        // Get other user's current status from Redis
        const status = await getUserOnlineStatus(otherUserId);

        // Send back the other user's status
        socket.emit("chat:user_status", {
          userId: otherUserId,
          online: status.online,
          lastSeen: status.lastSeen,
          timestamp: Date.now(),
        });

        logger.info(`User ${userId} joined chat with ${otherUserId} (online: ${status.online})`);
      } catch (err) {
        logger.error("chat:join error:", err.message);
      }
    });

    // ── Leave Chat Room ────────────────────────────────────────────────────
    socket.on("chat:leave", ({ otherUserId }) => {
      if (!otherUserId) return;
      const roomId = getRoomId(userId, otherUserId);
      socket.leave(`chat:${roomId}`);
    });

    // ── Send Message ────────────────────────────────────────────────────────
    socket.on("chat:send", async (data) => {
      try {
        const { receiverId, text, mediaUrl, sharedContent } = data;
        if (!receiverId || (!text?.trim() && !mediaUrl && !sharedContent)) return;

        const roomId = getRoomId(userId, receiverId);

        const messageData = {
          sender: userId,
          receiver: receiverId,
          roomId,
          text: (text || "").trim(),
          mediaUrl: mediaUrl || "",
          isRead: false,
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
          const Model = message.sharedContent.type === "post" ? require("../models/Post") : require("../models/Reel");
          const content = await Model.findById(message.sharedContent.contentId)
            .populate("author", "username profilePicture isVerified");
          
          // Convert message to plain object, then add the content
          const msgObj = message.toObject();
          msgObj.sharedContent = {
            ...msgObj.sharedContent,
            content: content.toObject ? content.toObject() : content,
          };

          // Deliver to receiver
          io.to(`user:${receiverId}`).emit("chat:receive", msgObj);
          // Confirm to sender (mark as delivered)
          socket.emit("chat:sent", msgObj);
        } else {
          const msgObj = message.toObject();
          
          // Deliver to receiver
          io.to(`user:${receiverId}`).emit("chat:receive", msgObj);
          // Confirm to sender (mark as delivered)
          socket.emit("chat:sent", msgObj);
        }

        logger.info(`Message: ${userId} → ${receiverId}`);
      } catch (err) {
        logger.error("chat:send error:", err.message);
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    // ── Typing Indicator ───────────────────────────────────────────────────
    socket.on("chat:typing", ({ receiverId, isTyping }) => {
      if (!receiverId) return;
      io.to(`user:${receiverId}`).emit("chat:typing", {
        userId,
        isTyping,
        timestamp: Date.now(),
      });
    });

    // ── Read Receipt (Messages Seen) ───────────────────────────────────────
    socket.on("chat:read", async ({ senderId }) => {
      try {
        const roomId = getRoomId(userId, senderId);
        await Message.updateMany(
          { roomId, receiver: userId, isRead: false },
          { isRead: true }
        );
        io.to(`user:${senderId}`).emit("chat:messages_seen", {
          seenBy: userId,
          roomId,
          timestamp: Date.now(),
        });

        logger.info(`Messages from ${senderId} seen by ${userId}`);
      } catch (err) {
        logger.error("chat:read error:", err.message);
      }
    });

    // ── Query User Status (Manual Check) ───────────────────────────────────
    socket.on("user:check_status", async ({ targetUserId }) => {
      try {
        if (!targetUserId) return;

        const status = await getUserOnlineStatus(targetUserId);

        socket.emit("user:status_response", {
          userId: targetUserId,
          online: status.online,
          lastSeen: status.lastSeen,
          timestamp: Date.now(),
        });
      } catch (err) {
        logger.error("user:check_status error:", err.message);
      }
    });

    // ── Message Deleted ────────────────────────────────────────────────────
    socket.on("chat:message_deleted", ({ messageId }) => {
      if (!messageId) return;
      // Broadcast deletion to all connected sockets
      socket.broadcast.emit("chat:message_deleted", { messageId });
    });

    // ── Disconnect Handler ────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);

      try {
        // Mark offline and store last seen timestamp in Redis
        await setUserOffline(userId);
        const lastSeen = Date.now();

        // Broadcast to all: this user is now offline
        socket.broadcast.emit("user:offline", {
          userId,
          lastSeen,
          timestamp: lastSeen,
        });

        logger.info(`✗ Offline: ${userId}`);
      } catch (err) {
        logger.error("Failed to set user offline:", err.message);
      }
    });
  });

  logger.info("Socket.io initialized (production grade)");
  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

module.exports = { initSocket, getIO, onlineUsers };
