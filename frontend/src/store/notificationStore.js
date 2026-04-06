/**
 * store/notificationStore.js
 * Global notification state for unread messages and toast notifications
 * Smart: doesn't annoy users! No notifications if already chatting or tab inactive
 */

import { create } from "zustand";

const useNotificationStore = create((set, get) => ({
  // Unread message state
  unreadCount: 0,
  unreadByUser: {}, // { userId: count }
  seenMessageIds: new Set(), // Track seen message IDs to prevent duplicates

  // Chat activity state (smart notifications)
  currentChatUserId: null, // If user is in chat with someone, store their ID
  tabActive: true, // Track if browser tab is active

  // Message status state
  messageStatus: {}, // { messageId: { status: "sent"|"delivered"|"seen", timestamp } }
  typingUsers: {}, // { userId: true/false } - who is typing
  userOnlineStatus: {}, // { userId: { online: true/false, lastSeen: timestamp } }

  // Toast notification state
  toasts: [], // Array of active toast notifications

  /**
   * Set current chat user ID (called when entering chat room)
   */
  setChatActivity: (userId) => {
    set({ currentChatUserId: userId });
  },

  /**
   * Clear chat activity (called when leaving chat)
   */
  clearChatActivity: () => {
    set({ currentChatUserId: null });
  },

  /**
   * Set tab visibility
   */
  setTabActive: (active) => {
    set({ tabActive: active });
  },

  /**
   * Add unread message from a specific user
   * Smart logic: Skip if already chatting with them OR tab inactive
   */
  addUnreadMessage: (userId, message) => {
    set((state) => {
      const { currentChatUserId, tabActive, seenMessageIds } = state;

      // SMART: Don't notify if already chatting with this user
      if (currentChatUserId === userId) {
        return state; // Silent update - already viewing their messages
      }

      // Check if we've already processed this message
      if (seenMessageIds.has(message._id)) {
        return state; // Message already counted, skip
      }

      const newSeenIds = new Set(seenMessageIds);
      newSeenIds.add(message._id);

      const newUnreadByUser = { ...state.unreadByUser };
      newUnreadByUser[userId] = (newUnreadByUser[userId] || 0) + 1;

      return {
        unreadCount: state.unreadCount + 1,
        unreadByUser: newUnreadByUser,
        seenMessageIds: newSeenIds,
      };
    });
  },

  /**
   * Get unread count for a specific user
   */
  getUnreadCount: (userId) => get().unreadByUser[userId] || 0,

  /**
   * Mark all messages from a user as read
   */
  markAsRead: (userId) => {
    set((state) => {
      const userUnreadCount = state.unreadByUser[userId] || 0;
      const newUnreadByUser = { ...state.unreadByUser };
      delete newUnreadByUser[userId];

      return {
        unreadCount: Math.max(0, state.unreadCount - userUnreadCount),
        unreadByUser: newUnreadByUser,
      };
    });
  },

  /**
   * Clear all notifications
   */
  clearAll: () => {
    set({
      unreadCount: 0,
      unreadByUser: {},
      seenMessageIds: new Set(),
    });
  },

  /**
   * Update typing status for a user
   */
  setUserTyping: (userId, isTyping) => {
    set((state) => {
      const newTypingUsers = { ...state.typingUsers };
      if (isTyping) {
        newTypingUsers[userId] = true;
      } else {
        delete newTypingUsers[userId];
      }
      return { typingUsers: newTypingUsers };
    });
  },

  /**
   * Check if a user is typing
   */
  isUserTyping: (userId) => get().typingUsers[userId] || false,

  /**
   * Update user online status
   */
  setUserOnlineStatus: (userId, online, lastSeen = null) => {
    set((state) => {
      const newStatus = { ...state.userOnlineStatus };
      newStatus[userId] = {
        online,
        lastSeen: lastSeen || Date.now(),
      };
      return { userOnlineStatus: newStatus };
    });
  },

  /**
   * Get user online status
   */
  getUserOnlineStatus: (userId) => {
    const status = get().userOnlineStatus[userId];
    return {
      online: status?.online || false,
      lastSeen: status?.lastSeen || null,
    };
  },

  /**
   * Update message delivery status
   */
  updateMessageStatus: (messageId, status, timestamp = null) => {
    set((state) => {
      const newStatus = { ...state.messageStatus };
      newStatus[messageId] = {
        status, // "sent" | "delivered" | "seen"
        timestamp: timestamp || Date.now(),
      };
      return { messageStatus: newStatus };
    });
  },

  /**
   * Get message status
   */
  getMessageStatus: (messageId) =>
    get().messageStatus[messageId] || { status: "sent", timestamp: null },

  /**
   * Add a toast notification
   * SMART: Skip if tab inactive (silent update only)
   */
  addToast: (toast) => {
    const tabActive = get().tabActive;

    // Don't show toast if tab is inactive (silent update)
    if (!tabActive && toast.type !== "newMessage") {
      return null; // Silent update
    }

    const id = Date.now();
    const toastWithId = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, toastWithId],
    }));

    // Auto-remove toast after duration (default 4 seconds)
    const duration = toast.duration || 4000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  /**
   * Remove a specific toast
   */
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  /**
   * Show success toast
   */
  showSuccess: (message, duration = 4000) => {
    get().addToast({ type: "success", message, duration });
  },

  /**
   * Show error toast
   */
  showError: (message, duration = 4000) => {
    get().addToast({ type: "error", message, duration });
  },

  /**
   * Show info toast
   */
  showInfo: (message, duration = 4000) => {
    get().addToast({ type: "info", message, duration });
  },

  /**
   * Show new message notification toast
   * SMART: Only shows if not already chatting with them
   */
  showNewMessage: (username, message) => {
    const { currentChatUserId } = get();
    if (!currentChatUserId) {
      get().addToast({
        type: "newMessage",
        username,
        message,
        duration: 5000,
      });
    }
  },
}));

// Track tab visibility globally
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    const tabActive = !document.hidden;
    useNotificationStore.setState({ tabActive });
  });
}

export default useNotificationStore;
