/**
 * store/socketStore.js - FIXED v2
 * Socket auth via httpOnly cookie (withCredentials) instead of Bearer token.
 */

import { create } from "zustand";
import { io } from "socket.io-client";

const resolveSocketUrl = () => {
  const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();

  if (configuredSocketUrl && /^https?:\/\//i.test(configuredSocketUrl)) {
    return configuredSocketUrl.replace(/\/+$/, "");
  }

  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredApiUrl && /^https?:\/\//i.test(configuredApiUrl)) {
    return configuredApiUrl
      .replace(/\/+$/, "")
      .replace(/\/api\/v1$/i, "");
  }

  return "http://localhost:5000";
};

const useSocketStore = create((set, get) => ({
  socket: null,
  onlineUsers: new Set(),

  connect: () => {
    if (get().socket?.connected) return;

    const socket = io(resolveSocketUrl(), {
      withCredentials: true,   // sends httpOnly cookie automatically
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("connect_error", (err) => console.warn("Socket error:", err.message));

    socket.on("user:online", ({ userId }) =>
      set(s => ({ onlineUsers: new Set([...s.onlineUsers, userId]) }))
    );
    socket.on("user:offline", ({ userId }) =>
      set(s => {
        const next = new Set(s.onlineUsers);
        next.delete(userId);
        return { onlineUsers: next };
      })
    );

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, onlineUsers: new Set() });
  },

  isOnline: (userId) => get().onlineUsers.has(String(userId)),
}));

export default useSocketStore;
