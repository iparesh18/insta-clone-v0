/**
 * hooks/useNotificationListener.js
 * Socket.io listener for messages, typing, online status
 * Runs globally to track all real-time events
 */

import { useEffect } from "react";
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

    socket.on("chat:receive", handleNewMessage);
    socket.on("chat:typing", handleUserTyping);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    return () => {
      socket.off("chat:receive", handleNewMessage);
      socket.off("chat:typing", handleUserTyping);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [socket, me, addUnreadMessage, showNewMessage, setUserTyping, setUserOnlineStatus]);
}
