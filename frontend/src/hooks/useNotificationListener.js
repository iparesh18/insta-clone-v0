/**
 * hooks/useNotificationListener.js
 * Socket.io listener with polling fallback for real-time notifications
 * NO page reload needed - all notifications arrive in real-time
 */

import { useEffect, useRef } from "react";
import useSocketStore from "@/store/socketStore";
import useNotificationStore from "@/store/notificationStore";
import useAuthStore from "@/store/authStore";

export function useNotificationListener() {
  const { socket } = useSocketStore();
  const { user: me } = useAuthStore();
  const addUnreadMessage = useNotificationStore((s) => s.addUnreadMessage);
  const showNewMessage = useNotificationStore((s) => s.showNewMessage);
  const setUserTyping = useNotificationStore((s) => s.setUserTyping);
  const setUserOnlineStatus = useNotificationStore((s) => s.setUserOnlineStatus);
  const addAppNotification = useNotificationStore((s) => s.addAppNotification);
  const showNotificationToast = useNotificationStore((s) => s.showNotificationToast);
  const fetchAppNotifications = useNotificationStore((s) => s.fetchAppNotifications);
  
  const pollIntervalRef = useRef(null);
  const lastNotificationIdRef = useRef(null);

  // ─── Polling Fallback (every 10 seconds) ──────────────────────────────
  // If Socket.io fails, this ensures notifications still arrive within 10 seconds
  useEffect(() => {
    if (!me) return;

    const startPolling = () => {
      if (pollIntervalRef.current) return;

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pagination = await fetchAppNotifications(1, 0);
          // Polling successful - notifications are being fetched
          console.log("📡 [POLLING] Notifications synced");
        } catch (err) {
          console.warn("⚠️ [POLLING] Fallback polling failed:", err.message);
        }
      }, 10000); // Poll every 10 seconds
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    // Start polling as fallback
    startPolling();

    return stopPolling;
  }, [me, fetchAppNotifications]);

  useEffect(() => {
    if (!socket || !me) return;

    // ─── New Message ─────────────────────────────────────────────────────
    const handleNewMessage = (message) => {
      const senderId =
        typeof message.sender === "string"
          ? message.sender
          : message.sender?._id;

      if (senderId === me._id) return;

      addUnreadMessage(senderId, message);

      const senderUsername =
        typeof message.sender === "string"
          ? "Someone"
          : message.sender?.username || "Someone";

      showNewMessage(senderUsername, message.text?.slice(0, 50) || "[Message]");
    };

    // ─── Typing Indicator ────────────────────────────────────────────────
    const handleUserTyping = ({ userId, isTyping }) => {
      setUserTyping(userId, isTyping);
    };

    // ─── User Online ────────────────────────────────────────────────────
    const handleUserOnline = ({ userId, timestamp }) => {
      setUserOnlineStatus(userId, true, null); // Online, no lastSeen
    };

    // ─── User Offline ───────────────────────────────────────────────────
    const handleUserOffline = ({ userId, lastSeen, timestamp }) => {
      setUserOnlineStatus(userId, false, lastSeen || timestamp);
    };

    // ─── App Notifications (likes, comments, follows) ──────────────────
    // REAL-TIME: Triggered instantly when someone likes/comments on your post/reel
    const handleNewNotification = (notification) => {
      console.log("🔔 [SOCKET] New notification received INSTANTLY:", notification);
      
      // Prevent duplicate notifications
      if (lastNotificationIdRef.current === notification._id) {
        console.log("⏭️  [DEDUP] Skipping duplicate notification");
        return;
      }
      
      lastNotificationIdRef.current = notification._id;
      addAppNotification(notification);
      showNotificationToast(notification.actor, notification.type);
    };

    socket.on("chat:receive", handleNewMessage);
    socket.on("chat:typing", handleUserTyping);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);
    socket.on("new_notification", handleNewNotification);

    console.log("✅ [SOCKET] Notification listeners attached");

    return () => {
      socket.off("chat:receive", handleNewMessage);
      socket.off("chat:typing", handleUserTyping);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
      socket.off("new_notification", handleNewNotification);
      console.log("❌ [SOCKET] Notification listeners removed");
    };
  }, [socket, me, addUnreadMessage, showNewMessage, setUserTyping, setUserOnlineStatus, addAppNotification, showNotificationToast]);
}
