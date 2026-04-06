/**
 * hooks/useNotificationListener.js
 * Socket.io listener for new messages with global notification support
 * Also tracks typing indicators and online status
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

    /**
     * Listen for incoming messages
     * Fires whenever a message is sent to the current user
     * Smart: uses notification store to skip if already chatting
     */
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

      showNewMessage(
        senderUsername,
        message.text?.slice(0, 50) || "[Message]"
      );
    };

    /**
     * Track typing indicators
     */
    const handleUserTyping = ({ userId, isTyping }) => {
      setUserTyping(userId, isTyping);
    };

    /**
     * Track online status of other users
     */
    const handleUserOnline = ({ userId }) => {
      setUserOnlineStatus(userId, true);
    };

    const handleUserOffline = ({ userId, lastSeen }) => {
      setUserOnlineStatus(userId, false, lastSeen);
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
