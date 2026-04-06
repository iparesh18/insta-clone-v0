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
const { setUserOnline } = require("../redis/redisHelpers");
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
  io.on("connection", (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    setUserOnline(userId).catch(() => {});

    // Join personal room for direct message routing
    socket.join(`user:${userId}`);

    // Broadcast presence
    socket.broadcast.emit("user:online", { userId });
    logger.info(`Socket connected: ${userId}`);

    // ── Send message ───────────────────────────────────────────────────
    socket.on("chat:send", async (data) => {
      try {
        const { receiverId, text, mediaUrl } = data;
        if (!receiverId || (!text?.trim() && !mediaUrl)) return;

        const roomId = getRoomId(userId, receiverId);

        const message = await Message.create({
          sender: userId,
          receiver: receiverId,
          roomId,
          text: (text || "").trim(),
          mediaUrl: mediaUrl || "",
        });

        const populated = await message.populate("sender", "username profilePicture");

        // Deliver to receiver
        io.to(`user:${receiverId}`).emit("chat:receive", populated);
        // Confirm to sender
        socket.emit("chat:sent", populated);
      } catch (err) {
        logger.error("chat:send error:", err.message);
        socket.emit("chat:error", { message: "Failed to send message" });
      }
    });

    // ── Typing indicator ───────────────────────────────────────────────
    socket.on("chat:typing", ({ receiverId, isTyping }) => {
      if (!receiverId) return;
      io.to(`user:${receiverId}`).emit("chat:typing", { senderId: userId, isTyping });
    });

    // ── Read receipt ───────────────────────────────────────────────────
    socket.on("chat:read", async ({ senderId }) => {
      try {
        const roomId = getRoomId(userId, senderId);
        await Message.updateMany(
          { roomId, receiver: userId, isRead: false },
          { isRead: true }
        );
        io.to(`user:${senderId}`).emit("chat:read_receipt", { readBy: userId, roomId });
      } catch (err) {
        logger.error("chat:read error:", err.message);
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit("user:offline", { userId });
      logger.info(`Socket disconnected: ${userId}`);
    });
  });

  logger.info("Socket.io initialised");
  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
};

module.exports = { initSocket, getIO, onlineUsers };
